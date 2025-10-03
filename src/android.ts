import path from "node:path";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

import * as xml from "fast-xml-parser";

import { ActionableError, Button, InstalledApp, Robot, ScreenElement, ScreenElementRect, ScreenSize, SwipeDirection, Orientation } from "./robot";
import { WaitCondition, WaitResult, waitForCondition } from "./wait-conditions";
import { TIMEOUTS, DURATIONS, BUFFERS } from "./config";

export interface AndroidDevice {
	deviceId: string;
	deviceType: "tv" | "mobile";
}

interface UiAutomatorXmlNode {
	node: UiAutomatorXmlNode[];
	class?: string;
	text?: string;
	bounds?: string;
	hint?: string;
	focused?: string;
	"content-desc"?: string;
	"resource-id"?: string;
}

interface UiAutomatorXml {
	hierarchy: {
		node: UiAutomatorXmlNode;
	};
}

const getAdbPath = (): string => {
	if (process.env.ANDROID_HOME) {
		return path.join(process.env.ANDROID_HOME, "platform-tools", "adb");
	}

	const defaultAndroidSdk = path.join(process.env.HOME || "", "Library", "Android", "sdk", "platform-tools", "adb");
	if (existsSync(defaultAndroidSdk)) {
		return defaultAndroidSdk;
	}

	return "adb";
};

const BUTTON_MAP: Record<Button, string> = {
	"BACK": "KEYCODE_BACK",
	"HOME": "KEYCODE_HOME",
	"VOLUME_UP": "KEYCODE_VOLUME_UP",
	"VOLUME_DOWN": "KEYCODE_VOLUME_DOWN",
	"ENTER": "KEYCODE_ENTER",
	"DPAD_CENTER": "KEYCODE_DPAD_CENTER",
	"DPAD_UP": "KEYCODE_DPAD_UP",
	"DPAD_DOWN": "KEYCODE_DPAD_DOWN",
	"DPAD_LEFT": "KEYCODE_DPAD_LEFT",
	"DPAD_RIGHT": "KEYCODE_DPAD_RIGHT",
};

type AndroidDeviceType = "tv" | "mobile";

// Cache TTL for element queries (in milliseconds)
// Elements are cached for 200ms to avoid duplicate queries
// Cache is cleared after any action (tap, swipe, etc.)
const ELEMENT_CACHE_TTL = 200;

interface CachedElements {
	data: ScreenElement[];
	timestamp: number;
}

export class AndroidRobot implements Robot {

	private _cachedScreenSize: ScreenSize | null = null;
	private _cachedElements: CachedElements | null = null;

	public constructor(private deviceId: string) {
	}

	public adb(...args: string[]): Buffer {
		return execFileSync(getAdbPath(), ["-s", this.deviceId, ...args], {
			maxBuffer: BUFFERS.maxBuffer,
			timeout: TIMEOUTS.slow,
		});
	}

	public getSystemFeatures(): string[] {
		return this.adb("shell", "pm", "list", "features")
			.toString()
			.split("\n")
			.map(line => line.trim())
			.filter(line => line.startsWith("feature:"))
			.map(line => line.substring("feature:".length));
	}

	/**
	 * Get screen size with caching
	 * Screen size doesn't change unless orientation changes
	 */
	public async getScreenSize(): Promise<ScreenSize> {
		// Return cached value if available
		if (this._cachedScreenSize) {
			return this._cachedScreenSize;
		}

		// Get fresh screen size
		const screenSize = this.adb("shell", "wm", "size")
			.toString()
			.split(" ")
			.pop();

		if (!screenSize) {
			throw new Error("Failed to get screen size");
		}

		const scale = 1;
		const [width, height] = screenSize.split("x").map(Number);

		// Cache the result
		this._cachedScreenSize = { width, height, scale };
		return this._cachedScreenSize;
	}

