/**
 * Visual Regression Testing Module
 *
 * Provides tools for comparing screenshots and detecting visual changes.
 * Uses pixelmatch for pixel-by-pixel comparison and sharp for image processing.
 */

import sharp from "sharp";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import fs from "fs";
import path from "path";

/**
 * Result of screenshot comparison
 */
export interface ComparisonResult {
  // Whether screenshots match (zero different pixels)
  match: boolean;

  // Similarity score from 0 to 1 (1 = identical)
  similarity: number;

  // Image showing differences highlighted in red
  diffImage: Buffer;

  // Number of pixels that differ
  differentPixels: number;

  // Total number of pixels in image
  totalPixels: number;

  // Path to diff image if saved
  diffImagePath?: string;
}

/**
 * Visual Testing Class
 *
 * Handles screenshot comparison and baseline management for visual regression testing.
 */
export class VisualTester {
	private baselinesDir: string;

	constructor(baselinesDir: string = "test/baselines") {
		this.baselinesDir = baselinesDir;

		// Create baselines directory if it doesn't exist
		if (!fs.existsSync(baselinesDir)) {
			fs.mkdirSync(baselinesDir, { recursive: true });
		}
	}

	/**
   * Compare two screenshots and detect visual differences
   *
   * @param actual - Current screenshot buffer
   * @param expected - Baseline screenshot buffer
   * @param threshold - Pixel difference threshold (0-1). Default 0.1 = 10% difference allowed
   * @returns Comparison result with similarity score and diff image
   */
	async compareScreenshots(
		actual: Buffer,
		expected: Buffer,
		threshold: number = 0.1
	): Promise<ComparisonResult> {
		try {
			// Convert buffers to PNG format
			const actualPng = PNG.sync.read(actual);
			const expectedPng = PNG.sync.read(expected);

			// Check if dimensions match
			if (actualPng.width !== expectedPng.width || actualPng.height !== expectedPng.height) {
				console.log(`Image dimensions differ. Resizing actual to match expected...`);
				console.log(`  Actual: ${actualPng.width}x${actualPng.height}`);
				console.log(`  Expected: ${expectedPng.width}x${expectedPng.height}`);

				// Resize actual image to match expected dimensions
				const resized = await sharp(actual)
					.resize(expectedPng.width, expectedPng.height, {
						fit: "fill" // Fill entire area, may distort
					})
					.png()
					.toBuffer();

				// Retry comparison with resized image
				return this.compareScreenshots(resized, expected, threshold);
			}

			// Create diff image to highlight differences
			const diff = new PNG({
				width: actualPng.width,
				height: actualPng.height
			});

			// Compare pixels using pixelmatch
			// Red pixels = differences, transparent = same
			const numDiffPixels = pixelmatch(
				actualPng.data,
				expectedPng.data,
				diff.data,
				actualPng.width,
				actualPng.height,
				{
					threshold: threshold,
					alpha: 0.1, // Low alpha for diff areas
					diffColor: [255, 0, 0] // Red color for differences
				}
			);

			// Calculate similarity score
			const totalPixels = actualPng.width * actualPng.height;
			const similarity = 1 - (numDiffPixels / totalPixels);

			// Convert diff image to buffer
			const diffImage = PNG.sync.write(diff);

			return {
				match: numDiffPixels === 0,
				similarity,
				diffImage,
				differentPixels: numDiffPixels,
				totalPixels
			};

		} catch (error: any) {
			throw new Error(`Failed to compare screenshots: ${error.message}`);
		}
	}

	/**
   * Save screenshot as baseline for future comparisons
   *
   * @param name - Baseline name (e.g., "home-screen", "login-page")
   * @param screenshot - Screenshot buffer to save
   */
	async saveBaseline(name: string, screenshot: Buffer): Promise<string> {
		try {
			// Ensure name ends with .png
			const filename = name.endsWith(".png") ? name : `${name}.png`;
			const filepath = path.join(this.baselinesDir, filename);

			// Save screenshot as PNG
			fs.writeFileSync(filepath, screenshot);

			console.log(`Baseline saved: ${filepath}`);
			return filepath;

		} catch (error: any) {
			throw new Error(`Failed to save baseline: ${error.message}`);
		}
	}

	/**
   * Load baseline screenshot from disk
   *
   * @param name - Baseline name
   * @returns Screenshot buffer
   */
	async loadBaseline(name: string): Promise<Buffer> {
		try {
			// Ensure name ends with .png
			const filename = name.endsWith(".png") ? name : `${name}.png`;
			const filepath = path.join(this.baselinesDir, filename);

			// Check if file exists
			if (!fs.existsSync(filepath)) {
				throw new Error(`Baseline not found: ${filepath}`);
			}

			// Read and return buffer
			return fs.readFileSync(filepath);

		} catch (error: any) {
			throw new Error(`Failed to load baseline: ${error.message}`);
		}
	}

	/**
   * Check if baseline exists
   *
   * @param name - Baseline name
   * @returns True if baseline exists
   */
	baselineExists(name: string): boolean {
		const filename = name.endsWith(".png") ? name : `${name}.png`;
		const filepath = path.join(this.baselinesDir, filename);
		return fs.existsSync(filepath);
	}

	/**
   * List all available baselines
   *
   * @returns Array of baseline names (without .png extension)
   */
	listBaselines(): string[] {
		if (!fs.existsSync(this.baselinesDir)) {
			return [];
		}

		const files = fs.readdirSync(this.baselinesDir);
		return files
			.filter(file => file.endsWith(".png"))
			.map(file => file.replace(".png", ""));
	}

	/**
   * Delete a baseline
   *
   * @param name - Baseline name
   */
	deleteBaseline(name: string): void {
		const filename = name.endsWith(".png") ? name : `${name}.png`;
		const filepath = path.join(this.baselinesDir, filename);

		if (fs.existsSync(filepath)) {
			fs.unlinkSync(filepath);
			console.log(`Baseline deleted: ${filepath}`);
		}
	}

	/**
   * Save diff image to disk for debugging
   *
   * @param name - Name for diff image (e.g., "home-screen-diff")
   * @param diffImage - Diff image buffer
   * @returns Path to saved diff image
   */
	saveDiffImage(name: string, diffImage: Buffer): string {
		const filename = name.endsWith(".png") ? name : `${name}.png`;
		const filepath = path.join(this.baselinesDir, filename);

		fs.writeFileSync(filepath, diffImage);
		console.log(`Diff image saved: ${filepath}`);

		return filepath;
	}
}
