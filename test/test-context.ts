import assert from "node:assert";
import { TestContext } from "../src/test-context";

/**
 * Tests for TestContext functionality
 *
 * These tests verify that test context tracking works correctly
 * This is critical for providing full test history to Cursor AI
 */

describe("test-context", () => {

	beforeEach(() => {
		// Clear context before each test
		TestContext.clear();
	});

	it("should record actions", () => {
		// Record a test action
		TestContext.recordAction({
			type: "tap",
			timestamp: Date.now(),
			device: "test-device",
			params: { x: 100, y: 200 },
			result: "success"
		});

		// Check action was recorded
		const actions = TestContext.getActions();
		assert.equal(actions.length, 1, "Should have 1 action");
		assert.equal(actions[0].type, "tap", "Action type should be tap");
		assert.equal(actions[0].device, "test-device", "Device should match");
	});

	it("should record multiple actions", () => {
		// Record several actions
		TestContext.recordAction({
			type: "tap",
			timestamp: Date.now(),
			device: "device1",
			params: { x: 100, y: 200 }
		});

		TestContext.recordAction({
			type: "swipe",
			timestamp: Date.now(),
			device: "device1",
			params: { direction: "up" }
		});

		TestContext.recordAction({
			type: "type",
			timestamp: Date.now(),
			device: "device1",
			params: { text: "hello" }
		});

		// Check all actions were recorded
		const actions = TestContext.getActions();
		assert.equal(actions.length, 3, "Should have 3 actions");
		assert.equal(TestContext.getActionCount(), 3, "Action count should be 3");
	});

	it("should add logs", () => {
		// Add some logs
		TestContext.addLog("Test log 1");
		TestContext.addLog("Test log 2");

		// Check logs were added
		const logs = TestContext.getLogs();
		assert.equal(logs.length, 2, "Should have 2 logs");
		assert.ok(logs[0].includes("Test log 1"), "First log should contain text");
		assert.ok(logs[1].includes("Test log 2"), "Second log should contain text");
	});

	it("should clear context", () => {
		// Add some data
		TestContext.recordAction({
			type: "tap",
			timestamp: Date.now(),
			device: "device1",
			params: { x: 100, y: 200 }
		});
		TestContext.addLog("Test log");

		// Clear context
		TestContext.clear();

		// Check everything is cleared
		assert.equal(TestContext.getActionCount(), 0, "Action count should be 0");
		assert.equal(TestContext.getLogs().length, 0, "Logs should be empty");
	});

	it("should export as resources", () => {
		// Add some data
		TestContext.recordAction({
			type: "tap",
			timestamp: Date.now(),
			device: "device1",
			params: { x: 100, y: 200 }
		});
		TestContext.addLog("Test log");

		// Export as resources
		const resources = TestContext.toResources();

		// Check resources
		assert.ok(resources.length >= 3, "Should have at least 3 resources");

		// Check actions resource
		const actionsResource = resources.find(r => r.uri === "test://current/actions");
		assert.ok(actionsResource, "Should have actions resource");
		assert.equal(actionsResource?.mimeType, "application/json", "Actions should be JSON");

		// Check logs resource
		const logsResource = resources.find(r => r.uri === "test://current/logs");
		assert.ok(logsResource, "Should have logs resource");
		assert.equal(logsResource?.mimeType, "text/plain", "Logs should be text");

		// Check summary resource
		const summaryResource = resources.find(r => r.uri === "test://current/summary");
		assert.ok(summaryResource, "Should have summary resource");
		assert.equal(summaryResource?.mimeType, "application/json", "Summary should be JSON");
	});

	it("should find resource by URI", () => {
		// Add some data
		TestContext.recordAction({
			type: "tap",
			timestamp: Date.now(),
			device: "device1",
			params: { x: 100, y: 200 }
		});

		// Find actions resource
		const resource = TestContext.findResource("test://current/actions");
		assert.ok(resource, "Should find actions resource");
		assert.equal(resource?.uri, "test://current/actions", "URI should match");
	});

	it("should return null for non-existent resource", () => {
		const resource = TestContext.findResource("test://nonexistent");
		assert.equal(resource, null, "Should return null for non-existent resource");
	});

	it("should disable and enable recording", () => {
		// Disable recording
		TestContext.disable();

		// Try to record action
		TestContext.recordAction({
			type: "tap",
			timestamp: Date.now(),
			device: "device1",
			params: { x: 100, y: 200 }
		});

		// Check nothing was recorded
		assert.equal(TestContext.getActionCount(), 0, "Should not record when disabled");

		// Enable recording
		TestContext.enable();

		// Record action
		TestContext.recordAction({
			type: "tap",
			timestamp: Date.now(),
			device: "device1",
			params: { x: 100, y: 200 }
		});

		// Check action was recorded
		assert.equal(TestContext.getActionCount(), 1, "Should record when enabled");
	});

	it("should add timestamp if not provided", () => {
		// Record action without timestamp
		TestContext.recordAction({
			type: "tap",
			timestamp: 0, // Will be overwritten
			device: "device1",
			params: { x: 100, y: 200 }
		});

		// Check timestamp was added
		const actions = TestContext.getActions();
		assert.ok(actions[0].timestamp > 0, "Timestamp should be added");
	});
});
