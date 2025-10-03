import { execFileSync } from "node:child_process";

import { trace } from "./logger";
import { WebDriverAgent } from "./webdriver-agent";
import { ActionableError, Button, InstalledApp, Robot, ScreenElement, ScreenSize, SwipeDirection, Orientation } from "./robot";
import { WaitCondition, WaitResult, waitForCondition } from "./wait-conditions";
import { TIMEOUTS, BUFFERS } from "./config";

export interface Simulator {
	name: string;
	uuid: string;
	state: string;
}

interface ListDevicesResponse {
	devices: {
		[key: string]: Array<{
			state: string;
			name: string;
			isAvailable: boolean;
			udid: string;
		}>,
	},
}

interface AppInfo {
	ApplicationType: string;
	Bundle: string;
	CFBundleDisplayName: string;
	CFBundleExecutable: string;
	CFBundleIdentifier: string;
	CFBundleName: string;
	CFBundleVersion: string;
	DataContainer: string;
	Path: string;
}

const WDA_PORT = 8100;

// Cache TTL for element queries (in milliseconds)
// Elements are cached for 200ms to avoid duplicate queries
// Cache is cleared after any action (tap, swipe, etc.)
const ELEMENT_CACHE_TTL = 200;

interface CachedElements {
	data: ScreenElement[];
	timestamp: number;
}

export class Simctl implements Robot {

	private wdaInstance: WebDriverAgent | null = null;
	private _cachedScreenSize: ScreenSize | null = null;
	private _cachedElements: CachedElements | null = null;
	private _wdaInitialized = false; // Track if WDA was checked/started

	constructor(private readonly simulatorUuid: string) {}

	private async isWdaInstalled(): Promise<boolean> {
		const apps = await this.listApps();
		return apps.map(app => app.packageName).includes("com.facebook.WebDriverAgentRunner.xctrunner");
	}

	private async startWda(): Promise<void> {
		if (!(await this.isWdaInstalled())) {
			// wda is not even installed, won't attempt to start it
			return;
		}

		trace("Starting WebDriverAgent");
		const webdriverPackageName = "com.facebook.WebDriverAgentRunner.xctrunner";
		this.simctl("launch", this.simulatorUuid, webdriverPackageName);

		// now we wait for wda to have a successful status
		const wda = new WebDriverAgent("localhost", WDA_PORT);

		// wait for wda to start (configured timeout)
		const timeout = +new Date() + TIMEOUTS.wdaStart;
		while (+new Date() < timeout) {
			// cross fingers and see if wda is already running
			if (await wda.isRunning()) {
				trace("WebDriverAgent is now running");
				return;
			}

			// wait 100ms before trying again
			await new Promise(resolve => setTimeout(resolve, 100));
		}

		trace("Could not start WebDriverAgent in time, giving up");
	}

	/**
	 * Get WebDriverAgent instance with lazy initialization
	 * Checks if WDA is running only ONCE on first call
	 * Subsequent calls reuse cached instance without checking
	 * This saves 5-10 seconds per test suite by avoiding repeated checks
	 */
	private async wda(): Promise<WebDriverAgent> {
		// Return cached instance immediately if already initialized
		if (this._wdaInitialized && this.wdaInstance) {
			return this.wdaInstance;
		}

		// First time initialization - check and start WDA if needed
		const wda = new WebDriverAgent("localhost", WDA_PORT);

		if (!(await wda.isRunning())) {
			await this.startWda();
			if (!(await wda.isRunning())) {
				throw new ActionableError("WebDriverAgent is not running on simulator, please see https://github.com/MrTrotskiy/mobilepixel/wiki/");
			}
		}

		// Cache the WDA instance and mark as initialized
		this.wdaInstance = wda;
		this._wdaInitialized = true;
		return wda;
	}

	private simctl(...args: string[]): Buffer {
		return execFileSync("xcrun", ["simctl", ...args], {
			timeout: TIMEOUTS.slow,
			maxBuffer: BUFFERS.maxBuffer,
		});
	}

