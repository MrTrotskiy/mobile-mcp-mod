/**
 * OCR Engine Tests
 *
 * Tests for text recognition functionality
 * NOTE: These are basic tests. Full testing requires actual device screenshots.
 */

import { OCREngine, getOCREngine } from "../src/ocr-engine";
import { describe, it } from "mocha";
import * as assert from "assert";

describe("OCR Engine", () => {
	let ocr: OCREngine;

	// Initialize OCR engine once for all tests
	before(async function() {
		// OCR initialization can take time (downloads language data)
		this.timeout(30000); // 30 seconds timeout

		console.log("Initializing OCR engine...");
		ocr = getOCREngine();
		await ocr.initialize();
		console.log("OCR engine initialized");
	});

	// Cleanup after all tests
	after(async () => {
		await ocr.terminate();
		console.log("OCR engine terminated");
	});

	it("should initialize OCR engine", () => {
		assert.ok(ocr, "OCR engine should be initialized");
	});

	it("should get singleton OCR engine instance", () => {
		const ocr1 = getOCREngine();
		const ocr2 = getOCREngine();
		assert.strictEqual(ocr1, ocr2, "Should return same instance");
	});

	// Note: Real OCR tests require actual screenshots
	// These will be run manually with device connected
	it.skip("should recognize text from screenshot", async function() {
		this.timeout(10000);

		// This test requires a real screenshot file
		// Run manually: test/manual/test-ocr.js

		// Example usage:
		// const fs = require('fs');
		// const screenshot = fs.readFileSync('test/fixtures/sample-screenshot.png');
		// const result = await ocr.recognizeText(screenshot);
		// assert.ok(result.words.length > 0, 'Should find some text');
	});

	it.skip("should find text by description", async function() {
		// This test requires a real screenshot
		// Run manually with device connected
	});
});

/**
 * Manual Test Instructions:
 *
 * To test OCR with real device:
 *
 * 1. Connect device (Android or iOS)
 * 2. Open Good Mood app
 * 3. Use Cursor to call mobile_ocr_screenshot tool:
 *    - Device: 843b3cd3 (or your device ID)
 *    - minConfidence: 60
 *    - preprocess: true
 *
 * 4. Check if OCR detects text like:
 *    - Numbers: "98", "68"
 *    - Labels: "Healthspan", "Optimal"
 *    - Buttons: "+", "-"
 *
 * 5. Try mobile_find_text_by_ocr to find specific text:
 *    - Text: "98"
 *    - Should return coordinates
 *
 * Expected Results:
 * - OCR processing time: < 2 seconds
 * - Confidence for clear text: > 60%
 * - Should find most visible text elements
 */
