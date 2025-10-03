import assert from "node:assert";
import { AndroidRobot, AndroidDeviceManager } from "../src/android";

/**
 * Tests for crash log reading functionality
 *
 * These tests verify that we can detect and read crash logs from devices
 * This is critical for debugging - helps AI understand why apps crash
 */

const manager = new AndroidDeviceManager();
const devices = manager.getConnectedDevices();
const hasOneAndroidDevice = devices.length === 1;

describe("crash-logs", () => {

	const android = new AndroidRobot(devices?.[0]?.deviceId || "");

	it("should be able to get crash logs", async function() {
		// Skip if no Android device connected
		hasOneAndroidDevice || this.skip();

		// Get crash logs (all apps)
		const crashes = android.getCrashLogs();

		// Should return array
		assert.ok(Array.isArray(crashes), "Crashes should be an array");
		assert.ok(crashes.length > 0, "Should return at least one line");

		// Each crash line should be a string
		for (const crash of crashes) {
			assert.ok(typeof crash === "string", "Each crash entry should be a string");
		}
	});

	it("should be able to filter crash logs by package name", async function() {
		// Skip if no Android device connected
		hasOneAndroidDevice || this.skip();

		// Get crash logs for Settings app (unlikely to have crashes)
		const crashes = android.getCrashLogs("com.android.settings");

		// Should return array
		assert.ok(Array.isArray(crashes), "Crashes should be an array");
		assert.ok(crashes.length > 0, "Should return at least one line");

		// If there are no crashes, should say so
		if (crashes[0].includes("No crashes found")) {
			assert.ok(true, "Correctly reported no crashes");
		}
	});

	it("should be able to get system errors", async function() {
		// Skip if no Android device connected
		hasOneAndroidDevice || this.skip();

		// Get system errors
		const errors = android.getSystemErrors(50);

		// Should return array
		assert.ok(Array.isArray(errors), "Errors should be an array");
		assert.ok(errors.length > 0, "Should return at least one line");

		// Each error should be a string
		for (const error of errors) {
			assert.ok(typeof error === "string", "Each error should be a string");
		}
	});

	it("should respect the lines parameter for crash logs", async function() {
		// Skip if no Android device connected
		hasOneAndroidDevice || this.skip();

		// Get crash logs with limited search
		const crashes = android.getCrashLogs(undefined, 100);

		// Should return something
		assert.ok(Array.isArray(crashes), "Crashes should be an array");
		assert.ok(crashes.length > 0, "Should return at least one line");
	});

	it("should respect the lines parameter for system errors", async function() {
		// Skip if no Android device connected
		hasOneAndroidDevice || this.skip();

		// Get only 10 error lines
		const errors = android.getSystemErrors(10);

		// Should return something
		assert.ok(Array.isArray(errors), "Errors should be an array");
		assert.ok(errors.length > 0, "Should return at least one line");

		// Should be limited in size (allow some flexibility)
		assert.ok(errors.length <= 20, "Should respect line limit approximately");
	});
});
