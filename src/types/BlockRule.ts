export type BlockRule = {
	/**
	 * The number of times an IP address can be accessed before it is blocked.
	 */
	count: number;
	/**
	 * The duration of the block countdown in milliseconds.
	 */
	duration: number;
	/**
	 * Delay threshold in milliseconds, start delaying responses after this many requests.
	 */
	delayThreshold?: number;
	/**
	 * The amount of time to delay the response.
	 */
	delay?: number;
	whiteList?: string[];
};

export type BlockRuleWithDelay = Required<BlockRule>;

export function haveRuleDelay(rule: BlockRule): rule is BlockRuleWithDelay {
	return rule.delayThreshold !== undefined && rule.delay !== undefined;
}
