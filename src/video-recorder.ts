/**
 * Video Recording Module
 *
 * Provides functionality to record device screen as video.
 * Supports both Android and iOS devices.
 */

import { execFile, ChildProcess } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const execFileAsync = promisify(execFile);

/**
 * Video recording options
 */
export interface VideoRecordingOptions {
	// Maximum recording time in seconds (default: 180 = 3 minutes)
	maxDuration?: number;

	// Video codec (Android only, default: h264)
	codec?: string;

	// Bit rate in bits per second (Android only, default: 4000000 = 4Mbps)
	bitRate?: number;

	// Video size (Android only, e.g., "1280x720")
	size?: string;
}

/**
 * Video Recorder Class
 *
 * Handles screen recording for Android and iOS devices.
 */
export class VideoRecorder {
	private recording: boolean = false;
	private recordingProcess: ChildProcess | null = null;
	private outputPath: string = "";
	private platform: "android" | "ios" | null = null;
	private deviceId: string = "";

	/**
   * Check if recording is in progress
   */
	isRecording(): boolean {
		return this.recording;
	}

	/**
   * Get current recording info
   */
	getRecordingInfo(): { recording: boolean; platform: string | null; deviceId: string; outputPath: string } {
		return {
			recording: this.recording,
			platform: this.platform,
			deviceId: this.deviceId,
			outputPath: this.outputPath
		};
	}

	/**
   * Start recording device screen
   *
   * @param deviceId - Device identifier
   * @param platform - Platform (android or ios)
   * @param options - Recording options
   */
	async startRecording(
		deviceId: string,
		platform: "android" | "ios",
		options: VideoRecordingOptions = {}
	): Promise<string> {
		if (this.recording) {
			throw new Error("Recording already in progress. Stop current recording first.");
		}

		// Create output directory if doesn't exist
		const outputDir = path.join(process.cwd(), "test", "recordings");
		if (!fs.existsSync(outputDir)) {
			fs.mkdirSync(outputDir, { recursive: true });
		}

		// Generate output file path with timestamp
		const timestamp = Date.now();
		this.outputPath = path.join(outputDir, `recording-${timestamp}.mp4`);
		this.platform = platform;
		this.deviceId = deviceId;

		if (platform === "android") {
			await this.startAndroidRecording(deviceId, options);
		} else {
			await this.startIosRecording(deviceId, options);
		}

		this.recording = true;
		return this.outputPath;
	}

	/**
   * Start Android screen recording using adb
   */
	private async startAndroidRecording(
		deviceId: string,
		options: VideoRecordingOptions
	): Promise<void> {
		// Build adb screenrecord command
		const args = ["-s", deviceId, "shell", "screenrecord"];

		// Add options
		if (options.maxDuration) {
			args.push("--time-limit", options.maxDuration.toString());
		} else {
			args.push("--time-limit", "180"); // Default 3 minutes
		}

		if (options.bitRate) {
			args.push("--bit-rate", options.bitRate.toString());
		}

		if (options.size) {
			args.push("--size", options.size);
		}

		// Output file on device
		args.push("/sdcard/mobilepixel-recording.mp4");

		console.log(`Starting Android recording: adb ${args.join(" ")}`);

		// Start recording process
		this.recordingProcess = execFile("adb", args, error => {
			// This callback is called when process exits
			if (error && this.recording) {
				console.error("Recording process error:", error);
			}
		});
	}

	/**
   * Start iOS screen recording using xcrun simctl
   */
	private async startIosRecording(
		deviceId: string,
		options: VideoRecordingOptions
	): Promise<void> {
		// Build xcrun simctl recordVideo command
		const args = ["simctl", "io", deviceId, "recordVideo"];

		// Add codec option
		args.push("--codec=h264");

		// Output file path
		args.push(this.outputPath);

		console.log(`Starting iOS recording: xcrun ${args.join(" ")}`);

		// Start recording process
		this.recordingProcess = execFile("xcrun", args, error => {
			// This callback is called when process exits
			if (error && this.recording) {
				console.error("Recording process error:", error);
			}
		});

		// For iOS, we need a small delay to ensure recording starts
		await new Promise(resolve => setTimeout(resolve, 500));
	}

	/**
   * Stop recording and retrieve video file
   *
   * @returns Video file buffer
   */
	async stopRecording(): Promise<{ path: string; size: number }> {
		if (!this.recording) {
			throw new Error("No recording in progress");
		}

		if (!this.recordingProcess) {
			throw new Error("Recording process not found");
		}

		console.log("Stopping recording...");

		// Send interrupt signal to stop recording
		this.recordingProcess.kill("SIGINT");

		// Wait for process to finish
		await new Promise(resolve => {
			if (this.recordingProcess) {
				this.recordingProcess.on("close", resolve);
				// Fallback timeout
				setTimeout(resolve, 3000);
			} else {
				resolve(null);
			}
		});

		// For Android, need to pull file from device
		if (this.platform === "android") {
			await this.pullAndroidRecording(this.deviceId);
		}

		// Check if file exists
		if (!fs.existsSync(this.outputPath)) {
			throw new Error(`Recording file not found: ${this.outputPath}`);
		}

		// Get file size
		const stats = fs.statSync(this.outputPath);
		const fileSizeInBytes = stats.size;

		// Reset state
		this.recording = false;
		this.recordingProcess = null;
		const resultPath = this.outputPath;
		this.outputPath = "";
		this.platform = null;
		this.deviceId = "";

		return {
			path: resultPath,
			size: fileSizeInBytes
		};
	}

	/**
   * Pull recording from Android device
   */
	private async pullAndroidRecording(deviceId: string): Promise<void> {
		console.log("Pulling recording from Android device...");

		// Wait a bit for file to be finalized
		await new Promise(resolve => setTimeout(resolve, 1000));

		// Pull file from device
		try {
			await execFileAsync("adb", [
				"-s",
				deviceId,
				"pull",
				"/sdcard/mobilepixel-recording.mp4",
				this.outputPath
			]);

			console.log(`Recording pulled to: ${this.outputPath}`);

			// Delete file from device
			await execFileAsync("adb", [
				"-s",
				deviceId,
				"shell",
				"rm",
				"/sdcard/mobilepixel-recording.mp4"
			]);

			console.log("Recording deleted from device");
		} catch (error: any) {
			throw new Error(`Failed to pull recording from device: ${error.message}`);
		}
	}

	/**
   * Cancel recording without saving
   */
	async cancelRecording(): Promise<void> {
		if (!this.recording) {
			throw new Error("No recording in progress");
		}

		if (this.recordingProcess) {
			this.recordingProcess.kill("SIGKILL");
		}

		// Clean up files
		if (this.platform === "android") {
			try {
				await execFileAsync("adb", [
					"-s",
					this.deviceId,
					"shell",
					"rm",
					"/sdcard/mobilepixel-recording.mp4"
				]);
			} catch (error) {
				// Ignore errors
			}
		}

		if (this.outputPath && fs.existsSync(this.outputPath)) {
			fs.unlinkSync(this.outputPath);
		}

		// Reset state
		this.recording = false;
		this.recordingProcess = null;
		this.outputPath = "";
		this.platform = null;
		this.deviceId = "";

		console.log("Recording cancelled");
	}
}
