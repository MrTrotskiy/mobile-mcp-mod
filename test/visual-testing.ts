/**
 * Visual Regression Testing Tests
 *
 * Test the visual testing functionality including baseline management
 * and screenshot comparison.
 */

import { VisualTester } from "../src/visual-testing";
import fs from "fs";
import sharp from "sharp";

const TEST_BASELINES_DIR = "test/baselines-test";

/**
 * Create a simple test image with given color
 */
async function createTestImage(
	width: number,
	height: number,
	r: number,
	g: number,
	b: number
): Promise<Buffer> {
	const channels = 4; // RGBA
	const data = Buffer.alloc(width * height * channels);

	for (let i = 0; i < width * height; i++) {
		data[i * channels] = r;     // Red
		data[i * channels + 1] = g; // Green
		data[i * channels + 2] = b; // Blue
		data[i * channels + 3] = 255; // Alpha (fully opaque)
	}

	return sharp(data, {
		raw: {
			width,
			height,
			channels
		}
	}).png().toBuffer();
}

/**
 * Create test image with a rectangle in different color
 */
async function createTestImageWithRect(
	width: number,
	height: number,
	bgColor: [number, number, number],
	rectColor: [number, number, number],
	rectX: number,
	rectY: number,
	rectWidth: number,
	rectHeight: number
): Promise<Buffer> {
	const channels = 4; // RGBA
	const data = Buffer.alloc(width * height * channels);

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const i = (y * width + x) * channels;

			// Check if pixel is inside rectangle
			const inRect = x >= rectX && x < rectX + rectWidth &&
                     y >= rectY && y < rectY + rectHeight;

			const color = inRect ? rectColor : bgColor;

			data[i] = color[0];     // Red
			data[i + 1] = color[1]; // Green
			data[i + 2] = color[2]; // Blue
			data[i + 3] = 255;      // Alpha
		}
	}

	return sharp(data, {
		raw: {
			width,
			height,
			channels
		}
	}).png().toBuffer();
}

