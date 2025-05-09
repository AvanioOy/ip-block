import {describe, expect, it} from 'vitest';
import {type BlockRule, isBlocked} from '../src';

const rule: BlockRule = {
	count: 5,
	delay: 100,
	delayThreshold: 2,
	duration: 10000, // 10 seconds
};

describe('isBlocked', () => {
	it('should be valid isBlocked values', () => {
		expect(isBlocked(0, rule)).to.be.eq(false);
		expect(isBlocked(4, rule)).to.be.eq(false);
		expect(isBlocked(5, rule)).to.be.eq(true);
		expect(isBlocked(6, rule)).to.be.eq(true);
	});
});
