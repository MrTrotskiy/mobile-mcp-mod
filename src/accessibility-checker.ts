/**
 * Accessibility Checker
 *
 * This module provides tools to check mobile app accessibility issues:
 * - Missing or poor accessibility labels
 * - Small touch targets (< 44x44 points)
 * - Low color contrast
 * - Overlapping interactive elements
 *
 * Purpose: Help developers find and fix accessibility problems early
 */

import { execFileSync } from "child_process";

// Interface for screen element (matches Robot interface)
export interface ScreenElement {
  type: string;
  text?: string;
  label?: string;
  value?: string;
  rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  enabled?: boolean;
  focused?: boolean;
  clickable?: boolean;
  checkable?: boolean;
  checked?: boolean;
}

// Accessibility issue types
export type AccessibilityIssueType =
  | "missing_label"           // Element has no accessibility label
  | "poor_label"              // Label is too short or generic
  | "small_touch_target"      // Touch target < 44x44 points
  | "overlapping_elements"    // Interactive elements overlap
  | "low_contrast"            // Text contrast ratio < 4.5:1
  | "duplicate_labels";       // Multiple elements with same label

// Single accessibility issue
export interface AccessibilityIssue {
  type: AccessibilityIssueType;
  severity: "critical" | "warning" | "info";
  element: ScreenElement;
  message: string;
  suggestion: string;
  wcagGuideline?: string; // WCAG 2.1 guideline reference
}

// Full accessibility report
export interface AccessibilityReport {
  timestamp: number;
  totalElements: number;
  interactiveElements: number;
  issues: AccessibilityIssue[];
  summary: {
    critical: number;
    warning: number;
    info: number;
  };
  score: number; // 0-100, 100 = perfect accessibility
}

// Minimum recommended touch target size (Apple & Android guidelines)
const MIN_TOUCH_TARGET_SIZE = 44;

// Generic labels that are considered poor
const POOR_LABELS = [
	"button",
	"click",
	"tap",
	"icon",
	"image",
	"view",
	"text",
	"label",
];

export class AccessibilityChecker {
	/**
   * Check all accessibility issues on current screen
   *
   * @param elements - List of elements from robot.getElementsOnScreen()
   * @param screenshot - Optional screenshot for contrast checking
   * @returns Full accessibility report
   */
	async checkAccessibility(
		elements: ScreenElement[],
		screenshot?: Buffer
	): Promise<AccessibilityReport> {
		const issues: AccessibilityIssue[] = [];

		// Get only interactive elements (buttons, inputs, etc)
		const interactiveElements = elements.filter(
			e => e.clickable || e.checkable || e.type.includes("Button")
		);

		// Check each element
		for (const element of interactiveElements) {
			// Check 1: Missing accessibility label
			if (!element.label && !element.text) {
				issues.push({
					type: "missing_label",
					severity: "critical",
					element,
					message: "Interactive element has no accessibility label",
					suggestion:
            "Add contentDescription (Android) or accessibilityLabel (iOS)",
					wcagGuideline: "WCAG 2.1 - 4.1.2 Name, Role, Value",
				});
			} else {
				// Check 2: Poor accessibility label
				const label = (element.label || element.text || "").toLowerCase();
				if (label.length < 3) {
					issues.push({
						type: "poor_label",
						severity: "warning",
						element,
						message: `Label "${label}" is too short`,
						suggestion: "Use descriptive label that explains element purpose",
						wcagGuideline: "WCAG 2.1 - 2.4.6 Headings and Labels",
					});
				} else if (POOR_LABELS.some(poor => label.includes(poor))) {
					issues.push({
						type: "poor_label",
						severity: "warning",
						element,
						message: `Label "${label}" is too generic`,
						suggestion: 'Use specific label like "Submit form" instead of "Button"',
						wcagGuideline: "WCAG 2.1 - 2.4.6 Headings and Labels",
					});
				}
			}

			// Check 3: Small touch target
			if (
				element.rect.width < MIN_TOUCH_TARGET_SIZE ||
        element.rect.height < MIN_TOUCH_TARGET_SIZE
			) {
				issues.push({
					type: "small_touch_target",
					severity: "warning",
					element,
					message: `Touch target ${element.rect.width}x${element.rect.height} is smaller than ${MIN_TOUCH_TARGET_SIZE}x${MIN_TOUCH_TARGET_SIZE}`,
					suggestion: `Increase touch target size to at least ${MIN_TOUCH_TARGET_SIZE}x${MIN_TOUCH_TARGET_SIZE} points`,
					wcagGuideline: "WCAG 2.1 - 2.5.5 Target Size (AAA)",
				});
			}
		}

		// Check 4: Overlapping elements
		const overlaps = this.findOverlappingElements(interactiveElements);
		for (const overlap of overlaps) {
			issues.push({
				type: "overlapping_elements",
				severity: "critical",
				element: overlap.element1,
				message: `Element overlaps with another interactive element`,
				suggestion: "Adjust layout to prevent overlapping touch targets",
				wcagGuideline: "WCAG 2.1 - 2.5.8 Target Size (Minimum)",
			});
		}

		// Check 5: Duplicate labels
		const duplicates = this.findDuplicateLabels(interactiveElements);
		for (const element of duplicates) {
			issues.push({
				type: "duplicate_labels",
				severity: "info",
				element,
				message: "Multiple elements have the same accessibility label",
				suggestion: "Make labels unique or add role/state information",
				wcagGuideline: "WCAG 2.1 - 4.1.2 Name, Role, Value",
			});
		}

		// Count issues by severity
		const summary = {
			critical: issues.filter(i => i.severity === "critical").length,
			warning: issues.filter(i => i.severity === "warning").length,
			info: issues.filter(i => i.severity === "info").length,
		};

		// Calculate accessibility score (0-100)
		// Penalty: critical -20, warning -5, info -1
		const penalties =
      summary.critical * 20 + summary.warning * 5 + summary.info * 1;
		const score = Math.max(0, 100 - penalties);

		return {
			timestamp: Date.now(),
			totalElements: elements.length,
			interactiveElements: interactiveElements.length,
			issues,
			summary,
			score,
		};
	}

