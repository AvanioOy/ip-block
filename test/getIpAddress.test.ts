import {describe, expect, it} from 'vitest';
import {getIpAddress} from '../src';

describe('buildDelay', () => {
	it('should be valid delay values', () => {
		expect(getIpAddress('127.0.0.1').address).to.be.eq('127.0.0.1');
		expect(getIpAddress('127.0.0.1/32').address).to.be.eq('127.0.0.1/32');
		expect(() => getIpAddress('unknown')).to.throw(TypeError, 'Invalid IP address: unknown');
		expect(() => getIpAddress(undefined)).to.throw(TypeError, 'Invalid IP address: undefined');
	});
});
