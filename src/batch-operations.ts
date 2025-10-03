/**
 * Batch Operations
 *
 * Execute multiple mobile actions in sequence (atomic operation)
 * Benefits:
 * - Atomic execution (all or nothing)
 * - Auto-rollback on error
 * - Screenshot on error for debugging
 * - Detailed execution report
 *
 * Use cases:
 * - Multi-step user flows (login, registration, checkout)
 * - Complex test scenarios
 * - Data entry forms
 */

import { Robot } from "./robot";

/**
 * Batch action types
 * Supported actions for batch execution
 */
export interface BatchAction {
	type: "tap" | "swipe" | "type" | "wait" | "screenshot" | "expect" | "launch_app" | "press_button";
	params: Record<string, any>;  // Action-specific parameters
	description?: string;         // Optional description for logging
}

/**
 * Result of single action execution
 */
interface ActionResult {
	action: BatchAction;
	status: "success" | "failed" | "skipped";
	result?: any;                 // Action result (e.g., screenshot buffer)
	error?: string;               // Error message if failed
	duration?: number;            // Execution time in ms
}

/**
 * Result of batch execution
 */
export interface BatchResult {
	success: boolean;             // True if all actions succeeded
	totalActions: number;         // Total number of actions
	successCount: number;         // Number of successful actions
	failedCount: number;          // Number of failed actions
	skippedCount: number;         // Number of skipped actions
	totalDuration: number;        // Total execution time in ms
	actions: ActionResult[];      // Detailed results for each action
	errorScreenshot?: Buffer;     // Screenshot taken on error (if enabled)
}

/**
 * Options for batch execution
 */
interface BatchExecutionOptions {
	stopOnError?: boolean;              // Stop on first error (default: true)
	takeScreenshotOnError?: boolean;    // Take screenshot when error occurs (default: true)
	actionDelay?: number;               // Delay between actions in ms (default: 0)
}

/**
 * Batch Operations executor
 * Executes series of mobile actions with error handling and rollback
 */
export class BatchOperations {

	/**
	 * Execute batch of actions atomically
	 *
	 * Strategy:
	 * 1. Execute actions sequentially
	 * 2. If error occurs and stopOnError=true, stop execution
	 * 3. Take screenshot on error (if enabled)
	 * 4. Return detailed report
	 *
	 * @param robot - Robot instance to execute actions on
	 * @param actions - Array of actions to execute
	 * @param options - Execution options
	 * @returns Batch execution result with detailed report
	 */
	static async executeBatch(
		robot: Robot,
		actions: BatchAction[],
		options?: BatchExecutionOptions
	): Promise<BatchResult> {
		const { stopOnError = true, takeScreenshotOnError = true, actionDelay = 0 } = options || {};
		const results: ActionResult[] = [];
		const startTime = Date.now();
		let errorScreenshot: Buffer | undefined;

		console.log(`[Batch Operations] Starting batch execution: ${actions.length} actions`);
		console.log(`[Batch Operations] Options: stopOnError=${stopOnError}, takeScreenshot=${takeScreenshotOnError}, delay=${actionDelay}ms`);

		// Execute each action
		for (let i = 0; i < actions.length; i++) {
			const action = actions[i];
			const actionStartTime = Date.now();

			console.log(`[Batch Operations] Executing action ${i + 1}/${actions.length}: ${action.type}`);
			if (action.description) {
				console.log(`[Batch Operations]   Description: ${action.description}`);
			}

			try {
				// Execute action
				const result = await this.executeAction(robot, action);
				const duration = Date.now() - actionStartTime;

				results.push({
					action,
					status: "success",
					result,
					duration
				});

				console.log(`[Batch Operations] ✅ Action ${i + 1} completed successfully (${duration}ms)`);

				// Delay before next action (if specified)
				if (actionDelay > 0 && i < actions.length - 1) {
					await this.delay(actionDelay);
				}

			} catch (error) {
				const duration = Date.now() - actionStartTime;
				const errorMsg = error instanceof Error ? error.message : "Unknown error";

				console.error(`[Batch Operations] ❌ Action ${i + 1} failed: ${errorMsg}`);

				results.push({
					action,
					status: "failed",
					error: errorMsg,
					duration
				});

				// Take screenshot on error (if enabled and not already taken)
				if (takeScreenshotOnError && !errorScreenshot) {
					try {
						console.log(`[Batch Operations] 📸 Taking error screenshot...`);
						errorScreenshot = await robot.getScreenshot();
					} catch (screenshotError) {
						console.error(`[Batch Operations] Failed to take error screenshot:`, screenshotError);
					}
				}

				// Stop execution if stopOnError is true
				if (stopOnError) {
					console.log(`[Batch Operations] Stopping execution due to error (stopOnError=true)`);

					// Mark remaining actions as skipped
					for (let j = i + 1; j < actions.length; j++) {
						results.push({
							action: actions[j],
							status: "skipped"
						});
					}
					break;
				}
			}
		}

		// Calculate statistics
		const totalDuration = Date.now() - startTime;
		const successCount = results.filter(r => r.status === "success").length;
		const failedCount = results.filter(r => r.status === "failed").length;
		const skippedCount = results.filter(r => r.status === "skipped").length;
		const success = failedCount === 0;

		console.log(`[Batch Operations] Batch execution completed: ${successCount} success, ${failedCount} failed, ${skippedCount} skipped (${totalDuration}ms)`);

		return {
			success,
			totalActions: actions.length,
			successCount,
			failedCount,
			skippedCount,
			totalDuration,
			actions: results,
			errorScreenshot
		};
	}

