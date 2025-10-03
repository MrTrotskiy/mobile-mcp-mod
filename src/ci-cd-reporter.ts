/**
 * CI/CD Reporter
 *
 * This module exports test results in formats compatible with CI/CD systems:
 * - JUnit XML (Jenkins, GitHub Actions, GitLab CI)
 * - JSON (custom dashboards)
 * - Markdown (GitHub comments, Slack)
 * - TAP (Test Anything Protocol)
 *
 * Purpose: Integrate mobile test results into CI/CD pipelines
 */

import fs from "fs";
import path from "path";

// Test result for CI/CD
export interface TestResult {
  name: string;
  className?: string;
  status: "passed" | "failed" | "skipped" | "error";
  duration: number; // milliseconds
  errorMessage?: string;
  errorType?: string;
  stackTrace?: string;
  timestamp: number;
}

// Test suite for CI/CD
export interface TestSuite {
  name: string;
  tests: TestResult[];
  timestamp: number;
  duration: number;
  failures: number;
  errors: number;
  skipped: number;
  passed: number;
}

export class CICDReporter {
	private outputDir: string;

	constructor(outputDir: string = "test/ci-reports") {
		this.outputDir = outputDir;

		// Create output directory if it doesn't exist
		if (!fs.existsSync(this.outputDir)) {
			fs.mkdirSync(this.outputDir, { recursive: true });
		}
	}

	/**
   * Export test suite to JUnit XML format
   * Compatible with Jenkins, GitHub Actions, GitLab CI, etc.
   */
	exportJUnitXML(suite: TestSuite): string {
		const totalTests = suite.tests.length;
		const timestamp = new Date(suite.timestamp).toISOString();

		let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
		xml += `<testsuite name="${this.escapeXML(suite.name)}" `;
		xml += `tests="${totalTests}" `;
		xml += `failures="${suite.failures}" `;
		xml += `errors="${suite.errors}" `;
		xml += `skipped="${suite.skipped}" `;
		xml += `time="${(suite.duration / 1000).toFixed(3)}" `;
		xml += `timestamp="${timestamp}">\n`;

		for (const test of suite.tests) {
			xml += `  <testcase name="${this.escapeXML(test.name)}" `;
			if (test.className) {
				xml += `classname="${this.escapeXML(test.className)}" `;
			}
			xml += `time="${(test.duration / 1000).toFixed(3)}"`;

			if (test.status === "passed") {
				xml += " />\n";
			} else {
				xml += ">\n";

				if (test.status === "failed") {
					xml += `    <failure message="${this.escapeXML(test.errorMessage || "Test failed")}" `;
					xml += `type="${this.escapeXML(test.errorType || "AssertionError")}">\n`;
					if (test.stackTrace) {
						xml += this.escapeXML(test.stackTrace);
					}
					xml += "\n    </failure>\n";
				} else if (test.status === "error") {
					xml += `    <error message="${this.escapeXML(test.errorMessage || "Test error")}" `;
					xml += `type="${this.escapeXML(test.errorType || "Error")}">\n`;
					if (test.stackTrace) {
						xml += this.escapeXML(test.stackTrace);
					}
					xml += "\n    </error>\n";
				} else if (test.status === "skipped") {
					xml += `    <skipped />\n`;
				}

				xml += "  </testcase>\n";
			}
		}

		xml += "</testsuite>\n";

		// Save to file
		const filename = `junit-${Date.now()}.xml`;
		const filepath = path.join(this.outputDir, filename);
		fs.writeFileSync(filepath, xml, "utf-8");

		return filepath;
	}

	/**
   * Export test suite to JSON format
   * Useful for custom dashboards and analytics
   */
	exportJSON(suite: TestSuite): string {
		const json = JSON.stringify(suite, null, 2);

		// Save to file
		const filename = `results-${Date.now()}.json`;
		const filepath = path.join(this.outputDir, filename);
		fs.writeFileSync(filepath, json, "utf-8");

		return filepath;
	}

	/**
   * Export test suite to Markdown format
   * Great for GitHub PR comments, Slack messages
   */
	exportMarkdown(suite: TestSuite): string {
		let md = `# Test Results: ${suite.name}\n\n`;

		// Summary
		md += `## Summary\n\n`;
		md += `- **Total Tests**: ${suite.tests.length}\n`;
		md += `- **Passed**: ✅ ${suite.passed}\n`;
		md += `- **Failed**: ❌ ${suite.failures}\n`;
		md += `- **Errors**: 💥 ${suite.errors}\n`;
		md += `- **Skipped**: ⏭️ ${suite.skipped}\n`;
		md += `- **Duration**: ${(suite.duration / 1000).toFixed(2)}s\n`;
		md += `- **Date**: ${new Date(suite.timestamp).toLocaleString()}\n\n`;

		// Pass rate
		const passRate = (suite.passed / suite.tests.length) * 100;
		md += `**Pass Rate**: ${passRate.toFixed(1)}%\n\n`;

		if (passRate === 100) {
			md += `🎉 **All tests passed!**\n\n`;
		} else if (passRate >= 80) {
			md += `✅ **Most tests passed**\n\n`;
		} else if (passRate >= 50) {
			md += `⚠️ **Some tests failed**\n\n`;
		} else {
			md += `❌ **Many tests failed - needs attention!**\n\n`;
		}

		// Failed tests detail
		const failedTests = suite.tests.filter(t => t.status === "failed" || t.status === "error");
		if (failedTests.length > 0) {
			md += `## Failed Tests\n\n`;
			for (const test of failedTests) {
				const emoji = test.status === "failed" ? "❌" : "💥";
				md += `### ${emoji} ${test.name}\n\n`;
				if (test.errorMessage) {
					md += `**Error**: ${test.errorMessage}\n\n`;
				}
				if (test.stackTrace) {
					md += "```\n";
					md += test.stackTrace.split("\n").slice(0, 10).join("\n"); // First 10 lines
					md += "\n```\n\n";
				}
			}
		}

		// Passed tests (summary only)
		if (suite.passed > 0) {
			md += `## Passed Tests (${suite.passed})\n\n`;
			const passedTests = suite.tests.filter(t => t.status === "passed");
			for (const test of passedTests) {
				md += `- ✅ ${test.name} (${(test.duration / 1000).toFixed(2)}s)\n`;
			}
			md += `\n`;
		}

		// Save to file
		const filename = `results-${Date.now()}.md`;
		const filepath = path.join(this.outputDir, filename);
		fs.writeFileSync(filepath, md, "utf-8");

		return filepath;
	}

