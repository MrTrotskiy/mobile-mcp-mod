import { Socket } from "node:net";
import { execFileSync } from "node:child_process";

import { WebDriverAgent } from "./webdriver-agent";
import { ActionableError, Button, InstalledApp, Robot, ScreenSize, SwipeDirection, ScreenElement, Orientation } from "./robot";
import { WaitCondition, WaitResult, waitForCondition } from "./wait-conditions";

const WDA_PORT = 8100;
const IOS_TUNNEL_PORT = 60105;

// Cache TTL for element queries (in milliseconds)
// Elements are cached for 200ms to avoid duplicate queries
// Cache is cleared after any action (tap, swipe, etc.)
const ELEMENT_CACHE_TTL = 200;

interface CachedElements {
	data: ScreenElement[];
	timestamp: number;
}

interface ListCommandOutput {
	deviceList: string[];
}

interface VersionCommandOutput {
	version: string;
}

interface InfoCommandOutput {
	DeviceClass: string;
	DeviceName: string;
	ProductName: string;
	ProductType: string;
	ProductVersion: string;
	PhoneNumber: string;
	TimeZone: string;
}

export interface IosDevice {
	deviceId: string;
	deviceName: string;
}

const getGoIosPath = (): string => {
	if (process.env.GO_IOS_PATH) {
		return process.env.GO_IOS_PATH;
	}

	// fallback to go-ios in PATH via `npm install -g go-ios`
	return "ios";
};

export class IosRobot implements Robot {

	private wdaInstance: WebDriverAgent | null = null;
	private _cachedScreenSize: ScreenSize | null = null;
	private _cachedElements: CachedElements | null = null;
	private _wdaInitialized = false; // Track if WDA was checked

	public constructor(private deviceId: string) {
	}

	private isListeningOnPort(port: number): Promise<boolean> {
		return new Promise((resolve, reject) => {
			const client = new Socket();
			client.connect(port, "localhost", () => {
				client.destroy();
				resolve(true);
			});

			client.on("error", (err: any) => {
				resolve(false);
			});
		});
	}

	private async isTunnelRunning(): Promise<boolean> {
		return await this.isListeningOnPort(IOS_TUNNEL_PORT);
	}

	private async isWdaForwardRunning(): Promise<boolean> {
		return await this.isListeningOnPort(WDA_PORT);
	}

	private async assertTunnelRunning(): Promise<void> {
		if (await this.isTunnelRequired()) {
			if (!(await this.isTunnelRunning())) {
				throw new ActionableError("iOS tunnel is not running, please see https://github.com/MrTrotskiy/mobilepixel/wiki/");
			}
		}
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

		// First time initialization - check tunnel and WDA
		await this.assertTunnelRunning();

		if (!(await this.isWdaForwardRunning())) {
			throw new ActionableError("Port forwarding to WebDriverAgent is not running (tunnel okay), please see https://github.com/MrTrotskiy/mobilepixel/wiki/");
		}

		const wda = new WebDriverAgent("localhost", WDA_PORT);

		if (!(await wda.isRunning())) {
			throw new ActionableError("WebDriverAgent is not running on device (tunnel okay, port forwarding okay), please see https://github.com/MrTrotskiy/mobilepixel/wiki/");
		}

		// Cache the WDA instance and mark as initialized
		this.wdaInstance = wda;
		this._wdaInitialized = true;
		return wda;
	}

	private async ios(...args: string[]): Promise<string> {
		return execFileSync(getGoIosPath(), ["--udid", this.deviceId, ...args], {}).toString();
	}

	public async getIosVersion(): Promise<string> {
		const output = await this.ios("info");
		const json = JSON.parse(output);
		return json.ProductVersion;
	}