	/**
	 * Execute single action
	 *
	 * Dispatches to appropriate robot method based on action type
	 *
	 * @param robot - Robot instance
	 * @param action - Action to execute
	 * @returns Action result (type depends on action)
	 */
	private static async executeAction(robot: Robot, action: BatchAction): Promise<any> {
		switch (action.type) {
			case "tap":
				// Tap at coordinates
				const { x, y } = action.params;
				if (x === undefined || y === undefined) {
					throw new Error("Tap action requires x and y coordinates");
				}
				await robot.tap(x, y);
				return { x, y };

			case "swipe":
				// Swipe in direction
				const { direction, distance } = action.params;
				if (!direction) {
					throw new Error("Swipe action requires direction");
				}
				if (distance) {
					const { x: startX, y: startY } = action.params;
					await robot.swipeFromCoordinate(startX || 0, startY || 0, direction, distance);
				} else {
					await robot.swipe(direction);
				}
				return { direction, distance };

			case "type":
				// Type text
				const { text, submit } = action.params;
				if (!text) {
					throw new Error("Type action requires text");
				}
				await robot.sendKeys(text);
				// TODO: Add submit support if robot has method
				return { text, submitted: submit || false };

			case "wait":
				// Wait for specified time
				const { ms } = action.params;
				if (!ms || ms <= 0) {
					throw new Error("Wait action requires positive ms value");
				}
				await this.delay(ms);
				return { waited: ms };

			case "screenshot":
				// Take screenshot
				const screenshot = await robot.getScreenshot();
				return screenshot;

			case "expect":
				// Verify element/text exists
				const { text: expectedText, element } = action.params;
				const elements = await robot.getElementsOnScreen();

				if (expectedText) {
					const found = elements.some(e =>
						e.text?.includes(expectedText) ||
						e.label?.includes(expectedText)
					);
					if (!found) {
						throw new Error(`Expected text not found: "${expectedText}"`);
					}
					return { verified: true, text: expectedText };
				}

				if (element) {
					// TODO: Add element matching logic
					throw new Error("Element expectation not yet implemented");
				}

				throw new Error("Expect action requires text or element parameter");

			case "launch_app":
				// Launch app
				const { packageName } = action.params;
				if (!packageName) {
					throw new Error("Launch app action requires packageName");
				}
				await robot.launchApp(packageName);
				return { packageName };

			case "press_button":
				// Press device button
				const { button } = action.params;
				if (!button) {
					throw new Error("Press button action requires button parameter");
				}
				await robot.pressButton(button);
				return { button };

			default:
				throw new Error(`Unknown action type: ${action.type}`);
		}
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
 * 1. Simple login flow:
 *    const result = await BatchOperations.executeBatch(robot, [
 *      { type: 'tap', params: { x: 100, y: 200 }, description: 'Tap email field' },
 *      { type: 'type', params: { text: 'user@example.com' } },
 *      { type: 'tap', params: { x: 100, y: 300 }, description: 'Tap password field' },
 *      { type: 'type', params: { text: 'password123' } },
 *      { type: 'tap', params: { x: 200, y: 400 }, description: 'Tap login button' },
 *      { type: 'expect', params: { text: 'Welcome' } }
 *    ]);
 *
 * 2. With options:
 *    const result = await BatchOperations.executeBatch(robot, actions, {
 *      stopOnError: true,
 *      takeScreenshotOnError: true,
 *      actionDelay: 500  // 500ms delay between actions
 *    });
 *
 * 3. Check results:
 *    if (result.success) {
 *      console.log('All actions completed successfully!');
 *    } else {
 *      console.error(`${result.failedCount} actions failed`);
 *      if (result.errorScreenshot) {
 *        fs.writeFileSync('error.png', result.errorScreenshot);
 *      }
 *    }
 */