	/**
   * Export test suite to TAP (Test Anything Protocol) format
   * Compatible with many test reporting tools
   */
	exportTAP(suite: TestSuite): string {
		let tap = `TAP version 13\n`;
		tap += `1..${suite.tests.length}\n`;

		for (let i = 0; i < suite.tests.length; i++) {
			const test = suite.tests[i];
			const testNum = i + 1;

			if (test.status === "passed") {
				tap += `ok ${testNum} - ${test.name}\n`;
			} else if (test.status === "skipped") {
				tap += `ok ${testNum} - ${test.name} # SKIP\n`;
			} else {
				tap += `not ok ${testNum} - ${test.name}\n`;
				if (test.errorMessage) {
					tap += `  ---\n`;
					tap += `  message: ${test.errorMessage}\n`;
					if (test.errorType) {
						tap += `  severity: ${test.errorType}\n`;
					}
					tap += `  ...\n`;
				}
			}
		}

		// Save to file
		const filename = `results-${Date.now()}.tap`;
		const filepath = path.join(this.outputDir, filename);
		fs.writeFileSync(filepath, tap, "utf-8");

		return filepath;
	}

	/**
   * Create GitHub Actions summary
   * Uses GitHub Actions markdown format
   */
	createGitHubActionsSummary(suite: TestSuite): string {
		let summary = `## 📱 Mobile Test Results\n\n`;

		const passRate = (suite.passed / suite.tests.length) * 100;
		const emoji = passRate === 100 ? "✅" : passRate >= 80 ? "🟡" : "❌";

		summary += `${emoji} **${suite.passed}/${suite.tests.length}** tests passed (${passRate.toFixed(1)}%)\n\n`;

		summary += `| Metric | Value |\n`;
		summary += `|--------|-------|\n`;
		summary += `| Total Tests | ${suite.tests.length} |\n`;
		summary += `| Passed | ✅ ${suite.passed} |\n`;
		summary += `| Failed | ❌ ${suite.failures} |\n`;
		summary += `| Errors | 💥 ${suite.errors} |\n`;
		summary += `| Skipped | ⏭️ ${suite.skipped} |\n`;
		summary += `| Duration | ${(suite.duration / 1000).toFixed(2)}s |\n`;
		summary += `| Pass Rate | ${passRate.toFixed(1)}% |\n\n`;

		// Failed tests
		const failedTests = suite.tests.filter(t => t.status === "failed" || t.status === "error");
		if (failedTests.length > 0) {
			summary += `### ❌ Failed Tests\n\n`;
			for (const test of failedTests) {
				summary += `- **${test.name}**: ${test.errorMessage || "Failed"}\n`;
			}
		} else {
			summary += `### 🎉 All tests passed!\n`;
		}

		// Save to file
		const filename = `github-summary-${Date.now()}.md`;
		const filepath = path.join(this.outputDir, filename);
		fs.writeFileSync(filepath, summary, "utf-8");

		return filepath;
	}

	/**
   * Create test suite from test results array
   */
	createTestSuite(name: string, tests: TestResult[]): TestSuite {
		const failures = tests.filter(t => t.status === "failed").length;
		const errors = tests.filter(t => t.status === "error").length;
		const skipped = tests.filter(t => t.status === "skipped").length;
		const passed = tests.filter(t => t.status === "passed").length;
		const duration = tests.reduce((sum, t) => sum + t.duration, 0);

		return {
			name,
			tests,
			timestamp: Date.now(),
			duration,
			failures,
			errors,
			skipped,
			passed
		};
	}

	/**
   * Escape XML special characters
   */
	private escapeXML(str: string): string {
		return str
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&apos;");
	}

	/**
   * Get summary statistics
   */
	getSummary(suite: TestSuite): {
    total: number;
    passed: number;
    failed: number;
    errors: number;
    skipped: number;
    passRate: number;
    duration: number;
  } {
		return {
			total: suite.tests.length,
			passed: suite.passed,
			failed: suite.failures,
			errors: suite.errors,
			skipped: suite.skipped,
			passRate: (suite.passed / suite.tests.length) * 100,
			duration: suite.duration
		};
	}
}
