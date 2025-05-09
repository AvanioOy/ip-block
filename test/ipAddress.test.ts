import {describe, expect, it} from 'vitest';
import {assertIpAddress} from '../src';

describe('buildDelay', () => {
	it('should be valid delay values', () => {
		expect(() => assertIpAddress('asd')).to.throw(TypeError, 'Invalid IP address: asd');
	});
});