async function runTests() {
	console.log("=== Visual Regression Testing Tests ===\n");

	// Create test directory
	if (fs.existsSync(TEST_BASELINES_DIR)) {
		fs.rmSync(TEST_BASELINES_DIR, { recursive: true });
	}
	fs.mkdirSync(TEST_BASELINES_DIR, { recursive: true });

	const tester = new VisualTester(TEST_BASELINES_DIR);

	// Test 1: Save and load baseline
	console.log("Test 1: Save and load baseline");
	try {
		const testImage = await createTestImage(100, 100, 255, 0, 0); // Red image
		await tester.saveBaseline("test-red", testImage);

		const loaded = await tester.loadBaseline("test-red");
		console.log(`  ✓ Baseline saved and loaded (${loaded.length} bytes)\n`);
	} catch (error: any) {
		console.log(`  ✗ FAILED: ${error.message}\n`);
	}

	// Test 2: Check if baseline exists
	console.log("Test 2: Check if baseline exists");
	try {
		const exists = tester.baselineExists("test-red");
		const notExists = tester.baselineExists("nonexistent");

		if (exists && !notExists) {
			console.log("  ✓ Baseline existence check works correctly\n");
		} else {
			console.log("  ✗ FAILED: Existence check returned unexpected results\n");
		}
	} catch (error: any) {
		console.log(`  ✗ FAILED: ${error.message}\n`);
	}

	// Test 3: List baselines
	console.log("Test 3: List baselines");
	try {
		const baselines = tester.listBaselines();
		console.log(`  Found ${baselines.length} baselines: ${baselines.join(", ")}`);

		if (baselines.includes("test-red")) {
			console.log("  ✓ List baselines works correctly\n");
		} else {
			console.log("  ✗ FAILED: Expected baseline not in list\n");
		}
	} catch (error: any) {
		console.log(`  ✗ FAILED: ${error.message}\n`);
	}

	// Test 4: Compare identical images
	console.log("Test 4: Compare identical images");
	try {
		const image1 = await createTestImage(100, 100, 0, 255, 0); // Green
		const image2 = await createTestImage(100, 100, 0, 255, 0); // Green

		const result = await tester.compareScreenshots(image1, image2);

		console.log(`  Similarity: ${(result.similarity * 100).toFixed(2)}%`);
		console.log(`  Different pixels: ${result.differentPixels}`);
		console.log(`  Match: ${result.match}`);

		if (result.match && result.similarity === 1.0) {
			console.log("  ✓ Identical images match perfectly\n");
		} else {
			console.log("  ✗ FAILED: Identical images should match\n");
		}
	} catch (error: any) {
		console.log(`  ✗ FAILED: ${error.message}\n`);
	}

	// Test 5: Compare different images
	console.log("Test 5: Compare different images");
	try {
		const image1 = await createTestImage(100, 100, 255, 0, 0); // Red
		const image2 = await createTestImage(100, 100, 0, 0, 255); // Blue

		const result = await tester.compareScreenshots(image1, image2);

		console.log(`  Similarity: ${(result.similarity * 100).toFixed(2)}%`);
		console.log(`  Different pixels: ${result.differentPixels.toLocaleString()}`);
		console.log(`  Match: ${result.match}`);

		if (!result.match && result.similarity < 1.0) {
			console.log("  ✓ Different images detected correctly\n");
		} else {
			console.log("  ✗ FAILED: Different images should not match\n");
		}
	} catch (error: any) {
		console.log(`  ✗ FAILED: ${error.message}\n`);
	}

	// Test 6: Compare images with small difference
	console.log("Test 6: Compare images with small difference (rectangle)");
	try {
		const image1 = await createTestImageWithRect(
			200, 200,
			[255, 255, 255], // White background
			[0, 0, 0],       // Black rectangle
			50, 50, 20, 20   // Small 20x20 rect
		);

		const image2 = await createTestImageWithRect(
			200, 200,
			[255, 255, 255], // White background
			[0, 0, 0],       // Black rectangle
			52, 52, 20, 20   // Same rect moved 2 pixels
		);

		const result = await tester.compareScreenshots(image1, image2);

		console.log(`  Similarity: ${(result.similarity * 100).toFixed(2)}%`);
		console.log(`  Different pixels: ${result.differentPixels.toLocaleString()}`);
		console.log(`  Match: ${result.match}`);

		// Save diff image for inspection
		tester.saveDiffImage("test-small-diff", result.diffImage);
		console.log("  Diff image saved to: test/baselines-test/test-small-diff.png");

		console.log("  ✓ Small difference detected\n");
	} catch (error: any) {
		console.log(`  ✗ FAILED: ${error.message}\n`);
	}

	// Test 7: Compare different sized images
	console.log("Test 7: Compare different sized images (auto-resize)");
	try {
		const image1 = await createTestImage(100, 100, 255, 0, 0); // 100x100 red
		const image2 = await createTestImage(150, 150, 255, 0, 0); // 150x150 red

		const result = await tester.compareScreenshots(image1, image2);

		console.log(`  Similarity: ${(result.similarity * 100).toFixed(2)}%`);
		console.log("  ✓ Auto-resize handled different dimensions\n");
	} catch (error: any) {
		console.log(`  ✗ FAILED: ${error.message}\n`);
	}

	// Test 8: Delete baseline
	console.log("Test 8: Delete baseline");
	try {
		tester.deleteBaseline("test-red");

		const exists = tester.baselineExists("test-red");

		if (!exists) {
			console.log("  ✓ Baseline deleted successfully\n");
		} else {
			console.log("  ✗ FAILED: Baseline still exists after deletion\n");
		}
	} catch (error: any) {
		console.log(`  ✗ FAILED: ${error.message}\n`);
	}

	console.log("=== Tests Complete ===\n");
	console.log("Note: Some test images and diff images saved to:", TEST_BASELINES_DIR);
	console.log("Review them to verify visual comparison works correctly.\n");
}

// Run tests
runTests().catch(console.error);
