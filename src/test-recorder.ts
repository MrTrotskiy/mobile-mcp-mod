/**
 * Test Recorder for mobile automation
 *
 * Purpose: Records user actions and generates test code
 * Similar to Playwright's codegen feature
 *
 * Features:
 * - Records taps, swipes, typing, launches
 * - Auto-generates action descriptions
 * - Captures screenshots (optional)
 * - Tracks timing between actions
 */

/**
 * Recorded action type
 */
export interface RecordedAction {
	type: "tap" | "swipe" | "type" | "wait" | "launch" | "assert" | "screenshot";
	timestamp: number; // milliseconds since recording started
	params: any;
	screenshot?: string; // base64 image data
	description?: string; // human-readable description
}

/**
 * Test Recorder - Records actions for test generation
 *
 * Usage:
 * 1. Call start() to begin recording
 * 2. Perform actions (tap, swipe, type)
 * 3. Call stop() to get recorded actions
 * 4. Use CodeGenerator to generate test code
 */
export class TestRecorder {
	private static recording: boolean = false;
	private static actions: RecordedAction[] = [];
	private static startTime: number = 0;

	/**
	 * Start recording test actions
	 */
	static start(): void {
		this.recording = true;
		this.actions = [];
		this.startTime = Date.now();
	}

	/**
	 * Stop recording and return all recorded actions
	 * @returns Array of recorded actions
	 */
	static stop(): RecordedAction[] {
		this.recording = false;
		return [...this.actions]; // Return copy
	}

	/**
	 * Check if currently recording
	 */
	static isRecording(): boolean {
		return this.recording;
	}

	/**
	 * Get current recorded actions (without stopping)
	 */
	static getActions(): RecordedAction[] {
		return [...this.actions]; // Return copy
	}

	/**
	 * Clear all recorded actions
	 */
	static clear(): void {
		this.actions = [];
		this.startTime = Date.now();
	}

	/**
	 * Record a single action
	 * @param action - Action to record
	 */
	static recordAction(action: Omit<RecordedAction, "timestamp">): void {
		if (!this.recording) {
			return;
		}

		this.actions.push({
			...action,
			timestamp: Date.now() - this.startTime
		});
	}

	/**
	 * Record a tap action
	 */
	static recordTap(x: number, y: number, description?: string): void {
		this.recordAction({
			type: "tap",
			params: { x, y },
			description: description || `Tap at (${x}, ${y})`
		});
	}

	/**
	 * Record a swipe action
	 */
	static recordSwipe(
		fromX: number,
		fromY: number,
		toX: number,
		toY: number,
		direction?: string
	): void {
		this.recordAction({
			type: "swipe",
			params: { fromX, fromY, toX, toY, direction },
			description: direction ? `Swipe ${direction}` : `Swipe from (${fromX}, ${fromY}) to (${toX}, ${toY})`
		});
	}

	/**
	 * Record typing text
	 */
	static recordType(text: string): void {
		this.recordAction({
			type: "type",
			params: { text },
			description: `Type "${text.length > 20 ? text.substring(0, 20) + "..." : text}"`
		});
	}

	/**
	 * Record app launch
	 */
	static recordLaunch(packageOrBundle: string): void {
		this.recordAction({
			type: "launch",
			params: { app: packageOrBundle },
			description: `Launch ${packageOrBundle}`
		});
	}

	/**
	 * Record wait action
	 */
	static recordWait(condition: string, timeout: number): void {
		this.recordAction({
			type: "wait",
			params: { condition, timeout },
			description: `Wait for ${condition} (${timeout}ms)`
		});
	}

	/**
	 * Record assertion
	 */
	static recordAssert(assertType: string, params: any, description: string): void {
		this.recordAction({
			type: "assert",
			params: { assertType, ...params },
			description: `Assert: ${description}`
		});
	}

	/**
	 * Record screenshot
	 */
	static recordScreenshot(screenshot: string, description?: string): void {
		this.recordAction({
			type: "screenshot",
			params: {},
			screenshot,
			description: description || "Screenshot"
		});
	}

	/**
	 * Get recording summary
	 */
	static getSummary(): string {
		if (!this.recording && this.actions.length === 0) {
			return "No recording active. Use mobile_start_recording to begin.";
		}

		const duration = this.recording
			? Date.now() - this.startTime
			: this.actions[this.actions.length - 1]?.timestamp || 0;

		const actionsByType = this.actions.reduce((acc, action) => {
			acc[action.type] = (acc[action.type] || 0) + 1;
			return acc;
		}, {} as Record<string, number>);

		const lines = [
			`Recording: ${this.recording ? "ACTIVE" : "STOPPED"}`,
			`Duration: ${(duration / 1000).toFixed(1)}s`,
			`Total Actions: ${this.actions.length}`,
			``
		];

		if (Object.keys(actionsByType).length > 0) {
			lines.push(`Actions by Type:`);
			Object.entries(actionsByType).forEach(([type, count]) => {
				lines.push(`  ${type}: ${count}`);
			});
		}

		return lines.join("\n");
	}
}
