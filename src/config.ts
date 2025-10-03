/**
 * Timeout configuration for mobile operations
 *
 * Different operations have different timeout requirements:
 * - Fast: Quick UI actions (tap, sendKeys, pressButton)
 * - Medium: Screen queries and connections (screenshots, elements)
 * - Slow: Heavy operations (app launch, orientation change)
 *
 * Shorter timeouts = faster failure detection
 * Longer timeouts = more reliable for slow devices
 */
export const TIMEOUTS = {
	// Quick operations: tap, sendKeys, pressButton
	// These should complete in under a second on normal devices
	fast: 5000,

	// Medium operations: screenshots, getElements, WDA connection
	// These involve network or device queries
	medium: 15000,

	// Slow operations: launchApp, orientation, adb/simctl commands
	// These may involve process spawning or system changes
	slow: 30000,

	// WebDriverAgent startup timeout
	// WDA needs time to launch and initialize
	wdaStart: 10000,

	// Default waitFor condition timeout
	// How long to wait for an element to appear/disappear
	waitFor: 5000,

	// Session connection timeout
	// Time to establish WebDriver session
	sessionConnection: 10000,
};

/**
 * Duration configuration for animations and gestures
 * These are NOT timeouts, but animation durations
 */
export const DURATIONS = {
	// Swipe gesture animation duration
	// Determines how fast the swipe moves across the screen
	swipe: 1000,

	// Long press gesture duration
	// How long to hold before releasing
	longPress: 500,
};

/**
 * Buffer sizes for command execution
 */
export const BUFFERS = {
	// Maximum buffer size for adb/simctl output (4MB)
	// Used for screenshots and large XML dumps
	maxBuffer: 1024 * 1024 * 4,
};
