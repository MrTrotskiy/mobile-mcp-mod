/**
 * Loading State Detector
 *
 * Automatically detects when loading completes by comparing screenshots
 * Useful for waiting for dynamic content, animations, or async data
 *
 * Strategy:
 * 1. Take screenshots at intervals
 * 2. Compare consecutive screenshots
 * 3. When screen is stable (no changes) for specified time, loading is complete
 *
 * Use cases:
 * - Wait for API responses
 * - Wait for animations to complete
 * - Wait for dynamic content to load
 * - Detect when page is fully rendered
 */

import { Robot } from "./robot";
import sharp from "sharp";

/**
 * Options for loading detection
 */
interface LoadingDetectionOptions {
	timeout?: number;          // Maximum wait time in ms (default: 10000)
	pollInterval?: number;     // Check interval in ms (default: 500)
	stabilityTime?: number;    // Screen must be stable for N ms (default: 1000)
	similarityThreshold?: number; // Similarity threshold 0-1 (default: 0.95)
}

/**
 * Result of loading detection
 */
interface LoadingDetectionResult {
	completed: boolean;        // True if loading completed
	duration: number;          // Time taken in ms
	reason: string;            // Reason for completion/timeout
	screenshotCount: number;   // Number of screenshots taken
}

/**
 * Loading State Detector
 *
 * Detects when screen loading/animation completes
 */
export class LoadingDetector {

	/**
	 * Wait for loading to complete
	 *
	 * Takes screenshots at intervals and compares them
	 * When screen is stable (similar screenshots) for specified time, considers loading complete
	 *
	 * @param robot - Robot instance to use
	 * @param options - Detection options
	 * @returns Detection result
	 */
	static async waitForLoading(
		robot: Robot,
		options?: LoadingDetectionOptions
	): Promise<LoadingDetectionResult> {
		const {
			timeout = 10000,
			pollInterval = 500,
			stabilityTime = 1000,
			similarityThreshold = 0.95
		} = options || {};

		console.error(`[Loading Detector] Starting detection (timeout: ${timeout}ms, interval: ${pollInterval}ms, stability: ${stabilityTime}ms)`);

		const startTime = Date.now();
		let lastScreenshot: Buffer | null = null;
		let stableStart: number | null = null;
		let screenshotCount = 0;

		while (Date.now() - startTime < timeout) {
			// Take screenshot
			const currentScreenshot = await robot.getScreenshot();
			screenshotCount++;

			if (lastScreenshot) {
				// Compare with previous screenshot
				const similarity = await this.compareScreenshots(lastScreenshot, currentScreenshot);

				console.error(`[Loading Detector] Screenshot ${screenshotCount} similarity: ${(similarity * 100).toFixed(2)}%`);

				if (similarity >= similarityThreshold) {
					// Screen is stable (similar to previous)
					if (!stableStart) {
						// Start stability timer
						stableStart = Date.now();
						console.error(`[Loading Detector] Screen stable, starting stability timer...`);
					} else {
						// Check if stable for required time
						const stableDuration = Date.now() - stableStart;

						if (stableDuration >= stabilityTime) {
							// Loading complete!
							const totalDuration = Date.now() - startTime;
							console.error(`[Loading Detector] ✅ Loading complete after ${totalDuration}ms (${screenshotCount} screenshots)`);

							return {
								completed: true,
								duration: totalDuration,
								reason: `Screen stable for ${stableDuration}ms`,
								screenshotCount
							};
						} else {
							console.error(`[Loading Detector] Still stable (${stableDuration}/${stabilityTime}ms)`);
						}
					}
				} else {
					// Screen changed, reset stability timer
					if (stableStart) {
						console.error(`[Loading Detector] Screen changed, resetting stability timer`);
					}
					stableStart = null;
				}
			}

			// Save current screenshot for next comparison
			lastScreenshot = currentScreenshot;

			// Wait before next check
			await this.delay(pollInterval);
		}

		// Timeout reached
		const totalDuration = Date.now() - startTime;
		console.error(`[Loading Detector] ⏱️ Timeout reached after ${totalDuration}ms (${screenshotCount} screenshots)`);

		return {
			completed: false,
			duration: totalDuration,
			reason: `Timeout after ${totalDuration}ms`,
			screenshotCount
		};
	}

