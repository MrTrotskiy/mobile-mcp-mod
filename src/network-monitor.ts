/**
 * NetworkMonitor class for capturing network requests from mobile devices
 *
 * Purpose: Allows Cursor AI to see HTTP/HTTPS requests and responses
 * This is critical for debugging API issues and understanding app behavior
 *
 * Android: Uses mitmproxy or Charles proxy setup
 * iOS: Uses similar proxy approach
 */

export interface NetworkRequest {
	id: string;
	timestamp: number;
	method: string; // GET, POST, PUT, DELETE, etc.
	url: string;
	headers: Record<string, string>;
	body?: string;
	status?: number; // HTTP status code
	statusText?: string;
	responseHeaders?: Record<string, string>;
	responseBody?: string;
	duration?: number; // Request duration in ms
	size?: number; // Response size in bytes
}

export interface NetworkFilter {
	packageName?: string; // Filter by app package
	url?: string; // Filter by URL pattern
	method?: string; // Filter by HTTP method
	status?: number; // Filter by status code
}

/**
 * Static class to store and manage network requests
 *
 * Why static? Because network monitoring runs in background
 * and we need to access captured requests from any tool
 */
export class NetworkMonitor {
	// Store all captured network requests
	private static requests: NetworkRequest[] = [];

	// Maximum number of requests to keep in memory
	private static maxRequests: number = 100;

	// Flag to enable/disable monitoring
	private static enabled: boolean = false;

	/**
	 * Start network monitoring
	 *
	 * Note: This requires proxy setup on device
	 * See documentation for setup instructions
	 */
	static start(): void {
		this.enabled = true;
		this.requests = [];
	}

	/**
	 * Stop network monitoring
	 */
	static stop(): void {
		this.enabled = false;
	}

	/**
	 * Check if monitoring is active
	 */
	static isEnabled(): boolean {
		return this.enabled;
	}

	/**
	 * Record a network request
	 *
	 * Call this when a request is captured by proxy
	 *
	 * @param request - Network request to record
	 */
	static recordRequest(request: NetworkRequest): void {
		if (!this.enabled) {
			return;
		}

		// Add to requests array
		this.requests.push(request);

		// Limit array size to prevent memory issues
		if (this.requests.length > this.maxRequests) {
			// Remove oldest requests
			this.requests = this.requests.slice(-this.maxRequests);
		}
	}

	/**
	 * Get all captured requests
	 *
	 * @param filter - Optional filter criteria
	 * @returns Array of network requests
	 */
	static getRequests(filter?: NetworkFilter): NetworkRequest[] {
		let results = [...this.requests];

		// Apply filters if provided
		if (filter) {
			if (filter.url) {
				// Filter by URL pattern (case-insensitive substring match)
				const urlPattern = filter.url.toLowerCase();
				results = results.filter(req =>
					req.url.toLowerCase().includes(urlPattern)
				);
			}

			if (filter.method) {
				// Filter by HTTP method
				results = results.filter(req =>
					req.method.toUpperCase() === filter.method?.toUpperCase()
				);
			}

			if (filter.status) {
				// Filter by status code
				results = results.filter(req =>
					req.status === filter.status
				);
			}
		}

		return results;
	}

	/**
	 * Get request by ID
	 *
	 * @param id - Request ID
	 * @returns Network request or null
	 */
	static getRequestById(id: string): NetworkRequest | null {
		return this.requests.find(req => req.id === id) || null;
	}

	/**
	 * Clear all captured requests
	 */
	static clear(): void {
		this.requests = [];
	}

	/**
	 * Get request count
	 */
	static getRequestCount(): number {
		return this.requests.length;
	}

	/**
	 * Get summary statistics
	 */
	static getSummary(): {
		totalRequests: number;
		methods: Record<string, number>;
		statusCodes: Record<number, number>;
		domains: Record<string, number>;
		} {
		const summary = {
			totalRequests: this.requests.length,
			methods: {} as Record<string, number>,
			statusCodes: {} as Record<number, number>,
			domains: {} as Record<string, number>
		};

		// Count by method
		for (const req of this.requests) {
			summary.methods[req.method] = (summary.methods[req.method] || 0) + 1;

			if (req.status) {
				summary.statusCodes[req.status] = (summary.statusCodes[req.status] || 0) + 1;
			}

			// Extract domain from URL
			try {
				const url = new URL(req.url);
				const domain = url.hostname;
				summary.domains[domain] = (summary.domains[domain] || 0) + 1;
			} catch (e) {
				// Invalid URL, skip
			}
		}

		return summary;
	}

	/**
	 * Export requests as JSON
	 *
	 * @param filter - Optional filter criteria
	 * @returns JSON string of requests
	 */
	static exportAsJson(filter?: NetworkFilter): string {
		const requests = this.getRequests(filter);
		return JSON.stringify(requests, null, 2);
	}

	/**
	 * Export requests as HAR (HTTP Archive format)
	 *
	 * HAR is a standard format for HTTP traffic
	 * Can be imported into Chrome DevTools, Charles, etc.
	 *
	 * @param filter - Optional filter criteria
	 * @returns HAR format JSON string
	 */
	static exportAsHar(filter?: NetworkFilter): string {
		const requests = this.getRequests(filter);

		// Create HAR format
		const har = {
			log: {
				version: "1.2",
				creator: {
					name: "mobilepixel",
					version: "1.0"
				},
				entries: requests.map(req => ({
					startedDateTime: new Date(req.timestamp).toISOString(),
					time: req.duration || 0,
					request: {
						method: req.method,
						url: req.url,
						httpVersion: "HTTP/1.1",
						headers: Object.entries(req.headers || {}).map(([name, value]) => ({
							name,
							value
						})),
						queryString: [],
						cookies: [],
						headersSize: -1,
						bodySize: req.body?.length || 0,
						postData: req.body ? {
							mimeType: req.headers["content-type"] || "application/json",
							text: req.body
						} : undefined
					},
					response: {
						status: req.status || 0,
						statusText: req.statusText || "",
						httpVersion: "HTTP/1.1",
						headers: Object.entries(req.responseHeaders || {}).map(([name, value]) => ({
							name,
							value
						})),
						cookies: [],
						content: {
							size: req.size || 0,
							mimeType: req.responseHeaders?.["content-type"] || "application/json",
							text: req.responseBody || ""
						},
						redirectURL: "",
						headersSize: -1,
						bodySize: req.size || 0
					},
					cache: {},
					timings: {
						send: 0,
						wait: req.duration || 0,
						receive: 0
					}
				}))
			}
		};

		return JSON.stringify(har, null, 2);
	}
}
