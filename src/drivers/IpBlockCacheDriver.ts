import {IBlockIpDriver} from '../interfaces/IBlockIpDriver';
import {ICacheOrAsync} from '@avanio/expire-cache';
import {IpAddress} from '../types/IpAddress';

export class IpBlockCacheDriver implements IBlockIpDriver {
	private cache: ICacheOrAsync<number, IpAddress>;

	constructor(cache: ICacheOrAsync<number, IpAddress>) {
		this.cache = cache;
	}

	public init(): void | Promise<void> {
		// nothing to do
	}

	public unload(): void | Promise<void> {
		return this.cache.clear();
	}

	public async getIpCount(ip: IpAddress): Promise<number> {
		return (await this.cache.get(ip)) || 0;
	}

	public async setIpCount(ip: IpAddress, count: number, clearTimeout: number): Promise<void> {
		return this.cache.set(ip, count, new Date(Date.now() + clearTimeout));
	}

	public removeIp(ip: IpAddress): boolean | Promise<boolean> {
		return this.cache.delete(ip);
	}

	public onClear(cb: (entries: Iterable<[IpAddress, number]>) => Promise<void>): void {
		this.cache.onClear(cb);
	}

	public listIpEntries(): AsyncIterable<[IpAddress, number]> | Iterable<[IpAddress, number]> {
		return this.cache.entries();
	}
}
