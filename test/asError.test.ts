import 'mocha';
import * as chai from 'chai';

import {asError} from '../src/';

const expect = chai.expect;

describe('buildDelay', () => {
	it('should be valid delay values', () => {
		expect(asError(new Error('message')))
			.to.be.instanceOf(Error)
			.and.to.have.property('message', 'message');
		expect(asError('message')).to.be.instanceOf(Error).and.to.have.property('message', 'message');
	});
});
