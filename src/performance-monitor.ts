/**
 * Performance Monitoring Module
 *
 * Monitors app performance metrics like CPU, memory, FPS.
 * Supports Android devices (iOS support limited).
 */

import { execFileSync } from "child_process";

/**
 * Performance metrics snapshot
 */
export interface PerformanceMetrics {
	// Timestamp when metrics were captured
	timestamp: number;

	// CPU usage percentage (0-100)
	cpu: number;

	// Memory usage in MB
	memory: number;

	// FPS (frames per second) - Android only
	fps: number;

	// Network bytes sent (future feature)
	networkSent: number;

	// Network bytes received (future feature)
	networkReceived: number;
}

/**
 * Performance Monitor Class
 *
 * Monitors app performance over time and provides metrics.
 */
export class PerformanceMonitor {
	private monitoring: boolean = false;
	private metrics: PerformanceMetrics[] = [];
	private intervalId: NodeJS.Timeout | null = null;
	private deviceId: string = "";
	private packageName: string = "";

	/**
   * Check if monitoring is active
   */
	isMonitoring(): boolean {
		return this.monitoring;
	}

	/**
   * Get current monitoring info
   */
	getMonitoringInfo(): { monitoring: boolean; deviceId: string; packageName: string; samplesCollected: number } {
		return {
			monitoring: this.monitoring,
			deviceId: this.deviceId,
			packageName: this.packageName,
			samplesCollected: this.metrics.length
		};
	}

	/**
   * Start monitoring app performance
   *
   * @param deviceId - Device identifier
   * @param packageName - App package name (Android: com.example.app, iOS: Bundle ID)
   * @param platform - Platform (android or ios)
   * @param interval - Sampling interval in milliseconds (default: 1000ms = 1 second)
   */
	async startMonitoring(
		deviceId: string,
		packageName: string,
		platform: "android" | "ios",
		interval: number = 1000
	): Promise<void> {
		if (this.monitoring) {
			throw new Error("Monitoring already in progress. Stop it first.");
		}

		this.monitoring = true;
		this.metrics = [];
		this.deviceId = deviceId;
		this.packageName = packageName;

		console.log(`Starting performance monitoring for ${packageName} on ${deviceId}`);

		// Collect metrics at intervals
		this.intervalId = setInterval(async () => {
			try {
				const metrics = await this.getCurrentMetrics(deviceId, packageName, platform);
				this.metrics.push(metrics);
			} catch (error: any) {
				console.error("Error collecting metrics:", error.message);
			}
		}, interval);
	}

	/**
   * Get current performance metrics snapshot
   *
   * @param deviceId - Device identifier
   * @param packageName - App package name
   * @param platform - Platform (android or ios)
   */
	async getCurrentMetrics(
		deviceId: string,
		packageName: string,
		platform: "android" | "ios"
	): Promise<PerformanceMetrics> {
		if (platform === "android") {
			return this.getAndroidMetrics(deviceId, packageName);
		} else {
			return this.getIosMetrics(deviceId, packageName);
		}
	}

	/**
   * Get Android app performance metrics
   */
	private async getAndroidMetrics(
		deviceId: string,
		packageName: string
	): Promise<PerformanceMetrics> {
		const timestamp = Date.now();
		let memory = 0;
		let cpu = 0;

		// Get memory info using dumpsys
		try {
			const meminfo = execFileSync("adb", [
				"-s",
				deviceId,
				"shell",
				"dumpsys",
				"meminfo",
				packageName
			]).toString();

			// Parse TOTAL memory from meminfo output
			// Format: "TOTAL   12345" (in KB)
			const memMatch = meminfo.match(/TOTAL\s+(\d+)/);
			if (memMatch) {
				memory = parseInt(memMatch[1], 10) / 1024; // Convert KB to MB
			}
		} catch (error) {
			console.error("Failed to get memory info:", error);
		}

		// Get CPU usage using top command
		try {
			const top = execFileSync("adb", [
				"-s",
				deviceId,
				"shell",
				"top",
				"-n",
				"1",
				"-b"
			]).toString();

			// Find line with package name and extract CPU percentage
			const lines = top.split("\n");
			for (const line of lines) {
				if (line.includes(packageName)) {
					// Top output format varies, but CPU is typically one of first columns
					// Example: "12345  1   0% S    123 1234567K com.example.app"
					const parts = line.trim().split(/\s+/);
					for (const part of parts) {
						if (part.includes("%")) {
							cpu = parseFloat(part.replace("%", ""));
							break;
						}
					}
					break;
				}
			}
		} catch (error) {
			console.error("Failed to get CPU info:", error);
		}

		return {
			timestamp,
			cpu,
			memory,
			fps: 60, // TODO: Get real FPS using dumpsys gfxinfo
			networkSent: 0, // TODO: Implement network tracking
			networkReceived: 0
		};
	}

	/**
   * Get iOS app performance metrics
   * Note: Limited support on iOS simulator
   */
	private async getIosMetrics(
		deviceId: string,
		packageName: string
	): Promise<PerformanceMetrics> {
		const timestamp = Date.now();

		// iOS performance monitoring is limited
		// Would need Instruments or other tools for real metrics
		console.warn("iOS performance monitoring has limited support");

		return {
			timestamp,
			cpu: 0,
			memory: 0,
			fps: 60,
			networkSent: 0,
			networkReceived: 0
		};
	}

	/**
   * Stop monitoring and return collected metrics
   */
	async stopMonitoring(): Promise<PerformanceMetrics[]> {
		if (!this.monitoring) {
			throw new Error("No monitoring in progress");
		}

		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = null;
		}

		this.monitoring = false;
		console.log(`Stopped monitoring. Collected ${this.metrics.length} samples.`);

		const result = this.metrics;
		this.metrics = [];
		this.deviceId = "";
		this.packageName = "";

		return result;
	}

	/**
   * Get all collected metrics without stopping
   */
	getMetrics(): PerformanceMetrics[] {
		return [...this.metrics];
	}

	/**
   * Calculate average metrics from collected samples
   */
	getAverageMetrics(): { cpu: number; memory: number; fps: number } | null {
		if (this.metrics.length === 0) {
			return null;
		}

		const sum = this.metrics.reduce(
			(acc, m) => ({
				cpu: acc.cpu + m.cpu,
				memory: acc.memory + m.memory,
				fps: acc.fps + m.fps
			}),
			{ cpu: 0, memory: 0, fps: 0 }
		);

		return {
			cpu: sum.cpu / this.metrics.length,
			memory: sum.memory / this.metrics.length,
			fps: sum.fps / this.metrics.length
		};
	}

	/**
   * Get peak (max) metrics from collected samples
   */
	getPeakMetrics(): { cpu: number; memory: number } | null {
		if (this.metrics.length === 0) {
			return null;
		}

		return {
			cpu: Math.max(...this.metrics.map(m => m.cpu)),
			memory: Math.max(...this.metrics.map(m => m.memory))
		};
	}
}
