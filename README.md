# IP delay and block module

## Description

This module can be used to delay and block IP addresses based on the number of requests for a given time period.

Module contains driver interface also for other implementations for ip tracking storage.(can use something like redis, memcache, etc)

## Install

```bash
npm i @avanio/ip-block --save
```

## Example

This example build ExpressJS middleware and uses IpBlockCacheDriver for caching ip and counts, which uses ExpireTimeoutCache for expiring the cached entries (based on duration rule).

```typescript
import {RequestHandler} from 'express';
import {ExpireTimeoutCache} from '@avanio/expire-cache';
import {BlockRule, IpAddress, IpBlockCacheDriver, IpBlocker} from '@avanio/ip-block';
import {Address6} from 'ip-address';

const ipv6LinkLocal = new Address6('fe80::/64');
const rule: BlockRule = {
	count: 100, // tries in duration
	delay: 100, // delay used by delayThreshold to add delay 
	delayThreshold: 50, // after 50 we can add delay to next request
	duration: 60000, // 60 seconds
	whiteList: ['10.0.0.0/8', ipv6LinkLocal],
};

const blockerDrivers = new IpBlockCacheDriver(new ExpireTimeoutCache<number, IpAddress>());
const blocker = new IpBlocker(rule, blockerDrivers);

// 'blocked' event is triggered when ip is blocked or unblocked
blocker.on('blocked', async (ip, isBlocked) => {
	// can extended to other services like apply actual Firewall rules.
});

const blockerMiddleware: RequestHandler = async (req, res, next) => {
	const blockRes = await blocker.checkIp(req.ip);
	if (blockRes.isErr) {
		return next(blockRes.err());
	}
	const {blocked, delay, count} = blockRes.ok();
	if (blocked) {
		return res.status(429).send('Too many requests');
	}
	if (delay > 0) {
		await new Promise((resolve) => setTimeout(resolve, delay)); // sleep for delay milliseconds
	}
	next();
};
````
