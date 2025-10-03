/**
 * Code Generator for mobile tests
 *
 * Purpose: Converts recorded actions into test code
 * Supports TypeScript and JavaScript output
 *
 * Features:
 * - Generates readable test code
 * - Adds descriptive comments
 * - Handles timing/waits intelligently
 * - Supports multiple test frameworks
 */

import { RecordedAction } from "./test-recorder";

export interface CodeGeneratorOptions {
	testName: string;
	deviceId: string;
	framework?: "jest" | "mocha" | "plain"; // Test framework
	language?: "typescript" | "javascript";
	includeScreenshots?: boolean; // Include screenshot assertions
	includeTimings?: boolean; // Include wait times between actions
}

/**
 * Code Generator - Generates test code from recorded actions
 */
export class CodeGenerator {
	/**
	 * Generate test code from recorded actions
	 */
	static generateTest(
		actions: RecordedAction[],
		options: CodeGeneratorOptions
	): string {
		const framework = options.framework || "jest";
		const language = options.language || "typescript";

		if (language === "typescript") {
			return this.generateTypeScriptTest(actions, options, framework);
		} else {
			return this.generateJavaScriptTest(actions, options, framework);
		}
	}

	/**
	 * Generate TypeScript test code
	 */
	private static generateTypeScriptTest(
		actions: RecordedAction[],
		options: CodeGeneratorOptions,
		framework: string
	): string {
		const imports = this.generateImports(options.deviceId, framework);
		const setup = this.generateSetup(options.deviceId, framework);
		const testBody = this.generateTestBody(actions, options);

		return `${imports}

${setup}
  it('${options.testName}', async () => {
${testBody}
  });
});
`;
	}

	/**
	 * Generate JavaScript test code
	 */
	private static generateJavaScriptTest(
		actions: RecordedAction[],
		options: CodeGeneratorOptions,
		framework: string
	): string {
		// Similar to TypeScript but without type annotations
		const imports = this.generateImports(options.deviceId, framework).replace(
			/: \w+/g,
			""
		);
		const setup = this.generateSetup(options.deviceId, framework).replace(
			/: \w+/g,
			""
		);
		const testBody = this.generateTestBody(actions, options);

		return `${imports}

${setup}
  it('${options.testName}', async () => {
${testBody}
  });
});
`;
	}

	/**
	 * Generate import statements
	 */
	private static generateImports(deviceId: string, framework: string): string {
		const isAndroid = deviceId.startsWith("android:");
		const robotType = isAndroid ? "AndroidRobot" : "IosRobot";

		return `import { ${robotType} } from '@mobilepixel/mcp';`;
	}

	/**
	 * Generate test setup code
	 */
	private static generateSetup(deviceId: string, framework: string): string {
		const isAndroid = deviceId.startsWith("android:");
		const robotType = isAndroid ? "AndroidRobot" : "IosRobot";
		const cleanDeviceId = deviceId.replace(/^(android|ios):/, "");

		return `describe('Mobile Test', () => {
  let robot: ${robotType};

  beforeEach(async () => {
    robot = new ${robotType}('${cleanDeviceId}');
  });
`;
	}

	/**
	 * Generate test body from actions
	 */
	private static generateTestBody(
		actions: RecordedAction[],
		options: CodeGeneratorOptions
	): string {
		const lines: string[] = [];
		let lastTimestamp = 0;

		actions.forEach((action, index) => {
			// Add wait if there's a significant delay between actions
			if (options.includeTimings && index > 0) {
				const delay = action.timestamp - lastTimestamp;
				if (delay > 1000) {
					// More than 1 second delay
					lines.push(
						`    // Wait ${(delay / 1000).toFixed(1)}s`,
						`    await new Promise(resolve => setTimeout(resolve, ${Math.round(delay)}));`,
						``
					);
				}
			}

			// Generate code for this action
			const code = this.generateActionCode(action);
			if (code) {
				lines.push(code);
			}

			lastTimestamp = action.timestamp;
		});

		return lines.join("\n");
	}

	/**
	 * Generate code for a single action
	 */
	private static generateActionCode(action: RecordedAction): string {
		const comment = action.description ? ` // ${action.description}` : "";

		switch (action.type) {
			case "launch":
				return `    await robot.launchApp('${action.params.app}');${comment}`;

			case "tap":
				return `    await robot.tap(${action.params.x}, ${action.params.y});${comment}`;

			case "swipe":
				if (action.params.direction) {
					return `    await robot.swipe('${action.params.direction}');${comment}`;
				} else {
					return `    await robot.swipeFromTo(${action.params.fromX}, ${action.params.fromY}, ${action.params.toX}, ${action.params.toY});${comment}`;
				}

			case "type":
				// Escape single quotes in text
				const escapedText = action.params.text.replace(/'/g, "\\'");
				return `    await robot.sendKeys('${escapedText}');${comment}`;

			case "wait":
				return `    await robot.waitFor({ condition: '${action.params.condition}', timeout: ${action.params.timeout} });${comment}`;

			case "assert":
				return `    // TODO: Implement assertion - ${action.description}`;

			case "screenshot":
				return `    await robot.getScreenshot();${comment}`;

			default:
				return `    // Unknown action: ${action.type}`;
		}
	}

	/**
	 * Generate code for a complete test scenario
	 * with best practices and assertions
	 */
	static generateAdvancedTest(
		actions: RecordedAction[],
		options: CodeGeneratorOptions
	): string {
		const code = this.generateTest(actions, {
			...options,
			includeTimings: true
		});

		// Add additional comments and best practices
		const header = `/**
 * Generated test: ${options.testName}
 * Device: ${options.deviceId}
 * Generated on: ${new Date().toISOString()}
 * 
 * Total actions: ${actions.length}
 * Duration: ${actions.length > 0 ? (actions[actions.length - 1].timestamp / 1000).toFixed(1) + "s" : "0s"}
 */

`;

		return header + code;
	}

	/**
	 * Generate human-readable test summary
	 */
	static generateSummary(actions: RecordedAction[]): string {
		if (actions.length === 0) {
			return "No actions recorded.";
		}

		const lines = [
			`Test Summary:`,
			`Total Actions: ${actions.length}`,
			`Duration: ${(actions[actions.length - 1].timestamp / 1000).toFixed(1)}s`,
			``,
			`Actions:`
		];

		actions.forEach((action, index) => {
			const time = (action.timestamp / 1000).toFixed(1);
			lines.push(
				`  ${index + 1}. [${time}s] ${action.type.toUpperCase()}: ${action.description || JSON.stringify(action.params)}`
			);
		});

		return lines.join("\n");
	}
}
