/**
 * Comprehensive benchmark suite for mobile-mcp
 *
 * Measures performance of all operations and compares against baselines.
 * Helps detect performance regressions during development.
 *
 * Usage:
 *   npx ts-node test/benchmark-suite.ts
 *   npx ts-node test/benchmark-suite.ts --save     # Save results as new baseline
 *   npx ts-node test/benchmark-suite.ts --compare  # Compare with baseline
 */

import { AndroidDeviceManager, AndroidRobot } from "../src/android";
import { writeFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";

// Benchmark result for a single operation
interface BenchmarkResult {
	name: string;
	operations: number;    // How many times operation was called
	totalTime: number;     // Total time in ms
	avgTime: number;       // Average time per operation
	minTime: number;       // Fastest operation
	maxTime: number;       // Slowest operation
	cached?: boolean;      // Whether result was from cache
}

// Complete benchmark suite results
interface BenchmarkSuite {
	timestamp: string;
	deviceId: string;
	results: BenchmarkResult[];
	totalDuration: number;
}

// Performance baseline for comparison
interface PerformanceBaseline {
	[key: string]: {
		avgTime: number;
		maxTime: number;
	};
}

const BASELINE_FILE = join(__dirname, "benchmark-baseline.json");

/**
 * Measure execution time of an async function
 */
async function measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; time: number }> {
	const start = Date.now();
	const result = await fn();
	const time = Date.now() - start;
	return { result, time };
}

/**
 * Run a benchmark multiple times and collect statistics
 */
async function runBenchmark(
	name: string,
	operation: () => Promise<void>,
	iterations: number = 3
): Promise<BenchmarkResult> {
	const times: number[] = [];

	// Run operation multiple times
	for (let i = 0; i < iterations; i++) {
		const { time } = await measureTime(operation);
		times.push(time);

		// Small delay between iterations to avoid cache effects
		if (i < iterations - 1) {
			await new Promise(resolve => setTimeout(resolve, 50));
		}
	}

	const totalTime = times.reduce((sum, t) => sum + t, 0);
	const avgTime = totalTime / iterations;
	const minTime = Math.min(...times);
	const maxTime = Math.max(...times);

	return {
		name,
		operations: iterations,
		totalTime,
		avgTime,
		minTime,
		maxTime,
	};
}

/**
 * Load baseline results from file
 */
function loadBaseline(): PerformanceBaseline | null {
	if (!existsSync(BASELINE_FILE)) {
		return null;
	}

	try {
		const data = readFileSync(BASELINE_FILE, "utf-8");
		return JSON.parse(data);
	} catch (error) {
		console.error("⚠️  Failed to load baseline:", error);
		return null;
	}
}

/**
 * Save results as new baseline
 */
function saveBaseline(suite: BenchmarkSuite): void {
	const baseline: PerformanceBaseline = {};

	suite.results.forEach(result => {
		baseline[result.name] = {
			avgTime: result.avgTime,
			maxTime: result.maxTime,
		};
	});

	writeFileSync(BASELINE_FILE, JSON.stringify(baseline, null, 2));
	console.log(`\n✅ Baseline saved to ${BASELINE_FILE}`);
}

/**
 * Compare results with baseline and detect regressions
 */
function compareWithBaseline(suite: BenchmarkSuite, baseline: PerformanceBaseline): void {
	console.log("\n📊 Comparison with baseline:");
	console.log("=".repeat(80));

	let hasRegressions = false;
	const REGRESSION_THRESHOLD = 1.2; // 20% slower = regression

	suite.results.forEach(result => {
		const baselineData = baseline[result.name];

		if (!baselineData) {
			console.log(`ℹ️  ${result.name}: No baseline data (new test)`);
			return;
		}

		const avgRatio = result.avgTime / baselineData.avgTime;
		const avgDiff = result.avgTime - baselineData.avgTime;
		const avgPercent = ((avgRatio - 1) * 100).toFixed(1);

		let status = "✅";
		let message = "";

		if (avgRatio > REGRESSION_THRESHOLD) {
			status = "❌";
			message = " REGRESSION DETECTED!";
			hasRegressions = true;
		} else if (avgRatio > 1.1) {
			status = "⚠️ ";
			message = " (slower)";
		} else if (avgRatio < 0.9) {
			status = "🚀";
			message = " (faster!)";
		}

		console.log(`${status} ${result.name}:`);
		console.log(`   Current: ${result.avgTime.toFixed(1)}ms | Baseline: ${baselineData.avgTime.toFixed(1)}ms`);
		console.log(`   Difference: ${avgDiff > 0 ? "+" : ""}${avgDiff.toFixed(1)}ms (${avgDiff > 0 ? "+" : ""}${avgPercent}%)${message}`);
		console.log();
	});

	if (hasRegressions) {
		console.log("\n⚠️  WARNING: Performance regressions detected!");
		console.log("Consider investigating these issues or updating baseline if intentional.");
	} else {
		console.log("\n✅ No performance regressions detected!");
	}
}

/**
 * Print benchmark results in a nice table format
 */
function printResults(suite: BenchmarkSuite): void {
	console.log("\n" + "=".repeat(80));
	console.log("📊 BENCHMARK RESULTS");
	console.log("=".repeat(80));
	console.log(`Device: ${suite.deviceId}`);
	console.log(`Timestamp: ${suite.timestamp}`);
	console.log(`Total Duration: ${(suite.totalDuration / 1000).toFixed(2)}s`);
	console.log("=".repeat(80));
	console.log();

	// Print table header
	console.log(
		"Operation".padEnd(35) +
		"Avg".padStart(10) +
		"Min".padStart(10) +
		"Max".padStart(10) +
		"Runs".padStart(8)
	);
	console.log("-".repeat(80));

	// Print each result
	suite.results.forEach(result => {
		const cached = result.cached ? " (cached)" : "";
		console.log(
			(result.name + cached).padEnd(35) +
			`${result.avgTime.toFixed(1)}ms`.padStart(10) +
			`${result.minTime.toFixed(1)}ms`.padStart(10) +
			`${result.maxTime.toFixed(1)}ms`.padStart(10) +
			`${result.operations}x`.padStart(8)
		);
	});

	console.log("=".repeat(80));
}

