import {Address4, Address6} from 'ip-address';
import {isIP as nodeIsIp} from 'net';

/**
 * Type of IP address
 * @example
 * 127.0.0.1
 * ::1
 */
export type IpAddress = string & {__ip: never};

/**
 * Type guard for IP address
 * @param {string} ip - The IP address to check.
 * @returns {boolean} - If the IP address is valid
 */
export function isIpAddress(ip: unknown): ip is IpAddress {
	return typeof ip === 'string' && nodeIsIp(ip) !== 0;
}

export function assertIpAddress(ip: unknown): asserts ip is IpAddress {
	if (!isIpAddress(ip)) {
		throw new TypeError(`Invalid IP address: ${String(ip)}`);
	}
}

export function getIpAddress(rawIp: unknown): Address4 | Address6 {
	if (typeof rawIp !== 'string') {
		// istanbul ignore next
		throw new TypeError(`Invalid IP address: ${String(rawIp)}`);
	}
	const [ip] = rawIp.split('/', 2);
	const ipType = nodeIsIp(ip);
	switch (ipType) {
		case 4:
			return new Address4(rawIp);
		case 6:
			return new Address6(rawIp);
		default: // istanbul ignore next
			throw new TypeError(`Invalid IP address: ${String(ip)}`);
	}
}
