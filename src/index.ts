import {Address4, Address6} from 'ip-address';
import {assertIpAddress, getIpAddress} from './types/IpAddress';
import {BlockRule, haveRuleDelay} from './types/BlockRule';
import {Err, Ok, Result} from 'mharj-result';
import {ILoggerLike, LogLevel, LogMapping, MapLogger} from '@avanio/logger-like';
import {BlockResponse} from './types/BlockResponse';
import {IBlockIpDriver} from './interfaces/IBlockIpDriver';
import {Loadable} from './types/Loadable';
export * from './types';
export * from './drivers';

export function asError(err: unknown): Error {
	if (err instanceof Error) {
		return err;
	}
	return new Error(String(err));
}

export function buildDelay(count: number, rule: BlockRule): number {
	if (!haveRuleDelay(rule) || count < rule.delayThreshold) {
		return 0;
	}
	return (count - rule.delayThreshold) * rule.delay;
}

/**
 * Check against the block rule if the IP is blocked or not.
 * @param count - The number of requests from the IP
 * @param rule - The block rule to check against
 * @returns - If the IP is blocked or not
 */
export function isBlocked(count: number, rule: BlockRule): boolean {
	return count >= rule.count;
}

export type EventCallback = (ip: string, isBlocked: boolean) => Promise<void>;

const defaultLogMap = {
	blocked: LogLevel.None,
	clear: LogLevel.None,
	delete: LogLevel.None,
	hit: LogLevel.None,
	unblocked: LogLevel.None,
	whiteListed: LogLevel.None,
} as const;

export type IpBlockerLogMapType = LogMapping<keyof typeof defaultLogMap>;

export class IpBlocker {
	private isDriverInit = false;
	private logger: MapLogger<IpBlockerLogMapType>;
	private driver: Loadable<IBlockIpDriver>;
	private blockRule: Loadable<BlockRule>;
	private handleBlockEvent = new Set<EventCallback>();
	private whiteList: (Address4 | Address6)[] | undefined | null = null;

	constructor(blockRule: Loadable<BlockRule>, driver: Loadable<IBlockIpDriver>, logger?: ILoggerLike, logMapping?: Partial<IpBlockerLogMapType>) {
		this.blockRule = blockRule;
		this.driver = driver;
		this.logger = new MapLogger(logger, {...defaultLogMap, ...logMapping});
	}

	/**
	 * initDriver initializes the driver if it is not initialized yet.
	 */
	public async init(): Promise<void> {
		await this.getDriver();
	}

	/**
	 * onBlockEvent is called when an IP is blocked or unblocked.
	 *
	 * This can be used to notify other services that an IP is blocked or unblocked (like firewall rules)
	 * @param blockEventCallback - The callback function which gets called when an IP is blocked or unblocked.
	 * @example
	 * const ipBlocker = new IpBlocker({count: 20, duration: 60000, delayThreshold: 5, delay: 1000});
	 * ipBlocker.onBlockEvent(async (ip, isBlocked) => {
	 *   console.log(`IP ${ip} is ${isBlocked ? 'blocked' : 'unblocked'}`);
	 * });
	 */
	public onBlockEvent(blockEventCallback: EventCallback): void {
		this.handleBlockEvent.add(blockEventCallback);
	}

	/**
	 * Check IP and return if it is blocked or not.
	 * @param {string} ip - The IP address to check.
	 * @returns {Promise<Result<BlockResponse, Error | TypeError>>} - The Promise result
	 * @example
	 * // 20 requests in 60 seconds, delay response after 5 requests for adding 1 seconds each time
	 * const ipBlocker = new IpBlocker({count: 20, duration: 60000, delayThreshold: 5, delay: 1000});
	 * const authIpBlockMiddleware = async (req, res, next) => {
	 *   const {blocked, delay, count} = await ipBlocker.checkIp(req.ip).unwrap();
	 *   if(blocked) {
	 *     return res.status(429).send('Too many requests');
	 *   }
	 *   if(delay > 0) { // delay response
	 *     await new Promise((resolve) => setTimeout(resolve, delay));
	 *   }
	 *   next();
	 * }
	 */
	public async checkIp(ip: string): Promise<Result<BlockResponse, Error | TypeError>> {
		try {
			const driver = await this.getDriver();
			assertIpAddress(ip);
			const blockRule = await this.getBlockRule();
			if (await this.checkIpInWhiteList(ip)) {
				this.logger.logKey('whiteListed', `IpBlocker: Whitelisted IP ${ip}`);
				return Ok({blocked: false, delay: 0, count: 0}); // ip is whitelisted
			}
			let count = await driver.getIpCount(ip);

			count++; // increment count
			const blocked = isBlocked(count, blockRule);
			await driver.setIpCount(ip, count, blockRule.duration); // store count for duration
			this.logger.logKey(blocked ? 'blocked' : 'hit', `IpBlocker: ${blocked ? 'Blocked' : 'Hit'} IP ${ip}, count: ${count} limit: ${blockRule.count}`);
			if (blocked && blocked !== isBlocked(count - 1, blockRule)) {
				await this.emitBlockEvent(ip, blocked); // emit block event as the ip is now blocked
			}
			return Ok({blocked, delay: buildDelay(count, blockRule), count});
		} catch (err) {
			// istanbul ignore next
			return Err(asError(err));
		}
	}