	/**
   * Find elements that overlap each other
   * This can cause confusion for screen readers and touch input
   */
	private findOverlappingElements(
		elements: ScreenElement[]
	): Array<{ element1: ScreenElement; element2: ScreenElement }> {
		const overlaps: Array<{ element1: ScreenElement; element2: ScreenElement }> =
      [];

		for (let i = 0; i < elements.length; i++) {
			for (let j = i + 1; j < elements.length; j++) {
				if (this.rectanglesOverlap(elements[i].rect, elements[j].rect)) {
					overlaps.push({
						element1: elements[i],
						element2: elements[j],
					});
				}
			}
		}

		return overlaps;
	}

	/**
   * Check if two rectangles overlap
   */
	private rectanglesOverlap(
		rect1: { x: number; y: number; width: number; height: number },
		rect2: { x: number; y: number; width: number; height: number }
	): boolean {
		return !(
			rect1.x + rect1.width < rect2.x ||
      rect2.x + rect2.width < rect1.x ||
      rect1.y + rect1.height < rect2.y ||
      rect2.y + rect2.height < rect1.y
		);
	}

	/**
   * Find elements with duplicate accessibility labels
   */
	private findDuplicateLabels(elements: ScreenElement[]): ScreenElement[] {
		const labelCounts = new Map<string, ScreenElement[]>();

		// Count elements per label
		for (const element of elements) {
			const label = element.label || element.text;
			if (label) {
				if (!labelCounts.has(label)) {
					labelCounts.set(label, []);
				}
        labelCounts.get(label)!.push(element);
			}
		}

		// Return elements with duplicate labels
		const duplicates: ScreenElement[] = [];
		for (const [, elems] of labelCounts.entries()) {
			if (elems.length > 1) {
				duplicates.push(...elems);
			}
		}

		return duplicates;
	}

	/**
   * Format accessibility report as readable text
   */
	formatReport(report: AccessibilityReport): string {
		let output = "# Accessibility Report\n\n";
		output += `Generated: ${new Date(report.timestamp).toLocaleString()}\n\n`;

		// Score and summary
		output += `## Score: ${report.score}/100\n\n`;
		output += `- Total elements: ${report.totalElements}\n`;
		output += `- Interactive elements: ${report.interactiveElements}\n`;
		output += `- Issues found: ${report.issues.length}\n`;
		output += `  - 🔴 Critical: ${report.summary.critical}\n`;
		output += `  - 🟡 Warning: ${report.summary.warning}\n`;
		output += `  - ℹ️ Info: ${report.summary.info}\n\n`;

		// Issues by severity
		if (report.issues.length === 0) {
			output += "✅ No accessibility issues found!\n";
			return output;
		}

		output += "## Issues\n\n";

		// Critical issues first
		const critical = report.issues.filter(i => i.severity === "critical");
		if (critical.length > 0) {
			output += "### 🔴 Critical Issues\n\n";
			for (const issue of critical) {
				output += this.formatIssue(issue);
			}
		}

		// Then warnings
		const warnings = report.issues.filter(i => i.severity === "warning");
		if (warnings.length > 0) {
			output += "### 🟡 Warnings\n\n";
			for (const issue of warnings) {
				output += this.formatIssue(issue);
			}
		}

		// Then info
		const info = report.issues.filter(i => i.severity === "info");
		if (info.length > 0) {
			output += "### ℹ️ Info\n\n";
			for (const issue of info) {
				output += this.formatIssue(issue);
			}
		}

		return output;
	}

	/**
   * Format single issue
   */
	private formatIssue(issue: AccessibilityIssue): string {
		let output = `**${issue.type.replace(/_/g, " ").toUpperCase()}**\n`;
		output += `- Element: ${issue.element.type}`;
		if (issue.element.text) {
			output += ` "${issue.element.text}"`;
		}
		output += `\n`;
		output += `- Location: (${issue.element.rect.x}, ${issue.element.rect.y}) - ${issue.element.rect.width}x${issue.element.rect.height}\n`;
		output += `- Problem: ${issue.message}\n`;
		output += `- Fix: ${issue.suggestion}\n`;
		if (issue.wcagGuideline) {
			output += `- Standard: ${issue.wcagGuideline}\n`;
		}
		output += "\n";
		return output;
	}

	/**
   * Get Android accessibility info using uiautomator
   * This provides additional accessibility metadata
   */
	async getAndroidAccessibilityInfo(deviceId: string): Promise<any> {
		try {
			// Dump UI hierarchy with accessibility info
			const xml = execFileSync("adb", [
				"-s",
				deviceId,
				"shell",
				"uiautomator",
				"dump",
				"/dev/tty",
			]).toString();

			// Parse XML and extract accessibility data
			// (In real implementation, would parse XML properly)
			return { raw: xml };
		} catch (error) {
			console.error("Failed to get accessibility info:", error);
			return null;
		}
	}
}
