/* eslint-disable no-unused-expressions */
import 'mocha';
import * as chai from 'chai';

import {assertIpAddress} from '../src/';

const expect = chai.expect;

describe('buildDelay', () => {
	it('should be valid delay values', () => {
		expect(() => assertIpAddress('asd')).to.throw(TypeError, 'Invalid IP address: asd');
	});
});
