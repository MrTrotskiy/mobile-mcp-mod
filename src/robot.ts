import { WaitCondition, WaitResult } from "./wait-conditions";

export interface Dimensions {
	width: number;
	height: number;
}

export interface ScreenSize extends Dimensions {
	scale: number;
}

export interface InstalledApp {
	packageName: string;
	appName: string;
}

export type SwipeDirection = "up" | "down" | "left" | "right";

export type Button = "HOME" | "BACK" | "VOLUME_UP" | "VOLUME_DOWN" | "ENTER" | "DPAD_CENTER" | "DPAD_UP" | "DPAD_DOWN" | "DPAD_LEFT" | "DPAD_RIGHT";

export interface ScreenElementRect {
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface ScreenElement {
	type: string;
	label?: string;
	text?: string;
	name?: string;
	value?: string;
	identifier?: string;
	rect: ScreenElementRect;

	// currently only on android tv
	focused?: boolean;
}

export class ActionableError extends Error {
	constructor(message: string) {
		super(message);
	}
}

export type Orientation = "portrait" | "landscape";

export interface Robot {
	/**
	 * Get the screen size of the device in pixels.
	 */
	getScreenSize(): Promise<ScreenSize>;

	/**
	 * Swipe in a direction.
	 */
	swipe(direction: SwipeDirection): Promise<void>;

	/**
	 * Swipe from a specific coordinate in a direction.
	 */
	swipeFromCoordinate(x: number, y: number, direction: SwipeDirection, distance?: number): Promise<void>;

	/**
	 * Get a screenshot of the screen. Returns a Buffer that contains
	 * a PNG image of the screen. Will be same dimensions as getScreenSize().
	 */
	getScreenshot(): Promise<Buffer>;

	/**
	 * List all installed apps on the device. Returns an array of package names (or
	 * bundle identifiers in iOS) for all installed apps.
	 */
	listApps(): Promise<InstalledApp[]>;

	/**
	 * Launch an app.
	 */
	launchApp(packageName: string): Promise<void>;

	/**
	 * Terminate an app. If app was already terminated (or non existent) then this
	 * is a no-op.
	 */
	terminateApp(packageName: string): Promise<void>;

	/**
	 * Open a URL in the device's web browser. Can be an https:// url, or a
	 * custom scheme (e.g. "myapp://").
	 */
	openUrl(url: string): Promise<void>;

	/**
	 * Send keys to the device, simulating keyboard input.
	 */
	sendKeys(text: string): Promise<void>;

	/**
	 * Press a button on the device, simulating a physical button press.
	 */
	pressButton(button: Button): Promise<void>;

	/**
	 * Tap on a specific coordinate on the screen.
	 */
	tap(x: number, y: number): Promise<void>;

	/**
	 * Long press on a specific coordinate on the screen.
	 */
	longPress(x: number, y: number): Promise<void>;

	/**
	 * Get all elements on the screen. Works only on native apps (not webviews). Will
	 * return a filtered list of elements that make sense to interact with.
	 */
	getElementsOnScreen(): Promise<ScreenElement[]>;

	/**
	 * Change the screen orientation of the device.
	 * @param orientation The desired orientation ("portrait" or "landscape")
	 */
	setOrientation(orientation: Orientation): Promise<void>;

	/**
	 * Get the current screen orientation.
	 */
	getOrientation(): Promise<Orientation>;

	/**
	 * Wait for a condition to be met (smart waiting like Playwright)
	 * Examples:
	 * - Wait for element to appear: { type: "element_visible", element: { label: "Submit" } }
	 * - Wait for element to disappear: { type: "element_hidden", element: { text: "Loading" } }
	 * - Wait for fixed time (fallback): { type: "time", timeMs: 1000 }
	 *
	 * @param condition - The condition to wait for
	 * @returns WaitResult with success status and timing information
	 */
	waitFor(condition: WaitCondition): Promise<WaitResult>;

	/**
	 * Get clipboard content from device.
	 * Returns empty string if clipboard is empty.
	 */
	getClipboard(): Promise<string>;

	/**
	 * Set clipboard content on device.
	 * @param text - Text to set in clipboard
	 */
	setClipboard(text: string): Promise<void>;

	/**
	 * Clear clipboard content on device.
	 */
	clearClipboard(): Promise<void>;

	/**
	 * Hide soft keyboard
	 *
	 * Useful when keyboard overlaps elements you want to interact with
	 * Safe to call even if keyboard is not visible
	 */
	hideKeyboard(): Promise<void>;

	/**
	 * Select option by text in native picker/dropdown
	 *
	 * Works with native Android spinners and iOS UIPickerView
	 * Automatically scrolls through options to find matching text
	 *
	 * @param text - Text of the option to select
	 * @param maxScrollAttempts - Maximum number of scroll attempts (default: 10)
	 * @returns true if option was found and selected, false otherwise
	 */
	selectOptionByText(text: string, maxScrollAttempts?: number): Promise<boolean>;

	/**
	 * Swipe inside a specific element (useful for scrollable containers)
	 *
	 * This allows scrolling within a specific element without affecting the whole screen
	 *
	 * @param element - The element to swipe inside
	 * @param direction - Swipe direction
	 * @param distance - Optional swipe distance (default: 70% of element dimension)
	 */
	swipeInElement(element: ScreenElement, direction: SwipeDirection, distance?: number): Promise<void>;
}
