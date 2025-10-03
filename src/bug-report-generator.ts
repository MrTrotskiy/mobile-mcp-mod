/**
 * Bug Report Generator
 *
 * This module automatically generates comprehensive bug reports including:
 * - Device information
 * - App state at time of bug
 * - Application logs
 * - Screenshot (optionally annotated)
 * - Screen hierarchy
 * - Network requests (if monitoring is active)
 * - Performance metrics (if monitoring is active)
 *
 * Purpose: Make it easy to create detailed bug reports with all relevant context
 */

import fs from "fs";
import path from "path";
import { Robot } from "./robot";

// Bug severity levels
export type BugSeverity = "critical" | "high" | "medium" | "low";

// Bug report data structure
export interface BugReport {
  // Basic info
  title: string;
  description: string;
  severity: BugSeverity;
  timestamp: number;

  // Device info
  device: {
    id: string;
    platform: "android" | "ios";
    osVersion?: string;
    manufacturer?: string;
    model?: string;
  };

  // App info
  app: {
    packageName: string;
    version?: string;
  };

  // Bug context
  stepsToReproduce: string[];
  expectedBehavior: string;
  actualBehavior: string;

  // Attachments
  screenshot?: string; // base64 or file path
  logs?: string[];
  elementHierarchy?: any[];
  networkRequests?: any[];
  performanceMetrics?: any;

  // Metadata
  reportId: string;
  reportedBy?: string;
}

export class BugReportGenerator {
	private outputDir: string;

	constructor(outputDir: string = "test/bug-reports") {
		this.outputDir = outputDir;

		// Create output directory if it doesn't exist
		if (!fs.existsSync(this.outputDir)) {
			fs.mkdirSync(this.outputDir, { recursive: true });
		}
	}

	/**
   * Generate bug report ID
   */
	private generateReportId(): string {
		const timestamp = Date.now();
		const random = Math.random().toString(36).substring(2, 8);
		return `BUG-${timestamp}-${random}`;
	}

	/**
   * Create a new bug report
   */
	async createReport(
		robot: Robot,
		options: {
      title: string;
      description: string;
      severity: BugSeverity;
      stepsToReproduce: string[];
      expectedBehavior: string;
      actualBehavior: string;
      deviceId: string;
      platform: "android" | "ios";
      packageName: string;
      includeScreenshot?: boolean;
      includeLogs?: boolean;
      includeElementHierarchy?: boolean;
      reportedBy?: string;
    }
	): Promise<BugReport> {
		const reportId = this.generateReportId();

		// Create bug report object
		const report: BugReport = {
			title: options.title,
			description: options.description,
			severity: options.severity,
			timestamp: Date.now(),
			device: {
				id: options.deviceId,
				platform: options.platform,
			},
			app: {
				packageName: options.packageName,
			},
			stepsToReproduce: options.stepsToReproduce,
			expectedBehavior: options.expectedBehavior,
			actualBehavior: options.actualBehavior,
			reportId,
			reportedBy: options.reportedBy,
		};

		// Capture screenshot if requested
		if (options.includeScreenshot) {
			try {
				const screenshot = await robot.getScreenshot();
				// Save screenshot to file
				const screenshotPath = path.join(this.outputDir, `${reportId}-screenshot.png`);
				fs.writeFileSync(screenshotPath, screenshot);
				report.screenshot = screenshotPath;
			} catch (error) {
				console.error("Failed to capture screenshot:", error);
			}
		}

		// Capture element hierarchy if requested
		if (options.includeElementHierarchy) {
			try {
				const elements = await robot.getElementsOnScreen();
				report.elementHierarchy = elements;
			} catch (error) {
				console.error("Failed to capture element hierarchy:", error);
			}
		}

		// Capture logs if requested (platform-specific)
		if (options.includeLogs) {
			try {
				// Try to get app logs if robot has the method
				if ("getAppLogs" in robot && typeof robot.getAppLogs === "function") {
					const logs = await (robot as any).getAppLogs(options.packageName, 100);
					report.logs = logs;
				}
			} catch (error) {
				console.error("Failed to capture logs:", error);
			}
		}

		return report;
	}