	private async checkIpInWhiteList(ip: string): Promise<boolean> {
		const whiteList = await this.getWhiteList();
		if (!whiteList) {
			return false;
		}
		const address = getIpAddress(ip);
		for (const rangeAddress of whiteList) {
			if (address.isInSubnet(rangeAddress)) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Clear the ip from the cache
	 * @param ip - the ip to clear
	 * @returns {Promise<Result<boolean, Error | TypeError>>} - the result as Promise Result boolean indicating if the ip was cleared
	 */
	public async clearIp(ip: string): Promise<Result<boolean, Error | TypeError>> {
		this.logger.logKey('clear', `IpBlocker: Clear IP ${ip}`);
		try {
			const driver = await this.getDriver();
			assertIpAddress(ip);
			return Ok(await driver.removeIp(ip));
		} catch (err) {
			// istanbul ignore next
			return Err(asError(err));
		}
	}

	/**
	 * get the current status of the tracked ip and blocked count
	 * @returns {Promise<Result<{count: number; blocked: number}, Error>>} - the current status as Promise Result
	 */
	public async status(): Promise<Result<{count: number; blocked: number}, Error>> {
		try {
			const driver = await this.getDriver();
			const blockRule = await this.getBlockRule();
			let count = 0;
			let blocked = 0;
			for await (const [_ip, c] of driver.listIpEntries()) {
				count++;
				if (isBlocked(c, blockRule)) {
					blocked++;
				}
			}
			return Ok({count, blocked});
		} catch (err) {
			// istanbul ignore next
			return Err(asError(err));
		}
	}

	/**
	 * destroy the ip blocker
	 */
	public async destroy(): Promise<void> {
		const driver = await this.getDriver();
		await driver.unload();
	}

	private async emitBlockEvent(ip: string, isBlocked: boolean): Promise<void> {
		const callbackList = Array.from(this.handleBlockEvent);
		await Promise.all(callbackList.map((cb) => cb(ip, isBlocked))); // call all callbacks (async)
	}

	private getBlockRule(): Promise<BlockRule> | BlockRule {
		if (typeof this.blockRule === 'function') {
			this.blockRule = this.blockRule();
		}
		return this.blockRule;
	}

	private async getWhiteList(): Promise<(Address4 | Address6)[] | undefined> {
		// check if initial value is null
		if (this.whiteList === null) {
			const blockRule = await this.getBlockRule();
			if (!blockRule.whiteList) {
				return undefined; // no whitelist
			}
			this.whiteList = blockRule.whiteList.map((ip) => (typeof ip === 'string' ? getIpAddress(ip) : ip));
		}
		return this.whiteList;
	}

	private async getDriver(): Promise<IBlockIpDriver> {
		if (typeof this.driver === 'function') {
			this.driver = this.driver();
		}
		const driver = await this.driver;
		if (!this.isDriverInit) {
			this.isDriverInit = true;
			await driver.init();
			// add listener for clearing cache
			driver.onClear(async (entries) => {
				const blockRule = await this.getBlockRule();
				// notify all IPs that are cleared from cache that they are no longer blocked
				for await (const [ip, count] of entries) {
					// only notify those if ip was blocked
					if (isBlocked(count, blockRule)) {
						this.logger.logKey('unblocked', `IpBlocker: Unblocked IP ${ip}`);
						await this.emitBlockEvent(ip, false);
					}
				}
			});
		}
		return driver;
	}
}
