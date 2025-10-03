/**
 * Assertions class for mobile testing
 *
 * Purpose: Provides Playwright-like assertions for mobile apps
 * Makes tests more readable and maintainable
 *
 * Examples:
 * - expectElementVisible("login button")
 * - expectTextContains("Welcome")
 * - expectElementEnabled("submit button")
 */

import { Robot } from "./robot";
import { AIElementFinder } from "./ai-element-finder";

export interface AssertionResult {
	success: boolean;
	message: string;
	actualValue?: any;
	expectedValue?: any;
}

/**
 * Assertions class provides test assertions for mobile apps
 *
 * Similar to Playwright's expect() but for mobile
 */
export class Assertions {
	constructor(private robot: Robot) {}

	/**
	 * Assert that element with description exists and is visible
	 *
	 * @param description - Natural language description of element
	 * @param timeout - Timeout in milliseconds (default: 5000)
	 * @returns Assertion result
	 */
	async expectElementVisible(
		description: string,
		timeout: number = 5000
	): Promise<AssertionResult> {
		const startTime = Date.now();

		// Poll for element
		while (Date.now() - startTime < timeout) {
			const elements = await this.robot.getElementsOnScreen();
			const match = AIElementFinder.findElementByDescription(elements, description, 50);

			if (match) {
				return {
					success: true,
					message: `Element "${description}" is visible (confidence: ${match.score}%)`,
					actualValue: "visible"
				};
			}

			// Wait before retry
			await new Promise(resolve => setTimeout(resolve, 500));
		}

		return {
			success: false,
			message: `Expected element "${description}" to be visible but was not found after ${timeout}ms`,
			actualValue: "not found",
			expectedValue: "visible"
		};
	}

	/**
	 * Assert that element with description does NOT exist
	 *
	 * @param description - Natural language description of element
	 * @param timeout - Timeout in milliseconds (default: 5000)
	 * @returns Assertion result
	 */
	async expectElementNotVisible(
		description: string,
		timeout: number = 5000
	): Promise<AssertionResult> {
		const startTime = Date.now();

		// Poll to ensure element stays invisible
		while (Date.now() - startTime < timeout) {
			const elements = await this.robot.getElementsOnScreen();
			const match = AIElementFinder.findElementByDescription(elements, description, 50);

			if (match) {
				return {
					success: false,
					message: `Expected element "${description}" to not be visible but it was found`,
					actualValue: "visible",
					expectedValue: "not visible"
				};
			}

			// Wait before retry
			await new Promise(resolve => setTimeout(resolve, 500));
		}

		return {
			success: true,
			message: `Element "${description}" is not visible`,
			actualValue: "not visible"
		};
	}

	/**
	 * Assert that screen contains specific text
	 *
	 * @param text - Text to search for
	 * @param timeout - Timeout in milliseconds (default: 5000)
	 * @returns Assertion result
	 */
	async expectTextVisible(
		text: string,
		timeout: number = 5000
	): Promise<AssertionResult> {
		const startTime = Date.now();
		const searchText = text.toLowerCase();

		while (Date.now() - startTime < timeout) {
			const elements = await this.robot.getElementsOnScreen();

			// Check if any element contains the text
			for (const element of elements) {
				const elementText = `${element.text || ""} ${element.label || ""} ${element.name || ""}`.toLowerCase();
				if (elementText.includes(searchText)) {
					return {
						success: true,
						message: `Text "${text}" is visible on screen`,
						actualValue: "visible"
					};
				}
			}

			// Wait before retry
			await new Promise(resolve => setTimeout(resolve, 500));
		}

		return {
			success: false,
			message: `Expected text "${text}" to be visible but was not found after ${timeout}ms`,
			actualValue: "not found",
			expectedValue: "visible"
		};
	}

