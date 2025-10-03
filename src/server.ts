import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z, ZodRawShape, ZodTypeAny } from "zod";
import fs from "node:fs";
import os from "node:os";
import crypto from "node:crypto";

import { error, trace } from "./logger";
import { AndroidRobot, AndroidDeviceManager } from "./android";
import { ActionableError, Robot } from "./robot";
import { SimctlManager } from "./iphone-simulator";
import { IosManager, IosRobot } from "./ios";
import { PNG } from "./png";
import { isScalingAvailable, Image } from "./image-utils";
import { TestContext } from "./test-context";
import { NetworkMonitor } from "./network-monitor";
import { AIElementFinder } from "./ai-element-finder";
import { getOCREngine } from "./ocr-engine";
import { Assertions } from "./assertions";
import { TestRecorder } from "./test-recorder";
import { CodeGenerator } from "./code-generator";
import { VisualTester } from "./visual-testing";
import { VideoRecorder } from "./video-recorder";
import { PerformanceMonitor } from "./performance-monitor";
import { DeviceConditions } from "./device-conditions";
import { AccessibilityChecker } from "./accessibility-checker";
import { ScreenshotAnnotator, Colors } from "./screenshot-annotator";
import { BugReportGenerator } from "./bug-report-generator";
import { TestFlakinessDetector } from "./test-flakiness-detector";
import { TestDataGenerator } from "./test-data-generator";
import { VisualTouchIndicators } from "./visual-touch-indicators";
import { CICDReporter, TestResult } from "./ci-cd-reporter";
import { BatchOperations, BatchAction } from "./batch-operations";
import { LoadingDetector } from "./loading-detector";
import { configureSharpPerformance } from "./image-performance";
import path from "node:path";

// Load MCP configuration
interface McpConfig {
	tools: Record<string, boolean>;
}

const loadMcpConfig = (): McpConfig => {
	try {
		const configPath = path.join(process.cwd(), "mcp-config.json");
		if (fs.existsSync(configPath)) {
			const configData = fs.readFileSync(configPath, "utf-8");
			return JSON.parse(configData);
		}
	} catch (error: any) {
		console.error("[MCP Config] Failed to load config, using defaults:", error.message);
	}
	
	// Default: all enabled
	return {
		tools: {
			core: true,
			ai: true,
			testing: true,
			assertions: true,
			visual_testing: true,
			accessibility: true,
			bug_reports: true,
			test_recording: true,
			batch_operations: true,
			loading_detection: true,
			clipboard: true,
			device_conditions: true,
			video_recording: true,
			performance_monitoring: true,
			network_monitoring: true,
			flakiness_detection: true,
			test_data_generation: true
		}
	};
};

export const getAgentVersion = (): string => {
	const json = require("../package.json");
	return json.version;
};

const getLatestAgentVersion = async (): Promise<string> => {
	const response = await fetch("https://api.github.com/repos/MrTrotskiy/mobilepixel/tags?per_page=1");
	const json = await response.json();
	return json[0].name;
};

const checkForLatestAgentVersion = async (): Promise<void> => {
	try {
		const latestVersion = await getLatestAgentVersion();
		const currentVersion = getAgentVersion();
		if (latestVersion !== currentVersion) {
			trace(`You are running an older version of the agent. Please update to the latest version: ${latestVersion}.`);
		}
	} catch (error: any) {
		// ignore
	}
};