	public async getScreenshot(): Promise<Buffer> {
		const wda = await this.wda();
		return await wda.getScreenshot();
		// alternative: return this.simctl("io", this.simulatorUuid, "screenshot", "-");
	}

	public async openUrl(url: string) {
		const wda = await this.wda();
		await wda.openUrl(url);
		// alternative: this.simctl("openurl", this.simulatorUuid, url);
	}

	public async launchApp(packageName: string) {
		this.simctl("launch", this.simulatorUuid, packageName);
	}

	public async terminateApp(packageName: string) {
		this.simctl("terminate", this.simulatorUuid, packageName);
	}

	public async listApps(): Promise<InstalledApp[]> {
		const text = this.simctl("listapps", this.simulatorUuid).toString();
		const result = execFileSync("plutil", ["-convert", "json", "-o", "-", "-r", "-"], {
			input: text,
		});

		const output = JSON.parse(result.toString()) as Record<string, AppInfo>;
		return Object.values(output).map(app => ({
			packageName: app.CFBundleIdentifier,
			appName: app.CFBundleDisplayName,
		}));
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

		// Get fresh screen size from WebDriverAgent
		const wda = await this.wda();
		this._cachedScreenSize = await wda.getScreenSize();
		return this._cachedScreenSize;
	}

	public async sendKeys(keys: string) {
		const wda = await this.wda();
		await wda.sendKeys(keys);

		// Clear element cache after sending keys
		this.clearElementCache();
	}

	public async swipe(direction: SwipeDirection): Promise<void> {
		const wda = await this.wda();
		await wda.swipe(direction);

		// Clear element cache after swipe
		this.clearElementCache();
	}

	public async swipeFromCoordinate(x: number, y: number, direction: SwipeDirection, distance?: number): Promise<void> {
		const wda = await this.wda();
		await wda.swipeFromCoordinate(x, y, direction, distance);

		// Clear element cache after swipe
		this.clearElementCache();
	}

	public async tap(x: number, y: number) {
		const wda = await this.wda();
		await wda.tap(x, y);

		// Clear element cache after tap
		this.clearElementCache();
	}

	public async longPress(x: number, y: number) {
		const wda = await this.wda();
		await wda.longPress(x, y);

		// Clear element cache after long press
		this.clearElementCache();
	}

	public async pressButton(button: Button) {
		const wda = await this.wda();
		await wda.pressButton(button);

		// Clear element cache after button press
		this.clearElementCache();
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
		const wda = await this.wda();
		const elements = await wda.getElementsOnScreen();

		// Store in cache with current timestamp
		this._cachedElements = {
			data: elements,
			timestamp: Date.now(),
		};

		return elements;
	}

	/**
	 * Clear element cache
	 * Called after any action that might change screen elements
	 */
	private clearElementCache(): void {
		this._cachedElements = null;
	}

	public async setOrientation(orientation: Orientation): Promise<void> {
		const wda = await this.wda();
		await wda.setOrientation(orientation);

		// Clear screen size cache since orientation changed
		this._cachedScreenSize = null;

		// Clear element cache since orientation changed
		this.clearElementCache();
	}

