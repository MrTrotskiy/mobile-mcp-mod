/**
 * Screenshot Annotator
 *
 * This module provides tools to annotate screenshots with visual markers:
 * - Draw rectangles around elements
 * - Add text labels
 * - Highlight areas
 * - Draw arrows pointing to specific elements
 * - Add circles/dots to mark touch points
 *
 * Purpose: Make it easy to create annotated screenshots for bug reports,
 * documentation, or visual test results.
 */

import sharp from "sharp";
import fs from "fs";
import path from "path";

// Color definition
export interface Color {
  r: number; // 0-255
  g: number; // 0-255
  b: number; // 0-255
  alpha?: number; // 0-1, default: 1
}

// Predefined colors
export const Colors = {
	RED: { r: 255, g: 0, b: 0 } as Color,
	GREEN: { r: 0, g: 255, b: 0 } as Color,
	BLUE: { r: 0, g: 0, b: 255 } as Color,
	YELLOW: { r: 255, g: 255, b: 0 } as Color,
	ORANGE: { r: 255, g: 165, b: 0 } as Color,
	PURPLE: { r: 128, g: 0, b: 128 } as Color,
	WHITE: { r: 255, g: 255, b: 255 } as Color,
	BLACK: { r: 0, g: 0, b: 0 } as Color,
};

// Rectangle annotation
export interface RectangleAnnotation {
  type: "rectangle";
  x: number;
  y: number;
  width: number;
  height: number;
  color: Color;
  thickness?: number; // default: 3
  filled?: boolean; // default: false
  label?: string; // optional text label
}

// Circle annotation
export interface CircleAnnotation {
  type: "circle";
  x: number; // center x
  y: number; // center y
  radius: number;
  color: Color;
  thickness?: number; // default: 3
  filled?: boolean; // default: false
}

// Text annotation
export interface TextAnnotation {
  type: "text";
  x: number;
  y: number;
  text: string;
  color: Color;
  fontSize?: number; // default: 24
  backgroundColor?: Color; // optional background
}

// Arrow annotation
export interface ArrowAnnotation {
  type: "arrow";
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  color: Color;
  thickness?: number; // default: 3
}

// Line annotation
export interface LineAnnotation {
  type: "line";
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  color: Color;
  thickness?: number; // default: 3
}

// Highlight annotation (semi-transparent overlay)
export interface HighlightAnnotation {
  type: "highlight";
  x: number;
  y: number;
  width: number;
  height: number;
  color: Color;
  opacity?: number; // 0-1, default: 0.3
}

// Union type for all annotations
export type Annotation =
  | RectangleAnnotation
  | CircleAnnotation
  | TextAnnotation
  | ArrowAnnotation
  | LineAnnotation
  | HighlightAnnotation;

export class ScreenshotAnnotator {
	private annotations: Annotation[] = [];
	private screenshotBuffer: Buffer | null = null;
	private outputDir: string;

	constructor(outputDir: string = "test/annotated-screenshots") {
		this.outputDir = outputDir;

		// Create output directory if it doesn't exist
		if (!fs.existsSync(this.outputDir)) {
			fs.mkdirSync(this.outputDir, { recursive: true });
		}
	}

	/**
   * Load screenshot to annotate
   */
	loadScreenshot(screenshot: Buffer): void {
		this.screenshotBuffer = screenshot;
	}

	/**
   * Clear all annotations
   */
	clearAnnotations(): void {
		this.annotations = [];
	}

	/**
   * Add rectangle annotation
   */
	addRectangle(
		x: number,
		y: number,
		width: number,
		height: number,
		color: Color = Colors.RED,
		options: { thickness?: number; filled?: boolean; label?: string } = {}
	): void {
		this.annotations.push({
			type: "rectangle",
			x,
			y,
			width,
			height,
			color,
			thickness: options.thickness || 3,
			filled: options.filled || false,
			label: options.label,
		});
	}

	/**
   * Add circle annotation
   */
	addCircle(
		x: number,
		y: number,
		radius: number,
		color: Color = Colors.BLUE,
		options: { thickness?: number; filled?: boolean } = {}
	): void {
		this.annotations.push({
			type: "circle",
			x,
			y,
			radius,
			color,
			thickness: options.thickness || 3,
			filled: options.filled || false,
		});
	}

