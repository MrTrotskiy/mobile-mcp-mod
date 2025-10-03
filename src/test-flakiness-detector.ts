/**
 * Test Flakiness Detector
 *
 * This module tracks test execution history and detects flaky tests
 * (tests that sometimes pass and sometimes fail without code changes).
 *
 * Features:
 * - Track test results over multiple runs
 * - Calculate flakiness score
 * - Identify patterns in failures
 * - Provide recommendations for fixing flaky tests
 *
 * Purpose: Help identify and fix unreliable tests that reduce confidence in CI/CD
 */

import fs from "fs";
import path from "path";

// Test result status
export type TestStatus = "passed" | "failed" | "skipped" | "error";

// Single test execution result
export interface TestRun {
  testId: string;
  testName: string;
  status: TestStatus;
  duration: number; // milliseconds
  timestamp: number;
  errorMessage?: string;
  stackTrace?: string;
  retryCount?: number;
}

// Test statistics over multiple runs
export interface TestStatistics {
  testId: string;
  testName: string;
  totalRuns: number;
  passed: number;
  failed: number;
  skipped: number;
  errors: number;
  passRate: number; // 0-100
  flakinessScore: number; // 0-100, higher = more flaky
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  lastRun: TestRun;
  firstFailure?: number; // timestamp
  lastFailure?: number; // timestamp
  consecutiveFailures: number;
}

// Flaky test identification
export interface FlakyTest {
  testId: string;
  testName: string;
  flakinessScore: number;
  passRate: number;
  totalRuns: number;
  failurePattern: string; // e.g., "intermittent", "recent", "timing-related"
  recommendation: string;
  statistics: TestStatistics;
}

// Test history database
interface TestHistoryDB {
  tests: Map<string, TestRun[]>; // testId -> array of runs
  lastUpdated: number;
}

export class TestFlakinessDetector {
	private historyFile: string;
	private history: TestHistoryDB;
	private maxHistorySize: number = 100; // Keep last 100 runs per test

	constructor(historyFile: string = "test/test-history.json") {
		this.historyFile = historyFile;
		this.history = this.loadHistory();
	}

	/**
   * Load test history from file
   */
	private loadHistory(): TestHistoryDB {
		try {
			if (fs.existsSync(this.historyFile)) {
				const data = fs.readFileSync(this.historyFile, "utf-8");
				const parsed = JSON.parse(data);

				// Convert plain object to Map
				const tests = new Map<string, TestRun[]>();
				if (parsed.tests) {
					Object.keys(parsed.tests).forEach(key => {
						tests.set(key, parsed.tests[key]);
					});
				}

				return {
					tests,
					lastUpdated: parsed.lastUpdated || Date.now()
				};
			}
		} catch (error) {
			console.error("Failed to load test history:", error);
		}

		// Return empty history if file doesn't exist or failed to load
		return {
			tests: new Map(),
			lastUpdated: Date.now()
		};
	}

	/**
   * Save test history to file
   */
	private saveHistory(): void {
		try {
			// Ensure directory exists
			const dir = path.dirname(this.historyFile);
			if (!fs.existsSync(dir)) {
				fs.mkdirSync(dir, { recursive: true });
			}

			// Convert Map to plain object for JSON serialization
			const testsObj: Record<string, TestRun[]> = {};
			this.history.tests.forEach((value, key) => {
				testsObj[key] = value;
			});

			const data = JSON.stringify({
				tests: testsObj,
				lastUpdated: Date.now()
			}, null, 2);

			fs.writeFileSync(this.historyFile, data, "utf-8");
		} catch (error) {
			console.error("Failed to save test history:", error);
		}
	}

	/**
   * Record a test run
   */
	recordTestRun(testRun: TestRun): void {
		const runs = this.history.tests.get(testRun.testId) || [];

		// Add new run
		runs.push(testRun);

		// Keep only last N runs
		if (runs.length > this.maxHistorySize) {
			runs.shift(); // Remove oldest
		}

		this.history.tests.set(testRun.testId, runs);
		this.history.lastUpdated = Date.now();

		// Save after each recording
		this.saveHistory();
	}

