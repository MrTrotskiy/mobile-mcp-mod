/**
 * AI Helper Functions for MobilePixel MCP
 *
 * This module provides smart helper functions that make it easy for AI agents
 * to interact with mobile applications correctly.
 *
 * KEY PRINCIPLE: Always use Accessibility API coordinates, not visual coordinates!
 */

import { Robot, ScreenElement } from "./robot";

// ============================================================================
// CORE HELPER FUNCTIONS - Use these for reliable mobile interaction
// ============================================================================

/**
 * Click on element by its label (accessibility label)
 * This is the RECOMMENDED way to click elements!
 *
 * @example
 * await clickElementByLabel(robot, "Home");
 * await clickElementByLabel(robot, "Settings");
 */
export async function clickElementByLabel(
	robot: Robot,
	label: string,
	exact: boolean = false
): Promise<boolean> {
	const elements = await robot.getElementsOnScreen();

	const element = elements.find((el: ScreenElement) => {
		if (!el.label) {
			return false;
		}
		return exact
			? el.label === label
			: el.label.toLowerCase().includes(label.toLowerCase());
	});

	if (!element) {
		throw new Error(`Element with label "${label}" not found`);
	}

	// Calculate CENTER coordinates from accessibility bounds
	const centerX = element.rect.x + element.rect.width / 2;
	const centerY = element.rect.y + element.rect.height / 2;

	await robot.tap(centerX, centerY);
	return true;
}

/**
 * Click on element by its text content
 * Use this when element has visible text
 *
 * @example
 * await clickElementByText(robot, "Login");
 * await clickElementByText(robot, "Submit");
 */
export async function clickElementByText(
	robot: Robot,
	text: string,
	exact: boolean = false
): Promise<boolean> {
	const elements = await robot.getElementsOnScreen();

	const element = elements.find((el: ScreenElement) => {
		if (!el.text) {
			return false;
		}
		return exact
			? el.text === text
			: el.text.toLowerCase().includes(text.toLowerCase());
	});

	if (!element) {
		throw new Error(`Element with text "${text}" not found`);
	}

	const centerX = element.rect.x + element.rect.width / 2;
	const centerY = element.rect.y + element.rect.height / 2;

	await robot.tap(centerX, centerY);
	return true;
}

/**
 * Smart click with multiple fallback strategies
 * Tries: label → text → identifier → type
 *
 * This is the SAFEST method for clicking unknown elements
 *
 * @example
 * await smartClick(robot, "Home");
 * await smartClick(robot, "Settings Button");
 */
export async function smartClick(
	robot: Robot,
	searchTerm: string
): Promise<boolean> {
	const elements = await robot.getElementsOnScreen();
	const searchLower = searchTerm.toLowerCase();

	// Strategy 1: Try to find by label
	let element = elements.find((el: ScreenElement) =>
		el.label?.toLowerCase().includes(searchLower)
	);

	// Strategy 2: Try to find by text
	if (!element) {
		element = elements.find((el: ScreenElement) =>
			el.text?.toLowerCase().includes(searchLower)
		);
	}

	// Strategy 3: Try to find by identifier
	if (!element) {
		element = elements.find((el: ScreenElement) =>
			el.identifier?.toLowerCase().includes(searchLower)
		);
	}

	// Strategy 4: Try to find by type
	if (!element) {
		element = elements.find((el: ScreenElement) =>
			el.type?.toLowerCase().includes(searchLower)
		);
	}

	if (!element) {
		throw new Error(`No element found matching "${searchTerm}"`);
	}

	const centerX = element.rect.x + element.rect.width / 2;
	const centerY = element.rect.y + element.rect.height / 2;

	await robot.tap(centerX, centerY);
	return true;
}

/**
 * Wait for element to appear, then click it
 * Useful for elements that load dynamically
 *
 * @example
 * await waitAndClick(robot, "Login Button", 5000);
 */
export async function waitAndClick(
	robot: Robot,
	searchTerm: string,
	timeoutMs: number = 5000
): Promise<boolean> {
	const startTime = Date.now();

	while (Date.now() - startTime < timeoutMs) {
		try {
			await smartClick(robot, searchTerm);
			return true;
		} catch (error) {
			// Element not found yet, wait and retry
			await new Promise(resolve => setTimeout(resolve, 500));
		}
	}

	throw new Error(`Element "${searchTerm}" did not appear within ${timeoutMs}ms`);
}

/**
 * Get element center coordinates from accessibility tree
 * USE THIS instead of guessing coordinates!
 *
 * @example
 * const coords = await getElementCenter(robot, "Home");
 * await robot.tap(coords.x, coords.y);
 */
export async function getElementCenter(
	robot: Robot,
	searchTerm: string
): Promise<{ x: number; y: number }> {
	const elements = await robot.getElementsOnScreen();
	const searchLower = searchTerm.toLowerCase();

	const element = elements.find((el: ScreenElement) =>
		el.label?.toLowerCase().includes(searchLower) ||
		el.text?.toLowerCase().includes(searchLower) ||
		el.identifier?.toLowerCase().includes(searchLower)
	);

	if (!element) {
		throw new Error(`Element "${searchTerm}" not found`);
	}

	return {
		x: element.rect.x + element.rect.width / 2,
		y: element.rect.y + element.rect.height / 2
	};
}