	/**
   * Add text annotation
   */
	addText(
		x: number,
		y: number,
		text: string,
		color: Color = Colors.BLACK,
		options: { fontSize?: number; backgroundColor?: Color } = {}
	): void {
		this.annotations.push({
			type: "text",
			x,
			y,
			text,
			color,
			fontSize: options.fontSize || 24,
			backgroundColor: options.backgroundColor,
		});
	}

	/**
   * Add arrow annotation
   */
	addArrow(
		fromX: number,
		fromY: number,
		toX: number,
		toY: number,
		color: Color = Colors.RED,
		thickness: number = 3
	): void {
		this.annotations.push({
			type: "arrow",
			fromX,
			fromY,
			toX,
			toY,
			color,
			thickness,
		});
	}

	/**
   * Add line annotation
   */
	addLine(
		fromX: number,
		fromY: number,
		toX: number,
		toY: number,
		color: Color = Colors.BLACK,
		thickness: number = 3
	): void {
		this.annotations.push({
			type: "line",
			fromX,
			fromY,
			toX,
			toY,
			color,
			thickness,
		});
	}

	/**
   * Add highlight annotation (semi-transparent overlay)
   */
	addHighlight(
		x: number,
		y: number,
		width: number,
		height: number,
		color: Color = Colors.YELLOW,
		opacity: number = 0.3
	): void {
		this.annotations.push({
			type: "highlight",
			x,
			y,
			width,
			height,
			color,
			opacity,
		});
	}

	/**
   * Highlight a screen element
   * Convenience method that adds a rectangle around the element
   */
	highlightElement(
		element: {
      rect: { x: number; y: number; width: number; height: number };
    },
		color: Color = Colors.GREEN,
		label?: string
	): void {
		this.addRectangle(
			element.rect.x,
			element.rect.y,
			element.rect.width,
			element.rect.height,
			color,
			{ thickness: 4, label }
		);
	}

	/**
   * Mark a tap point
   * Convenience method that adds a circle at the tap coordinates
   */
	markTapPoint(
		x: number,
		y: number,
		color: Color = Colors.RED,
		label?: string
	): void {
		// Add filled circle
		this.addCircle(x, y, 15, color, { filled: true });

		// Add optional label
		if (label) {
			this.addText(x + 20, y - 10, label, Colors.BLACK, {
				fontSize: 20,
				backgroundColor: Colors.WHITE,
			});
		}
	}

	/**
   * Render all annotations onto the screenshot
   * Returns annotated screenshot as Buffer
   */
	async render(): Promise<Buffer> {
		if (!this.screenshotBuffer) {
			throw new Error("No screenshot loaded. Call loadScreenshot() first.");
		}

		// Get image metadata
		const metadata = await sharp(this.screenshotBuffer).metadata();
		const width = metadata.width!;
		const height = metadata.height!;

		// Create SVG with annotations
		const svg = this.generateSVG(width, height);

		// Composite SVG onto screenshot
		const annotated = await sharp(this.screenshotBuffer)
			.composite([
				{
					input: Buffer.from(svg),
					top: 0,
					left: 0,
				},
			])
			.png()
			.toBuffer();

		return annotated;
	}

	/**
   * Generate SVG with all annotations
   */
	private generateSVG(width: number, height: number): string {
		let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;

		for (const annotation of this.annotations) {
			svg += this.annotationToSVG(annotation);
		}

		svg += "</svg>";
		return svg;
	}

	/**
   * Convert single annotation to SVG element
   */
	private annotationToSVG(annotation: Annotation): string {
		switch (annotation.type) {
			case "rectangle":
				return this.rectangleToSVG(annotation);
			case "circle":
				return this.circleToSVG(annotation);
			case "text":
				return this.textToSVG(annotation);
			case "arrow":
				return this.arrowToSVG(annotation);
			case "line":
				return this.lineToSVG(annotation);
			case "highlight":
				return this.highlightToSVG(annotation);
			default:
				return "";
		}
	}

	private rectangleToSVG(rect: RectangleAnnotation): string {
		const color = this.colorToRGB(rect.color);
		const fillOpacity = rect.filled ? 0.3 : 0;

		let svg = `<rect x="${rect.x}" y="${rect.y}" width="${rect.width}" height="${rect.height}" 
      stroke="${color}" stroke-width="${rect.thickness || 3}" 
      fill="${color}" fill-opacity="${fillOpacity}" />`;

		// Add label if present
		if (rect.label) {
			svg += this.textToSVG({
				type: "text",
				x: rect.x,
				y: rect.y - 5,
				text: rect.label,
				color: rect.color,
				fontSize: 20,
				backgroundColor: Colors.WHITE,
			});
		}

		return svg;
	}

