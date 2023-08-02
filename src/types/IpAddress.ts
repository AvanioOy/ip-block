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