	public async listApps(): Promise<InstalledApp[]> {
		// only apps that have a launcher activity are returned
		return this.adb("shell", "cmd", "package", "query-activities", "-a", "android.intent.action.MAIN", "-c", "android.intent.category.LAUNCHER")
			.toString()
			.split("\n")
			.map(line => line.trim())
			.filter(line => line.startsWith("packageName="))
			.map(line => line.substring("packageName=".length))
			.filter((value, index, self) => self.indexOf(value) === index)
			.map(packageName => ({
				packageName,
				appName: packageName,
			}));
	}

	private async listPackages(): Promise<string[]> {
		return this.adb("shell", "pm", "list", "packages")
			.toString()
			.split("\n")
			.map(line => line.trim())
			.filter(line => line.startsWith("package:"))
			.map(line => line.substring("package:".length));
	}

	public async launchApp(packageName: string): Promise<void> {
		this.adb("shell", "monkey", "-p", packageName, "-c", "android.intent.category.LAUNCHER", "1");
	}

	public async listRunningProcesses(): Promise<string[]> {
		return this.adb("shell", "ps", "-e")
			.toString()
			.split("\n")
			.map(line => line.trim())
			.filter(line => line.startsWith("u")) // non-system processes
			.map(line => line.split(/\s+/)[8]); // get process name
	}

	public async swipe(direction: SwipeDirection): Promise<void> {
		const screenSize = await this.getScreenSize();
		const centerX = screenSize.width >> 1;

		let x0: number, y0: number, x1: number, y1: number;

		switch (direction) {
			case "up":
				x0 = x1 = centerX;
				y0 = Math.floor(screenSize.height * 0.80);
				y1 = Math.floor(screenSize.height * 0.20);
				break;
			case "down":
				x0 = x1 = centerX;
				y0 = Math.floor(screenSize.height * 0.20);
				y1 = Math.floor(screenSize.height * 0.80);
				break;
			case "left":
				x0 = Math.floor(screenSize.width * 0.80);
				x1 = Math.floor(screenSize.width * 0.20);
				y0 = y1 = Math.floor(screenSize.height * 0.50);
				break;
			case "right":
				x0 = Math.floor(screenSize.width * 0.20);
				x1 = Math.floor(screenSize.width * 0.80);
				y0 = y1 = Math.floor(screenSize.height * 0.50);
				break;
			default:
				throw new ActionableError(`Swipe direction "${direction}" is not supported`);
		}

		this.adb("shell", "input", "swipe", `${x0}`, `${y0}`, `${x1}`, `${y1}`, `${DURATIONS.swipe}`);

		// Clear element cache after swipe
		this.clearElementCache();
	}

	public async swipeFromCoordinate(x: number, y: number, direction: SwipeDirection, distance?: number): Promise<void> {
		const screenSize = await this.getScreenSize();

		let x0: number, y0: number, x1: number, y1: number;

		// Use provided distance or default to 30% of screen dimension
		const defaultDistanceY = Math.floor(screenSize.height * 0.3);
		const defaultDistanceX = Math.floor(screenSize.width * 0.3);
		const swipeDistanceY = distance || defaultDistanceY;
		const swipeDistanceX = distance || defaultDistanceX;

		switch (direction) {
			case "up":
				x0 = x1 = x;
				y0 = y;
				y1 = Math.max(0, y - swipeDistanceY);
				break;
			case "down":
				x0 = x1 = x;
				y0 = y;
				y1 = Math.min(screenSize.height, y + swipeDistanceY);
				break;
			case "left":
				x0 = x;
				x1 = Math.max(0, x - swipeDistanceX);
				y0 = y1 = y;
				break;
			case "right":
				x0 = x;
				x1 = Math.min(screenSize.width, x + swipeDistanceX);
				y0 = y1 = y;
				break;
			default:
				throw new ActionableError(`Swipe direction "${direction}" is not supported`);
		}

		this.adb("shell", "input", "swipe", `${x0}`, `${y0}`, `${x1}`, `${y1}`, `${DURATIONS.swipe}`);

		// Clear element cache after swipe
		this.clearElementCache();
	}

	private getDisplayCount(): number {
		return this.adb("shell", "dumpsys", "SurfaceFlinger", "--display-id")
			.toString()
			.split("\n")
			.filter(s => s.startsWith("Display "))
			.length;
	}

