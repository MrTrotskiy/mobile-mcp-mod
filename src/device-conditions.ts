/**
 * Device Conditions Simulation Module
 *
 * Allows simulating various device conditions for testing:
 * - Battery level
 * - Network conditions (WiFi, 4G, 3G, offline)
 * - Geolocation
 * - Airplane mode
 */

import { execFileSync } from "child_process";

/**
 * Network condition types
 */
export type NetworkCondition = "wifi" | "4g" | "3g" | "2g" | "offline" | "none";

/**
 * Device Conditions Manager
 *
 * Provides methods to simulate various device conditions for testing.
 * Primarily supports Android devices.
 */
export class DeviceConditions {
	/**
	 * Set battery level on device (Android only)
	 *
	 * Simulates different battery levels for testing battery-dependent features.
	 * Useful for testing low battery warnings, battery optimizations, etc.
	 *
	 * @param deviceId - Device identifier
	 * @param percent - Battery level percentage (0-100)
	 */
	async setBatteryLevel(deviceId: string, percent: number): Promise<void> {
		if (percent < 0 || percent > 100) {
			throw new Error("Battery level must be between 0 and 100");
		}

		try {
			// Set battery level using dumpsys
			execFileSync("adb", [
				"-s",
				deviceId,
				"shell",
				"dumpsys",
				"battery",
				"set",
				"level",
				percent.toString()
			]);

			console.log(`Battery level set to ${percent}%`);
		} catch (error: any) {
			throw new Error(`Failed to set battery level: ${error.message}`);
		}
	}

	/**
	 * Reset battery to normal mode (disable simulation)
	 *
	 * @param deviceId - Device identifier
	 */
	async resetBattery(deviceId: string): Promise<void> {
		try {
			execFileSync("adb", [
				"-s",
				deviceId,
				"shell",
				"dumpsys",
				"battery",
				"reset"
			]);

			console.log("Battery simulation reset");
		} catch (error: any) {
			throw new Error(`Failed to reset battery: ${error.message}`);
		}
	}

	/**
	 * Enable/disable airplane mode on device (Android only)
	 *
	 * Note: Requires proper permissions and may not work on all devices.
	 *
	 * @param deviceId - Device identifier
	 * @param enable - True to enable, false to disable
	 */
	async setAirplaneMode(deviceId: string, enable: boolean): Promise<void> {
		try {
			const value = enable ? "1" : "0";

			// Set airplane mode setting
			execFileSync("adb", [
				"-s",
				deviceId,
				"shell",
				"settings",
				"put",
				"global",
				"airplane_mode_on",
				value
			]);

			// Broadcast intent to apply changes
			execFileSync("adb", [
				"-s",
				deviceId,
				"shell",
				"am",
				"broadcast",
				"-a",
				"android.intent.action.AIRPLANE_MODE",
				"--ez",
				"state",
				enable.toString()
			]);

			console.log(`Airplane mode ${enable ? "enabled" : "disabled"}`);
		} catch (error: any) {
			throw new Error(`Failed to set airplane mode: ${error.message}`);
		}
	}

	/**
	 * Enable/disable WiFi on device (Android only)
	 *
	 * @param deviceId - Device identifier
	 * @param enable - True to enable, false to disable
	 */
	async setWiFi(deviceId: string, enable: boolean): Promise<void> {
		try {
			const command = enable ? "enable" : "disable";

			execFileSync("adb", [
				"-s",
				deviceId,
				"shell",
				"svc",
				"wifi",
				command
			]);

			console.log(`WiFi ${enable ? "enabled" : "disabled"}`);
		} catch (error: any) {
			throw new Error(`Failed to set WiFi: ${error.message}`);
		}
	}

	/**
	 * Enable/disable mobile data on device (Android only)
	 *
	 * @param deviceId - Device identifier
	 * @param enable - True to enable, false to disable
	 */
	async setMobileData(deviceId: string, enable: boolean): Promise<void> {
		try {
			const command = enable ? "enable" : "disable";

			execFileSync("adb", [
				"-s",
				deviceId,
				"shell",
				"svc",
				"data",
				command
			]);

			console.log(`Mobile data ${enable ? "enabled" : "disabled"}`);
		} catch (error: any) {
			throw new Error(`Failed to set mobile data: ${error.message}`);
		}
	}