	/**
	 * Compare two screenshots and return similarity score
	 *
	 * Uses pixel-by-pixel comparison
	 * Returns value from 0 (completely different) to 1 (identical)
	 *
	 * @param img1 - First screenshot buffer
	 * @param img2 - Second screenshot buffer
	 * @returns Similarity score (0-1)
	 */
	private static async compareScreenshots(img1: Buffer, img2: Buffer): Promise<number> {
		try {
			// Get raw pixel data from both images
			const [img1Data, img2Data] = await Promise.all([
				sharp(img1).raw().toBuffer({ resolveWithObject: true }),
				sharp(img2).raw().toBuffer({ resolveWithObject: true })
			]);

			// Check if images have same dimensions
			if (img1Data.info.width !== img2Data.info.width ||
				img1Data.info.height !== img2Data.info.height) {
				console.warn(`[Loading Detector] Screenshot size mismatch: ${img1Data.info.width}x${img1Data.info.height} vs ${img2Data.info.width}x${img2Data.info.height}`);
				return 0; // Different sizes = different screens
			}

			// Compare pixel data
			const buffer1 = img1Data.data;
			const buffer2 = img2Data.data;

			if (buffer1.length !== buffer2.length) {
				return 0;
			}

			// Calculate pixel difference
			let totalDiff = 0;
			const channels = img1Data.info.channels; // Number of channels (RGB = 3, RGBA = 4)

			// Compare each pixel
			for (let i = 0; i < buffer1.length; i += channels) {
				// Calculate difference for each channel (R, G, B)
				for (let c = 0; c < Math.min(3, channels); c++) {
					const diff = Math.abs(buffer1[i + c] - buffer2[i + c]);
					totalDiff += diff;
				}
			}

			// Calculate similarity score
			// Maximum possible difference per pixel per channel is 255
			const maxDiff = (buffer1.length / channels) * 255 * 3; // pixels * channels * max_value
			const similarity = 1 - (totalDiff / maxDiff);

			return similarity;

		} catch (error) {
			console.error(`[Loading Detector] Screenshot comparison failed:`, error);
			// On error, assume screens are different
			return 0;
		}
	}

	/**
	 * Simple delay helper
	 */
	private static delay(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	/**
	 * Wait for specific element to appear (loading indicator disappears)
	 *
	 * Alternative approach: wait for element to appear/disappear
	 * More reliable than screenshot comparison for known loading indicators
	 *
	 * @param robot - Robot instance
	 * @param elementText - Text of loading indicator (e.g., "Loading...", "Please wait")
	 * @param waitForDisappear - If true, waits for element to disappear (default: true)
	 * @param timeout - Maximum wait time in ms (default: 10000)
	 */
	static async waitForElement(
		robot: Robot,
		elementText: string,
		waitForDisappear: boolean = true,
		timeout: number = 10000
	): Promise<LoadingDetectionResult> {
		console.error(`[Loading Detector] Waiting for element "${elementText}" to ${waitForDisappear ? "disappear" : "appear"}`);

		const startTime = Date.now();
		const pollInterval = 500;
		let checksCount = 0;

		while (Date.now() - startTime < timeout) {
			checksCount++;

			// Get elements on screen
			const elements = await robot.getElementsOnScreen();

			// Check if element exists
			const elementExists = elements.some(e =>
				e.text?.includes(elementText) ||
				e.label?.includes(elementText)
			);

			const conditionMet = waitForDisappear ? !elementExists : elementExists;

			if (conditionMet) {
				const duration = Date.now() - startTime;
				console.error(`[Loading Detector] ✅ Element condition met after ${duration}ms`);

				return {
					completed: true,
					duration,
					reason: `Element "${elementText}" ${waitForDisappear ? "disappeared" : "appeared"}`,
					screenshotCount: checksCount
				};
			}

			// Wait before next check
			await this.delay(pollInterval);
		}

		// Timeout
		const duration = Date.now() - startTime;
		console.error(`[Loading Detector] ⏱️ Timeout: element condition not met after ${duration}ms`);

		return {
			completed: false,
			duration,
			reason: `Timeout waiting for element "${elementText}"`,
			screenshotCount: checksCount
		};
	}
}

/**
 * Usage Examples:
 *
 * 1. Wait for loading to complete (screenshot comparison):
 *    const result = await LoadingDetector.waitForLoading(robot, {
 *      timeout: 10000,
 *      stabilityTime: 1000,
 *      similarityThreshold: 0.95
 *    });
 *    if (result.completed) {
 *      console.log('Loading complete!');
 *    }
 *
 * 2. Wait for loading indicator to disappear:
 *    const result = await LoadingDetector.waitForElement(
 *      robot,
 *      'Loading...',
 *      true,  // wait for disappear
 *      10000  // timeout
 *    );
 *
 * 3. Wait for element to appear:
 *    const result = await LoadingDetector.waitForElement(
 *      robot,
 *      'Welcome',
 *      false,  // wait for appear
 *      5000
 *    );
 */