/**
 * Main benchmark suite
 */
async function runBenchmarkSuite() {
	const args = process.argv.slice(2);
	const shouldSave = args.includes("--save");
	const shouldCompare = args.includes("--compare");

	console.log("🚀 Mobile-MCP Benchmark Suite");
	console.log("=".repeat(80));

	// Initialize Android device
	const manager = new AndroidDeviceManager();
	const devices = manager.getConnectedDevices();

	if (devices.length === 0) {
		console.log("❌ No Android devices found. Please connect a device or start emulator.");
		console.log("Run: adb devices");
		process.exit(1);
	}

	const deviceId = devices[0].deviceId;
	const android = new AndroidRobot(deviceId);
	console.log(`📱 Device: ${deviceId}\n`);

	const suiteStart = Date.now();
	const results: BenchmarkResult[] = [];

	try {
		// Benchmark 1: getScreenSize (first call - uncached)
		console.log("Running: getScreenSize (uncached)...");
		const screenSizeResult = await runBenchmark(
			"getScreenSize (first call)",
			async () => {
				// Clear cache by creating new robot instance
				const freshRobot = new AndroidRobot(deviceId);
				await freshRobot.getScreenSize();
			},
			3
		);
		results.push(screenSizeResult);

		// Benchmark 2: getScreenSize (cached)
		console.log("Running: getScreenSize (cached)...");
		await android.getScreenSize(); // Warm up cache
		const screenSizeCachedResult = await runBenchmark(
			"getScreenSize (cached)",
			async () => {
				await android.getScreenSize();
			},
			10
		);
		screenSizeCachedResult.cached = true;
		results.push(screenSizeCachedResult);

		// Benchmark 3: getElementsOnScreen (uncached)
		console.log("Running: getElementsOnScreen (uncached)...");
		const elementsResult = await runBenchmark(
			"getElementsOnScreen (first call)",
			async () => {
				const freshRobot = new AndroidRobot(deviceId);
				await freshRobot.getElementsOnScreen();
			},
			3
		);
		results.push(elementsResult);

		// Benchmark 4: getElementsOnScreen (cached)
		console.log("Running: getElementsOnScreen (cached)...");
		await android.getElementsOnScreen(); // Warm up cache
		const elementsCachedResult = await runBenchmark(
			"getElementsOnScreen (cached)",
			async () => {
				await android.getElementsOnScreen();
			},
			5
		);
		elementsCachedResult.cached = true;
		results.push(elementsCachedResult);

		// Benchmark 5: tap operation
		console.log("Running: tap()...");
		const tapResult = await runBenchmark(
			"tap (coordinate)",
			async () => {
				await android.tap(100, 100);
			},
			5
		);
		results.push(tapResult);

		// Benchmark 6: swipe operation
		console.log("Running: swipe()...");
		const swipeResult = await runBenchmark(
			"swipe (full screen)",
			async () => {
				await android.swipe("up");
			},
			3
		);
		results.push(swipeResult);

		// Benchmark 7: sendKeys operation
		console.log("Running: sendKeys()...");
		const sendKeysResult = await runBenchmark(
			"sendKeys (text input)",
			async () => {
				await android.sendKeys("test");
			},
			5
		);
		results.push(sendKeysResult);

		// Benchmark 8: getScreenshot
		console.log("Running: getScreenshot()...");
		const screenshotResult = await runBenchmark(
			"getScreenshot",
			async () => {
				await android.getScreenshot();
			},
			3
		);
		results.push(screenshotResult);

		// Benchmark 9: pressButton
		console.log("Running: pressButton()...");
		const pressButtonResult = await runBenchmark(
			"pressButton (BACK)",
			async () => {
				await android.pressButton("BACK");
			},
			5
		);
		results.push(pressButtonResult);

		// Benchmark 10: getOrientation
		console.log("Running: getOrientation()...");
		const orientationResult = await runBenchmark(
			"getOrientation",
			async () => {
				await android.getOrientation();
			},
			5
		);
		results.push(orientationResult);

		// Create suite results
		const suite: BenchmarkSuite = {
			timestamp: new Date().toISOString(),
			deviceId,
			results,
			totalDuration: Date.now() - suiteStart,
		};

		// Print results
		printResults(suite);

		// Handle baseline operations
		if (shouldSave) {
			saveBaseline(suite);
		}

		if (shouldCompare || shouldSave) {
			const baseline = loadBaseline();
			if (baseline) {
				compareWithBaseline(suite, baseline);
			} else {
				console.log("\nℹ️  No baseline found. Run with --save to create one.");
			}
		}

		console.log("\n✅ Benchmark suite completed successfully!");
		console.log("\n💡 Tips:");
		console.log("  - Run with --save to create/update baseline");
		console.log("  - Run with --compare to check for regressions");
		console.log("  - Run regularly to track performance over time");

	} catch (error) {
		console.error("\n❌ Benchmark failed:", error);
		process.exit(1);
	}
}

// Run the benchmark suite
runBenchmarkSuite().catch(error => {
	console.error("❌ Fatal error:", error);
	process.exit(1);
});
