import 'mocha';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import {BlockRule, buildDelay} from '../src/';

chai.use(chaiAsPromised);

const expect = chai.expect;

const rule: BlockRule = {
	count: 5,
	delay: 100,
	delayThreshold: 2,
	duration: 10000, // 10 seconds
};

describe('buildDelay', () => {
	it('should be valid delay values', () => {
		expect(buildDelay(0, rule)).to.be.eq(0);
		expect(buildDelay(2, rule)).to.be.eq(0);
		expect(buildDelay(3, rule)).to.be.eq(100);
		expect(buildDelay(4, rule)).to.be.eq(200);
		expect(buildDelay(5, rule)).to.be.eq(300);
	});
});
