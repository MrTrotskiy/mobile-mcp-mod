/**
 * Visual Touch Indicators
 *
 * This module enables/disables visual indicators for touch interactions on screen.
 * Useful for debugging, demonstrations, and recording test runs.
 *
 * Features:
 * - Show touch points when tapping (circles at tap location)
 * - Show pointer location and coordinates
 * - Configurable for Android and iOS
 *
 * Purpose: Make it easy to see where AI/automation is interacting with the app
 */

import { execFileSync } from "child_process";

export interface TouchIndicatorSettings {
  showTouches: boolean; // Show circles at touch points
  showPointerLocation: boolean; // Show pointer trails and coordinates
}

export class VisualTouchIndicators {
	/**
   * Enable touch indicators on Android device
   */
	enableAndroidTouchIndicators(
		deviceId: string,
		settings: TouchIndicatorSettings = {
			showTouches: true,
			showPointerLocation: false
		}
	): string {
		try {
			// Enable show touches (circles at tap points)
			if (settings.showTouches) {
				execFileSync("adb", [
					"-s", deviceId,
					"shell", "settings", "put", "system", "show_touches", "1"
				]);
			}

			// Enable pointer location (shows coordinates and trails)
			if (settings.showPointerLocation) {
				execFileSync("adb", [
					"-s", deviceId,
					"shell", "settings", "put", "system", "pointer_location", "1"
				]);
			}

			let message = "✅ Touch indicators enabled:\n";
			if (settings.showTouches) {
				message += "- Show touches: ON (circles at tap points)\n";
			}
			if (settings.showPointerLocation) {
				message += "- Pointer location: ON (coordinates and trails)\n";
			}

			return message;
		} catch (error) {
			throw new Error(`Failed to enable touch indicators: ${error}`);
		}
	}

	/**
   * Disable touch indicators on Android device
   */
	disableAndroidTouchIndicators(deviceId: string): string {
		try {
			// Disable show touches
			execFileSync("adb", [
				"-s", deviceId,
				"shell", "settings", "put", "system", "show_touches", "0"
			]);

			// Disable pointer location
			execFileSync("adb", [
				"-s", deviceId,
				"shell", "settings", "put", "system", "pointer_location", "0"
			]);

			return "✅ Touch indicators disabled";
		} catch (error) {
			throw new Error(`Failed to disable touch indicators: ${error}`);
		}
	}

	/**
   * Get current touch indicator settings on Android
   */
	getAndroidTouchIndicatorStatus(deviceId: string): TouchIndicatorSettings {
		try {
			// Check show touches
			const showTouchesResult = execFileSync("adb", [
				"-s", deviceId,
				"shell", "settings", "get", "system", "show_touches"
			]).toString().trim();

			// Check pointer location
			const pointerLocationResult = execFileSync("adb", [
				"-s", deviceId,
				"shell", "settings", "get", "system", "pointer_location"
			]).toString().trim();

			return {
				showTouches: showTouchesResult === "1",
				showPointerLocation: pointerLocationResult === "1"
			};
		} catch (error) {
			// If settings don't exist, assume disabled
			return {
				showTouches: false,
				showPointerLocation: false
			};
		}
	}

	/**
   * Enable touch indicators on iOS Simulator
   */
	enableIOSTouchIndicators(deviceId: string): string {
		try {
			// iOS Simulator: Enable internal touches via defaults
			execFileSync("xcrun", [
				"simctl", "spawn", deviceId,
				"defaults", "write", "com.apple.iphonesimulator",
				"ShowSingleTouches", "1"
			]);

			return "✅ Touch indicators enabled on iOS Simulator\n- Single touches will be shown as circles";
		} catch (error) {
			// Fallback message - iOS touch indicators are limited
			return "⚠️ iOS touch indicators have limited support in simulator.\n" +
             "For physical devices, enable 'AssistiveTouch' in Settings > Accessibility.";
		}
	}

	/**
   * Disable touch indicators on iOS Simulator
   */
	disableIOSTouchIndicators(deviceId: string): string {
		try {
			execFileSync("xcrun", [
				"simctl", "spawn", deviceId,
				"defaults", "write", "com.apple.iphonesimulator",
				"ShowSingleTouches", "0"
			]);

			return "✅ Touch indicators disabled on iOS Simulator";
		} catch (error) {
			return "✅ Touch indicators disabled (or were not enabled)";
		}
	}

	/**
   * Toggle touch indicators (enable if disabled, disable if enabled)
   */
	toggleAndroidTouchIndicators(deviceId: string): string {
		const currentStatus = this.getAndroidTouchIndicatorStatus(deviceId);

		if (currentStatus.showTouches) {
			return this.disableAndroidTouchIndicators(deviceId);
		} else {
			return this.enableAndroidTouchIndicators(deviceId);
		}
	}

	/**
   * Quick enable for demos/recordings (both touches and pointer)
   */
	enableDemoMode(deviceId: string, platform: "android" | "ios"): string {
		if (platform === "android") {
			return this.enableAndroidTouchIndicators(deviceId, {
				showTouches: true,
				showPointerLocation: true
			});
		} else {
			return this.enableIOSTouchIndicators(deviceId);
		}
	}
}
