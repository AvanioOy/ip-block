/* eslint-disable sonarjs/no-duplicate-string */
import 'mocha';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';
import {BlockRule, IpBlockCacheDriver, IpBlocker} from '../src';
import {Address6} from 'ip-address';
import {ExpireTimeoutCache} from '@avanio/expire-cache';
import {IpAddress} from '../src/types/IpAddress';

const ipv6LinkLocal = new Address6('fe80::/64');

chai.use(chaiAsPromised);

const onBlockSpy = sinon.spy();

const expect = chai.expect;

const rule: BlockRule = {
	count: 5,
	delay: 100,
	delayThreshold: 2,
	duration: 10000, // 10 seconds
	whiteList: ['10.0.0.0/8', ipv6LinkLocal],
};

let blocker: IpBlocker;

describe('IpBlocker', () => {
	beforeEach(() => {
		onBlockSpy.resetHistory();
	});
	describe('IpBlocker manual clean', () => {
		before(async () => {
			blocker = new IpBlocker(
				() => rule,
				() => new IpBlockCacheDriver(new ExpireTimeoutCache<number, IpAddress>()),
			);
			blocker.onBlockEvent(onBlockSpy);
			await blocker.init();
		});
		it('should be valid whitelist values', async () => {
			expect((await blocker.checkIp('10.0.0.5')).unwrap()).to.be.eql({delay: 0, blocked: false, count: 0});
			expect((await blocker.checkIp('fe80::200:5aee:feaa:20a2')).unwrap()).to.be.eql({delay: 0, blocked: false, count: 0});
		});
		it('should be valid isBlocked values', async () => {
			expect((await blocker.checkIp('::1')).unwrap()).to.be.eql({delay: 0, blocked: false, count: 1});
			expect((await blocker.checkIp('127.0.0.1')).unwrap()).to.be.eql({delay: 0, blocked: false, count: 1});
			expect(onBlockSpy.callCount).to.be.eq(0);
			expect((await blocker.checkIp('127.0.0.1')).unwrap()).to.be.eql({delay: 0, blocked: false, count: 2});
			expect(onBlockSpy.callCount).to.be.eq(0);
			expect((await blocker.checkIp('127.0.0.1')).unwrap()).to.be.eql({delay: 100, blocked: false, count: 3});
			expect(onBlockSpy.callCount).to.be.eq(0);
			expect((await blocker.checkIp('127.0.0.1')).unwrap()).to.be.eql({delay: 200, blocked: false, count: 4});
			expect(onBlockSpy.callCount).to.be.eq(0);
			expect((await blocker.checkIp('127.0.0.1')).unwrap()).to.be.eql({delay: 300, blocked: true, count: 5});
			expect(onBlockSpy.callCount).to.be.eq(1);
			expect(onBlockSpy.args[0]).to.be.eql(['127.0.0.1', true]);
			expect((await blocker.checkIp('127.0.0.1')).unwrap()).to.be.eql({delay: 400, blocked: true, count: 6});
			expect(onBlockSpy.callCount).to.be.eq(1);
			expect((await blocker.status()).unwrap()).to.be.eql({count: 2, blocked: 1});
		});
		it('should be valid isBlocked values after clear', async () => {
			// clear the ip
			await blocker.clearIp('127.0.0.1');
			expect((await blocker.checkIp('127.0.0.1')).unwrap()).to.be.eql({delay: 0, blocked: false, count: 1});
			expect(onBlockSpy.callCount).to.be.eq(1);
			expect(onBlockSpy.args[0]).to.be.eql(['127.0.0.1', false]);
			expect((await blocker.status()).unwrap()).to.be.eql({count: 2, blocked: 0});
		});
		after(async () => {
			await blocker.destroy();
		});
	});
	describe('IpBlocker with 100ms timeout', () => {
		before(() => {
			blocker = new IpBlocker(
				{
					count: 5,
					delay: 100,
					delayThreshold: 2,
					duration: 100,
				},
				new IpBlockCacheDriver(new ExpireTimeoutCache<number, IpAddress>()),
			);
			blocker.onBlockEvent(onBlockSpy);
		});
		it('should be valid isBlocked values', async () => {
			expect((await blocker.checkIp('::1')).unwrap()).to.be.eql({delay: 0, blocked: false, count: 1});
			expect((await blocker.checkIp('127.0.0.1')).unwrap()).to.be.eql({delay: 0, blocked: false, count: 1});
			expect(onBlockSpy.callCount).to.be.eq(0);
			expect((await blocker.checkIp('127.0.0.1')).unwrap()).to.be.eql({delay: 0, blocked: false, count: 2});
			expect(onBlockSpy.callCount).to.be.eq(0);
			expect((await blocker.checkIp('127.0.0.1')).unwrap()).to.be.eql({delay: 100, blocked: false, count: 3});
			expect(onBlockSpy.callCount).to.be.eq(0);
			expect((await blocker.checkIp('127.0.0.1')).unwrap()).to.be.eql({delay: 200, blocked: false, count: 4});
			expect(onBlockSpy.callCount).to.be.eq(0);
			expect((await blocker.checkIp('127.0.0.1')).unwrap()).to.be.eql({delay: 300, blocked: true, count: 5});
			expect(onBlockSpy.callCount).to.be.eq(1);
			expect(onBlockSpy.args[0]).to.be.eql(['127.0.0.1', true]);
			expect((await blocker.checkIp('127.0.0.1')).unwrap()).to.be.eql({delay: 400, blocked: true, count: 6});
			expect(onBlockSpy.callCount).to.be.eq(1);
			expect((await blocker.status()).unwrap()).to.be.eql({count: 2, blocked: 1});
		});
		it('should be valid isBlocked values after timeout', async function () {
			// wait for the timeout to kick in
			await new Promise((resolve) => setTimeout(resolve, 100));
			expect(onBlockSpy.callCount).to.be.eq(1);
			expect(onBlockSpy.args[0]).to.be.eql(['127.0.0.1', false]);
			expect((await blocker.status()).unwrap()).to.be.eql({count: 0, blocked: 0});
		});
	});
});