	/**
	 * Assert that text is NOT visible on screen
	 *
	 * @param text - Text that should not be present
	 * @param timeout - Timeout in milliseconds (default: 5000)
	 * @returns Assertion result
	 */
	async expectTextNotVisible(
		text: string,
		timeout: number = 5000
	): Promise<AssertionResult> {
		const startTime = Date.now();
		const searchText = text.toLowerCase();

		while (Date.now() - startTime < timeout) {
			const elements = await this.robot.getElementsOnScreen();

			// Check if any element contains the text
			for (const element of elements) {
				const elementText = `${element.text || ""} ${element.label || ""} ${element.name || ""}`.toLowerCase();
				if (elementText.includes(searchText)) {
					return {
						success: false,
						message: `Expected text "${text}" to not be visible but it was found`,
						actualValue: "visible",
						expectedValue: "not visible"
					};
				}
			}

			// Wait before retry
			await new Promise(resolve => setTimeout(resolve, 500));
		}

		return {
			success: true,
			message: `Text "${text}" is not visible on screen`,
			actualValue: "not visible"
		};
	}

	/**
	 * Assert that element count matches expected count
	 *
	 * @param description - Natural language description
	 * @param expectedCount - Expected number of matching elements
	 * @param timeout - Timeout in milliseconds (default: 5000)
	 * @returns Assertion result
	 */
	async expectElementCount(
		description: string,
		expectedCount: number,
		timeout: number = 5000
	): Promise<AssertionResult> {
		const startTime = Date.now();

		while (Date.now() - startTime < timeout) {
			const elements = await this.robot.getElementsOnScreen();
			const matches = AIElementFinder.findAllMatchingElements(
				elements,
				description,
				50,
				100 // Get all matches
			);

			if (matches.length === expectedCount) {
				return {
					success: true,
					message: `Found ${expectedCount} elements matching "${description}"`,
					actualValue: matches.length,
					expectedValue: expectedCount
				};
			}

			// Wait before retry
			await new Promise(resolve => setTimeout(resolve, 500));
		}

		// Get final count for error message
		const elements = await this.robot.getElementsOnScreen();
		const matches = AIElementFinder.findAllMatchingElements(elements, description, 50, 100);

		return {
			success: false,
			message: `Expected ${expectedCount} elements matching "${description}" but found ${matches.length}`,
			actualValue: matches.length,
			expectedValue: expectedCount
		};
	}

	/**
	 * Assert that app is on specific screen (by checking for key elements)
	 *
	 * @param screenIdentifier - Text or element that identifies the screen
	 * @param timeout - Timeout in milliseconds (default: 5000)
	 * @returns Assertion result
	 */
	async expectOnScreen(
		screenIdentifier: string,
		timeout: number = 5000
	): Promise<AssertionResult> {
		// This is essentially the same as expectTextVisible or expectElementVisible
		// We check for the presence of the identifier
		const textResult = await this.expectTextVisible(screenIdentifier, timeout);

		if (textResult.success) {
			return {
				success: true,
				message: `On screen with "${screenIdentifier}"`,
				actualValue: "correct screen"
			};
		}

		const elementResult = await this.expectElementVisible(screenIdentifier, timeout);

		if (elementResult.success) {
			return {
				success: true,
				message: `On screen with "${screenIdentifier}"`,
				actualValue: "correct screen"
			};
		}

		return {
			success: false,
			message: `Expected to be on screen with "${screenIdentifier}" but could not find it`,
			actualValue: "unknown screen",
			expectedValue: `screen with "${screenIdentifier}"`
		};
	}

	/**
	 * Assert that URL contains specific text (for web apps)
	 *
	 * Note: This is a placeholder for web view testing
	 * Native apps don't have URLs
	 *
	 * @param urlPart - Part of URL to check for
	 * @returns Assertion result
	 */
	async expectUrlContains(urlPart: string): Promise<AssertionResult> {
		return {
			success: false,
			message: "URL assertions are not supported for native mobile apps. Use expectOnScreen instead.",
			actualValue: "native app",
			expectedValue: `url contains "${urlPart}"`
		};
	}
}