	public async getOrientation(): Promise<Orientation> {
		const wda = await this.wda();
		return wda.getOrientation();
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
	 * Hide soft keyboard (simulator version)
	 * Uses WDA to dismiss keyboard
	 */
	public async hideKeyboard(): Promise<void> {
		try {
			const wda = await this.wda();
			// Try to dismiss keyboard by tapping outside or sending return
			// WDA has built-in keyboard dismissal logic
			try {
				// Get screen size and tap in safe area (top of screen)
				const screenSize = await this.getScreenSize();
				await wda.tap(screenSize.width / 2, 50);
			} catch {
				// Ignore if tap fails
			}
		} catch (error) {
			// Ignore errors - keyboard might not be present
		}
	}

	/**
	 * Select option by text in native picker (simulator version)
	 * Same implementation as IosRobot
	 */
	public async selectOptionByText(text: string, maxScrollAttempts: number = 10): Promise<boolean> {
		const textLower = text.toLowerCase();

		for (let attempt = 0; attempt < maxScrollAttempts; attempt++) {
			const elements = await this.getElementsOnScreen();

			const option = elements.find(el =>
				(el.text || "").toLowerCase().includes(textLower) ||
				(el.label || "").toLowerCase().includes(textLower) ||
				(el.value || "").toLowerCase().includes(textLower)
			);

			if (option) {
				const tapX = option.rect.x + Math.floor(option.rect.width / 2);
				const tapY = option.rect.y + Math.floor(option.rect.height / 2);
				await this.tap(tapX, tapY);
				return true;
			}

			const screenSize = await this.getScreenSize();
			const centerX = Math.floor(screenSize.width / 2);
			const centerY = Math.floor(screenSize.height * 0.6);

			await this.swipeFromCoordinate(centerX, centerY, "up", 100);
			await new Promise(resolve => setTimeout(resolve, 200));
		}

		return false;
	}

	/**
	 * Swipe inside a specific element (simulator version)
	 * Same implementation as IosRobot
	 */
	public async swipeInElement(element: ScreenElement, direction: SwipeDirection, distance?: number): Promise<void> {
		const centerX = Math.floor(element.rect.x + element.rect.width / 2);
		const centerY = Math.floor(element.rect.y + element.rect.height / 2);

		let swipeDistance: number;
		if (distance) {
			swipeDistance = distance;
		} else {
			if (direction === "up" || direction === "down") {
				swipeDistance = Math.floor(element.rect.height * 0.7);
			} else {
				swipeDistance = Math.floor(element.rect.width * 0.7);
			}
		}

		await this.swipeFromCoordinate(centerX, centerY, direction, swipeDistance);
	}

	/**
	 * Get clipboard content from simulator
	 */
	public async getClipboard(): Promise<string> {
		try {
			const result = execFileSync("xcrun", [
				"simctl",
				"pbpaste",
				this.simulatorUuid
			]).toString();
			return result;
		} catch (error) {
			console.error("Failed to get clipboard:", error);
			return "";
		}
	}

	/**
	 * Set clipboard content on simulator
	 */
	public async setClipboard(text: string): Promise<void> {
		try {
			execFileSync("xcrun", [
				"simctl",
				"pbcopy",
				this.simulatorUuid
			], {
				input: text
			});
		} catch (error) {
			throw new Error(`Failed to set clipboard: ${error}`);
		}
	}

	/**
	 * Clear clipboard content
	 */
	public async clearClipboard(): Promise<void> {
		await this.setClipboard("");
	}

	/**
	 * Cleanup - dispose WebDriver session
	 * Should be called when Robot is disposed or tests are complete
	 */
	public async dispose(): Promise<void> {
		if (this.wdaInstance) {
			await this.wdaInstance.dispose();
			this.wdaInstance = null;
		}
	}
}

export class SimctlManager {

	public listSimulators(): Simulator[] {
		// detect if this is a mac
		if (process.platform !== "darwin") {
			// don't even try to run xcrun
			return [];
		}

		try {
			const text = execFileSync("xcrun", ["simctl", "list", "devices", "-j"]).toString();
			const json: ListDevicesResponse = JSON.parse(text);
			return Object.values(json.devices).flatMap(device => {
				return device.map(d => {
					return {
						name: d.name,
						uuid: d.udid,
						state: d.state,
					};
				});
			});
		} catch (error) {
			console.error("Error listing simulators", error);
			return [];
		}
	}

	public listBootedSimulators(): Simulator[] {
		return this.listSimulators()
			.filter(simulator => simulator.state === "Booted");
	}

	public getSimulator(uuid: string): Simctl {
		return new Simctl(uuid);
	}
}
