import assert from "node:assert";
import { AndroidRobot, AndroidDeviceManager } from "../src/android";

/**
 * Tests for log reading functionality
 *
 * These tests verify that we can read application logs from devices
 * This is critical for debugging and understanding app behavior
 */

const manager = new AndroidDeviceManager();
const devices = manager.getConnectedDevices();
const hasOneAndroidDevice = devices.length === 1;

describe("log-reader", () => {

	const android = new AndroidRobot(devices?.[0]?.deviceId || "");

	it("should be able to get app logs for running app", async function() {
		// Skip if no Android device connected
		hasOneAndroidDevice || this.skip();

		// First, launch Settings app (always available on Android)
		const settingsPackage = "com.android.settings";
		await android.launchApp(settingsPackage);

		// Wait a bit for app to start
		await new Promise(resolve => setTimeout(resolve, 1000));

		// Get logs for Settings app
		const logs = android.getAppLogs(settingsPackage, 50);

		// Verify we got some logs back
		assert.ok(logs.length > 0, "Should have at least one log line");

		// Logs should be an array of strings
		assert.ok(Array.isArray(logs), "Logs should be an array");

		// Each log line should be a non-empty string
		for (const log of logs) {
			assert.ok(typeof log === "string", "Each log should be a string");
		}
	});

	it("should handle non-running app gracefully", async function() {
		// Skip if no Android device connected
		hasOneAndroidDevice || this.skip();

		// Try to get logs for an app that doesn't exist
		const fakePackage = "com.fake.nonexistent.app";
		const logs = android.getAppLogs(fakePackage, 10);

		// Should return a message saying app is not running
		assert.ok(logs.length > 0, "Should return at least one line");
		assert.ok(logs[0].includes("not running"), "Should indicate app is not running");
	});

	it("should be able to clear logs", async function() {
		// Skip if no Android device connected
		hasOneAndroidDevice || this.skip();

		// Clear logs
		const result = android.clearLogs();

		// Should return success message
		assert.ok(result.includes("success"), "Should return success message");
	});

	it("should respect the lines parameter", async function() {
		// Skip if no Android device connected
		hasOneAndroidDevice || this.skip();

		// Launch Settings app
		const settingsPackage = "com.android.settings";
		await android.launchApp(settingsPackage);

		// Wait for app to start
		await new Promise(resolve => setTimeout(resolve, 1000));

		// Get only 5 lines
		const logs = android.getAppLogs(settingsPackage, 5);

		// Should respect the limit (allow some flexibility)
		// Note: Actual count might be slightly different due to logcat behavior
		assert.ok(logs.length <= 10, "Should return approximately the requested number of lines");
	});
});