/**
 * Find element by any property (label, text, identifier, type)
 * Returns the element object with full details
 *
 * @example
 * const homeButton = await findElement(robot, "Home");
 * console.log(homeButton.rect); // { x: 0, y: 2076, width: 216, height: 90 }
 */
export async function findElement(
	robot: Robot,
	searchTerm: string
): Promise<ScreenElement | null> {
	const elements = await robot.getElementsOnScreen();
	const searchLower = searchTerm.toLowerCase();

	return elements.find((el: ScreenElement) =>
		el.label?.toLowerCase().includes(searchLower) ||
		el.text?.toLowerCase().includes(searchLower) ||
		el.identifier?.toLowerCase().includes(searchLower) ||
		el.type?.toLowerCase().includes(searchLower)
	) || null;
}

/**
 * Check if element exists on screen
 *
 * @example
 * if (await elementExists(robot, "Login")) {
 *   console.log("User is on login screen");
 * }
 */
export async function elementExists(
	robot: Robot,
	searchTerm: string
): Promise<boolean> {
	const element = await findElement(robot, searchTerm);
	return element !== null;
}

/**
 * Get all elements matching a search term
 * Useful when multiple elements have similar labels
 *
 * @example
 * const buttons = await findAllElements(robot, "button");
 * console.log(`Found ${buttons.length} buttons`);
 */
export async function findAllElements(
	robot: Robot,
	searchTerm: string
): Promise<ScreenElement[]> {
	const elements = await robot.getElementsOnScreen();
	const searchLower = searchTerm.toLowerCase();

	return elements.filter((el: ScreenElement) =>
		el.label?.toLowerCase().includes(searchLower) ||
		el.text?.toLowerCase().includes(searchLower) ||
		el.identifier?.toLowerCase().includes(searchLower) ||
		el.type?.toLowerCase().includes(searchLower)
	);
}

// ============================================================================
// NAVIGATION HELPERS - Common navigation patterns
// ============================================================================

/**
 * Click navigation bar button (Home, Tools, Settings, etc.)
 * Automatically handles bottom navigation bars
 *
 * @example
 * await clickNavButton(robot, "Home");
 * await clickNavButton(robot, "Settings");
 */
export async function clickNavButton(
	robot: Robot,
	buttonName: string
): Promise<boolean> {
	// Navigation buttons are usually at the bottom
	// They have label matching the button name
	return await clickElementByLabel(robot, buttonName);
}

/**
 * Click dialog button (OK, Cancel, Close, etc.)
 *
 * @example
 * await clickDialogButton(robot, "OK");
 * await clickDialogButton(robot, "Cancel");
 */
export async function clickDialogButton(
	robot: Robot,
	buttonText: string
): Promise<boolean> {
	// Dialog buttons usually have text property
	return await clickElementByText(robot, buttonText);
}

// ============================================================================
// BEST PRACTICES FOR AI AGENTS
// ============================================================================

/**
 * CRITICAL RULES FOR AI AGENTS:
 *
 * 1. ALWAYS use getElementsOnScreen() to get coordinates
 *    ❌ BAD:  robot.tap(100, 1400)  // Guessing coordinates
 *    ✅ GOOD: clickElementByLabel(robot, "Home")
 *
 * 2. NEVER use visual coordinates from screenshots
 *    Visual coordinates != Accessibility API coordinates
 *    Screenshots can be scaled, accessibility tree is always accurate
 *
 * 3. Calculate CENTER of element, not edges
 *    centerX = rect.x + rect.width / 2
 *    centerY = rect.y + rect.height / 2
 *
 * 4. Use smart helper functions instead of manual taps
 *    ✅ smartClick(robot, "Login")
 *    ❌ robot.tap(540, 1234)
 *
 * 5. Always check if element exists before clicking
 *    if (await elementExists(robot, "Login")) { ... }
 *
 * 6. For dialogs, wait for them to appear in accessibility tree
 *    await waitAndClick(robot, "OK", 3000);
 *
 * 7. Use exact matching when you know exact label/text
 *    await clickElementByLabel(robot, "Home", true); // exact = true
 */

export const AI_BEST_PRACTICES = {
	ALWAYS: [
		"Use getElementsOnScreen() to get accurate coordinates",
		"Calculate center of elements: x + width/2, y + height/2",
		"Use helper functions (smartClick, clickElementByLabel)",
		"Wait for dialogs to appear in accessibility tree",
		"Check element exists before interacting"
	],
	NEVER: [
		"Guess coordinates from screenshots",
		"Use visual coordinates",
		"Click on element edges",
		"Assume element positions",
		"Skip getElementsOnScreen() call"
	]
};