	/**
	 * Set network condition simulation
	 *
	 * Simulates different network conditions for testing.
	 *
	 * @param deviceId - Device identifier
	 * @param condition - Network condition to simulate
	 */
	async setNetworkCondition(
		deviceId: string,
		condition: NetworkCondition
	): Promise<string> {
		switch (condition) {
			case "offline":
			// Enable airplane mode to simulate offline
				await this.setAirplaneMode(deviceId, true);
				return "Network set to offline (airplane mode enabled)";

			case "none":
			// Disable both WiFi and mobile data
				await this.setWiFi(deviceId, false);
				await this.setMobileData(deviceId, false);
				return "Network disabled (WiFi and mobile data off)";

			case "wifi":
			// Enable WiFi, disable mobile data
				await this.setWiFi(deviceId, true);
				await this.setMobileData(deviceId, false);
				return "Network set to WiFi only";

			case "4g":
			case "3g":
			case "2g":
			// Enable mobile data, disable WiFi
				await this.setWiFi(deviceId, false);
				await this.setMobileData(deviceId, true);
				return `Network set to mobile data (${condition}).\nNote: Actual speed throttling requires additional tools.`;

			default:
				throw new Error(`Unknown network condition: ${condition}`);
		}
	}

	/**
	 * Set device geolocation (Android emulator only)
	 *
	 * Sets GPS coordinates for testing location-based features.
	 *
	 * @param deviceId - Device identifier
	 * @param latitude - Latitude coordinate
	 * @param longitude - Longitude coordinate
	 */
	async setGeolocation(
		deviceId: string,
		latitude: number,
		longitude: number
	): Promise<void> {
		try {
			// Set geolocation using emu geo command (emulator only)
			execFileSync("adb", [
				"-s",
				deviceId,
				"emu",
				"geo",
				"fix",
				longitude.toString(),
				latitude.toString()
			]);

			console.log(`Geolocation set to ${latitude}, ${longitude}`);
		} catch (error: any) {
			// Fallback: try broadcast intent method
			try {
				execFileSync("adb", [
					"-s",
					deviceId,
					"shell",
					"am",
					"broadcast",
					"-a",
					"android.location.GPS_ENABLED_CHANGE",
					"--ez",
					"enabled",
					"true"
				]);

				console.log(`Geolocation enabled (coordinates not set - emulator only feature)`);
			} catch {
				throw new Error(`Failed to set geolocation: ${error.message}. Note: This feature works only on emulators.`);
			}
		}
	}

	/**
	 * Get current battery status
	 *
	 * @param deviceId - Device identifier
	 * @returns Battery status information
	 */
	async getBatteryStatus(deviceId: string): Promise<{
		level: number;
		status: string;
		health: string;
	}> {
		try {
			const output = execFileSync("adb", [
				"-s",
				deviceId,
				"shell",
				"dumpsys",
				"battery"
			]).toString();

			// Parse battery info
			const levelMatch = output.match(/level: (\d+)/);
			const statusMatch = output.match(/status: (\d+)/);
			const healthMatch = output.match(/health: (\d+)/);

			const level = levelMatch ? parseInt(levelMatch[1], 10) : 0;
			const statusCode = statusMatch ? parseInt(statusMatch[1], 10) : 0;
			const healthCode = healthMatch ? parseInt(healthMatch[1], 10) : 0;

			// Status codes: 1=Unknown, 2=Charging, 3=Discharging, 4=Not charging, 5=Full
			const statusMap: Record<number, string> = {
				1: "Unknown",
				2: "Charging",
				3: "Discharging",
				4: "Not charging",
				5: "Full"
			};

			// Health codes: 1=Unknown, 2=Good, 3=Overheat, 4=Dead, 5=Over voltage, 6=Unspecified failure, 7=Cold
			const healthMap: Record<number, string> = {
				1: "Unknown",
				2: "Good",
				3: "Overheat",
				4: "Dead",
				5: "Over voltage",
				6: "Unspecified failure",
				7: "Cold"
			};

			return {
				level,
				status: statusMap[statusCode] || "Unknown",
				health: healthMap[healthCode] || "Unknown"
			};
		} catch (error: any) {
			throw new Error(`Failed to get battery status: ${error.message}`);
		}
	}
}