export const createMcpServer = (): McpServer => {

	// Configure Sharp for optimal image processing performance
	// Must be called before any image operations
	// Provides 20-30% performance boost for cached operations
	configureSharpPerformance();

	// Load MCP configuration
	const config = loadMcpConfig();
	console.error("[MCP Config] Loaded configuration:", JSON.stringify(config.tools, null, 2));

	const server = new McpServer({
		name: "mobilepixel",
		version: getAgentVersion(),
		capabilities: {
			resources: {},
			tools: {},
		},
	});

	// an empty object to satisfy windsurf
	const noParams = z.object({});

	const tool = (name: string, description: string, paramsSchema: ZodRawShape, cb: (args: z.objectOutputType<ZodRawShape, ZodTypeAny>) => Promise<string>) => {
		const wrappedCb = async (args: ZodRawShape): Promise<CallToolResult> => {
			try {
				trace(`Invoking ${name} with args: ${JSON.stringify(args)}`);
				const response = await cb(args);
				trace(`=> ${response}`);
				posthog("tool_invoked", {}).then();
				return {
					content: [{ type: "text", text: response }],
				};
			} catch (error: any) {
				if (error instanceof ActionableError) {
					return {
						content: [{ type: "text", text: `${error.message}. Please fix the issue and try again.` }],
					};
				} else {
					// a real exception
					trace(`Tool '${description}' failed: ${error.message} stack: ${error.stack}`);
					return {
						content: [{ type: "text", text: `Error: ${error.message}` }],
						isError: true,
					};
				}
			}
		};

		server.tool(name, description, paramsSchema, args => wrappedCb(args));
	};

	// Helper to conditionally register tools based on config
	const toolIf = (category: string, name: string, description: string, paramsSchema: ZodRawShape, cb: (args: z.objectOutputType<ZodRawShape, ZodTypeAny>) => Promise<string>) => {
		if (config.tools[category] !== false) {
			tool(name, description, paramsSchema, cb);
		}
	};

	const posthog = async (event: string, properties: Record<string, string>) => {
		try {
			const url = "https://us.i.posthog.com/i/v0/e/";
			const api_key = "phc_KHRTZmkDsU7A8EbydEK8s4lJpPoTDyyBhSlwer694cS";
			const name = os.hostname() + process.execPath;
			const distinct_id = crypto.createHash("sha256").update(name).digest("hex");
			const systemProps = {
				Platform: os.platform(),
				Product: "mobilepixel",
				Version: getAgentVersion(),
				NodeVersion: process.version,
			};

			await fetch(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify({
					api_key,
					event,
					properties: {
						...systemProps,
						...properties,
					},
					distinct_id,
				})
			});
		} catch (err: any) {
			// ignore
		}
	};

	posthog("launch", {}).then();

	const simulatorManager = new SimctlManager();

	const getRobotFromDevice = (device: string): Robot => {
		const iosManager = new IosManager();
		const androidManager = new AndroidDeviceManager();
		const simulators = simulatorManager.listBootedSimulators();
		const androidDevices = androidManager.getConnectedDevices();
		const iosDevices = iosManager.listDevices();

		// Check if it's a simulator
		const simulator = simulators.find(s => s.name === device);
		if (simulator) {
			return simulatorManager.getSimulator(device);
		}

		// Check if it's an Android device
		const androidDevice = androidDevices.find(d => d.deviceId === device);
		if (androidDevice) {
			return new AndroidRobot(device);
		}

		// Check if it's an iOS device
		const iosDevice = iosDevices.find(d => d.deviceId === device);
		if (iosDevice) {
			return new IosRobot(device);
		}

		throw new ActionableError(`Device "${device}" not found. Use the mobile_list_available_devices tool to see available devices.`);
	};

	tool(
		"mobile_list_available_devices",
		"List all available devices. This includes both physical devices and simulators. If there is more than one device returned, you need to let the user select one of them.",
		{
			noParams
		},
		async ({}) => {
			const iosManager = new IosManager();
			const androidManager = new AndroidDeviceManager();
			const simulators = simulatorManager.listBootedSimulators();
			const simulatorNames = simulators.map(d => d.name);
			const androidDevices = androidManager.getConnectedDevices();
			const iosDevices = await iosManager.listDevices();
			const iosDeviceNames = iosDevices.map(d => d.deviceId);
			const androidTvDevices = androidDevices.filter(d => d.deviceType === "tv").map(d => d.deviceId);
			const androidMobileDevices = androidDevices.filter(d => d.deviceType === "mobile").map(d => d.deviceId);

			const resp = ["Found these devices:"];
			if (simulatorNames.length > 0) {
				resp.push(`iOS simulators: [${simulatorNames.join(".")}]`);
			}

			if (iosDevices.length > 0) {
				resp.push(`iOS devices: [${iosDeviceNames.join(",")}]`);
			}

			if (androidMobileDevices.length > 0) {
				resp.push(`Android devices: [${androidMobileDevices.join(",")}]`);
			}

			if (androidTvDevices.length > 0) {
				resp.push(`Android TV devices: [${androidTvDevices.join(",")}]`);
			}

			return resp.join("\n");
		}
	);


	tool(
		"mobile_list_apps",
		"List all the installed apps on the device",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you.")
		},
		async ({ device }) => {
			const robot = getRobotFromDevice(device);
			const result = await robot.listApps();
			return `Found these apps on device: ${result.map(app => `${app.appName} (${app.packageName})`).join(", ")}`;
		}
	);

	tool(
		"mobile_launch_app",
		"Launch an app on mobile device. Use this to open a specific app. You can find the package name of the app by calling list_apps_on_device.",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you."),
			packageName: z.string().describe("The package name of the app to launch"),
		},
		async ({ device, packageName }) => {
			const robot = getRobotFromDevice(device);
			await robot.launchApp(packageName);

			// Record action in test context
			TestContext.recordAction({
				type: "launch_app",
				timestamp: Date.now(),
				device,
				params: { packageName },
				result: "success"
			});

			// Record in test recorder if recording
			TestRecorder.recordLaunch(packageName);

			return `Launched app ${packageName}`;
		}
	);

	tool(
		"mobile_terminate_app",
		"Stop and terminate an app on mobile device",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you."),
			packageName: z.string().describe("The package name of the app to terminate"),
		},
		async ({ device, packageName }) => {
			const robot = getRobotFromDevice(device);
			await robot.terminateApp(packageName);
			return `Terminated app ${packageName}`;
		}
	);

	tool(
		"mobile_get_screen_size",
		"Get the screen size of the mobile device in pixels",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you.")
		},
		async ({ device }) => {
			const robot = getRobotFromDevice(device);
			const screenSize = await robot.getScreenSize();
			return `Screen size is ${screenSize.width}x${screenSize.height} pixels`;
		}
	);

	tool(
		"mobile_click_on_screen_at_coordinates",
		"Click on the screen at given x,y coordinates. If clicking on an element, use the list_elements_on_screen tool to find the coordinates.",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you."),
			x: z.number().describe("The x coordinate to click on the screen, in pixels"),
			y: z.number().describe("The y coordinate to click on the screen, in pixels"),
		},
		async ({ device, x, y }) => {
			const robot = getRobotFromDevice(device);
			await robot.tap(x, y);

			// Record action in test context
			TestContext.recordAction({
				type: "tap",
				timestamp: Date.now(),
				device,
				params: { x, y },
				result: "success"
			});

			// Record in test recorder if recording
			TestRecorder.recordTap(x, y);

			return `Clicked on screen at coordinates: ${x}, ${y}`;
		}
	);

	tool(
		"mobile_long_press_on_screen_at_coordinates",
		"Long press on the screen at given x,y coordinates. If long pressing on an element, use the list_elements_on_screen tool to find the coordinates.",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you."),
			x: z.number().describe("The x coordinate to long press on the screen, in pixels"),
			y: z.number().describe("The y coordinate to long press on the screen, in pixels"),
		},
		async ({ device, x, y }) => {
			const robot = getRobotFromDevice(device);
			await robot.longPress(x, y);
			return `Long pressed on screen at coordinates: ${x}, ${y}`;
		}
	);

	tool(
		"mobile_list_elements_on_screen",
		"List elements on screen and their coordinates, with display text or accessibility label. Do not cache this result.",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you.")
		},
		async ({ device }) => {
			const robot = getRobotFromDevice(device);
			const elements = await robot.getElementsOnScreen();

			const result = elements.map(element => {
				const out: any = {
					type: element.type,
					text: element.text,
					label: element.label,
					name: element.name,
					value: element.value,
					identifier: element.identifier,
					coordinates: {
						x: element.rect.x,
						y: element.rect.y,
						width: element.rect.width,
						height: element.rect.height,
					},
				};

				if (element.focused) {
					out.focused = true;
				}

				return out;
			});

			return `Found these elements on screen: ${JSON.stringify(result)}`;
		}
	);

	tool(
		"mobile_press_button",
		"Press a button on device",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you."),
			button: z.string().describe("The button to press. Supported buttons: BACK (android only), HOME, VOLUME_UP, VOLUME_DOWN, ENTER, DPAD_CENTER (android tv only), DPAD_UP (android tv only), DPAD_DOWN (android tv only), DPAD_LEFT (android tv only), DPAD_RIGHT (android tv only)"),
		},
		async ({ device, button }) => {
			const robot = getRobotFromDevice(device);
			await robot.pressButton(button);
			return `Pressed the button: ${button}`;
		}
	);

	tool(
		"mobile_open_url",
		"Open a URL in browser on device",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you."),
			url: z.string().describe("The URL to open"),
		},
		async ({ device, url }) => {
			const robot = getRobotFromDevice(device);
			await robot.openUrl(url);
			return `Opened URL: ${url}`;
		}
	);

	tool(
		"mobile_swipe_on_screen",
		"Swipe on the screen",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you."),
			direction: z.enum(["up", "down", "left", "right"]).describe("The direction to swipe"),
			x: z.number().optional().describe("The x coordinate to start the swipe from, in pixels. If not provided, uses center of screen"),
			y: z.number().optional().describe("The y coordinate to start the swipe from, in pixels. If not provided, uses center of screen"),
			distance: z.number().optional().describe("The distance to swipe in pixels. Defaults to 400 pixels for iOS or 30% of screen dimension for Android"),
		},
		async ({ device, direction, x, y, distance }) => {
			const robot = getRobotFromDevice(device);

			if (x !== undefined && y !== undefined) {
				// Use coordinate-based swipe
				await robot.swipeFromCoordinate(x, y, direction, distance);

				// Record action in test context
				TestContext.recordAction({
					type: "swipe",
					timestamp: Date.now(),
					device,
					params: { direction, x, y, distance },
					result: "success"
				});

				// Record in test recorder if recording
				TestRecorder.recordSwipe(x, y, x, y, direction);

				const distanceText = distance ? ` ${distance} pixels` : "";
				return `Swiped ${direction}${distanceText} from coordinates: ${x}, ${y}`;
			} else {
				// Use center-based swipe
				await robot.swipe(direction);

				// Record action in test context
				TestContext.recordAction({
					type: "swipe",
					timestamp: Date.now(),
					device,
					params: { direction },
					result: "success"
				});

				// Record in test recorder if recording
				TestRecorder.recordSwipe(0, 0, 0, 0, direction);

				return `Swiped ${direction} on screen`;
			}
		}
	);

	tool(
		"mobile_type_keys",
		"Type text into the focused element",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you."),
			text: z.string().describe("The text to type"),
			submit: z.boolean().describe("Whether to submit the text. If true, the text will be submitted as if the user pressed the enter key."),
		},
		async ({ device, text, submit }) => {
			const robot = getRobotFromDevice(device);
			await robot.sendKeys(text);

			if (submit) {
				await robot.pressButton("ENTER");
			}

			// Record action in test context
			TestContext.recordAction({
				type: "type",
				timestamp: Date.now(),
				device,
				params: { text, submit },
				result: "success"
			});

			// Record in test recorder if recording
			TestRecorder.recordType(text);

			return `Typed text: ${text}`;
		}
	);

	tool(
		"mobile_save_screenshot",
		"Save a screenshot of the mobile device to a file",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you."),
			saveTo: z.string().describe("The path to save the screenshot to"),
		},
		async ({ device, saveTo }) => {
			const robot = getRobotFromDevice(device);

			const screenshot = await robot.getScreenshot();
			fs.writeFileSync(saveTo, screenshot);
			return `Screenshot saved to: ${saveTo}`;
		}
	);

	server.tool(
		"mobile_take_screenshot",
		"Take a screenshot of the mobile device. Use this to understand what's on screen, if you need to press an element that is available through view hierarchy then you must list elements on screen instead. Do not cache this result.",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you.")
		},
		async ({ device }) => {
			try {
				const robot = getRobotFromDevice(device);
				const screenSize = await robot.getScreenSize();

				let screenshot = await robot.getScreenshot();
				let mimeType = "image/png";

				// validate we received a png, will throw exception otherwise
				const image = new PNG(screenshot);
				const pngSize = image.getDimensions();
				if (pngSize.width <= 0 || pngSize.height <= 0) {
					throw new ActionableError("Screenshot is invalid. Please try again.");
				}

				if (isScalingAvailable()) {
					trace("Image scaling is available, resizing screenshot");
					const image = Image.fromBuffer(screenshot);
					const beforeSize = screenshot.length;
					screenshot = image.resize(Math.floor(pngSize.width / screenSize.scale))
						.jpeg({ quality: 75 })
						.toBuffer();

					const afterSize = screenshot.length;
					trace(`Screenshot resized from ${beforeSize} bytes to ${afterSize} bytes`);

					mimeType = "image/jpeg";
				}

				const screenshot64 = screenshot.toString("base64");
				trace(`Screenshot taken: ${screenshot.length} bytes`);

				return {
					content: [{ type: "image", data: screenshot64, mimeType }]
				};
			} catch (err: any) {
				error(`Error taking screenshot: ${err.message} ${err.stack}`);
				return {
					content: [{ type: "text", text: `Error: ${err.message}` }],
					isError: true,
				};
			}
		}
	);

	tool(
		"mobile_set_orientation",
		"Change the screen orientation of the device",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you."),
			orientation: z.enum(["portrait", "landscape"]).describe("The desired orientation"),
		},
		async ({ device, orientation }) => {
			const robot = getRobotFromDevice(device);
			await robot.setOrientation(orientation);
			return `Changed device orientation to ${orientation}`;
		}
	);

	tool(
		"mobile_get_orientation",
		"Get the current screen orientation of the device",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you.")
		},
		async ({ device }) => {
			const robot = getRobotFromDevice(device);
			const orientation = await robot.getOrientation();
			return `Current device orientation is ${orientation}`;
		}
	);

	tool(
		"mobile_get_app_logs",
		"Get application logs from the device. This shows recent log entries from a specific app, which helps with debugging. Use this when you need to see what errors or messages the app is logging.",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you."),
			packageName: z.string().describe("The package name (Android) or bundle ID (iOS) of the app to get logs for. Use mobile_list_apps to find available package names."),
			lines: z.number().optional().describe("Number of most recent log lines to return. Defaults to 100 if not specified.")
		},
		async ({ device, packageName, lines }) => {
			const robot = getRobotFromDevice(device);
			const numLines = lines || 100;

			// Check if it's Android or iOS robot
			// Android robot has getAppLogs method, iOS robot has it too
			if (robot instanceof AndroidRobot || robot instanceof IosRobot) {
				const logs = robot.getAppLogs(packageName, numLines);

				if (logs.length === 0) {
					return `No logs found for app: ${packageName}`;
				}

				// Format logs nicely
				const logText = logs.join("\n");
				return `Application logs for ${packageName} (${logs.length} lines):\n\n${logText}`;
			}

			// For simulators or other robot types
			return `Log reading is not yet supported for this device type`;
		}
	);

	tool(
		"mobile_clear_app_logs",
		"Clear application logs on the device. This clears all logs (not just one app) on Android devices. iOS does not support clearing logs programmatically.",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you.")
		},
		async ({ device }) => {
			const robot = getRobotFromDevice(device);

			// Check if it's Android or iOS robot
			if (robot instanceof AndroidRobot || robot instanceof IosRobot) {
				const result = robot.clearLogs();
				return result;
			}

			// For simulators or other robot types
			return `Log clearing is not yet supported for this device type`;
		}
	);

	tool(
		"mobile_get_crash_logs",
		"Get crash logs from the device. This shows recent app crashes with stack traces, which is critical for debugging crash issues. Use this when an app has crashed and you need to understand why.",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you."),
			packageName: z.string().optional().describe("Optional package name (Android) or bundle ID (iOS) to filter crashes for a specific app. If not provided, returns all recent crashes."),
			lines: z.number().optional().describe("Number of log lines to search through for crashes. Defaults to 500 if not specified.")
		},
		async ({ device, packageName, lines }) => {
			const robot = getRobotFromDevice(device);
			const numLines = lines || 500;

			// Check if it's Android or iOS robot
			if (robot instanceof AndroidRobot || robot instanceof IosRobot) {
				const crashes = robot.getCrashLogs(packageName, numLines);

				if (crashes.length === 0) {
					return packageName
						? `No crashes found for app: ${packageName}`
						: "No crashes found in recent logs";
				}

				// Format crashes nicely
				const crashText = crashes.join("\n");

				if (packageName) {
					return `Crash logs for ${packageName} (searched ${numLines} lines):\n\n${crashText}`;
				}

				return `Recent crash logs (searched ${numLines} lines):\n\n${crashText}`;
			}

			// For simulators or other robot types
			return `Crash log reading is not yet supported for this device type`;
		}
	);

	tool(
		"mobile_get_system_errors",
		"Get system error logs from the device. This shows system-level errors that might affect app behavior. Use this when you need to understand system-level issues or investigate performance problems.",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you."),
			lines: z.number().optional().describe("Number of recent error log lines to return. Defaults to 100 if not specified.")
		},
		async ({ device, lines }) => {
			const robot = getRobotFromDevice(device);
			const numLines = lines || 100;

			// Check if it's Android or iOS robot
			if (robot instanceof AndroidRobot || robot instanceof IosRobot) {
				const errors = robot.getSystemErrors(numLines);

				if (errors.length === 0) {
					return "No system errors found in recent logs";
				}

				// Format errors nicely
				const errorText = errors.join("\n");
				return `System error logs (${errors.length} entries):\n\n${errorText}`;
			}

			// For simulators or other robot types
			return `System error reading is not yet supported for this device type`;
		}
	);

	// MCP Tools for network monitoring
	// Note: Requires proxy setup on device (mitmproxy, Charles, etc.)

	toolIf(
		"network_monitoring",
		"mobile_set_proxy",
		"Set HTTP proxy on device for network monitoring. Configure device to route traffic through a proxy server (e.g., mitmproxy, Charles). After setting proxy, restart the app.",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you."),
			host: z.string().describe("Proxy server host/IP address (e.g., '192.168.1.100' or 'localhost')"),
			port: z.number().describe("Proxy server port (e.g., 8080 for mitmproxy, 8888 for Charles)")
		},
		async ({ device, host, port }) => {
			const robot = getRobotFromDevice(device);

			if (robot instanceof AndroidRobot || robot instanceof IosRobot) {
				const result = robot.setProxy(host, port);
				return result;
			}

			return "Proxy configuration is not supported for this device type";
		}
	);

	toolIf(
		"network_monitoring",
		"mobile_clear_proxy",
		"Clear HTTP proxy settings on device. Restore direct network connection. Restart the app after clearing proxy.",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you.")
		},
		async ({ device }) => {
			const robot = getRobotFromDevice(device);

			if (robot instanceof AndroidRobot || robot instanceof IosRobot) {
				const result = robot.clearProxy();
				return result;
			}

			return "Proxy configuration is not supported for this device type";
		}
	);

	toolIf(
		"network_monitoring",
		"mobile_get_proxy",
		"Get current HTTP proxy settings on device.",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you.")
		},
		async ({ device }) => {
			const robot = getRobotFromDevice(device);

			if (robot instanceof AndroidRobot || robot instanceof IosRobot) {
				const result = robot.getProxy();
				return result;
			}

			return "Proxy configuration is not supported for this device type";
		}
	);

	toolIf(
		"network_monitoring",
		"mobile_network_start_monitoring",
		"Start capturing network requests. Note: Requires proxy to be set up and running (use mobile_set_proxy first).",
		{
			noParams
		},
		async ({}) => {
			NetworkMonitor.start();
			return "Network monitoring started. All HTTP/HTTPS requests will be captured (if proxy is configured).";
		}
	);

	toolIf(
		"network_monitoring",
		"mobile_network_stop_monitoring",
		"Stop capturing network requests.",
		{
			noParams
		},
		async ({}) => {
			NetworkMonitor.stop();
			const count = NetworkMonitor.getRequestCount();
			return `Network monitoring stopped. Captured ${count} requests.`;
		}
	);

	toolIf(
		"network_monitoring",
		"mobile_network_get_requests",
		"Get captured network requests. Returns list of HTTP/HTTPS requests with details.",
		{
			url: z.string().optional().describe("Optional URL pattern to filter requests (e.g., 'api.example.com')"),
			method: z.string().optional().describe("Optional HTTP method to filter (e.g., 'GET', 'POST')"),
			status: z.number().optional().describe("Optional HTTP status code to filter (e.g., 200, 404, 500)")
		},
		async ({ url, method, status }) => {
			const requests = NetworkMonitor.getRequests({ url, method, status });

			if (requests.length === 0) {
				return "No network requests captured yet. Start monitoring with mobile_network_start_monitoring.";
			}

			// Format requests for display
			const formatted = requests.map((req, i) => {
				const statusStr = req.status ? ` [${req.status}]` : "";
				const durationStr = req.duration ? ` (${req.duration}ms)` : "";
				return `${i + 1}. ${req.method} ${req.url}${statusStr}${durationStr}`;
			}).join("\n");

			return `Captured ${requests.length} requests:\n\n${formatted}\n\nUse mobile_network_get_request_details to see full details.`;
		}
	);

	toolIf(
		"network_monitoring",
		"mobile_network_get_request_details",
		"Get detailed information about a specific network request, including headers and body.",
		{
			id: z.string().describe("Request ID to get details for")
		},
		async ({ id }) => {
			const request = NetworkMonitor.getRequestById(id);

			if (!request) {
				return `Request with ID ${id} not found.`;
			}

			// Format request details
			const details = [
				`Request ID: ${request.id}`,
				`Method: ${request.method}`,
				`URL: ${request.url}`,
				`Timestamp: ${new Date(request.timestamp).toISOString()}`,
				``
			];

			if (request.status) {
				details.push(`Status: ${request.status} ${request.statusText || ""}`);
			}

			if (request.duration) {
				details.push(`Duration: ${request.duration}ms`);
			}

			if (request.headers && Object.keys(request.headers).length > 0) {
				details.push(``, `Request Headers:`);
				for (const [name, value] of Object.entries(request.headers)) {
					details.push(`  ${name}: ${value}`);
				}
			}

			if (request.body) {
				details.push(``, `Request Body:`, request.body);
			}

			if (request.responseHeaders && Object.keys(request.responseHeaders).length > 0) {
				details.push(``, `Response Headers:`);
				for (const [name, value] of Object.entries(request.responseHeaders)) {
					details.push(`  ${name}: ${value}`);
				}
			}

			if (request.responseBody) {
				details.push(``, `Response Body:`, request.responseBody);
			}

			return details.join("\n");
		}
	);

	toolIf(
		"network_monitoring",
		"mobile_network_get_summary",
		"Get summary statistics of captured network requests.",
		{
			noParams
		},
		async ({}) => {
			const summary = NetworkMonitor.getSummary();

			if (summary.totalRequests === 0) {
				return "No network requests captured yet.";
			}

			const lines = [
				`Network Monitoring Summary:`,
				``,
				`Total Requests: ${summary.totalRequests}`,
				``,
				`By Method:`
			];

			for (const [method, count] of Object.entries(summary.methods)) {
				lines.push(`  ${method}: ${count}`);
			}

			lines.push(``, `By Status Code:`);
			for (const [status, count] of Object.entries(summary.statusCodes)) {
				lines.push(`  ${status}: ${count}`);
			}

			lines.push(``, `By Domain:`);
			for (const [domain, count] of Object.entries(summary.domains)) {
				lines.push(`  ${domain}: ${count}`);
			}

			return lines.join("\n");
		}
	);

	toolIf(
		"network_monitoring",
		"mobile_network_clear",
		"Clear all captured network requests from memory.",
		{
			noParams
		},
		async ({}) => {
			const count = NetworkMonitor.getRequestCount();
			NetworkMonitor.clear();
			return `Cleared ${count} captured requests.`;
		}
	);

	// MCP Tools for AI Element Finder
	// Find elements by natural language description

	tool(
		"mobile_find_element_by_description",
		"Find UI element by natural language description. Examples: 'login button', 'email input field', 'settings icon in top right'. Returns element coordinates.",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you."),
			description: z.string().describe("Natural language description of the element (e.g., 'blue login button', 'email input field at top')"),
			threshold: z.number().optional().describe("Minimum confidence score 0-100 (default: 50). Lower threshold returns more results.")
		},
		async ({ device, description, threshold }) => {
			const robot = getRobotFromDevice(device);

			// Get elements on screen
			const elements = await robot.getElementsOnScreen();

			if (elements.length === 0) {
				return "No elements found on screen. Make sure the app is running and screen is not blank.";
			}

			// Find element by description
			const match = AIElementFinder.findElementByDescription(
				elements,
				description,
				threshold || 50
			);

			if (!match) {
				return `No element found matching "${description}". Try a different description or lower the threshold.`;
			}

			// Format result
			const result = [
				`Found element: ${match.element.type}`,
				`Confidence: ${match.score}%`,
				`Reason: ${match.reason}`,
				``,
				`Details:`,
				`  Text: ${match.element.text || "(none)"}`,
				`  Label: ${match.element.label || "(none)"}`,
				`  Position: x=${match.element.rect.x}, y=${match.element.rect.y}`,
				`  Size: ${match.element.rect.width}x${match.element.rect.height}`,
				``,
				`To tap this element, use: mobile_click_on_screen_at_coordinates with x=${match.element.rect.x + match.element.rect.width / 2}, y=${match.element.rect.y + match.element.rect.height / 2}`
			];

			return result.join("\n");
		}
	);

	tool(
		"mobile_tap_element_by_description",
		"Find and tap element by natural language description. Combines find + tap in one command. Examples: 'tap login button', 'click email field'.",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you."),
			description: z.string().describe("Natural language description of the element to tap"),
			threshold: z.number().optional().describe("Minimum confidence score 0-100 (default: 50)")
		},
		async ({ device, description, threshold }) => {
			const robot = getRobotFromDevice(device);

			// Auto-hide keyboard before tap to avoid keyboard overlapping elements
			// This is safe to call even if keyboard is not visible
			try {
				await robot.hideKeyboard();
			} catch (error) {
				// Ignore errors - keyboard might not be present
			}

			// Get elements on screen
			const elements = await robot.getElementsOnScreen();

			if (elements.length === 0) {
				return "No elements found on screen.";
			}

			// Find element with improved fallback (AI + accessibility)
			const match = AIElementFinder.findElementByDescription(
				elements,
				description,
				threshold || 50
			);

			if (!match) {
				return `Could not find element matching "${description}". Try using mobile_list_elements_on_screen to see available elements.`;
			}

			// Calculate tap coordinates (center of element)
			const tapX = match.element.rect.x + Math.floor(match.element.rect.width / 2);
			const tapY = match.element.rect.y + Math.floor(match.element.rect.height / 2);

			// Tap element
			await robot.tap(tapX, tapY);

			// Record action in test context
			TestContext.recordAction({
				type: "tap_by_description",
				timestamp: Date.now(),
				device,
				params: { description, confidence: match.score },
				result: "success"
			});

			// Record in test recorder if recording
			TestRecorder.recordTap(tapX, tapY, `Tap ${description}`);

			return `Tapped "${match.element.type}" (confidence: ${match.score}%, reason: ${match.reason}) at coordinates: ${tapX}, ${tapY}`;
		}
	);

	tool(
		"mobile_hide_keyboard",
		"Hide soft keyboard on device. Useful when keyboard overlaps elements you want to interact with. Safe to call even if keyboard is not visible.",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you.")
		},
		async ({ device }) => {
			const robot = getRobotFromDevice(device);

			await robot.hideKeyboard();

			// Record action in test context
			TestContext.recordAction({
				type: "hide_keyboard",
				timestamp: Date.now(),
				device,
				params: {},
				result: "success"
			});

			return "Keyboard hidden successfully";
		}
	);

	tool(
		"mobile_select_option_by_text",
		"Select option by text in native picker/dropdown. Works with Android spinners and iOS UIPickerView. Automatically scrolls through options to find matching text.",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you."),
			text: z.string().describe("Text of the option to select (e.g., 'Option 2', 'January')"),
			maxScrollAttempts: z.number().optional().describe("Maximum number of scroll attempts (default: 10)")
		},
		async ({ device, text, maxScrollAttempts }) => {
			const robot = getRobotFromDevice(device);

			const found = await robot.selectOptionByText(text, maxScrollAttempts || 10);

			// Record action in test context
			TestContext.recordAction({
				type: "select_option",
				timestamp: Date.now(),
				device,
				params: { text, found },
				result: found ? "success" : "not_found"
			});

			if (found) {
				return `Selected option: "${text}"`;
			} else {
				return `Could not find option: "${text}" after ${maxScrollAttempts || 10} scroll attempts`;
			}
		}
	);

	tool(
		"mobile_swipe_in_element",
		"Swipe inside a specific element (useful for scrollable containers like carousels, nested lists, modal dialogs). First use mobile_find_element_by_description to get the element.",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you."),
			elementDescription: z.string().describe("Natural language description of the element to swipe inside (e.g., 'scrollable list', 'carousel')"),
			direction: z.enum(["up", "down", "left", "right"]).describe("Swipe direction"),
			distance: z.number().optional().describe("Optional swipe distance in pixels (default: 70% of element dimension)")
		},
		async ({ device, elementDescription, direction, distance }) => {
			const robot = getRobotFromDevice(device);

			// Find the element first
			const elements = await robot.getElementsOnScreen();

			if (elements.length === 0) {
				return "No elements found on screen.";
			}

			const match = AIElementFinder.findElementByDescription(elements, elementDescription, 50);

			if (!match) {
				return `Could not find element matching "${elementDescription}".`;
			}

			// Swipe inside the element
			await robot.swipeInElement(match.element, direction, distance);

			// Record action in test context
			TestContext.recordAction({
				type: "swipe_in_element",
				timestamp: Date.now(),
				device,
				params: { elementDescription, direction, distance },
				result: "success"
			});

			return `Swiped ${direction} inside "${match.element.type}" (confidence: ${match.score}%)`;
		}
	);

	tool(
		"mobile_find_all_matching_elements",
		"Find all elements matching description. Returns multiple matches sorted by confidence. Useful when you want to see all possible matches.",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you."),
			description: z.string().describe("Natural language description of elements to find"),
			threshold: z.number().optional().describe("Minimum confidence score 0-100 (default: 50)"),
			limit: z.number().optional().describe("Maximum number of results (default: 5)")
		},
		async ({ device, description, threshold, limit }) => {
			const robot = getRobotFromDevice(device);

			// Get elements on screen
			const elements = await robot.getElementsOnScreen();

			if (elements.length === 0) {
				return "No elements found on screen.";
			}

			// Find all matching elements
			const matches = AIElementFinder.findAllMatchingElements(
				elements,
				description,
				threshold || 50,
				limit || 5
			);

			if (matches.length === 0) {
				return `No elements found matching "${description}".`;
			}

			// Format results
			const results = [
				`Found ${matches.length} matching elements for "${description}":`,
				``
			];

			matches.forEach((match, i) => {
				const centerX = match.element.rect.x + Math.floor(match.element.rect.width / 2);
				const centerY = match.element.rect.y + Math.floor(match.element.rect.height / 2);

				results.push(`${i + 1}. ${match.element.type} (${match.score}% confidence)`);
				results.push(`   Reason: ${match.reason}`);
				results.push(`   Text: ${match.element.text || "(none)"}`);
				results.push(`   Position: (${centerX}, ${centerY})`);
				results.push(``);
			});

			return results.join("\n");
		}
	);

	// MCP Tools for OCR (Optical Character Recognition)
	// Find visual elements that accessibility API cannot detect

	tool(
		"mobile_ocr_screenshot",
		"Perform OCR (text recognition) on screenshot to find visual elements like buttons, numbers, icons. Useful when accessibility API fails to detect elements. Uses FAST mode (3x faster) with optional parallel processing.",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you."),
			minConfidence: z.number().optional().describe("Minimum OCR confidence (0-100). Default: 60. Lower value returns more results but less accurate."),
			preprocess: z.boolean().optional().describe("Apply image preprocessing (grayscale, contrast, threshold) for better accuracy. Default: true."),
			usePool: z.boolean().optional().describe("Use worker pool for parallel processing (faster for multiple requests). Default: false.")
		},
		async ({ device, minConfidence, preprocess, usePool }) => {
			const robot = getRobotFromDevice(device);

			// Take screenshot
			const screenshotBuffer = await robot.getScreenshot();

			// Initialize OCR engine
			const ocrEngine = getOCREngine();

			// Use worker pool for parallel processing if requested
			let result;
			if (usePool) {
				await ocrEngine.initializeWithPool(4); // 4 workers for optimal performance
				result = await ocrEngine.recognizeTextParallel(screenshotBuffer, {
					minConfidence: minConfidence || 60,
					preprocess: preprocess !== false
				});
			} else {
				await ocrEngine.initialize();
				result = await ocrEngine.recognizeText(screenshotBuffer, {
					minConfidence: minConfidence || 60,
					preprocess: preprocess !== false
				});
			}

			// Record in test context
			TestContext.recordAction({
				type: "ocr_screenshot",
				timestamp: Date.now(),
				device,
				params: { minConfidence, preprocess },
				result: `Found ${result.words.length} words in ${result.processTime}ms`
			});

			// Format results
			const results = [
				`OCR Results:`,
				`- Total words found: ${result.words.length}`,
				`- Processing time: ${result.processTime}ms`,
				``,
				`Words with coordinates:`
			];

			result.words.forEach((word, index) => {
				results.push(
					`${index + 1}. "${word.text}" at (${Math.round(word.center.x)}, ${Math.round(word.center.y)}) - confidence: ${Math.round(word.confidence)}%`
				);
			});

			if (result.words.length === 0) {
				results.push("No text found. Try adjusting minConfidence or check if image has readable text.");
			}

			return results.join("\n");
		}
	);

	tool(
		"mobile_find_text_by_ocr",
		"Find specific text on screen using OCR. Useful for finding numbers (98, 68), buttons without accessibility labels, or visual text elements. Uses FAST mode (3x faster) with optional parallel processing.",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you."),
			text: z.string().describe("Text to find (e.g., '98', 'Optimal', 'Settings', '+')"),
			minConfidence: z.number().optional().describe("Minimum OCR confidence (0-100). Default: 60."),
			usePool: z.boolean().optional().describe("Use worker pool for parallel processing. Default: false.")
		},
		async ({ device, text, minConfidence, usePool }) => {
			const robot = getRobotFromDevice(device);

			// Take screenshot
			const screenshotBuffer = await robot.getScreenshot();

			// Initialize OCR engine
			const ocrEngine = getOCREngine();

			// Use worker pool for parallel processing if requested
			let ocrResult;
			if (usePool) {
				await ocrEngine.initializeWithPool(4);
				ocrResult = await ocrEngine.recognizeTextParallel(screenshotBuffer, {
					minConfidence: minConfidence || 60
				});
			} else {
				await ocrEngine.initialize();
				ocrResult = await ocrEngine.recognizeText(screenshotBuffer, {
					minConfidence: minConfidence || 60
				});
			}

			// Search for text
			const matches = ocrEngine.findTextByDescription(ocrResult, text);

			// Record in test context
			TestContext.recordAction({
				type: "find_text_by_ocr",
				timestamp: Date.now(),
				device,
				params: { text, minConfidence },
				result: `Found ${matches.length} matches`
			});

			if (matches.length === 0) {
				return `Text "${text}" not found on screen. Try:\n- Check if text is visible\n- Use mobile_ocr_screenshot to see all detected text\n- Lower minConfidence threshold`;
			}

			// Format results
			const results = [
				`Found ${matches.length} match(es) for "${text}":`,
				``
			];

			matches.forEach((match, index) => {
				results.push(
					`${index + 1}. "${match.text}" at coordinates (${Math.round(match.x)}, ${Math.round(match.y)}) - confidence: ${Math.round(match.confidence)}%`
				);
			});

			results.push(``);
			results.push(`Use mobile_click_on_screen_at_coordinates to tap at these coordinates.`);

			return results.join("\n");
		}
	);

	// MCP Tools for Assertions
	// Playwright-like expect() for mobile testing

	tool(
		"mobile_expect_element_visible",
		"Assert that element is visible on screen. Waits for element to appear within timeout. Similar to Playwright's expect(element).toBeVisible().",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you."),
			description: z.string().describe("Natural language description of element to find"),
			timeout: z.number().optional().describe("Timeout in milliseconds (default: 5000)")
		},
		async ({ device, description, timeout }) => {
			const robot = getRobotFromDevice(device);
			const assertions = new Assertions(robot);

			const result = await assertions.expectElementVisible(description, timeout || 5000);

			if (result.success) {
				return `✓ ${result.message}`;
			} else {
				return `✗ ${result.message}`;
			}
		}
	);

	tool(
		"mobile_expect_element_not_visible",
		"Assert that element is NOT visible on screen. Waits to ensure element stays hidden. Similar to Playwright's expect(element).not.toBeVisible().",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you."),
			description: z.string().describe("Natural language description of element that should not be visible"),
			timeout: z.number().optional().describe("Timeout in milliseconds (default: 5000)")
		},
		async ({ device, description, timeout }) => {
			const robot = getRobotFromDevice(device);
			const assertions = new Assertions(robot);

			const result = await assertions.expectElementNotVisible(description, timeout || 5000);

			if (result.success) {
				return `✓ ${result.message}`;
			} else {
				return `✗ ${result.message}`;
			}
		}
	);

	tool(
		"mobile_expect_text_visible",
		"Assert that specific text is visible on screen. Waits for text to appear within timeout.",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you."),
			text: z.string().describe("Text to search for on screen"),
			timeout: z.number().optional().describe("Timeout in milliseconds (default: 5000)")
		},
		async ({ device, text, timeout }) => {
			const robot = getRobotFromDevice(device);
			const assertions = new Assertions(robot);

			const result = await assertions.expectTextVisible(text, timeout || 5000);

			if (result.success) {
				return `✓ ${result.message}`;
			} else {
				return `✗ ${result.message}`;
			}
		}
	);

	tool(
		"mobile_expect_text_not_visible",
		"Assert that specific text is NOT visible on screen. Waits to ensure text stays hidden.",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you."),
			text: z.string().describe("Text that should not be visible on screen"),
			timeout: z.number().optional().describe("Timeout in milliseconds (default: 5000)")
		},
		async ({ device, text, timeout }) => {
			const robot = getRobotFromDevice(device);
			const assertions = new Assertions(robot);

			const result = await assertions.expectTextNotVisible(text, timeout || 5000);

			if (result.success) {
				return `✓ ${result.message}`;
			} else {
				return `✗ ${result.message}`;
			}
		}
	);

	tool(
		"mobile_expect_element_count",
		"Assert that specific number of matching elements are on screen. Useful for lists, grids, etc.",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you."),
			description: z.string().describe("Natural language description of elements to count"),
			count: z.number().describe("Expected number of matching elements"),
			timeout: z.number().optional().describe("Timeout in milliseconds (default: 5000)")
		},
		async ({ device, description, count, timeout }) => {
			const robot = getRobotFromDevice(device);
			const assertions = new Assertions(robot);

			const result = await assertions.expectElementCount(description, count, timeout || 5000);

			if (result.success) {
				return `✓ ${result.message}`;
			} else {
				return `✗ ${result.message} (expected: ${result.expectedValue}, actual: ${result.actualValue})`;
			}
		}
	);

	tool(
		"mobile_expect_on_screen",
		"Assert that app is on a specific screen by checking for key element or text. Useful for navigation verification.",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you."),
			screenIdentifier: z.string().describe("Text or element that uniquely identifies the screen (e.g., 'Login', 'Settings', 'Welcome')"),
			timeout: z.number().optional().describe("Timeout in milliseconds (default: 5000)")
		},
		async ({ device, screenIdentifier, timeout }) => {
			const robot = getRobotFromDevice(device);
			const assertions = new Assertions(robot);

			const result = await assertions.expectOnScreen(screenIdentifier, timeout || 5000);

			if (result.success) {
				return `✓ ${result.message}`;
			} else {
				return `✗ ${result.message}`;
			}
		}
	);

	// MCP Tools for Batch Operations
	// Execute multiple actions atomically

	tool(
		"mobile_batch_actions",
		"Execute multiple mobile actions in sequence (atomic operation). Useful for multi-step flows like login, registration, or complex test scenarios. Supports rollback on error.",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you."),
			actions: z.array(z.object({
				type: z.enum(["tap", "swipe", "type", "wait", "screenshot", "expect", "launch_app", "press_button"]).describe("Action type to execute"),
				params: z.record(z.any()).describe("Action parameters (e.g., {x: 100, y: 200} for tap, {text: 'hello'} for type)"),
				description: z.string().optional().describe("Optional description for logging")
			})).describe("Array of actions to execute sequentially"),
			stopOnError: z.boolean().optional().describe("Stop execution on first error (default: true)"),
			takeScreenshotOnError: z.boolean().optional().describe("Take screenshot when error occurs (default: true)"),
			actionDelay: z.number().optional().describe("Delay between actions in milliseconds (default: 0)")
		},
		async ({ device, actions, stopOnError, takeScreenshotOnError, actionDelay }) => {
			const robot = getRobotFromDevice(device);

			// Execute batch
			console.error(`[Batch] Executing batch of ${actions.length} actions on device ${device}`);
			const result = await BatchOperations.executeBatch(robot, actions as BatchAction[], {
				stopOnError: stopOnError !== false,  // Default to true
				takeScreenshotOnError: takeScreenshotOnError !== false,  // Default to true
				actionDelay: actionDelay || 0
			});

			// Record in test context
			TestContext.recordAction({
				type: "batch_actions",
				timestamp: Date.now(),
				device,
				params: { actionCount: actions.length },
				result: result.success ? "success" : "failed"
			});

			// Format results
			const lines = [
				`Batch Execution Results:`,
				`- Total actions: ${result.totalActions}`,
				`- Success: ${result.successCount}`,
				`- Failed: ${result.failedCount}`,
				`- Skipped: ${result.skippedCount}`,
				`- Total duration: ${result.totalDuration}ms`,
				`- Overall status: ${result.success ? "✅ SUCCESS" : "❌ FAILED"}`,
				``
			];

			// Add detailed action results
			if (result.actions.length > 0) {
				lines.push(`Action Details:`);
				result.actions.forEach((actionResult, index) => {
					const statusIcon = actionResult.status === "success" ? "✅" :
						actionResult.status === "failed" ? "❌" : "⏭️";
					lines.push(`${index + 1}. ${statusIcon} ${actionResult.action.type} - ${actionResult.status}`);

					if (actionResult.action.description) {
						lines.push(`   Description: ${actionResult.action.description}`);
					}

					if (actionResult.duration) {
						lines.push(`   Duration: ${actionResult.duration}ms`);
					}

					if (actionResult.error) {
						lines.push(`   Error: ${actionResult.error}`);
					}
				});
			}

			// Note about error screenshot
			if (result.errorScreenshot) {
				lines.push(``);
				lines.push(`📸 Error screenshot captured (${result.errorScreenshot.length} bytes)`);
				lines.push(`Note: Screenshot is captured but not returned in response. Check test context for details.`);
			}

			return lines.join("\n");
		}
	);

	// MCP Tools for Loading Detection
	// Detect when loading/animation completes

	tool(
		"mobile_wait_for_loading",
		"Wait for loading to complete by detecting screen stability. Uses screenshot comparison to determine when animations/loading finish. Useful for dynamic content and async operations.",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you."),
			timeout: z.number().optional().describe("Maximum wait time in milliseconds (default: 10000)"),
			pollInterval: z.number().optional().describe("Check interval in milliseconds (default: 500)"),
			stabilityTime: z.number().optional().describe("Screen must be stable for N milliseconds (default: 1000)"),
			similarityThreshold: z.number().optional().describe("Similarity threshold 0-1, higher = more strict (default: 0.95)")
		},
		async ({ device, timeout, pollInterval, stabilityTime, similarityThreshold }) => {
			const robot = getRobotFromDevice(device);

			console.error(`[Loading] Waiting for loading to complete on device ${device}`);
			const result = await LoadingDetector.waitForLoading(robot, {
				timeout: timeout || 10000,
				pollInterval: pollInterval || 500,
				stabilityTime: stabilityTime || 1000,
				similarityThreshold: similarityThreshold || 0.95
			});

			// Record in test context
			TestContext.recordAction({
				type: "wait_for_loading",
				timestamp: Date.now(),
				device,
				params: { timeout, stabilityTime },
				result: result.completed ? "completed" : "timeout"
			});

			// Format result
			const lines = [
				`Loading Detection Result:`,
				`- Status: ${result.completed ? "✅ Complete" : "⏱️ Timeout"}`,
				`- Duration: ${result.duration}ms`,
				`- Screenshots taken: ${result.screenshotCount}`,
				`- Reason: ${result.reason}`
			];

			if (!result.completed) {
				lines.push(``);
				lines.push(`Tip: Try increasing timeout or reducing stabilityTime if loading is still in progress.`);
			}

			return lines.join("\n");
		}
	);

	tool(
		"mobile_wait_for_element_condition",
		"Wait for specific element to appear or disappear. More reliable than screenshot comparison when you know the element text (e.g., 'Loading...', 'Please wait').",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you."),
			elementText: z.string().describe("Text of element to watch (e.g., 'Loading...', 'Welcome', 'Please wait')"),
			waitForDisappear: z.boolean().optional().describe("If true, waits for element to disappear. If false, waits for element to appear (default: true)"),
			timeout: z.number().optional().describe("Maximum wait time in milliseconds (default: 10000)")
		},
		async ({ device, elementText, waitForDisappear, timeout }) => {
			const robot = getRobotFromDevice(device);

			const shouldDisappear = waitForDisappear !== false; // Default to true
			console.error(`[Loading] Waiting for element "${elementText}" to ${shouldDisappear ? "disappear" : "appear"}`);

			const result = await LoadingDetector.waitForElement(
				robot,
				elementText,
				shouldDisappear,
				timeout || 10000
			);

			// Record in test context
			TestContext.recordAction({
				type: "wait_for_element_condition",
				timestamp: Date.now(),
				device,
				params: { elementText, waitForDisappear: shouldDisappear },
				result: result.completed ? "completed" : "timeout"
			});

			// Format result
			const lines = [
				`Element Condition Result:`,
				`- Status: ${result.completed ? "✅ Complete" : "⏱️ Timeout"}`,
				`- Duration: ${result.duration}ms`,
				`- Element: "${elementText}"`,
				`- Condition: ${shouldDisappear ? "disappear" : "appear"}`,
				`- Checks performed: ${result.screenshotCount}`,
				`- Reason: ${result.reason}`
			];

			if (!result.completed) {
				lines.push(``);
				lines.push(`Tip: Use mobile_list_elements_on_screen to verify element text is correct.`);
			}

			return lines.join("\n");
		}
	);

	// MCP Tools for Test Recording
	// Record actions and generate test code

	tool(
		"mobile_start_recording",
		"Start recording test actions. All subsequent mobile actions (tap, swipe, type, launch) will be recorded for test generation.",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you.")
		},
		async ({ device }) => {
			TestRecorder.start();
			return `Started recording test actions on ${device}. All actions will be recorded until you call mobile_stop_recording.`;
		}
	);

	tool(
		"mobile_stop_recording",
		"Stop recording and optionally generate test code. Returns recorded actions summary.",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you."),
			generateCode: z.boolean().optional().describe("Whether to generate test code (default: false)")
		},
		async ({ device, generateCode }) => {
			const actions = TestRecorder.stop();

			if (actions.length === 0) {
				return "Recording stopped. No actions were recorded.";
			}

			const summary = CodeGenerator.generateSummary(actions);

			if (generateCode) {
				return summary + "\n\nUse mobile_generate_test_code to generate test code from these actions.";
			}

			return summary;
		}
	);

	tool(
		"mobile_get_recording_status",
		"Get current recording status and summary of recorded actions.",
		{
			noParams
		},
		async ({}) => {
			return TestRecorder.getSummary();
		}
	);

	tool(
		"mobile_generate_test_code",
		"Generate test code from recorded actions. Must call mobile_stop_recording first.",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you."),
			testName: z.string().describe("Name for the generated test (e.g., 'Login Flow Test')"),
			language: z.enum(["typescript", "javascript"]).optional().describe("Programming language (default: typescript)"),
			framework: z.enum(["jest", "mocha", "plain"]).optional().describe("Test framework (default: jest)"),
			includeTimings: z.boolean().optional().describe("Include timing delays between actions (default: false)")
		},
		async ({ device, testName, language, framework, includeTimings }) => {
			const actions = TestRecorder.getActions();

			if (actions.length === 0) {
				return "No recorded actions available. Use mobile_start_recording to begin recording.";
			}

			const code = CodeGenerator.generateAdvancedTest(actions, {
				testName,
				deviceId: device,
				language: language || "typescript",
				framework: framework || "jest",
				includeTimings: includeTimings || false
			});

			return "Generated test code:\n\n```" + (language || "typescript") + "\n" + code + "\n```";
		}
	);

	tool(
		"mobile_clear_recording",
		"Clear all recorded actions without stopping recording. Useful to restart recording without generating code.",
		{
			noParams
		},
		async ({}) => {
			TestRecorder.clear();
			return "Cleared all recorded actions. Recording continues if it was active.";
		}
	);

	// MCP Tools for test context
	// Note: Full MCP Resources support will be added in future
	// For now, we expose test context through tools

	tool(
		"mobile_clear_test_context",
		"Clear test context (action history and logs). Use this at the start of a new test to reset the context.",
		{
			noParams
		},
		async ({}) => {
			TestContext.clear();
			return "Test context cleared. Starting fresh test session.";
		}
	);

	tool(
		"mobile_get_session_summary",
		"Get summary of current test session. Shows how many actions performed, devices used, etc.",
		{
			noParams
		},
		async ({}) => {
			const summary = TestContext.findResource("test://current/summary");
			if (!summary) {
				return "No test context available. Start performing actions to build test context.";
			}
			return `Test Summary:\n${summary.text}`;
		}
	);

	tool(
		"mobile_get_test_actions",
		"Get full history of all actions performed in current test session. Returns detailed action log.",
		{
			noParams
		},
		async ({}) => {
			const actions = TestContext.findResource("test://current/actions");
			if (!actions) {
				return "No actions recorded yet. Start performing actions to build test history.";
			}
			return `Test Actions:\n${actions.text}`;
		}
	);

	tool(
		"mobile_get_test_logs",
		"Get all logs captured during current test session.",
		{
			noParams
		},
		async ({}) => {
			const logs = TestContext.findResource("test://current/logs");
			if (!logs || logs.text.trim() === "") {
				return "No logs captured yet.";
			}
			return `Test Logs:\n${logs.text}`;
		}
	);

	// ===========================
	// VISUAL REGRESSION TESTING
	// ===========================

	// Create visual tester instance
	const visualTester = new VisualTester();

	// Create video recorder instance
	const videoRecorder = new VideoRecorder();

	// Create performance monitor instance
	const performanceMonitor = new PerformanceMonitor();

	// Create device conditions instance
	const deviceConditions = new DeviceConditions();
	const accessibilityChecker = new AccessibilityChecker();
	const screenshotAnnotator = new ScreenshotAnnotator();
	const bugReportGenerator = new BugReportGenerator();
	const flakinessDetector = new TestFlakinessDetector();
	const dataGenerator = new TestDataGenerator();
	const touchIndicators = new VisualTouchIndicators();
	const cicdReporter = new CICDReporter();

	tool(
		"mobile_save_baseline",
		"Save current screenshot as baseline for future visual regression comparisons. Use this to create reference images.",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you."),
			name: z.string().describe("Baseline name (e.g., 'home-screen', 'login-page'). Should be descriptive and unique.")
		},
		async ({ device, name }) => {
			const robot = getRobotFromDevice(device);

			// Get current screenshot
			const screenshot = await robot.getScreenshot();

			// Save as baseline
			const filepath = await visualTester.saveBaseline(name, screenshot);

			return `Baseline saved successfully: ${filepath}\n\nYou can now use mobile_compare_screenshot to compare future screenshots against this baseline.`;
		}
	);

	tool(
		"mobile_compare_screenshot",
		"Compare current screenshot with a saved baseline to detect visual regressions. Returns similarity score and highlights differences.",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you."),
			baselineName: z.string().describe("Name of the baseline to compare against (e.g., 'home-screen')"),
			threshold: z.number().optional().describe("Pixel difference threshold 0-1 (default: 0.1 = 10% tolerance). Lower = stricter comparison.")
		},
		async ({ device, baselineName, threshold }) => {
			const robot = getRobotFromDevice(device);

			// Check if baseline exists
			if (!visualTester.baselineExists(baselineName)) {
				return `Baseline '${baselineName}' not found. Use mobile_save_baseline to create it first.\n\nAvailable baselines: ${visualTester.listBaselines().join(", ") || "none"}`;
			}

			// Get current screenshot
			const actual = await robot.getScreenshot();

			// Load baseline
			const expected = await visualTester.loadBaseline(baselineName);

			// Compare
			const result = await visualTester.compareScreenshots(
				actual,
				expected,
				threshold || 0.1
			);

			// Generate report
			let report = `Visual Comparison Results:\n`;
			report += `  Baseline: ${baselineName}\n`;
			report += `  Similarity: ${(result.similarity * 100).toFixed(2)}%\n`;
			report += `  Different pixels: ${result.differentPixels.toLocaleString()} / ${result.totalPixels.toLocaleString()}\n`;
			report += `  Match: ${result.match ? "✓ YES" : "✗ NO"}\n`;

			if (!result.match) {
				// Save diff image for debugging
				const diffPath = visualTester.saveDiffImage(`${baselineName}_diff`, result.diffImage);
				report += `\n⚠️ Visual regression detected!\n`;
				report += `Diff image saved to: ${diffPath}\n`;
				report += `\nThe diff image highlights changed pixels in red. Review it to see what changed.`;
			} else {
				report += `\n✓ Screenshots match! No visual regression detected.`;
			}

			return report;
		}
	);

	tool(
		"mobile_list_baselines",
		"List all available baseline screenshots for visual regression testing.",
		{
			noParams
		},
		async ({}) => {
			const baselines = visualTester.listBaselines();

			if (baselines.length === 0) {
				return "No baselines found. Use mobile_save_baseline to create your first baseline.";
			}

			return `Available baselines (${baselines.length}):\n\n` +
				baselines.map((name, i) => `${i + 1}. ${name}`).join("\n");
		}
	);

	tool(
		"mobile_delete_baseline",
		"Delete a baseline screenshot. Use this to remove outdated or incorrect baselines.",
		{
			name: z.string().describe("Name of the baseline to delete")
		},
		async ({ name }) => {
			if (!visualTester.baselineExists(name)) {
				return `Baseline '${name}' not found.\n\nAvailable baselines: ${visualTester.listBaselines().join(", ") || "none"}`;
			}

			visualTester.deleteBaseline(name);
			return `Baseline '${name}' deleted successfully.`;
		}
	);

	// ===========================
	// VIDEO RECORDING
	// ===========================

	toolIf(
		"video_recording",
		"mobile_start_video_recording",
		"Start recording video of device screen. Records until stopped (max 3 minutes). Video saved to test/recordings/.",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you."),
			maxDuration: z.number().optional().describe("Maximum recording duration in seconds (default: 180 = 3 minutes)"),
			bitRate: z.number().optional().describe("Android only: Video bit rate in bits per second (default: 4000000 = 4Mbps)"),
			size: z.string().optional().describe("Android only: Video size like '1280x720' (default: device screen size)")
		},
		async ({ device, maxDuration, bitRate, size }) => {
			if (videoRecorder.isRecording()) {
				return "Recording already in progress. Stop it first using mobile_stop_video_recording.";
			}

			const robot = getRobotFromDevice(device);
			const platform = robot instanceof AndroidRobot ? "android" : "ios";

			const outputPath = await videoRecorder.startRecording(device, platform, {
				maxDuration,
				bitRate,
				size
			});

			return `Started video recording.\n\nPlatform: ${platform}\nDevice: ${device}\nMax duration: ${maxDuration || 180} seconds\nOutput: ${outputPath}\n\nUse mobile_stop_video_recording to stop and save the video.`;
		}
	);

	toolIf(
		"video_recording",
		"mobile_stop_video_recording",
		"Stop video recording and save to file. Returns file path and size.",
		{
			noParams
		},
		async ({}) => {
			if (!videoRecorder.isRecording()) {
				return "No recording in progress. Use mobile_start_video_recording to start recording first.";
			}

			const result = await videoRecorder.stopRecording();

			const sizeMB = (result.size / 1024 / 1024).toFixed(2);

			return `Video recording stopped and saved.\n\nFile: ${result.path}\nSize: ${sizeMB} MB\n\nYou can now review the video or use it for documentation.`;
		}
	);

	toolIf(
		"video_recording",
		"mobile_get_recording_status_video",
		"Check if video recording is in progress and get recording details.",
		{
			noParams
		},
		async ({}) => {
			const info = videoRecorder.getRecordingInfo();

			if (!info.recording) {
				return "No video recording in progress.";
			}

			return `Video recording in progress:\n\nPlatform: ${info.platform}\nDevice: ${info.deviceId}\nOutput: ${info.outputPath}\n\nUse mobile_stop_video_recording to stop.`;
		}
	);

	toolIf(
		"video_recording",
		"mobile_cancel_video_recording",
		"Cancel current video recording without saving. Useful if you want to discard the recording.",
		{
			noParams
		},
		async ({}) => {
			if (!videoRecorder.isRecording()) {
				return "No recording in progress.";
			}

			await videoRecorder.cancelRecording();
			return "Video recording cancelled. No file was saved.";
		}
	);

	// ===========================
	// CLIPBOARD OPERATIONS
	// ===========================

	tool(
		"mobile_get_clipboard",
		"Get clipboard content from device. Returns current text in clipboard.",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you.")
		},
		async ({ device }) => {
			const robot = getRobotFromDevice(device);
			const content = await robot.getClipboard();

			if (!content || content.length === 0) {
				return "Clipboard is empty.";
			}

			return `Clipboard content:\n\n${content}`;
		}
	);

	tool(
		"mobile_set_clipboard",
		"Set clipboard content on device. Useful for pasting text into app fields.",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you."),
			text: z.string().describe("Text to set in clipboard")
		},
		async ({ device, text }) => {
			const robot = getRobotFromDevice(device);
			await robot.setClipboard(text);

			return `Clipboard set successfully.\n\nContent: ${text.substring(0, 100)}${text.length > 100 ? "..." : ""}`;
		}
	);

	tool(
		"mobile_clear_clipboard",
		"Clear clipboard content on device.",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you.")
		},
		async ({ device }) => {
			const robot = getRobotFromDevice(device);
			await robot.clearClipboard();

			return "Clipboard cleared successfully.";
		}
	);

	// ===========================
	// PERFORMANCE MONITORING
	// ===========================

	toolIf(
		"performance_monitoring",
		"mobile_start_performance_monitoring",
		"Start monitoring app performance metrics (CPU, memory). Collects samples every second until stopped.",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you."),
			packageName: z.string().describe("App package name (Android: com.example.app, iOS: bundle ID)"),
			interval: z.number().optional().describe("Sampling interval in milliseconds (default: 1000ms = 1 second)")
		},
		async ({ device, packageName, interval }) => {
			if (performanceMonitor.isMonitoring()) {
				return "Performance monitoring already in progress. Stop it first using mobile_stop_performance_monitoring.";
			}

			const robot = getRobotFromDevice(device);
			const platform = robot instanceof AndroidRobot ? "android" : "ios";

			await performanceMonitor.startMonitoring(device, packageName, platform, interval || 1000);

			return `Started performance monitoring.\n\nDevice: ${device}\nPackage: ${packageName}\nPlatform: ${platform}\nInterval: ${interval || 1000}ms\n\nUse mobile_stop_performance_monitoring to stop and get results.`;
		}
	);

	toolIf(
		"performance_monitoring",
		"mobile_stop_performance_monitoring",
		"Stop performance monitoring and get collected metrics. Returns average, peak, and all samples.",
		{
			noParams
		},
		async ({}) => {
			if (!performanceMonitor.isMonitoring()) {
				return "No performance monitoring in progress. Use mobile_start_performance_monitoring to start.";
			}

			const metrics = await performanceMonitor.stopMonitoring();
			const avg = performanceMonitor.getAverageMetrics();
			const peak = performanceMonitor.getPeakMetrics();

			if (!avg || !peak) {
				return "No metrics collected.";
			}

			let report = `Performance Monitoring Results:\n\n`;
			report += `Samples collected: ${metrics.length}\n\n`;
			report += `Average Performance:\n`;
			report += `  CPU: ${avg.cpu.toFixed(2)}%\n`;
			report += `  Memory: ${avg.memory.toFixed(2)} MB\n`;
			report += `  FPS: ${avg.fps.toFixed(0)}\n\n`;
			report += `Peak Performance:\n`;
			report += `  CPU: ${peak.cpu.toFixed(2)}%\n`;
			report += `  Memory: ${peak.memory.toFixed(2)} MB\n`;

			return report;
		}
	);

	toolIf(
		"performance_monitoring",
		"mobile_get_performance_status",
		"Check if performance monitoring is active and get current stats.",
		{
			noParams
		},
		async ({}) => {
			const info = performanceMonitor.getMonitoringInfo();

			if (!info.monitoring) {
				return "No performance monitoring in progress.";
			}

			const avg = performanceMonitor.getAverageMetrics();

			let report = `Performance monitoring active:\n\n`;
			report += `Device: ${info.deviceId}\n`;
			report += `Package: ${info.packageName}\n`;
			report += `Samples collected: ${info.samplesCollected}\n`;

			if (avg) {
				report += `\nCurrent Average:\n`;
				report += `  CPU: ${avg.cpu.toFixed(2)}%\n`;
				report += `  Memory: ${avg.memory.toFixed(2)} MB\n`;
			}

			return report;
		}
	);

	// ===========================
	// DEVICE CONDITIONS SIMULATION
	// ===========================

	tool(
		"mobile_set_battery_level",
		"Simulate battery level on device (Android only). Useful for testing low battery scenarios.",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you."),
			percent: z.number().min(0).max(100).describe("Battery level percentage (0-100)")
		},
		async ({ device, percent }) => {
			await deviceConditions.setBatteryLevel(device, percent);
			return `Battery level set to ${percent}%.\n\nUse mobile_get_battery_status to verify.`;
		}
	);

	tool(
		"mobile_reset_battery",
		"Reset battery to normal mode (disable simulation).",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you.")
		},
		async ({ device }) => {
			await deviceConditions.resetBattery(device);
			return "Battery simulation reset to normal mode.";
		}
	);

	tool(
		"mobile_get_battery_status",
		"Get current battery status including level, charging status, and health.",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you.")
		},
		async ({ device }) => {
			const status = await deviceConditions.getBatteryStatus(device);
			return `Battery Status:\n\nLevel: ${status.level}%\nStatus: ${status.status}\nHealth: ${status.health}`;
		}
	);

	tool(
		"mobile_set_airplane_mode",
		"Enable or disable airplane mode on device (Android only).",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you."),
			enable: z.boolean().describe("True to enable, false to disable")
		},
		async ({ device, enable }) => {
			await deviceConditions.setAirplaneMode(device, enable);
			return `Airplane mode ${enable ? "enabled" : "disabled"}.`;
		}
	);

	tool(
		"mobile_set_wifi",
		"Enable or disable WiFi on device (Android only).",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you."),
			enable: z.boolean().describe("True to enable, false to disable")
		},
		async ({ device, enable }) => {
			await deviceConditions.setWiFi(device, enable);
			return `WiFi ${enable ? "enabled" : "disabled"}.`;
		}
	);

	tool(
		"mobile_set_mobile_data",
		"Enable or disable mobile data on device (Android only).",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you."),
			enable: z.boolean().describe("True to enable, false to disable")
		},
		async ({ device, enable }) => {
			await deviceConditions.setMobileData(device, enable);
			return `Mobile data ${enable ? "enabled" : "disabled"}.`;
		}
	);

	tool(
		"mobile_set_network_condition",
		"Simulate different network conditions (offline, wifi, 4g, etc.) for testing.",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you."),
			condition: z.enum(["offline", "wifi", "4g", "3g", "2g", "none"]).describe("Network condition: offline (airplane), wifi, 4g/3g/2g (mobile), none (all off)")
		},
		async ({ device, condition }) => {
			const result = await deviceConditions.setNetworkCondition(device, condition);
			return result;
		}
	);

	tool(
		"mobile_set_geolocation",
		"Set GPS coordinates on device (Android emulator only). Useful for testing location-based features.",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you."),
			latitude: z.number().min(-90).max(90).describe("Latitude coordinate (-90 to 90)"),
			longitude: z.number().min(-180).max(180).describe("Longitude coordinate (-180 to 180)")
		},
		async ({ device, latitude, longitude }) => {
			await deviceConditions.setGeolocation(device, latitude, longitude);
			return `Geolocation set to:\nLatitude: ${latitude}\nLongitude: ${longitude}\n\nNote: This works best on emulators.`;
		}
	);

	// ==================== Week 6: Accessibility Testing ====================

	tool(
		"mobile_check_accessibility",
		"Check current screen for accessibility issues (missing labels, small touch targets, overlapping elements). Returns detailed report with WCAG guidelines.",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you."),
			includeScreenshot: z.boolean().optional().describe("Include screenshot in report for context (default: false)")
		},
		async ({ device, includeScreenshot }) => {
			const robot = getRobotFromDevice(device);

			// Get all elements on screen
			const elements = await robot.getElementsOnScreen();

			// Get screenshot if requested (for future contrast checking)
			let screenshot: Buffer | undefined;
			if (includeScreenshot) {
				screenshot = await robot.getScreenshot();
			}

			// Run accessibility checks
			const report = await accessibilityChecker.checkAccessibility(elements, screenshot);

			// Format report as readable text
			const formatted = accessibilityChecker.formatReport(report);

			return formatted;
		}
	);

	tool(
		"mobile_get_accessibility_score",
		"Get quick accessibility score (0-100) for current screen. Higher is better. Use mobile_check_accessibility for detailed issues.",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you.")
		},
		async ({ device }) => {
			const robot = getRobotFromDevice(device);
			const elements = await robot.getElementsOnScreen();
			const report = await accessibilityChecker.checkAccessibility(elements);

			let emoji = "✅";
			let rating = "Excellent";
			if (report.score < 50) {
				emoji = "❌";
				rating = "Poor";
			} else if (report.score < 70) {
				emoji = "🟡";
				rating = "Needs Improvement";
			} else if (report.score < 90) {
				emoji = "🟢";
				rating = "Good";
			}

			return `${emoji} Accessibility Score: ${report.score}/100 (${rating})

Summary:
- Total elements: ${report.totalElements}
- Interactive elements: ${report.interactiveElements}
- Issues found: ${report.issues.length}
  - 🔴 Critical: ${report.summary.critical}
  - 🟡 Warning: ${report.summary.warning}
  - ℹ️ Info: ${report.summary.info}

${report.score < 90 ? "Run mobile_check_accessibility for detailed issue list." : ""}`;
		}
	);

	tool(
		"mobile_find_accessibility_issues",
		"Find specific type of accessibility issues on current screen. Useful for targeted checks.",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you."),
			issueType: z.enum(["missing_label", "poor_label", "small_touch_target", "overlapping_elements", "duplicate_labels"]).optional().describe("Filter by specific issue type. If not provided, returns all issues.")
		},
		async ({ device, issueType }) => {
			const robot = getRobotFromDevice(device);
			const elements = await robot.getElementsOnScreen();
			const report = await accessibilityChecker.checkAccessibility(elements);

			// Filter issues if type specified
			let issues = report.issues;
			if (issueType) {
				issues = issues.filter(i => i.type === issueType);
			}

			if (issues.length === 0) {
				if (issueType) {
					return `✅ No ${issueType.replace(/_/g, " ")} issues found!`;
				}
				return "✅ No accessibility issues found!";
			}

			// Format issues
			let output = `Found ${issues.length} ${issueType ? issueType.replace(/_/g, " ") : "accessibility"} issue(s):\n\n`;

			for (let i = 0; i < issues.length; i++) {
				const issue = issues[i];
				const severityEmoji = issue.severity === "critical" ? "🔴" : issue.severity === "warning" ? "🟡" : "ℹ️";

				output += `${severityEmoji} Issue ${i + 1}/${issues.length}\n`;
				output += `Type: ${issue.type.replace(/_/g, " ")}\n`;
				output += `Element: ${issue.element.type}`;
				if (issue.element.text) {
					output += ` "${issue.element.text}"`;
				}
				output += `\n`;
				output += `Location: (${issue.element.rect.x}, ${issue.element.rect.y}) - ${issue.element.rect.width}x${issue.element.rect.height}\n`;
				output += `Problem: ${issue.message}\n`;
				output += `Fix: ${issue.suggestion}\n`;
				if (issue.wcagGuideline) {
					output += `Standard: ${issue.wcagGuideline}\n`;
				}
				output += "\n";
			}

			return output;
		}
	);

	// ==================== Week 6: Screenshot Annotations ====================

	tool(
		"mobile_annotate_screenshot",
		"Annotate a screenshot with visual markers (rectangles, circles, text, arrows). Useful for bug reports and documentation.",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you."),
			annotations: z.array(z.object({
				type: z.enum(["rectangle", "circle", "text", "highlight", "tap_point"]).describe("Type of annotation"),
				x: z.number().describe("X coordinate"),
				y: z.number().describe("Y coordinate"),
				width: z.number().optional().describe("Width (for rectangle/highlight)"),
				height: z.number().optional().describe("Height (for rectangle/highlight)"),
				radius: z.number().optional().describe("Radius (for circle)"),
				text: z.string().optional().describe("Text content (for text annotation)"),
				color: z.enum(["red", "green", "blue", "yellow", "orange", "purple", "white", "black"]).optional().describe("Color (default: red)"),
				label: z.string().optional().describe("Optional label for element")
			})).describe("List of annotations to add to screenshot"),
			saveName: z.string().describe("Name for saved annotated screenshot (e.g., 'login-error')")
		},
		async ({ device, annotations, saveName }) => {
			const robot = getRobotFromDevice(device);

			// Get current screenshot
			const screenshot = await robot.getScreenshot();

			// Load screenshot into annotator
			screenshotAnnotator.loadScreenshot(screenshot);
			screenshotAnnotator.clearAnnotations();

			// Add each annotation
			for (const ann of annotations) {
				const color = Colors[(ann.color || "red").toUpperCase() as keyof typeof Colors];

				switch (ann.type) {
					case "rectangle":
						if (ann.width && ann.height) {
							screenshotAnnotator.addRectangle(ann.x, ann.y, ann.width, ann.height, color, { label: ann.label });
						}
						break;
					case "circle":
						if (ann.radius) {
							screenshotAnnotator.addCircle(ann.x, ann.y, ann.radius, color);
						}
						break;
					case "text":
						if (ann.text) {
							screenshotAnnotator.addText(ann.x, ann.y, ann.text, color);
						}
						break;
					case "highlight":
						if (ann.width && ann.height) {
							screenshotAnnotator.addHighlight(ann.x, ann.y, ann.width, ann.height, color);
						}
						break;
					case "tap_point":
						screenshotAnnotator.markTapPoint(ann.x, ann.y, color, ann.label);
						break;
				}
			}

			// Save annotated screenshot
			const filepath = await screenshotAnnotator.save(saveName);

			return `Annotated screenshot saved to: ${filepath}\n\nAnnotations added: ${annotations.length}`;
		}
	);

	tool(
		"mobile_highlight_element",
		"Highlight a specific element on current screenshot. Finds element and draws rectangle around it.",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you."),
			elementSelector: z.object({
				text: z.string().optional(),
				label: z.string().optional(),
				type: z.string().optional()
			}).describe("Element to highlight (text, label, or type)"),
			color: z.enum(["red", "green", "blue", "yellow", "orange", "purple"]).optional().describe("Highlight color (default: green)"),
			label: z.string().optional().describe("Optional label to show above element"),
			saveName: z.string().describe("Name for saved screenshot (e.g., 'highlighted-button')")
		},
		async ({ device, elementSelector, color, label, saveName }) => {
			const robot = getRobotFromDevice(device);

			// Get screenshot and elements
			const screenshot = await robot.getScreenshot();
			const elements = await robot.getElementsOnScreen();

			// Find matching element
			const element = elements.find(e => {
				if (elementSelector.text && e.text?.includes(elementSelector.text)) {return true;}
				if (elementSelector.label && e.label?.includes(elementSelector.label)) {return true;}
				if (elementSelector.type && e.type === elementSelector.type) {return true;}
				return false;
			});

			if (!element) {
				return `Element not found with selector: ${JSON.stringify(elementSelector)}`;
			}

			// Load screenshot and highlight element
			screenshotAnnotator.loadScreenshot(screenshot);
			screenshotAnnotator.clearAnnotations();

			const highlightColor = Colors[(color || "green").toUpperCase() as keyof typeof Colors];
			screenshotAnnotator.highlightElement(element, highlightColor, label);

			// Save
			const filepath = await screenshotAnnotator.save(saveName);

			return `Element highlighted: ${element.type} "${element.text || element.label || "(no text)"}"\nLocation: (${element.rect.x}, ${element.rect.y}) - ${element.rect.width}x${element.rect.height}\n\nScreenshot saved to: ${filepath}`;
		}
	);

	tool(
		"mobile_mark_tap_points",
		"Mark tap points on screenshot with circles and optional labels. Useful for showing test steps.",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you."),
			tapPoints: z.array(z.object({
				x: z.number(),
				y: z.number(),
				label: z.string().optional().describe("Optional label like 'Step 1', 'Tap here'")
			})).describe("List of tap points to mark"),
			saveName: z.string().describe("Name for saved screenshot")
		},
		async ({ device, tapPoints, saveName }) => {
			const robot = getRobotFromDevice(device);

			// Get screenshot
			const screenshot = await robot.getScreenshot();

			// Load and mark tap points
			screenshotAnnotator.loadScreenshot(screenshot);
			screenshotAnnotator.clearAnnotations();

			for (const point of tapPoints) {
				screenshotAnnotator.markTapPoint(point.x, point.y, Colors.RED, point.label);
			}

			// Save
			const filepath = await screenshotAnnotator.save(saveName);

			return `Marked ${tapPoints.length} tap point(s) on screenshot\n\nScreenshot saved to: ${filepath}`;
		}
	);

	// ==================== Week 6: Bug Report Generator ====================

	tool(
		"mobile_create_bug_report",
		"Create comprehensive bug report with device info, screenshot, logs, and element hierarchy. Saves to markdown file.",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you."),
			title: z.string().describe("Bug title (e.g., 'Login button not responding')"),
			description: z.string().describe("Detailed description of the bug"),
			severity: z.enum(["critical", "high", "medium", "low"]).describe("Bug severity level"),
			stepsToReproduce: z.array(z.string()).describe("List of steps to reproduce the bug"),
			expectedBehavior: z.string().describe("What should happen"),
			actualBehavior: z.string().describe("What actually happens"),
			packageName: z.string().describe("App package name (e.g., 'com.example.app')"),
			includeScreenshot: z.boolean().optional().describe("Include screenshot (default: true)"),
			includeLogs: z.boolean().optional().describe("Include app logs (default: false)"),
			includeElementHierarchy: z.boolean().optional().describe("Include element hierarchy (default: false)"),
			reportedBy: z.string().optional().describe("Reporter name (optional)")
		},
		async ({ device, title, description, severity, stepsToReproduce, expectedBehavior, actualBehavior, packageName, includeScreenshot, includeLogs, includeElementHierarchy, reportedBy }) => {
			const robot = getRobotFromDevice(device);
			const platform = robot instanceof AndroidRobot ? "android" : "ios";

			// Create bug report
			const report = await bugReportGenerator.createReport(robot, {
				title,
				description,
				severity,
				stepsToReproduce,
				expectedBehavior,
				actualBehavior,
				deviceId: device,
				platform,
				packageName,
				includeScreenshot: includeScreenshot !== false,
				includeLogs: includeLogs || false,
				includeElementHierarchy: includeElementHierarchy || false,
				reportedBy
			});

			// Save report
			const filepath = await bugReportGenerator.save(report, "markdown");

			// Generate summary
			const severityEmoji: Record<string, string> = {
				critical: "🔴",
				high: "🟠",
				medium: "🟡",
				low: "🟢"
			};

			let summary = `${severityEmoji[severity]} Bug Report Created\n\n`;
			summary += `**${title}**\n`;
			summary += `Report ID: ${report.reportId}\n`;
			summary += `Severity: ${severity.toUpperCase()}\n\n`;
			summary += `Included:\n`;
			if (report.screenshot) {summary += `✓ Screenshot\n`;}
			if (report.logs && report.logs.length > 0) {summary += `✓ Logs (${report.logs.length} lines)\n`;}
			if (report.elementHierarchy && report.elementHierarchy.length > 0) {summary += `✓ Element Hierarchy (${report.elementHierarchy.length} elements)\n`;}
			summary += `\nReport saved to: ${filepath}`;

			return summary;
		}
	);

	tool(
		"mobile_create_quick_bug_report",
		"Create quick bug report with just title and description. Automatically includes screenshot.",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you."),
			title: z.string().describe("Bug title"),
			description: z.string().describe("Bug description"),
			packageName: z.string().describe("App package name")
		},
		async ({ device, title, description, packageName }) => {
			const robot = getRobotFromDevice(device);
			const platform = robot instanceof AndroidRobot ? "android" : "ios";

			// Create quick report
			const report = await bugReportGenerator.createQuickReport(
				robot,
				title,
				description,
				device,
				platform,
				packageName
			);

			// Save report
			const filepath = await bugReportGenerator.save(report, "markdown");

			return `🐛 Quick Bug Report Created\n\n**${title}**\nReport ID: ${report.reportId}\n\nReport saved to: ${filepath}`;
		}
	);

	// ==================== Week 7: Test Flakiness Detection ====================

	toolIf(
		"flakiness_detection",
		"mobile_record_test_result",
		"Record test execution result for flakiness tracking. Call this after each test run to build history.",
		{
			testId: z.string().describe("Unique test identifier (e.g., 'login-test', 'checkout-flow')"),
			testName: z.string().describe("Human-readable test name"),
			status: z.enum(["passed", "failed", "skipped", "error"]).describe("Test result status"),
			duration: z.number().describe("Test duration in milliseconds"),
			errorMessage: z.string().optional().describe("Error message if test failed"),
			stackTrace: z.string().optional().describe("Stack trace if test failed")
		},
		async ({ testId, testName, status, duration, errorMessage, stackTrace }) => {
			flakinessDetector.recordTestRun({
				testId,
				testName,
				status,
				duration,
				timestamp: Date.now(),
				errorMessage,
				stackTrace
			});

			const stats = flakinessDetector.getTestStatistics(testId);
			if (!stats) {
				return `✅ Test result recorded: ${testName} - ${status.toUpperCase()}`;
			}

			let response = `✅ Test result recorded: ${testName} - ${status.toUpperCase()}\n\n`;
			response += `Statistics (${stats.totalRuns} runs):\n`;
			response += `- Pass rate: ${stats.passRate.toFixed(1)}%\n`;
			response += `- Flakiness score: ${stats.flakinessScore}/100`;

			if (stats.flakinessScore >= 40) {
				response += ` ⚠️ FLAKY\n`;
				response += `\n💡 This test is showing signs of flakiness. Run mobile_get_flaky_tests for recommendations.`;
			}

			return response;
		}
	);

	toolIf(
		"flakiness_detection",
		"mobile_get_test_statistics",
		"Get detailed statistics for a specific test including pass rate, flakiness score, and history.",
		{
			testId: z.string().describe("Test identifier to get statistics for")
		},
		async ({ testId }) => {
			const stats = flakinessDetector.getTestStatistics(testId);

			if (!stats) {
				return `No test history found for test ID: ${testId}`;
			}

			let report = `# Test Statistics: ${stats.testName}\n\n`;
			report += `**Test ID**: ${testId}\n`;
			report += `**Total Runs**: ${stats.totalRuns}\n\n`;

			// Status breakdown
			report += `## Results\n`;
			report += `- ✅ Passed: ${stats.passed} (${stats.passRate.toFixed(1)}%)\n`;
			report += `- ❌ Failed: ${stats.failed}\n`;
			report += `- ⏭️ Skipped: ${stats.skipped}\n`;
			report += `- 💥 Errors: ${stats.errors}\n\n`;

			// Flakiness
			report += `## Flakiness Analysis\n`;
			report += `**Flakiness Score**: ${stats.flakinessScore}/100`;

			if (stats.flakinessScore >= 70) {
				report += ` 🔴 HIGHLY FLAKY\n`;
			} else if (stats.flakinessScore >= 40) {
				report += ` 🟡 FLAKY\n`;
			} else {
				report += ` ✅ STABLE\n`;
			}

			if (stats.consecutiveFailures > 0) {
				report += `**Consecutive Failures**: ${stats.consecutiveFailures} ⚠️\n`;
			}
			report += `\n`;

			// Duration
			report += `## Performance\n`;
			report += `- Average: ${stats.avgDuration.toFixed(0)}ms\n`;
			report += `- Min: ${stats.minDuration.toFixed(0)}ms\n`;
			report += `- Max: ${stats.maxDuration.toFixed(0)}ms\n\n`;

			// Last run
			report += `## Last Run\n`;
			report += `- Status: ${stats.lastRun.status.toUpperCase()}\n`;
			report += `- Duration: ${stats.lastRun.duration.toFixed(0)}ms\n`;
			report += `- Time: ${new Date(stats.lastRun.timestamp).toLocaleString()}\n`;
			if (stats.lastRun.errorMessage) {
				report += `- Error: ${stats.lastRun.errorMessage}\n`;
			}

			return report;
		}
	);

	toolIf(
		"flakiness_detection",
		"mobile_get_flaky_tests",
		"Get list of all flaky tests with recommendations for fixing them.",
		{
			threshold: z.number().optional().describe("Flakiness threshold 0-100 (default: 40). Tests above this are considered flaky.")
		},
		async ({ threshold }) => {
			const flakyTests = flakinessDetector.getFlakyTests(threshold || 40);

			if (flakyTests.length === 0) {
				return `✅ No flaky tests found! All tests are stable.\n\nRun mobile_get_test_summary to see overall statistics.`;
			}

			let report = `# Flaky Tests Report\n\n`;
			report += `Found ${flakyTests.length} flaky test(s):\n\n`;

			for (let i = 0; i < flakyTests.length; i++) {
				const test = flakyTests[i];
				const emoji = test.flakinessScore >= 70 ? "🔴" : "🟡";

				report += `## ${i + 1}. ${emoji} ${test.testName}\n\n`;
				report += `**Test ID**: ${test.testId}\n`;
				report += `**Flakiness Score**: ${test.flakinessScore}/100\n`;
				report += `**Pass Rate**: ${test.passRate.toFixed(1)}%\n`;
				report += `**Total Runs**: ${test.totalRuns}\n`;
				report += `**Pattern**: ${test.failurePattern}\n\n`;
				report += `**💡 Recommendation**:\n${test.recommendation}\n\n`;
				report += `---\n\n`;
			}

			return report;
		}
	);

	toolIf(
		"flakiness_detection",
		"mobile_get_test_summary",
		"Get summary of all test execution history including flakiness statistics.",
		{},
		async () => {
			const summary = flakinessDetector.getSummaryReport();

			let report = `# Test Execution Summary\n\n`;
			report += `**Total Tests Tracked**: ${summary.totalTests}\n`;
			report += `**Tests with Issues**: ${summary.testsWithIssues}\n`;
			report += `**Flaky Tests**: ${summary.flakyTests}`;

			if (summary.flakyTests > 0) {
				report += ` ⚠️\n`;
			} else {
				report += ` ✅\n`;
			}
			report += `\n`;

			report += `## Overall Statistics\n`;
			report += `- Average Pass Rate: ${summary.avgPassRate.toFixed(1)}%\n`;
			report += `- Average Flakiness Score: ${summary.avgFlakinessScore.toFixed(1)}/100\n\n`;

			if (summary.flakyTests > 0) {
				report += `⚠️ You have flaky tests. Run mobile_get_flaky_tests for details and recommendations.`;
			} else if (summary.avgPassRate < 95) {
				report += `💡 Some tests are failing consistently. Review failed tests to fix issues.`;
			} else {
				report += `✅ Test suite is healthy! Keep monitoring for flakiness.`;
			}

			return report;
		}
	);

	toolIf(
		"flakiness_detection",
		"mobile_clear_test_history",
		"Clear test execution history. Use to reset tracking or remove old data.",
		{
			testId: z.string().optional().describe("Specific test ID to clear. If not provided, clears all history.")
		},
		async ({ testId }) => {
			if (testId) {
				flakinessDetector.clearTestHistory(testId);
				return `✅ Cleared history for test: ${testId}`;
			} else {
				flakinessDetector.clearAllHistory();
				return `✅ Cleared all test history`;
			}
		}
	);

	// ==================== Week 7: Test Data Generator ====================

	toolIf(
		"test_data_generation",
		"mobile_generate_person",
		"Generate random person data (name, email, phone, date of birth). Useful for registration and profile tests.",
		{
			locale: z.enum(["en-US", "ru-RU", "uk-UA", "de-DE", "fr-FR"]).optional().describe("Locale for generated data (default: en-US)")
		},
		async ({ locale }) => {
			if (locale) {
				dataGenerator.setLocale(locale);
			}

			const person = dataGenerator.generatePerson();

			let output = `# Generated Person\n\n`;
			output += `**Name**: ${person.fullName}\n`;
			output += `**First Name**: ${person.firstName}\n`;
			output += `**Last Name**: ${person.lastName}\n`;
			output += `**Email**: ${person.email}\n`;
			output += `**Phone**: ${person.phone}\n`;
			output += `**Username**: ${person.username}\n`;
			output += `**Date of Birth**: ${person.dateOfBirth}\n`;
			output += `**Age**: ${person.age}\n`;
			output += `**Gender**: ${person.gender}\n`;

			return output;
		}
	);

	toolIf(
		"test_data_generation",
		"mobile_generate_email",
		"Generate random email address.",
		{
			firstName: z.string().optional().describe("First name for email"),
			lastName: z.string().optional().describe("Last name for email")
		},
		async ({ firstName, lastName }) => {
			const email = dataGenerator.generateEmail(firstName, lastName);
			return `Generated email: ${email}`;
		}
	);

	toolIf(
		"test_data_generation",
		"mobile_generate_phone",
		"Generate random phone number based on locale.",
		{
			locale: z.enum(["en-US", "ru-RU", "uk-UA", "de-DE", "fr-FR"]).optional().describe("Locale for phone format")
		},
		async ({ locale }) => {
			if (locale) {
				dataGenerator.setLocale(locale);
			}

			const phone = dataGenerator.generatePhone();
			return `Generated phone: ${phone}`;
		}
	);

	toolIf(
		"test_data_generation",
		"mobile_generate_address",
		"Generate random address (street, city, zip code, country).",
		{},
		async () => {
			const address = dataGenerator.generateAddress();

			let output = `# Generated Address\n\n`;
			output += `**Street**: ${address.street}\n`;
			output += `**City**: ${address.city}\n`;
			if (address.state) {
				output += `**State**: ${address.state}\n`;
			}
			output += `**Zip Code**: ${address.zipCode}\n`;
			output += `**Country**: ${address.country}\n\n`;
			output += `**Full Address**: ${address.fullAddress}\n`;

			return output;
		}
	);

	toolIf(
		"test_data_generation",
		"mobile_generate_credit_card",
		"Generate test credit card data. WARNING: This is TEST DATA ONLY, not real credit cards.",
		{
			type: z.enum(["visa", "mastercard", "amex"]).optional().describe("Card type")
		},
		async ({ type }) => {
			const card = dataGenerator.generateCreditCard(type);

			let output = `# Generated Credit Card (TEST DATA ONLY)\n\n`;
			output += `⚠️ **WARNING**: This is test data only. Do not use for real transactions.\n\n`;
			output += `**Type**: ${card.type.toUpperCase()}\n`;
			output += `**Number**: ${card.number}\n`;
			output += `**CVV**: ${card.cvv}\n`;
			output += `**Expiry**: ${card.expiryMonth}/${card.expiryYear}\n`;
			output += `**Cardholder**: ${card.cardholderName}\n`;

			return output;
		}
	);

	toolIf(
		"test_data_generation",
		"mobile_generate_password",
		"Generate secure random password.",
		{
			length: z.number().optional().describe("Password length (default: 12)"),
			includeSymbols: z.boolean().optional().describe("Include special symbols (default: true)")
		},
		async ({ length, includeSymbols }) => {
			const password = dataGenerator.generatePassword(
				length || 12,
				includeSymbols !== false
			);
			return `Generated password: ${password}`;
		}
	);

	toolIf(
		"test_data_generation",
		"mobile_generate_date",
		"Generate random date. Useful for date picker testing.",
		{
			type: z.enum(["past", "future", "random"]).describe("Date type: past (days back), future (days ahead), or random between dates"),
			days: z.number().optional().describe("Number of days (for past/future). Default: 30")
		},
		async ({ type, days }) => {
			let date: string;

			switch (type) {
				case "past":
					date = dataGenerator.generatePastDate(days || 30);
					break;
				case "future":
					date = dataGenerator.generateFutureDate(days || 30);
					break;
				case "random":
				default:
					date = dataGenerator.generateDate();
					break;
			}

			return `Generated date: ${date}`;
		}
	);

	toolIf(
		"test_data_generation",
		"mobile_generate_text",
		"Generate random lorem ipsum text. Useful for text input testing.",
		{
			sentences: z.number().optional().describe("Number of sentences (default: 3)")
		},
		async ({ sentences }) => {
			const text = dataGenerator.generateText(sentences || 3);
			return `Generated text:\n\n${text}`;
		}
	);

	toolIf(
		"test_data_generation",
		"mobile_generate_batch_data",
		"Generate multiple test data items at once. Useful for bulk testing.",
		{
			type: z.enum(["persons", "emails", "phones"]).describe("Type of data to generate"),
			count: z.number().describe("Number of items to generate (1-100)")
		},
		async ({ type, count }) => {
			if (count < 1 || count > 100) {
				return "Error: Count must be between 1 and 100";
			}

			const items: string[] = [];

			for (let i = 0; i < count; i++) {
				switch (type) {
					case "persons":
						const person = dataGenerator.generatePerson();
						items.push(`${i + 1}. ${person.fullName} (${person.email}, ${person.phone})`);
						break;
					case "emails":
						items.push(`${i + 1}. ${dataGenerator.generateEmail()}`);
						break;
					case "phones":
						items.push(`${i + 1}. ${dataGenerator.generatePhone()}`);
						break;
				}
			}

			let output = `# Generated ${count} ${type}\n\n`;
			output += items.join("\n");

			return output;
		}
	);

	// ==================== Week 7: Visual Touch Indicators ====================

	tool(
		"mobile_enable_touch_indicators",
		"Enable visual indicators for touch/tap interactions. Shows circles at tap points. Perfect for demos and debugging AI interactions!",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you."),
			showPointerLocation: z.boolean().optional().describe("Also show pointer trails and coordinates (Android only, default: false)")
		},
		async ({ device, showPointerLocation }) => {
			const robot = getRobotFromDevice(device);
			const platform = robot instanceof AndroidRobot ? "android" : "ios";

			if (platform === "android") {
				const result = touchIndicators.enableAndroidTouchIndicators(device, {
					showTouches: true,
					showPointerLocation: showPointerLocation || false
				});
				return result;
			} else {
				const result = touchIndicators.enableIOSTouchIndicators(device);
				return result;
			}
		}
	);

	tool(
		"mobile_disable_touch_indicators",
		"Disable visual touch indicators. Returns screen to normal mode.",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you.")
		},
		async ({ device }) => {
			const robot = getRobotFromDevice(device);
			const platform = robot instanceof AndroidRobot ? "android" : "ios";

			if (platform === "android") {
				return touchIndicators.disableAndroidTouchIndicators(device);
			} else {
				return touchIndicators.disableIOSTouchIndicators(device);
			}
		}
	);

	tool(
		"mobile_toggle_touch_indicators",
		"Toggle touch indicators on/off. Convenient for quick switching during testing.",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you.")
		},
		async ({ device }) => {
			const robot = getRobotFromDevice(device);
			const platform = robot instanceof AndroidRobot ? "android" : "ios";

			if (platform === "android") {
				return touchIndicators.toggleAndroidTouchIndicators(device);
			} else {
				// For iOS, check if enabled and toggle
				try {
					touchIndicators.disableIOSTouchIndicators(device);
					return "✅ Touch indicators toggled OFF";
				} catch {
					touchIndicators.enableIOSTouchIndicators(device);
					return "✅ Touch indicators toggled ON";
				}
			}
		}
	);

	tool(
		"mobile_get_touch_indicator_status",
		"Check if touch indicators are currently enabled on device.",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you.")
		},
		async ({ device }) => {
			const robot = getRobotFromDevice(device);
			const platform = robot instanceof AndroidRobot ? "android" : "ios";

			if (platform === "android") {
				const status = touchIndicators.getAndroidTouchIndicatorStatus(device);

				let output = "# Touch Indicator Status\n\n";
				output += `**Platform**: Android\n`;
				output += `**Show Touches**: ${status.showTouches ? "✅ Enabled" : "❌ Disabled"}\n`;
				output += `**Pointer Location**: ${status.showPointerLocation ? "✅ Enabled" : "❌ Disabled"}\n`;

				return output;
			} else {
				return "# Touch Indicator Status\n\n**Platform**: iOS\n\nNote: iOS touch indicators have limited API access. Check device settings for AssistiveTouch.";
			}
		}
	);

	tool(
		"mobile_enable_demo_mode",
		"Enable full demo mode with all visual indicators (touches + pointer trails). Best for recordings and presentations!",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you.")
		},
		async ({ device }) => {
			const robot = getRobotFromDevice(device);
			const platform = robot instanceof AndroidRobot ? "android" : "ios";

			return touchIndicators.enableDemoMode(device, platform);
		}
	);

	// ==================== Week 7: CI/CD Integration ====================

	tool(
		"mobile_export_test_results",
		"Export test results to CI/CD format (JUnit XML, JSON, Markdown, TAP). Use after running tests to integrate with CI/CD pipelines.",
		{
			format: z.enum(["junit", "json", "markdown", "tap", "github"]).describe("Export format: junit (Jenkins, GitHub Actions), json (custom dashboards), markdown (PR comments), tap (Test Anything Protocol), github (GitHub Actions summary)"),
			testSuiteName: z.string().describe("Name of the test suite (e.g., 'Mobile E2E Tests')"),
			testResults: z.array(z.object({
				name: z.string().describe("Test name"),
				status: z.enum(["passed", "failed", "skipped", "error"]).describe("Test status"),
				duration: z.number().describe("Duration in milliseconds"),
				errorMessage: z.string().optional().describe("Error message if failed"),
				errorType: z.string().optional().describe("Error type (e.g., 'AssertionError')"),
				stackTrace: z.string().optional().describe("Stack trace if failed")
			})).describe("Array of test results")
		},
		async ({ format, testSuiteName, testResults }) => {
			// Convert to internal format
			const tests: TestResult[] = testResults.map((t: any) => ({
				name: t.name,
				status: t.status,
				duration: t.duration,
				errorMessage: t.errorMessage,
				errorType: t.errorType,
				stackTrace: t.stackTrace,
				timestamp: Date.now()
			}));

			// Create test suite
			const suite = cicdReporter.createTestSuite(testSuiteName, tests);

			// Export in requested format
			let filepath: string;
			let formatName: string;

			switch (format) {
				case "junit":
					filepath = cicdReporter.exportJUnitXML(suite);
					formatName = "JUnit XML";
					break;
				case "json":
					filepath = cicdReporter.exportJSON(suite);
					formatName = "JSON";
					break;
				case "markdown":
					filepath = cicdReporter.exportMarkdown(suite);
					formatName = "Markdown";
					break;
				case "tap":
					filepath = cicdReporter.exportTAP(suite);
					formatName = "TAP";
					break;
				case "github":
					filepath = cicdReporter.createGitHubActionsSummary(suite);
					formatName = "GitHub Actions Summary";
					break;
				default:
					filepath = cicdReporter.exportJSON(suite);
					formatName = "JSON";
			}

			// Get summary
			const summary = cicdReporter.getSummary(suite);

			let output = `✅ Test results exported to ${formatName}\n\n`;
			output += `**File**: ${filepath}\n\n`;
			output += `## Summary\n`;
			output += `- Total: ${summary.total} tests\n`;
			output += `- Passed: ✅ ${summary.passed}\n`;
			output += `- Failed: ❌ ${summary.failed}\n`;
			output += `- Errors: 💥 ${summary.errors}\n`;
			output += `- Skipped: ⏭️ ${summary.skipped}\n`;
			output += `- Pass Rate: ${summary.passRate.toFixed(1)}%\n`;
			output += `- Duration: ${(summary.duration / 1000).toFixed(2)}s\n`;

			return output;
		}
	);

	tool(
		"mobile_create_test_report",
		"Create comprehensive test report with summary statistics. Quick way to export test results.",
		{
			testSuiteName: z.string().describe("Test suite name"),
			passed: z.number().describe("Number of passed tests"),
			failed: z.number().describe("Number of failed tests"),
			skipped: z.number().optional().describe("Number of skipped tests (default: 0)"),
			duration: z.number().describe("Total duration in milliseconds"),
			format: z.enum(["junit", "markdown", "github"]).optional().describe("Export format (default: markdown)")
		},
		async ({ testSuiteName, passed, failed, skipped, duration, format }) => {
			// Create dummy test results
			const tests: TestResult[] = [];

			// Add passed tests
			for (let i = 0; i < passed; i++) {
				tests.push({
					name: `Test ${i + 1}`,
					status: "passed",
					duration: duration / (passed + failed + (skipped || 0)),
					timestamp: Date.now()
				});
			}

			// Add failed tests
			for (let i = 0; i < failed; i++) {
				tests.push({
					name: `Test ${passed + i + 1}`,
					status: "failed",
					duration: duration / (passed + failed + (skipped || 0)),
					errorMessage: "Test failed",
					timestamp: Date.now()
				});
			}

			// Add skipped tests
			for (let i = 0; i < (skipped || 0); i++) {
				tests.push({
					name: `Test ${passed + failed + i + 1}`,
					status: "skipped",
					duration: 0,
					timestamp: Date.now()
				});
			}

			const suite = cicdReporter.createTestSuite(testSuiteName, tests);

			const exportFormat = format || "markdown";
			let filepath: string;

			if (exportFormat === "junit") {
				filepath = cicdReporter.exportJUnitXML(suite);
			} else if (exportFormat === "github") {
				filepath = cicdReporter.createGitHubActionsSummary(suite);
			} else {
				filepath = cicdReporter.exportMarkdown(suite);
			}

			const summary = cicdReporter.getSummary(suite);

			return `✅ Test report created\n\nFile: ${filepath}\n\nPass Rate: ${summary.passRate.toFixed(1)}% (${passed}/${passed + failed} passed)`;
		}
	);

	// ===========================
	// MCP RESOURCES
	// ===========================
	// Add Resources support for TestContext
	// This provides test execution history to Cursor AI

	// Register static resources for test context
	// These are refreshed on each request to show current state

	server.registerResource(
		"test-actions",
		"test://current/actions",
		{
			title: "Test Actions History",
			description: "All actions performed in current test session",
			mimeType: "application/json"
		},
		async (uri: URL) => {
			const actions = TestContext.getActions();
			return {
				contents: [{
					uri: uri.href,
					mimeType: "application/json",
					text: JSON.stringify(actions, null, 2)
				}]
			};
		}
	);

	server.registerResource(
		"test-logs",
		"test://current/logs",
		{
			title: "Test Logs",
			description: "All logs captured during test session",
			mimeType: "text/plain"
		},
		async (uri: URL) => {
			const logs = TestContext.getLogs();
			return {
				contents: [{
					uri: uri.href,
					mimeType: "text/plain",
					text: logs.join("\n")
				}]
			};
		}
	);

	server.registerResource(
		"test-summary",
		"test://current/summary",
		{
			title: "Test Summary",
			description: "Summary of current test session",
			mimeType: "application/json"
		},
		async (uri: URL) => {
			const actions = TestContext.getActions();
			const summary = {
				totalActions: actions.length,
				totalLogs: TestContext.getLogs().length,
				startTime: actions.length > 0 ? actions[0].timestamp : null,
				lastActionTime: actions.length > 0 ? actions[actions.length - 1].timestamp : null,
				devices: [...new Set(actions.map(a => a.device))],
				actionTypes: [...new Set(actions.map(a => a.type))]
			};
			return {
				contents: [{
					uri: uri.href,
					mimeType: "application/json",
					text: JSON.stringify(summary, null, 2)
				}]
			};
		}
	);

	// async check for latest agent version
	checkForLatestAgentVersion().then();

	return server;
};
