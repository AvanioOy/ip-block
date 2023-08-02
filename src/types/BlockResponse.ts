export type BlockResponse = {
	/**
	 * true if the IP address is blocked
	 */
	blocked: boolean;
	/**
	 * delay in milliseconds for the response
	 */
	delay: number;
	/**
	 * count of requests
	 */
	count: number;
};