	/**
   * Format bug report as Markdown
   */
	formatMarkdown(report: BugReport): string {
		let md = `# ${report.title}\n\n`;

		// Severity badge
		const severityEmoji = {
			critical: "🔴",
			high: "🟠",
			medium: "🟡",
			low: "🟢"
		};
		md += `**Severity**: ${severityEmoji[report.severity]} ${report.severity.toUpperCase()}\n\n`;

		// Basic info
		md += `**Report ID**: ${report.reportId}\n`;
		md += `**Reported**: ${new Date(report.timestamp).toLocaleString()}\n`;
		if (report.reportedBy) {
			md += `**Reported By**: ${report.reportedBy}\n`;
		}
		md += `\n---\n\n`;

		// Description
		md += `## Description\n\n${report.description}\n\n`;

		// Expected vs Actual
		md += `## Expected Behavior\n\n${report.expectedBehavior}\n\n`;
		md += `## Actual Behavior\n\n${report.actualBehavior}\n\n`;

		// Steps to reproduce
		md += `## Steps to Reproduce\n\n`;
		report.stepsToReproduce.forEach((step, i) => {
			md += `${i + 1}. ${step}\n`;
		});
		md += `\n`;

		// Environment
		md += `## Environment\n\n`;
		md += `- **Device**: ${report.device.id}\n`;
		md += `- **Platform**: ${report.device.platform}\n`;
		if (report.device.osVersion) {
			md += `- **OS Version**: ${report.device.osVersion}\n`;
		}
		if (report.device.manufacturer) {
			md += `- **Manufacturer**: ${report.device.manufacturer}\n`;
		}
		if (report.device.model) {
			md += `- **Model**: ${report.device.model}\n`;
		}
		md += `- **App Package**: ${report.app.packageName}\n`;
		if (report.app.version) {
			md += `- **App Version**: ${report.app.version}\n`;
		}
		md += `\n`;

		// Screenshot
		if (report.screenshot) {
			md += `## Screenshot\n\n`;
			md += `![Screenshot](${report.screenshot})\n\n`;
		}

		// Logs
		if (report.logs && report.logs.length > 0) {
			md += `## Application Logs\n\n`;
			md += "```\n";
			report.logs.slice(0, 50).forEach(log => {
				md += `${log}\n`;
			});
			if (report.logs.length > 50) {
				md += `... (${report.logs.length - 50} more lines)\n`;
			}
			md += "```\n\n";
		}

		// Element Hierarchy
		if (report.elementHierarchy && report.elementHierarchy.length > 0) {
			md += `## Screen Elements (${report.elementHierarchy.length} total)\n\n`;
			md += "```json\n";
			md += JSON.stringify(report.elementHierarchy.slice(0, 10), null, 2);
			if (report.elementHierarchy.length > 10) {
				md += `\n// ... (${report.elementHierarchy.length - 10} more elements)\n`;
			}
			md += "\n```\n\n";
		}

		// Network Requests
		if (report.networkRequests && report.networkRequests.length > 0) {
			md += `## Network Requests (${report.networkRequests.length} total)\n\n`;
			report.networkRequests.slice(0, 10).forEach((req: any) => {
				md += `- **${req.method}** ${req.url}\n`;
				if (req.statusCode) {
					md += `  Status: ${req.statusCode}\n`;
				}
			});
			if (report.networkRequests.length > 10) {
				md += `... (${report.networkRequests.length - 10} more requests)\n`;
			}
			md += `\n`;
		}

		// Performance Metrics
		if (report.performanceMetrics) {
			md += `## Performance Metrics\n\n`;
			const metrics = report.performanceMetrics;
			if (metrics.cpu !== undefined) {
				md += `- **CPU**: ${metrics.cpu.toFixed(2)}%\n`;
			}
			if (metrics.memory !== undefined) {
				md += `- **Memory**: ${metrics.memory.toFixed(2)} MB\n`;
			}
			if (metrics.fps !== undefined) {
				md += `- **FPS**: ${metrics.fps}\n`;
			}
			md += `\n`;
		}

		md += `---\n\n`;
		md += `*Report generated automatically by MobilePixel*\n`;

		return md;
	}

	/**
   * Format bug report as JSON
   */
	formatJSON(report: BugReport): string {
		return JSON.stringify(report, null, 2);
	}

	/**
   * Save bug report to file
   */
	async save(report: BugReport, format: "markdown" | "json" = "markdown"): Promise<string> {
		const ext = format === "markdown" ? "md" : "json";
		const filename = `${report.reportId}.${ext}`;
		const filepath = path.join(this.outputDir, filename);

		const content = format === "markdown"
			? this.formatMarkdown(report)
			: this.formatJSON(report);

		fs.writeFileSync(filepath, content, "utf-8");

		return filepath;
	}

	/**
   * Create a quick bug report with minimal info
   */
	async createQuickReport(
		robot: Robot,
		title: string,
		description: string,
		deviceId: string,
		platform: "android" | "ios",
		packageName: string
	): Promise<BugReport> {
		return this.createReport(robot, {
			title,
			description,
			severity: "medium",
			stepsToReproduce: ["Issue occurred during testing"],
			expectedBehavior: "App should work correctly",
			actualBehavior: description,
			deviceId,
			platform,
			packageName,
			includeScreenshot: true,
			includeLogs: false,
			includeElementHierarchy: false,
		});
	}
}