	private getFirstDisplayId(): string | null {
		const displays = this.adb("shell", "cmd", "display", "get-displays")
			.toString()
			.split("\n")
			.filter(s => s.startsWith("Display id "))
			// filter for state ON even though get-displays only returns turned on displays
			.filter(s => s.indexOf(", state ON,") >= 0)
			// another paranoia check
			.filter(s => s.indexOf(", uniqueId ") >= 0);

		if (displays.length > 0) {
			const m = displays[0].match(/uniqueId \"([^\"]+)\"/);
			if (m !== null) {
				const displayId = m[1];
				if (displayId.indexOf("local:") === 0) {
					return displayId.split(":")[1];
				}

				return displayId;
			}
		}

		return null;
	}

	public async getScreenshot(): Promise<Buffer> {
		if (this.getDisplayCount() <= 1) {
			// backward compatibility for android 10 and below, and for single display devices
			return this.adb("exec-out", "screencap", "-p");
		}

		// find the first display that is turned on, and capture that one
		const displayId = this.getFirstDisplayId();
		return this.adb("exec-out", "screencap", "-p", "-d", `${displayId}`);
	}

	private collectElements(node: UiAutomatorXmlNode): ScreenElement[] {
		const elements: Array<ScreenElement> = [];

		if (node.node) {
			if (Array.isArray(node.node)) {
				for (const childNode of node.node) {
					elements.push(...this.collectElements(childNode));
				}
			} else {
				elements.push(...this.collectElements(node.node));
			}
		}

		if (node.text || node["content-desc"] || node.hint) {
			const element: ScreenElement = {
				type: node.class || "text",
				text: node.text,
				label: node["content-desc"] || node.hint || "",
				rect: this.getScreenElementRect(node),
			};

			if (node.focused === "true") {
				// only provide it if it's true, otherwise don't confuse llm
				element.focused = true;
			}

			const resourceId = node["resource-id"];
			if (resourceId !== null && resourceId !== "") {
				element.identifier = resourceId;
			}

			if (element.rect.width > 0 && element.rect.height > 0) {
				elements.push(element);
			}
		}

		return elements;
	}

	/**
	 * Get elements on screen with caching
	 * Elements are cached for 200ms to avoid duplicate queries
	 * Cache is automatically cleared after any action
	 */
	public async getElementsOnScreen(): Promise<ScreenElement[]> {
		// Check if cache is valid (exists and not expired)
		if (this._cachedElements) {
			const age = Date.now() - this._cachedElements.timestamp;
			if (age < ELEMENT_CACHE_TTL) {
				// Cache is fresh, return cached data
				return this._cachedElements.data;
			}
		}

		// Cache miss or expired - fetch fresh elements
		const parsedXml = await this.getUiAutomatorXml();
		const hierarchy = parsedXml.hierarchy;
		const elements = this.collectElements(hierarchy.node);

		// Store in cache with current timestamp
		this._cachedElements = {
			data: elements,
			timestamp: Date.now(),
		};

		return elements;
	}

	/**
	 * Hide soft keyboard on device
	 *
	 * Useful when keyboard overlaps elements you want to interact with
	 * Safe to call even if keyboard is not visible
	 */
	public async hideKeyboard(): Promise<void> {
		try {
			// Send BACK key event to dismiss keyboard
			// This is the standard Android way to hide keyboard
			this.adb("shell", "input", "keyevent", "KEYCODE_BACK");

			// Clear element cache since keyboard state changed
			this.clearElementCache();
		} catch (error) {
			// Ignore errors - keyboard might not be visible
			console.error("Failed to hide keyboard:", error);
		}
	}

	/**
	 * Select option by text in native picker/dropdown
	 *
	 * Works with native Android spinners
	 * Automatically scrolls through options to find matching text
	 *
	 * @param text - Text of the option to select
	 * @param maxScrollAttempts - Maximum number of scroll attempts (default: 10)
	 * @returns true if option was found and selected, false otherwise
	 */
	public async selectOptionByText(text: string, maxScrollAttempts: number = 10): Promise<boolean> {
		// Strategy:
		// 1. Get all elements on screen
		// 2. Look for element with matching text
		// 3. If found, tap on it
		// 4. If not found, scroll and try again

		for (let attempt = 0; attempt < maxScrollAttempts; attempt++) {
			const elements = await this.getElementsOnScreen();

			// Find element with matching text
			const matchingElement = elements.find(el =>
				el.text === text || el.label === text
			);

			if (matchingElement) {
				// Found it! Tap on it
				const centerX = matchingElement.rect.x + matchingElement.rect.width / 2;
				const centerY = matchingElement.rect.y + matchingElement.rect.height / 2;
				await this.tap(centerX, centerY);
				return true;
			}

			// Not found, scroll down to see more options
			if (attempt < maxScrollAttempts - 1) {
				await this.swipe("down");
			}
		}

		// Not found after all attempts
		return false;
	}

	/**
	 * Swipe inside a specific element (useful for scrollable containers)
	 *
	 * This allows scrolling within a specific element like carousels or nested lists
	 *
	 * @param element - The element to swipe inside
	 * @param direction - Swipe direction
	 * @param distance - Optional swipe distance (default: 70% of element dimension)
	 */
	public async swipeInElement(element: ScreenElement, direction: SwipeDirection, distance?: number): Promise<void> {
		// Calculate center of element as starting point
		const centerX = element.rect.x + element.rect.width / 2;
		const centerY = element.rect.y + element.rect.height / 2;

		// Calculate swipe distance (default to 70% of element size)
		let swipeDistance: number;
		if (distance) {
			swipeDistance = distance;
		} else {
			// Default: 70% of element dimension
			if (direction === "up" || direction === "down") {
				swipeDistance = Math.floor(element.rect.height * 0.7);
			} else {
				swipeDistance = Math.floor(element.rect.width * 0.7);
			}
		}

		// Perform swipe from center of element
		await this.swipeFromCoordinate(centerX, centerY, direction, swipeDistance);
	}

	/**
	 * Clear element cache
	 * Called after any action that might change screen elements
	 */
	private clearElementCache(): void {
		this._cachedElements = null;
	}

	public async terminateApp(packageName: string): Promise<void> {
		this.adb("shell", "am", "force-stop", packageName);
	}

	public async openUrl(url: string): Promise<void> {
		this.adb("shell", "am", "start", "-a", "android.intent.action.VIEW", "-d", url);
	}

	private isAscii(text: string): boolean {
		return /^[\x00-\x7F]*$/.test(text);
	}

	private escapeShellText(text: string): string {
		// escape all shell special characters that could be used for injection
		return text.replace(/[\\'"` \t\n\r|&;()<>{}[\]$*?]/g, "\\$&");
	}

	private async isDeviceKitInstalled(): Promise<boolean> {
		const packages = await this.listPackages();
		return packages.includes("com.mobilenext.devicekit");
	}

	public async sendKeys(text: string): Promise<void> {
		if (text === "") {
			// bailing early, so we don't run adb shell with empty string.
			// this happens when you prompt with a simple "submit".
			return;
		}

		if (this.isAscii(text)) {
			// adb shell input only supports ascii characters. and
			// some of the keys have to be escaped.
			const _text = this.escapeShellText(text);
			this.adb("shell", "input", "text", _text);
		} else if (await this.isDeviceKitInstalled()) {
			// try sending over clipboard
			const base64 = Buffer.from(text).toString("base64");

			// send clipboard over and immediately paste it
			this.adb("shell", "am", "broadcast", "-a", "devicekit.clipboard.set", "-e", "encoding", "base64", "-e", "text", base64, "-n", "com.mobilenext.devicekit/.ClipboardBroadcastReceiver");
			this.adb("shell", "input", "keyevent", "KEYCODE_PASTE");

			// clear clipboard when we're done
			this.adb("shell", "am", "broadcast", "-a", "devicekit.clipboard.clear", "-n", "com.mobilenext.devicekit/.ClipboardBroadcastReceiver");
		} else {
			throw new ActionableError("Non-ASCII text is not supported on Android, please install mobilenext devicekit, see https://github.com/mobile-next/devicekit-android");
		}

		// Clear element cache after sending keys
		this.clearElementCache();
	}

	public async pressButton(button: Button) {
		if (!BUTTON_MAP[button]) {
			throw new ActionableError(`Button "${button}" is not supported`);
		}

		const mapped = BUTTON_MAP[button];
		this.adb("shell", "input", "keyevent", mapped);

		// Clear element cache after button press
		this.clearElementCache();
	}

	public async tap(x: number, y: number): Promise<void> {
		this.adb("shell", "input", "tap", `${x}`, `${y}`);

		// Clear element cache after tap
		this.clearElementCache();
	}

	public async longPress(x: number, y: number): Promise<void> {
		// a long press is a swipe with no movement and a long duration
		this.adb("shell", "input", "swipe", `${x}`, `${y}`, `${x}`, `${y}`, `${DURATIONS.longPress}`);

		// Clear element cache after long press
		this.clearElementCache();
	}

	public async setOrientation(orientation: Orientation): Promise<void> {
		const value = orientation === "portrait" ? 0 : 1;

		// disable auto-rotation prior to setting the orientation
		this.adb("shell", "settings", "put", "system", "accelerometer_rotation", "0");
		this.adb("shell", "content", "insert", "--uri", "content://settings/system", "--bind", "name:s:user_rotation", "--bind", `value:i:${value}`);

		// Clear screen size cache since orientation changed
		this._cachedScreenSize = null;

		// Clear element cache since orientation changed
		this.clearElementCache();
	}

	public async getOrientation(): Promise<Orientation> {
		const rotation = this.adb("shell", "settings", "get", "system", "user_rotation").toString().trim();
		return rotation === "0" ? "portrait" : "landscape";
	}

	/**
	 * Wait for a condition to be met (smart waiting)
	 * Uses polling with exponential backoff
	 */
	public async waitFor(condition: WaitCondition): Promise<WaitResult> {
		return waitForCondition(condition, async () => {
			return await this.getElementsOnScreen();
		});
	}

	/**
	 * Get application logs from Android device
	 *
	 * Returns recent log entries for a specific app package
	 * This helps with debugging by showing what the app is logging
	 *
	 * @param packageName - Package name of the app (e.g., "com.example.app")
	 * @param lines - Number of most recent log lines to return (default: 100)
	 * @returns Array of log lines as strings
	 */
	public getAppLogs(packageName: string, lines: number = 100): string[] {
		try {
			// Get PID of the running app
			// pidof returns the process ID if app is running
			const pidOutput = this.adb("shell", "pidof", packageName).toString().trim();

			if (!pidOutput) {
				// App is not running, return empty logs
				return [`App ${packageName} is not running`];
			}

			const pid = pidOutput;

			// Get logs filtered by PID
			// -d: dump logs and exit (don't follow)
			// --pid: filter by process ID
			// -t: show timestamps
			const logsOutput = this.adb(
				"shell",
				"logcat",
				"-d",
				"--pid",
				pid,
				"-t",
				lines.toString()
			).toString();

			// Split into lines and filter empty ones
			const logLines = logsOutput
				.split("\n")
				.map(line => line.trim())
				.filter(line => line.length > 0);

			// If no logs, return helpful message
			if (logLines.length === 0) {
				return [`No logs found for ${packageName}`];
			}

			return logLines;
		} catch (error: any) {
			// If command fails, return error message
			return [`Error reading logs: ${error.message}`];
		}
	}

	/**
	 * Clear all logs on Android device
	 *
	 * Note: This clears ALL logs on device, not just one app
	 * Use with caution as it affects all applications
	 *
	 * @returns Success or error message
	 */
	public clearLogs(): string {
		try {
			// Clear all logs
			// -c: clear (flush) the entire log and exit
			this.adb("shell", "logcat", "-c");
			return "Android logs cleared successfully";
		} catch (error: any) {
			return `Error clearing logs: ${error.message}`;
		}
	}

	/**
	 * Get crash logs from Android device
	 *
	 * Searches for FATAL EXCEPTION entries in logs
	 * These indicate app crashes and include stack traces
	 *
	 * This is critical for debugging - helps Cursor AI see why apps crash
	 *
	 * @param packageName - Optional package name to filter crashes (if not provided, gets all crashes)
	 * @param lines - Number of log lines to search through (default: 500)
	 * @returns Array of crash log entries
	 */
	public getCrashLogs(packageName?: string, lines: number = 500): string[] {
		try {
			// Strategy:
			// 1. Get recent logs from crash buffer
			// 2. Search for FATAL EXCEPTION or AndroidRuntime errors
			// 3. Filter by package name if provided
			// 4. Return grouped crash reports

			// Get logs from crash buffer
			// -b crash: read from crash log buffer
			// -d: dump and exit
			// -t: limit number of lines
			const crashBuffer = this.adb(
				"shell",
				"logcat",
				"-b",
				"crash",
				"-d",
				"-t",
				lines.toString()
			).toString();

			// Also get main log buffer for FATAL EXCEPTION entries
			const mainBuffer = this.adb(
				"shell",
				"logcat",
				"-d",
				"-t",
				lines.toString()
			).toString();

			// Combine both buffers
			const allLogs = crashBuffer + "\n" + mainBuffer;

			// Split into lines
			const logLines = allLogs.split("\n");

			// Find crash-related lines
			const crashLines: string[] = [];
			let inCrashBlock = false;
			let crashBlockLines: string[] = [];

			for (const line of logLines) {
				// Check if this is start of a crash
				if (line.includes("FATAL EXCEPTION") ||
					line.includes("AndroidRuntime") && line.includes("FATAL") ||
					line.includes("*** FATAL EXCEPTION")) {

					// If we were already in a crash block, save it
					if (inCrashBlock && crashBlockLines.length > 0) {
						// Check if crash matches package filter
						const crashText = crashBlockLines.join("\n");
						if (!packageName || crashText.includes(packageName)) {
							crashLines.push("=== CRASH DETECTED ===");
							crashLines.push(...crashBlockLines);
							crashLines.push("=== END CRASH ===");
							crashLines.push("");
						}
					}

					// Start new crash block
					inCrashBlock = true;
					crashBlockLines = [line];
				} else if (inCrashBlock) {
					// Continue collecting crash lines
					crashBlockLines.push(line);

					// Stop collecting after we see empty line or new log entry starts
					if (line.trim() === "" || (!line.startsWith("\t") && !line.startsWith(" ") && line.length > 0 && !line.includes("at "))) {
						// End of this crash block
						const crashText = crashBlockLines.join("\n");
						if (!packageName || crashText.includes(packageName)) {
							crashLines.push("=== CRASH DETECTED ===");
							crashLines.push(...crashBlockLines);
							crashLines.push("=== END CRASH ===");
							crashLines.push("");
						}
						inCrashBlock = false;
						crashBlockLines = [];
					}
				}
			}

			// Handle last crash block if still open
			if (inCrashBlock && crashBlockLines.length > 0) {
				const crashText = crashBlockLines.join("\n");
				if (!packageName || crashText.includes(packageName)) {
					crashLines.push("=== CRASH DETECTED ===");
					crashLines.push(...crashBlockLines);
					crashLines.push("=== END CRASH ===");
				}
			}

			// If no crashes found, return helpful message
			if (crashLines.length === 0) {
				if (packageName) {
					return [`No crashes found for ${packageName}`];
				}
				return ["No crashes found in recent logs"];
			}

			return crashLines;
		} catch (error: any) {
			return [`Error reading crash logs: ${error.message}`];
		}
	}

	/**
	 * Get system error logs from Android device
	 *
	 * Searches for ERROR level logs in system logs
	 * This includes system-level errors that might affect app behavior
	 *
	 * Helps Cursor AI understand system-level issues
	 *
	 * @param lines - Number of recent log lines to return (default: 100)
	 * @returns Array of system error log entries
	 */
	public getSystemErrors(lines: number = 100): string[] {
		try {
			// Get logs filtered by ERROR priority
			// -b system: read from system log buffer
			// -d: dump and exit
			// *:E: show only ERROR priority and above
			// -t: limit number of lines
			const logsOutput = this.adb(
				"shell",
				"logcat",
				"-b",
				"system",
				"-d",
				"*:E",
				"-t",
				lines.toString()
			).toString();

			// Split into lines and filter empty ones
			const logLines = logsOutput
				.split("\n")
				.map(line => line.trim())
				.filter(line => line.length > 0);

			// If no errors found, return helpful message
			if (logLines.length === 0) {
				return ["No system errors found in recent logs"];
			}

			return logLines;
		} catch (error: any) {
			return [`Error reading system errors: ${error.message}`];
		}
	}

	/**
	 * Get clipboard content from device
	 *
	 * Uses adb shell to read clipboard content.
	 * Returns empty string if clipboard is empty.
	 */
	public async getClipboard(): Promise<string> {
		try {
		// Use cmd clipboard get command (Android 10+)
			const result = this.adb("shell", "cmd", "clipboard", "get").toString();
			return result.trim();
		} catch (error) {
		// Fallback: return empty string if command fails
			console.error("Failed to get clipboard:", error);
			return "";
		}
	}

	/**
	 * Set clipboard content on device
	 *
	 * @param text - Text to set in clipboard
	 */
	public async setClipboard(text: string): Promise<void> {
		try {
		// Use service call method which is more reliable
		// This is a workaround for cmd clipboard limitations
			this.adb("shell", "service", "call", "clipboard", "2", "s16", `android.content.ClipData`, "i32", "1", "s16", "text/plain", "s16", text);
		} catch (error) {
		// Fallback: try simpler approach
			try {
			// Direct service call with text
				const escapedText = text.replace(/'/g, "");
				this.adb("shell", `am broadcast -a clipper.set -e text '${escapedText}'`);
			} catch {
				throw new Error(`Failed to set clipboard: ${error}`);
			}
		}
	}

	/**
	 * Clear clipboard content
	 */
	public async clearClipboard(): Promise<void> {
		try {
			this.adb("shell", "cmd", "clipboard", "clear");
		} catch (error) {
		// Fallback: set empty string
			await this.setClipboard("");
		}
	}

	/**
	 * Set HTTP proxy for Wi-Fi connection
	 *
	 * This allows intercepting network traffic through a proxy server
	 * Required for network monitoring with tools like mitmproxy or Charles
	 *
	 * Note: Requires device to be connected via Wi-Fi
	 *
	 * @param host - Proxy server host (e.g., "192.168.1.100")
	 * @param port - Proxy server port (e.g., 8080)
	 * @returns Success or error message
	 */
	public setProxy(host: string, port: number): string {
		try {
			// Set global HTTP proxy via adb shell settings
			// This works for most apps that respect system proxy settings
			this.adb("shell", "settings", "put", "global", "http_proxy", `${host}:${port}`);
			return `Proxy set to ${host}:${port}. Restart app to apply changes.`;
		} catch (error: any) {
			return `Error setting proxy: ${error.message}`;
		}
	}

	/**
	 * Clear HTTP proxy settings
	 *
	 * Removes proxy configuration and restores direct connection
	 *
	 * @returns Success or error message
	 */
	public clearProxy(): string {
		try {
			// Clear global HTTP proxy
			this.adb("shell", "settings", "put", "global", "http_proxy", ":0");
			return "Proxy cleared. Restart app to apply changes.";
		} catch (error: any) {
			return `Error clearing proxy: ${error.message}`;
		}
	}

	/**
	 * Get current proxy settings
	 *
	 * @returns Current proxy configuration
	 */
	public getProxy(): string {
		try {
			const proxy = this.adb("shell", "settings", "get", "global", "http_proxy").toString().trim();
			if (!proxy || proxy === ":0") {
				return "No proxy configured (direct connection)";
			}
			return `Current proxy: ${proxy}`;
		} catch (error: any) {
			return `Error reading proxy: ${error.message}`;
		}
	}

	/**
	 * Check if Activity is in resumed state (ready for UI inspection)
	 * This helps avoid unnecessary UIAutomator dump attempts
	 */
	private isActivityResumed(): boolean {
		try {
			const activities = this.adb("shell", "dumpsys", "activity", "activities").toString();
			// Check if there's a resumed activity
			return activities.includes("mResumedActivity") || activities.includes("mFocusedActivity");
		} catch (error) {
			// If we can't check, assume it's okay to proceed
			return true;
		}
	}

	/**
	 * Get UIAutomator XML dump with optimized retry logic
	 * - Reduced retries: 10 → 3 attempts
	 * - Exponential backoff: 50ms, 100ms, 200ms
	 * - Activity state checking before attempts
	 */
	private async getUiAutomatorDump(): Promise<string> {
		const maxRetries = 3; // Reduced from 10
		let delay = 50; // Start with 50ms

		for (let tries = 0; tries < maxRetries; tries++) {
			// Check if activity is ready (skip on first try)
			if (tries > 0) {
				if (!this.isActivityResumed()) {
					// Activity not ready, wait before retry
					await new Promise(resolve => setTimeout(resolve, delay));
					delay *= 2; // Exponential backoff: 50ms → 100ms → 200ms
					continue;
				}
			}

			try {
				const dump = this.adb("exec-out", "uiautomator", "dump", "/dev/tty").toString();

				// Check for known error
				if (dump.includes("null root node returned by UiTestAutomationBridge")) {
					if (tries < maxRetries - 1) {
						// Wait before retry with exponential backoff
						await new Promise(resolve => setTimeout(resolve, delay));
						delay *= 2;
						continue;
					}
					// Last attempt failed
					throw new ActionableError("UIAutomator returned null root node - UI may not be ready");
				}

				// Check if we got valid XML
				const xmlStart = dump.indexOf("<?xml");
				if (xmlStart === -1) {
					if (tries < maxRetries - 1) {
						await new Promise(resolve => setTimeout(resolve, delay));
						delay *= 2;
						continue;
					}
					throw new ActionableError("Invalid UIAutomator dump - no XML found");
				}

				// Success! Return XML
				return dump.substring(xmlStart);

			} catch (error) {
				// If it's our ActionableError, rethrow
				if (error instanceof ActionableError) {
					throw error;
				}

				// For other errors, retry or fail
				if (tries < maxRetries - 1) {
					await new Promise(resolve => setTimeout(resolve, delay));
					delay *= 2;
					continue;
				}

				throw new ActionableError(`Failed to get UIAutomator XML after ${maxRetries} attempts: ${error}`);
			}
		}

		throw new ActionableError(`Failed to get UIAutomator XML after ${maxRetries} attempts`);
	}

	private async getUiAutomatorXml(): Promise<UiAutomatorXml> {
		const dump = await this.getUiAutomatorDump();
		const parser = new xml.XMLParser({
			ignoreAttributes: false,
			attributeNamePrefix: "",
		});

		return parser.parse(dump) as UiAutomatorXml;
	}

	private getScreenElementRect(node: UiAutomatorXmlNode): ScreenElementRect {
		const bounds = String(node.bounds);

		const [, left, top, right, bottom] = bounds.match(/^\[(\d+),(\d+)\]\[(\d+),(\d+)\]$/)?.map(Number) || [];
		return {
			x: left,
			y: top,
			width: right - left,
			height: bottom - top,
		};
	}
}

export class AndroidDeviceManager {

	private getDeviceType(name: string): AndroidDeviceType {
		const device = new AndroidRobot(name);
		const features = device.getSystemFeatures();
		if (features.includes("android.software.leanback") || features.includes("android.hardware.type.television")) {
			return "tv";
		}

		return "mobile";
	}

	public getConnectedDevices(): AndroidDevice[] {
		try {
			const names = execFileSync(getAdbPath(), ["devices"])
				.toString()
				.split("\n")
				.map(line => line.trim())
				.filter(line => line !== "")
				.filter(line => !line.startsWith("List of devices attached"))
				.map(line => line.split("\t")[0]);

			return names.map(name => ({
				deviceId: name,
				deviceType: this.getDeviceType(name),
			}));
		} catch (error) {
			console.error("Could not execute adb command, maybe ANDROID_HOME is not set?");
			return [];
		}
	}
}
