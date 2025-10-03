/**
 * Robot Retry Helper
 *
 * Provides retry logic for robot actions (tap, swipe, etc.)
 * Improves reliability when first action attempt doesn't register
 *
 * Use cases:
 * - Tap didn't register (element still visible)
 * - Loading state caused miss
 * - Coordinate slightly off
 */

import { Robot } from "./robot";

/**
 * Retry options for robot actions
 */
interface RetryOptions {
	maxRetries?: number;           // Maximum retry attempts (default: 2)
	retryDelay?: number;           // Delay between retries in ms (default: 500)
	verifyAction?: () => Promise<boolean>;  // Optional verification function
}

/**
 * Robot Retry Helper class
 *
 * Provides wrapper methods with retry logic for common robot actions
 */
export class RobotRetryHelper {

	/**
	 * Tap with automatic retry logic
	 *
	 * Sometimes first tap doesn't register due to:
	 * - Loading states
	 * - Animation timing
	 * - Slightly off coordinates
	 *
	 * This method retries the tap if verification fails
	 *
	 * @param robot - Robot instance to use
	 * @param x - X coordinate to tap
	 * @param y - Y coordinate to tap
	 * @param options - Retry options
	 */
	static async tapWithRetry(
		robot: Robot,
		x: number,
		y: number,
		options?: RetryOptions
	): Promise<{ success: boolean; attempts: number; error?: string }> {
		const { maxRetries = 2, retryDelay = 500, verifyAction } = options || {};

		console.error(`[Robot Retry] Tapping at (${x}, ${y}) with up to ${maxRetries} retries`);

		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				// Attempt tap
				await robot.tap(x, y);
				console.error(`[Robot Retry] Tap attempt ${attempt}/${maxRetries} completed`);

				// If no verification function, assume success
				if (!verifyAction) {
					return { success: true, attempts: attempt };
				}

				// Wait a bit for UI to update
				await this.delay(300);

				// Verify action succeeded
				const verified = await verifyAction();

				if (verified) {
					console.error(`[Robot Retry] ✅ Tap verified successful after ${attempt} attempt(s)`);
					return { success: true, attempts: attempt };
				} else {
					console.error(`[Robot Retry] ⚠️ Tap verification failed, attempt ${attempt}/${maxRetries}`);

					// If not last attempt, wait before retry
					if (attempt < maxRetries) {
						await this.delay(retryDelay);
					}
				}

			} catch (error) {
				const errorMsg = error instanceof Error ? error.message : "Unknown error";
				console.error(`[Robot Retry] ❌ Tap attempt ${attempt} failed:`, errorMsg);

				// If last attempt, throw error
				if (attempt === maxRetries) {
					return { success: false, attempts: attempt, error: errorMsg };
				}

				// Wait before retry
				await this.delay(retryDelay);
			}
		}

		return { success: false, attempts: maxRetries, error: "Max retries reached" };
	}

	/**
	 * Swipe with retry logic
	 *
	 * Retries swipe if verification fails
	 *
	 * @param robot - Robot instance
	 * @param direction - Swipe direction
	 * @param options - Retry options
	 */
	static async swipeWithRetry(
		robot: Robot,
		direction: "up" | "down" | "left" | "right",
		options?: RetryOptions
	): Promise<{ success: boolean; attempts: number }> {
		const { maxRetries = 2, retryDelay = 500, verifyAction } = options || {};

		console.error(`[Robot Retry] Swiping ${direction} with up to ${maxRetries} retries`);

		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				await robot.swipe(direction);
				console.error(`[Robot Retry] Swipe attempt ${attempt}/${maxRetries} completed`);

				// If no verification, assume success
				if (!verifyAction) {
					return { success: true, attempts: attempt };
				}

				// Wait for UI to settle
				await this.delay(500);

				// Verify
				const verified = await verifyAction();
				if (verified) {
					console.error(`[Robot Retry] ✅ Swipe verified after ${attempt} attempt(s)`);
					return { success: true, attempts: attempt };
				} else {
					console.error(`[Robot Retry] ⚠️ Swipe verification failed, attempt ${attempt}/${maxRetries}`);
					if (attempt < maxRetries) {
						await this.delay(retryDelay);
					}
				}

			} catch (error) {
				console.error(`[Robot Retry] ❌ Swipe attempt ${attempt} failed:`, error);
				if (attempt < maxRetries) {
					await this.delay(retryDelay);
				}
			}
		}

		return { success: false, attempts: maxRetries };
	}

	/**
	 * Type text with retry logic
	 *
	 * Retries if text input fails
	 *
	 * @param robot - Robot instance
	 * @param text - Text to type
	 * @param options - Retry options
	 */
	static async typeWithRetry(
		robot: Robot,
		text: string,
		options?: RetryOptions
	): Promise<{ success: boolean; attempts: number }> {
		const { maxRetries = 2, retryDelay = 500 } = options || {};

		console.error(`[Robot Retry] Typing "${text}" with up to ${maxRetries} retries`);

		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				await robot.sendKeys(text);
				console.error(`[Robot Retry] ✅ Type attempt ${attempt} completed`);
				return { success: true, attempts: attempt };

			} catch (error) {
				console.error(`[Robot Retry] ❌ Type attempt ${attempt} failed:`, error);
				if (attempt < maxRetries) {
					await this.delay(retryDelay);
				}
			}
		}

		return { success: false, attempts: maxRetries };
	}

	/**
	 * Simple delay helper
	 */
	private static delay(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}
}

/**
 * Usage Examples:
 *
 * 1. Basic tap with retry (no verification):
 *    await RobotRetryHelper.tapWithRetry(robot, 100, 200);
 *
 * 2. Tap with verification:
 *    await RobotRetryHelper.tapWithRetry(robot, 100, 200, {
 *      maxRetries: 3,
 *      verifyAction: async () => {
 *        // Check if button is no longer visible (tap worked)
 *        const elements = await robot.getElementsOnScreen();
 *        return !elements.some(e => e.text === 'Login');
 *      }
 *    });
 *
 * 3. Swipe with retry:
 *    await RobotRetryHelper.swipeWithRetry(robot, 'up', {
 *      maxRetries: 2,
 *      retryDelay: 1000
 *    });
 */