	private circleToSVG(circle: CircleAnnotation): string {
		const color = this.colorToRGB(circle.color);
		const fillOpacity = circle.filled ? 1 : 0;

		return `<circle cx="${circle.x}" cy="${circle.y}" r="${circle.radius}" 
      stroke="${color}" stroke-width="${circle.thickness || 3}" 
      fill="${color}" fill-opacity="${fillOpacity}" />`;
	}

	private textToSVG(text: TextAnnotation): string {
		const color = this.colorToRGB(text.color);
		let svg = "";

		// Add background if specified
		if (text.backgroundColor) {
			const bgColor = this.colorToRGB(text.backgroundColor);
			// Estimate text width (rough approximation)
			const textWidth = text.text.length * (text.fontSize || 24) * 0.6;
			const padding = 5;

			svg += `<rect x="${text.x - padding}" y="${text.y - (text.fontSize || 24) - padding}" 
        width="${textWidth + padding * 2}" height="${(text.fontSize || 24) + padding * 2}" 
        fill="${bgColor}" fill-opacity="0.8" />`;
		}

		// Add text
		svg += `<text x="${text.x}" y="${text.y}" font-size="${text.fontSize || 24}" 
      fill="${color}" font-family="Arial, sans-serif" font-weight="bold">${this.escapeXML(text.text)}</text>`;

		return svg;
	}

	private arrowToSVG(arrow: ArrowAnnotation): string {
		const color = this.colorToRGB(arrow.color);

		// Calculate arrow head
		const angle = Math.atan2(arrow.toY - arrow.fromY, arrow.toX - arrow.fromX);
		const arrowLength = 15;
		const arrowAngle = Math.PI / 6; // 30 degrees

		const arrowX1 =
      arrow.toX - arrowLength * Math.cos(angle - arrowAngle);
		const arrowY1 =
      arrow.toY - arrowLength * Math.sin(angle - arrowAngle);
		const arrowX2 =
      arrow.toX - arrowLength * Math.cos(angle + arrowAngle);
		const arrowY2 =
      arrow.toY - arrowLength * Math.sin(angle + arrowAngle);

		return `
      <line x1="${arrow.fromX}" y1="${arrow.fromY}" x2="${arrow.toX}" y2="${arrow.toY}" 
        stroke="${color}" stroke-width="${arrow.thickness || 3}" />
      <polygon points="${arrow.toX},${arrow.toY} ${arrowX1},${arrowY1} ${arrowX2},${arrowY2}" 
        fill="${color}" />
    `;
	}

	private lineToSVG(line: LineAnnotation): string {
		const color = this.colorToRGB(line.color);

		return `<line x1="${line.fromX}" y1="${line.fromY}" x2="${line.toX}" y2="${line.toY}" 
      stroke="${color}" stroke-width="${line.thickness || 3}" />`;
	}

	private highlightToSVG(highlight: HighlightAnnotation): string {
		const color = this.colorToRGB(highlight.color);

		return `<rect x="${highlight.x}" y="${highlight.y}" width="${highlight.width}" height="${highlight.height}" 
      fill="${color}" fill-opacity="${highlight.opacity || 0.3}" stroke="none" />`;
	}

	/**
   * Convert Color to RGB string
   */
	private colorToRGB(color: Color): string {
		return `rgb(${color.r}, ${color.g}, ${color.b})`;
	}

	/**
   * Escape XML special characters
   */
	private escapeXML(text: string): string {
		return text
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&apos;");
	}

	/**
   * Save annotated screenshot to file
   */
	async save(name: string): Promise<string> {
		const annotated = await this.render();
		const filename = `${name}-${Date.now()}.png`;
		const filepath = path.join(this.outputDir, filename);

		fs.writeFileSync(filepath, annotated);

		return filepath;
	}

	/**
   * Get current annotations
   */
	getAnnotations(): Annotation[] {
		return [...this.annotations];
	}

	/**
   * Get annotations count
   */
	getAnnotationsCount(): number {
		return this.annotations.length;
	}
}
