/**
 * Smart waiting conditions for mobile automation
 * Similar to Playwright's waiting mechanisms
 */

import { ScreenElement } from "./robot";
import { TIMEOUTS } from "./config";

/**
 * Element selector for waiting
 */
export interface ElementSelector {
	label?: string;      // Accessibility label
	text?: string;       // Text content
	type?: string;       // Element type (Button, TextField, etc)
	identifier?: string; // Resource ID / identifier
}

/**
 * Wait condition types
 */
export type WaitConditionType =
	| "element_visible"      // Wait for element to appear
	| "element_hidden"       // Wait for element to disappear
	| "element_enabled"      // Wait for element to be enabled
	| "time";               // Wait for fixed time (fallback)

/**
 * Wait condition configuration
 */
export interface WaitCondition {
	type: WaitConditionType;
	element?: ElementSelector;
	timeout?: number;        // Maximum wait time in ms (default: 5000)
	pollInterval?: number;   // Check interval in ms (default: 100)
	timeMs?: number;        // For type="time" - how long to wait
}

/**
 * Result of wait operation
 */
export interface WaitResult {
	success: boolean;
	element?: ScreenElement;
	timeElapsed: number;
	error?: string;
}

/**
 * Default wait configuration
 * Uses centralized timeout from config
 */
export const DEFAULT_WAIT_CONFIG = {
	timeout: TIMEOUTS.waitFor,  // From config (default: 5 seconds)
	pollInterval: 100,           // Check every 100ms
	maxPollInterval: 1000,       // Max interval for exponential backoff
};

/**
 * Check if element matches selector
 */
export function elementMatches(element: ScreenElement, selector: ElementSelector): boolean {
	// Check label match
	if (selector.label !== undefined) {
		if (element.label?.includes(selector.label) === false) {
			return false;
		}
	}

	// Check text match
	if (selector.text !== undefined) {
		if (element.text?.includes(selector.text) === false) {
			return false;
		}
	}

	// Check type match
	if (selector.type !== undefined) {
		if (element.type !== selector.type) {
			return false;
		}
	}

	// Check identifier match
	if (selector.identifier !== undefined) {
		if (element.identifier !== selector.identifier) {
			return false;
		}
	}

	return true;
}

/**
 * Find element in array that matches selector
 */
export function findElement(elements: ScreenElement[], selector: ElementSelector): ScreenElement | undefined {
	return elements.find(el => elementMatches(el, selector));
}

/**
 * Calculate next poll interval with exponential backoff
 */
export function getNextPollInterval(currentInterval: number, maxInterval: number = DEFAULT_WAIT_CONFIG.maxPollInterval): number {
	const nextInterval = currentInterval * 1.5;
	return Math.min(nextInterval, maxInterval);
}

/**
 * Sleep for specified time
 */
export function sleep(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Wait implementation helper
 * Used by Robot implementations
 */
export async function waitForCondition(
	condition: WaitCondition,
	checkFn: () => Promise<ScreenElement[]>
): Promise<WaitResult> {
	const timeout = condition.timeout ?? DEFAULT_WAIT_CONFIG.timeout;
	const startTime = Date.now();

	// Handle simple time-based wait
	if (condition.type === "time") {
		const waitTime = condition.timeMs ?? 1000;
		await sleep(waitTime);
		return {
			success: true,
			timeElapsed: waitTime,
		};
	}

	// Element-based conditions require selector
	if (!condition.element) {
		return {
			success: false,
			timeElapsed: 0,
			error: "Element selector is required for element-based conditions",
		};
	}

	let pollInterval = condition.pollInterval ?? DEFAULT_WAIT_CONFIG.pollInterval;

	// Poll until condition is met or timeout
	while (Date.now() - startTime < timeout) {
		try {
			const elements = await checkFn();
			const element = findElement(elements, condition.element);

			switch (condition.type) {
				case "element_visible":
					if (element) {
						return {
							success: true,
							element,
							timeElapsed: Date.now() - startTime,
						};
					}
					break;

				case "element_hidden":
					if (!element) {
						return {
							success: true,
							timeElapsed: Date.now() - startTime,
						};
					}
					break;

				case "element_enabled":
					if (element && !element.focused) {
						// Element exists and not focused (enabled)
						return {
							success: true,
							element,
							timeElapsed: Date.now() - startTime,
						};
					}
					break;
			}
		} catch (error) {
			// Ignore errors during polling, continue waiting
		}

		// Wait before next check with exponential backoff
		await sleep(pollInterval);
		pollInterval = getNextPollInterval(pollInterval);
	}

	// Timeout reached
	return {
		success: false,
		timeElapsed: Date.now() - startTime,
		error: `Timeout waiting for condition: ${condition.type}`,
	};
}