	/**
   * Calculate statistics for a test
   */
	getTestStatistics(testId: string): TestStatistics | null {
		const runs = this.history.tests.get(testId);
		if (!runs || runs.length === 0) {
			return null;
		}

		// Count statuses
		let passed = 0;
		let failed = 0;
		let skipped = 0;
		let errors = 0;
		let totalDuration = 0;
		let minDuration = Infinity;
		let maxDuration = 0;
		let firstFailure: number | undefined;
		let lastFailure: number | undefined;
		let consecutiveFailures = 0;

		for (const run of runs) {
			switch (run.status) {
				case "passed":
					passed++;
					consecutiveFailures = 0;
					break;
				case "failed":
					failed++;
					consecutiveFailures++;
					if (!firstFailure) {
						firstFailure = run.timestamp;
					}
					lastFailure = run.timestamp;
					break;
				case "skipped":
					skipped++;
					break;
				case "error":
					errors++;
					break;
			}

			totalDuration += run.duration;
			minDuration = Math.min(minDuration, run.duration);
			maxDuration = Math.max(maxDuration, run.duration);
		}

		const totalRuns = runs.length;
		const passRate = (passed / totalRuns) * 100;
		const flakinessScore = this.calculateFlakinessScore(runs);

		return {
			testId,
			testName: runs[runs.length - 1].testName,
			totalRuns,
			passed,
			failed,
			skipped,
			errors,
			passRate,
			flakinessScore,
			avgDuration: totalDuration / totalRuns,
			minDuration: minDuration === Infinity ? 0 : minDuration,
			maxDuration,
			lastRun: runs[runs.length - 1],
			firstFailure,
			lastFailure,
			consecutiveFailures
		};
	}

	/**
   * Calculate flakiness score (0-100)
   * Higher score = more flaky
   */
	private calculateFlakinessScore(runs: TestRun[]): number {
		if (runs.length < 2) {
			return 0; // Not enough data
		}

		let score = 0;

		// Factor 1: Status changes (pass->fail->pass)
		let statusChanges = 0;
		for (let i = 1; i < runs.length; i++) {
			if (runs[i].status !== runs[i - 1].status) {
				statusChanges++;
			}
		}
		const statusChangeRate = statusChanges / (runs.length - 1);
		score += statusChangeRate * 50; // Max 50 points

		// Factor 2: Pass rate (50-95% is most flaky)
		const passed = runs.filter(r => r.status === "passed").length;
		const passRate = passed / runs.length;

		if (passRate >= 0.5 && passRate <= 0.95) {
			// Most flaky range
			const flakyFactor = 1 - Math.abs(passRate - 0.725) / 0.225;
			score += flakyFactor * 30; // Max 30 points
		} else if (passRate < 0.5) {
			// Consistently failing - not flaky
			score += 10;
		}

		// Factor 3: Recent failures (last 10 runs)
		const recentRuns = runs.slice(-10);
		const recentFailed = recentRuns.filter(r => r.status === "failed").length;
		if (recentFailed > 0 && recentFailed < recentRuns.length) {
			score += (recentFailed / recentRuns.length) * 20; // Max 20 points
		}

		return Math.min(100, Math.round(score));
	}

	/**
   * Get all flaky tests (flakiness score > threshold)
   */
	getFlakyTests(threshold: number = 40): FlakyTest[] {
		const flakyTests: FlakyTest[] = [];

		this.history.tests.forEach((runs, testId) => {
			const stats = this.getTestStatistics(testId);
			if (!stats) {
				return;
			}

			if (stats.flakinessScore >= threshold) {
				const pattern = this.identifyFailurePattern(runs);
				const recommendation = this.getRecommendation(stats, pattern);

				flakyTests.push({
					testId,
					testName: stats.testName,
					flakinessScore: stats.flakinessScore,
					passRate: stats.passRate,
					totalRuns: stats.totalRuns,
					failurePattern: pattern,
					recommendation,
					statistics: stats
				});
			}
		});

		// Sort by flakiness score (highest first)
		return flakyTests.sort((a, b) => b.flakinessScore - a.flakinessScore);
	}