	private async isTunnelRequired(): Promise<boolean> {
		const version = await this.getIosVersion();
		const args = version.split(".");
		return parseInt(args[0], 10) >= 17;
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

	public async listApps(): Promise<InstalledApp[]> {
		await this.assertTunnelRunning();

		const output = await this.ios("apps", "--all", "--list");
		return output
			.split("\n")
			.map(line => {
				const [packageName, appName] = line.split(" ");
				return {
					packageName,
					appName,
				};
			});
	}

	public async launchApp(packageName: string): Promise<void> {
		await this.assertTunnelRunning();
		await this.ios("launch", packageName);
	}

	public async terminateApp(packageName: string): Promise<void> {
		await this.assertTunnelRunning();
		await this.ios("kill", packageName);
	}

	public async openUrl(url: string): Promise<void> {
		const wda = await this.wda();
		await wda.openUrl(url);
	}

	public async sendKeys(text: string): Promise<void> {
		const wda = await this.wda();
		await wda.sendKeys(text);

		// Clear element cache after sending keys
		this.clearElementCache();
	}

	public async pressButton(button: Button): Promise<void> {
		const wda = await this.wda();
		await wda.pressButton(button);

		// Clear element cache after button press
		this.clearElementCache();
	}

	public async tap(x: number, y: number): Promise<void> {
		const wda = await this.wda();
		await wda.tap(x, y);

		// Clear element cache after tap
		this.clearElementCache();
	}

	public async longPress(x: number, y: number): Promise<void> {
		const wda = await this.wda();
		await wda.longPress(x, y);

		// Clear element cache after long press
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

	public async getScreenshot(): Promise<Buffer> {
		const wda = await this.wda();
		return await wda.getScreenshot();

		/* alternative:
		await this.assertTunnelRunning();
		const tmpFilename = path.join(tmpdir(), `screenshot-${randomBytes(8).toString("hex")}.png`);
		await this.ios("screenshot", "--output", tmpFilename);
		const buffer = readFileSync(tmpFilename);
		unlinkSync(tmpFilename);
		return buffer;
		*/
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
		return await wda.getOrientation();
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
	 * Get application logs from iOS device
	 *
	 * Returns recent log entries for a specific app bundle
	 * This helps with debugging by showing what the app is logging
	 *
	 * Note: Currently not fully implemented for physical devices
	 * Physical devices require more complex setup with devicectl
	 *
	 * @param bundleId - Bundle ID of the app (e.g., "com.example.app")
	 * @param lines - Number of most recent log lines to return (default: 100)
	 * @returns Array of log lines as strings
	 */
	public getAppLogs(bundleId: string, lines: number = 100): string[] {
		// iOS logging is more complex than Android
		// For simulators we could use: xcrun simctl spawn booted log show
		// For physical devices we need: devicectl or go-ios

		// For now, return a placeholder message
		// Full implementation will come in future iterations
		return [
			`iOS log reading not yet fully implemented`,
			`Bundle ID: ${bundleId}`,
			`Requested lines: ${lines}`,
			`Note: iOS physical device logging requires additional tools`,
			`For simulators, use: xcrun simctl spawn booted log show --predicate 'process == "${bundleId}"' --last ${lines}`
		];
	}

	/**
	 * Clear logs on iOS device
	 *
	 * iOS doesn't support clearing logs programmatically
	 * This is a platform limitation from Apple
	 *
	 * @returns Message explaining limitation
	 */
	public clearLogs(): string {
		// iOS doesn't allow clearing logs programmatically
		// This is a platform limitation from Apple
		return "iOS logs cannot be cleared programmatically (platform limitation)";
	}

	/**
	 * Get crash logs from iOS device
	 *
	 * For iOS, crash reports are stored in DiagnosticReports
	 * Physical devices require complex setup to access these
	 *
	 * This is critical for debugging - helps Cursor AI see why apps crash
	 *
	 * @param bundleId - Optional bundle ID to filter crashes
	 * @param lines - Not used for iOS (kept for API consistency)
	 * @returns Array of crash log entries or placeholder message
	 */
	public getCrashLogs(bundleId?: string, lines: number = 500): string[] {
		// iOS crash logs are stored in:
		// Simulator: ~/Library/Logs/DiagnosticReports/
		// Physical device: Requires devicectl or go-ios with complex setup

		// For now, return placeholder message
		// Full implementation will come in future iterations
		return [
			"iOS crash log reading not yet fully implemented",
			bundleId ? `Bundle ID: ${bundleId}` : "All apps",
			"Note: iOS crash logs require access to DiagnosticReports",
			"For simulators: Check ~/Library/Logs/DiagnosticReports/",
			"For physical devices: Requires devicectl or go-ios setup"
		];
	}

	/**
	 * Get system error logs from iOS device
	 *
	 * iOS system logs are available through log show command
	 * But physical devices require complex setup
	 *
	 * Helps Cursor AI understand system-level issues
	 *
	 * @param lines - Number of recent log lines to return
	 * @returns Array of system error log entries or placeholder message
	 */
	public getSystemErrors(lines: number = 100): string[] {
		// iOS system logs can be accessed via:
		// Simulator: log show --predicate 'messageType == "Error"' --last 1h
		// Physical device: Requires devicectl or go-ios

		// For now, return placeholder message
		// Full implementation will come in future iterations
		return [
			"iOS system error reading not yet fully implemented",
			`Requested lines: ${lines}`,
			"Note: iOS system errors require log show command",
			"For simulators: Use 'log show --predicate \"messageType == \\\"Error\\\"\" --last 1h'",
			"For physical devices: Requires devicectl or go-ios setup"
		];
	}

	/**
	 * Get clipboard content from device (iOS Simulator only)
	 *
	 * Uses simctl pbpaste to read clipboard content.
	 * Returns empty string if clipboard is empty or on physical device.
	 */
	public async getClipboard(): Promise<string> {
		try {
			// Use simctl pbpaste for simulator
			const result = execFileSync("xcrun", [
				"simctl",
				"pbpaste",
				this.deviceId
			]).toString();
			return result;
		} catch (error) {
			// Failed to get clipboard (might be physical device or empty)
			console.error("Failed to get clipboard:", error);
			return "";
		}
	}

	/**
	 * Set clipboard content on device (iOS Simulator only)
	 *
	 * @param text - Text to set in clipboard
	 */
	public async setClipboard(text: string): Promise<void> {
		try {
			// Use simctl pbcopy for simulator
			execFileSync("xcrun", [
				"simctl",
				"pbcopy",
				this.deviceId
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
	 * Set HTTP proxy for iOS device
	 *
	 * Allows intercepting network traffic through proxy server
	 * Required for network monitoring
	 *
	 * Note: iOS proxy setup is more complex than Android
	 * Requires manual configuration or MDM profile
	 *
	 * @param host - Proxy server host
	 * @param port - Proxy server port
	 * @returns Message about setup process
	 */
	public setProxy(host: string, port: number): string {
		// iOS doesn't allow programmatic proxy setup via command line
		// Requires either:
		// 1. Manual configuration in Settings > Wi-Fi > Configure Proxy
		// 2. MDM (Mobile Device Management) profile
		// 3. iOS simulator with simctl (for simulators only)

		return `iOS proxy setup requires manual configuration:\n` +
			`1. Go to Settings > Wi-Fi\n` +
			`2. Tap (i) next to connected network\n` +
			`3. Scroll to HTTP Proxy > Manual\n` +
			`4. Server: ${host}, Port: ${port}\n` +
			`5. Tap Save\n` +
			`Alternatively, install mitmproxy certificate for HTTPS.`;
	}

	/**
	 * Clear HTTP proxy for iOS device
	 *
	 * @returns Message about clearing proxy
	 */
	public clearProxy(): string {
		return `iOS proxy clearing requires manual configuration:\n` +
			`1. Go to Settings > Wi-Fi\n` +
			`2. Tap (i) next to connected network\n` +
			`3. Scroll to HTTP Proxy > Off\n` +
			`4. Tap Save`;
	}

	/**
	 * Get current proxy settings for iOS
	 *
	 * @returns Message about checking proxy
	 */
	public getProxy(): string {
		return `iOS proxy settings are not accessible programmatically.\n` +
			`Check manually: Settings > Wi-Fi > (i) > HTTP Proxy`;
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

export class IosManager {

	public isGoIosInstalled(): boolean {
		try {
			const output = execFileSync(getGoIosPath(), ["version"], { stdio: ["pipe", "pipe", "ignore"] }).toString();
			const json: VersionCommandOutput = JSON.parse(output);
			return json.version !== undefined && (json.version.startsWith("v") || json.version === "local-build");
		} catch (error) {
			return false;
		}
	}

	public getDeviceName(deviceId: string): string {
		const output = execFileSync(getGoIosPath(), ["info", "--udid", deviceId]).toString();
		const json: InfoCommandOutput = JSON.parse(output);
		return json.DeviceName;
	}

	public listDevices(): IosDevice[] {
		if (!this.isGoIosInstalled()) {
			console.error("go-ios is not installed, no physical iOS devices can be detected");
			return [];
		}

		const output = execFileSync(getGoIosPath(), ["list"]).toString();
		const json: ListCommandOutput = JSON.parse(output);
		const devices = json.deviceList.map(device => ({
			deviceId: device,
			deviceName: this.getDeviceName(device),
		}));

		return devices;
	}
}