	/**
   * Identify failure pattern
   */
	private identifyFailurePattern(runs: TestRun[]): string {
		if (runs.length < 3) {
			return "insufficient-data";
		}

		// Check for timing-related issues (duration variance)
		const durations = runs.map(r => r.duration);
		const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
		const variance = durations.reduce((sum, d) => sum + Math.pow(d - avgDuration, 2), 0) / durations.length;
		const stdDev = Math.sqrt(variance);

		if (stdDev > avgDuration * 0.5) {
			return "timing-related";
		}

		// Check recent trend
		const recentRuns = runs.slice(-10);
		const recentFailedCount = recentRuns.filter(r => r.status === "failed").length;

		if (recentFailedCount > recentRuns.length * 0.7) {
			return "recent-regression";
		}

		// Check for alternating pattern
		let alternating = true;
		for (let i = 1; i < Math.min(runs.length, 10); i++) {
			if (runs[i].status === runs[i - 1].status) {
				alternating = false;
				break;
			}
		}

		if (alternating) {
			return "alternating";
		}

		// Default
		return "intermittent";
	}

	/**
   * Get recommendation for fixing flaky test
   */
	private getRecommendation(stats: TestStatistics, pattern: string): string {
		switch (pattern) {
			case "timing-related":
				return "Test has high duration variance. Consider adding explicit waits, increasing timeouts, or using waitFor conditions instead of fixed delays.";

			case "recent-regression":
				return "Test recently started failing. Review recent code changes and check if test needs updating.";

			case "alternating":
				return "Test alternates between pass/fail. This suggests race conditions or shared state issues. Check for proper cleanup and test isolation.";

			case "intermittent":
				if (stats.passRate < 70) {
					return "Test fails frequently but not consistently. Check for network dependencies, external services, or test data issues.";
				}
				return "Test occasionally fails. Add better error messages, review assertions, and check for async timing issues.";

			default:
				return "Monitor test for more runs to identify pattern. Consider adding more logging to diagnose failures.";
		}
	}

	/**
   * Get summary report of all tests
   */
	getSummaryReport(): {
    totalTests: number;
    flakyTests: number;
    avgFlakinessScore: number;
    avgPassRate: number;
    testsWithIssues: number;
    } {
		let totalTests = 0;
		let flakyTests = 0;
		let totalFlakinessScore = 0;
		let totalPassRate = 0;
		let testsWithIssues = 0;

		this.history.tests.forEach((runs, testId) => {
			const stats = this.getTestStatistics(testId);
			if (!stats) {
				return;
			}

			totalTests++;
			totalFlakinessScore += stats.flakinessScore;
			totalPassRate += stats.passRate;

			if (stats.flakinessScore >= 40) {
				flakyTests++;
			}

			if (stats.passRate < 100 || stats.consecutiveFailures > 0) {
				testsWithIssues++;
			}
		});

		return {
			totalTests,
			flakyTests,
			avgFlakinessScore: totalTests > 0 ? totalFlakinessScore / totalTests : 0,
			avgPassRate: totalTests > 0 ? totalPassRate / totalTests : 0,
			testsWithIssues
		};
	}

	/**
   * Clear history for a specific test
   */
	clearTestHistory(testId: string): void {
		this.history.tests.delete(testId);
		this.saveHistory();
	}

	/**
   * Clear all history
   */
	clearAllHistory(): void {
		this.history.tests.clear();
		this.history.lastUpdated = Date.now();
		this.saveHistory();
	}

	/**
   * Export history as JSON
   */
	exportHistory(): string {
		const testsObj: Record<string, TestRun[]> = {};
		this.history.tests.forEach((value, key) => {
			testsObj[key] = value;
		});

		return JSON.stringify({
			tests: testsObj,
			lastUpdated: this.history.lastUpdated
		}, null, 2);
	}
}
