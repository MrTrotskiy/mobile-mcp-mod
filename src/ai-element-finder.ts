/**
 * AIElementFinder class for finding UI elements by natural language description
 *
 * Purpose: Makes testing more human-friendly by allowing Cursor AI to find elements
 * by description like "blue login button" instead of complex selectors
 *
 * Uses simple heuristics and fuzzy matching (no external AI API needed)
 *
 * NEW: OCR fallback for visual elements (buttons with no text, numbers, icons)
 */

import { ScreenElement } from "./robot";
import { getOCREngine } from "./ocr-engine";

export interface ElementMatch {
	element: ScreenElement;
	score: number; // Confidence score 0-100
	reason: string; // Why this element was matched
}

/**
 * AIElementFinder uses fuzzy matching and heuristics to find elements
 *
 * This is a lightweight implementation that doesn't require external AI API
 * It uses text similarity, type matching, and position hints
 */
export class AIElementFinder {

	/**
	 * Find element by natural language description
	 *
	 * Examples:
	 * - "login button"
	 * - "email input field"
	 * - "blue submit button at bottom"
	 * - "settings icon in top right"
	 *
	 * @param elements - List of elements on screen
	 * @param description - Natural language description
	 * @param threshold - Minimum confidence score (0-100, default: 35)
	 * @returns Best matching element or null
	 */
	static findElementByDescription(
		elements: ScreenElement[],
		description: string,
		threshold: number = 35
	): ElementMatch | null {
		// Normalize description
		const desc = description.toLowerCase().trim();

		// Score all elements
		const matches: ElementMatch[] = [];

		for (const element of elements) {
			const match = this.scoreElement(element, desc);
			if (match.score >= threshold) {
				matches.push(match);
			}
		}

		// Sort by score (highest first)
		matches.sort((a, b) => b.score - a.score);

		// Return best match
		return matches.length > 0 ? matches[0] : null;
	}

	/**
	 * Find all elements matching description
	 *
	 * Returns multiple matches sorted by confidence
	 *
	 * @param elements - List of elements on screen
	 * @param description - Natural language description
	 * @param threshold - Minimum confidence score
	 * @param limit - Maximum number of results (default: 5)
	 * @returns Array of matches
	 */
	static findAllMatchingElements(
		elements: ScreenElement[],
		description: string,
		threshold: number = 35,
		limit: number = 5
	): ElementMatch[] {
		const desc = description.toLowerCase().trim();
		const matches: ElementMatch[] = [];

		for (const element of elements) {
			const match = this.scoreElement(element, desc);
			if (match.score >= threshold) {
				matches.push(match);
			}
		}

		// Sort by score and limit results
		return matches
			.sort((a, b) => b.score - a.score)
			.slice(0, limit);
	}

	/**
	 * Score how well an element matches the description
	 *
	 * Uses multiple heuristics:
	 * - Text similarity (element text vs description)
	 * - Type matching (button, input, etc.)
	 * - Position hints (top, bottom, left, right)
	 * - Color/attribute hints (blue, red, disabled, etc.)
	 *
	 * @param element - Screen element to score
	 * @param description - Normalized description
	 * @returns Match with score and reason
	 */
	private static scoreElement(element: ScreenElement, description: string): ElementMatch {
		let score = 0;
		const reasons: string[] = [];

		// Extract keywords from description
		const keywords = description.split(/\s+/);

		// 1. Type matching (button, input, text, etc.)
		const typeScore = this.scoreType(element, keywords);
		score += typeScore.score;
		if (typeScore.score > 0) {
			reasons.push(typeScore.reason);
		}

		// 2. Text similarity
		const textScore = this.scoreText(element, description, keywords);
		score += textScore.score;
		if (textScore.score > 0) {
			reasons.push(textScore.reason);
		}

		// 3. Position hints (top, bottom, center, etc.)
		const positionScore = this.scorePosition(element, keywords);
		score += positionScore.score;
		if (positionScore.score > 0) {
			reasons.push(positionScore.reason);
		}

		// 4. Attribute hints (disabled, hidden, etc.)
		const attributeScore = this.scoreAttributes(element, keywords);
		score += attributeScore.score;
		if (attributeScore.score > 0) {
			reasons.push(attributeScore.reason);
		}

		// 5. Visual element hints (colors, symbols, icons)
		const visualScore = this.scoreVisualElements(element, description, keywords);
		score += visualScore.score;
		if (visualScore.score > 0) {
			reasons.push(visualScore.reason);
		}

		return {
			element,
			score: Math.min(100, score), // Cap at 100
			reason: reasons.join(", ") || "No clear match"
		};
	}

	/**
	 * Score element type match
	 */
	private static scoreType(element: ScreenElement, keywords: string[]): { score: number; reason: string } {
		const type = element.type.toLowerCase();
		let score = 0;
		let reason = "";

		// Check for type keywords
		const typeMap: Record<string, string[]> = {
			button: ["button", "btn"],
			input: ["input", "field", "textfield", "edittext"],
			text: ["text", "label", "textview"],
			image: ["image", "icon", "imageview"],
			checkbox: ["checkbox", "check"],
			switch: ["switch", "toggle"],
			list: ["list", "listview", "recyclerview"]
		};

		for (const [elementType, typeKeywords] of Object.entries(typeMap)) {
			if (type.includes(elementType)) {
				for (const keyword of keywords) {
					if (typeKeywords.includes(keyword)) {
						score += 30;
						reason = `type matches '${keyword}'`;
						break;
					}
				}
			}
		}

		return { score, reason };
	}

	/**
	 * Score text similarity
	 */
	private static scoreText(element: ScreenElement, description: string, keywords: string[]): { score: number; reason: string } {
		const text = (element.text || "").toLowerCase();
		const label = (element.label || "").toLowerCase();
		const name = (element.name || "").toLowerCase();
		const value = (element.value || "").toLowerCase();

		let score = 0;
		let reason = "";

		// Combine all text fields
		const allText = `${text} ${label} ${name} ${value}`.trim();

		// Exact match gets high score
		if (allText === description) {
			return { score: 50, reason: "exact text match" };
		}

		// Check if description is substring
		if (allText.includes(description)) {
			score += 40;
			reason = "contains description";
		}

		// Check individual keywords
		let matchedKeywords = 0;
		for (const keyword of keywords) {
			// Skip common words
			if (["the", "a", "an", "in", "on", "at", "to", "for"].includes(keyword)) {
				continue;
			}

			if (allText.includes(keyword)) {
				matchedKeywords++;
			}
		}

		if (matchedKeywords > 0) {
			const keywordScore = (matchedKeywords / keywords.length) * 30;
			score += keywordScore;
			if (!reason) {
				reason = `matches ${matchedKeywords}/${keywords.length} keywords`;
			}
		}

		return { score, reason };
	}

	/**
	 * Score position hints
	 */
	private static scorePosition(element: ScreenElement, keywords: string[]): { score: number; reason: string } {
		let score = 0;
		let reason = "";

		const rect = element.rect;
		const screenHeight = 2000; // Approximate, will be passed later if needed
		const screenWidth = 1000;

		// Check position keywords
		for (const keyword of keywords) {
			switch (keyword) {
				case "top":
					if (rect.y < screenHeight * 0.3) {
						score += 15;
						reason = "in top area";
					}
					break;
				case "bottom":
					if (rect.y > screenHeight * 0.7) {
						score += 15;
						reason = "in bottom area";
					}
					break;
				case "left":
					if (rect.x < screenWidth * 0.3) {
						score += 10;
						reason = "on left side";
					}
					break;
				case "right":
					if (rect.x > screenWidth * 0.7) {
						score += 10;
						reason = "on right side";
					}
					break;
				case "center":
				case "middle":
					const centerX = rect.x + rect.width / 2;
					const centerY = rect.y + rect.height / 2;
					if (Math.abs(centerX - screenWidth / 2) < screenWidth * 0.2 &&
						Math.abs(centerY - screenHeight / 2) < screenHeight * 0.2) {
						score += 15;
						reason = "in center";
					}
					break;
			}
		}

		return { score, reason };
	}

	/**
	 * Score attribute hints
	 */
	private static scoreAttributes(element: ScreenElement, keywords: string[]): { score: number; reason: string } {
		let score = 0;
		let reason = "";

		// Check for attribute keywords
		for (const keyword of keywords) {
			switch (keyword) {
				case "focused":
				case "active":
					if (element.focused) {
						score += 20;
						reason = "element is focused";
					}
					break;
				case "large":
				case "big":
					if (element.rect.width > 200 || element.rect.height > 100) {
						score += 10;
						reason = "large element";
					}
					break;
				case "small":
				case "tiny":
					if (element.rect.width < 100 && element.rect.height < 100) {
						score += 10;
						reason = "small element";
					}
					break;
			}
		}

		return { score, reason };
	}

	/**
	 * Score visual element hints (colors, symbols, icons)
	 *
	 * Improves detection of:
	 * - Colored elements (green button, red text)
	 * - Symbols (+, -, x, checkmark)
	 * - Icons (settings, profile, notification)
	 * - Progress bars
	 */
	private static scoreVisualElements(element: ScreenElement, description: string, keywords: string[]): { score: number; reason: string } {
		let score = 0;
		let reason = "";

		const type = element.type.toLowerCase();
		const text = (element.text || "").toLowerCase();
		const label = (element.label || "").toLowerCase();

		// 1. Color hints - look for color words in description
		const colorKeywords = ["green", "red", "blue", "yellow", "orange", "purple", "pink", "white", "black"];
		for (const color of colorKeywords) {
			if (description.includes(color)) {
				// If element has no text, likely a colored button/icon
				if (!text && !label && (type.includes("button") || type.includes("image"))) {
					score += 25;
					reason = `likely ${color} visual element`;
					break;
				}
			}
		}

		// 2. Symbol hints - detect common symbols
		const symbolMap: Record<string, string[]> = {
			"+": ["plus", "add", "new", "create"],
			"-": ["minus", "remove", "delete", "subtract"],
			"×": ["close", "exit", "cancel", "x"],
			"✓": ["check", "done", "complete", "ok"],
			"⚙": ["settings", "gear", "config"],
			"🔔": ["notification", "bell", "alert"],
			"👤": ["profile", "user", "account"],
			"🏠": ["home", "house"],
			"❤": ["heart", "like", "favorite", "love"]
		};

		for (const [symbol, symbolKeywords] of Object.entries(symbolMap)) {
			if (text === symbol || label === symbol) {
				for (const keyword of keywords) {
					if (symbolKeywords.includes(keyword)) {
						score += 30;
						reason = `symbol '${symbol}' matches '${keyword}'`;
						break;
					}
				}
			}
		}

		// 3. Icon detection - elements with no text are often icons/buttons
		if (!text && !label && keywords.length > 0) {
			// Check if description mentions icon, button, or common icon types
			const iconWords = ["icon", "button", "btn", "image"];
			const hasIconWord = keywords.some(k => iconWords.includes(k));

			if (hasIconWord && (type.includes("image") || type.includes("button"))) {
				score += 20;
				if (!reason) {
					reason = "likely icon or visual button";
				}
			}
		}

		// 4. Progress bar detection
		if (description.includes("progress") || description.includes("bar")) {
			if (type.includes("progress") || type.includes("seekbar") ||
				(element.rect.width > element.rect.height * 3)) { // Wide horizontal elements
				score += 25;
				reason = "matches progress bar pattern";
			}
		}

		// 5. Goal/category matching - for health/wellness apps
		if (description.includes("goal") || description.includes("category")) {
			// Look for elements in list-like structures
			if (type.includes("view") && element.rect.height < 200) {
				score += 15;
				if (!reason) {
					reason = "matches goal/category pattern";
				}
			}
		}

		return { score, reason };
	}

	/**
	 * Calculate optimal tap coordinates for element
	 *
	 * Strategy:
	 * - For small elements (< 10px): likely coordinate issue, use center
	 * - For normal elements: use center point
	 * - Warns about suspicious sizes
	 *
	 * @param element - Screen element to calculate coordinates for
	 * @returns Optimal tap coordinates {x, y}
	 */
	static getOptimalTapCoordinates(element: ScreenElement): { x: number; y: number } {
		const { x, y, width, height } = element.rect;

		// Warn about very small elements (might be coordinate issues)
		if (width < 10 || height < 10) {
			console.warn(`[AI Element Finder] Small element detected: ${width}x${height}px - coordinates might be inaccurate`);
		}

		// Warn about very large elements (might be container instead of button)
		if (width > 500 || height > 500) {
			console.warn(`[AI Element Finder] Large element detected: ${width}x${height}px - might be a container, not a clickable element`);
		}

		// Calculate center point (most reliable tap location)
		const centerX = Math.round(x + width / 2);
		const centerY = Math.round(y + height / 2);

		console.log(`[AI Element Finder] Tap coordinates: (${centerX}, ${centerY}) for ${width}x${height}px element`);

		return { x: centerX, y: centerY };
	}

	/**
	 * Enhanced element finding with OCR fallback
	 *
	 * Strategy:
	 * 1. First try accessibility-based detection (fast, works for most elements)
	 * 2. If not found or low confidence, try OCR (slower, but finds visual elements)
	 *
	 * Use cases for OCR fallback:
	 * - Visual buttons without text labels (green plus button, colored icons)
	 * - Numbers on progress bars (98, 68)
	 * - Text in images or styled buttons
	 * - Elements that accessibility API cannot see
	 *
	 * @param elements - List of elements from accessibility API
	 * @param screenshotBuffer - Screenshot image for OCR
	 * @param description - Natural language description (e.g., "green plus button", "98")
	 * @param threshold - Minimum confidence score (default: 35)
	 * @returns Element match with method indicator (accessibility or ocr)
	 */
	static async findElementWithOCR(
		elements: ScreenElement[],
		screenshotBuffer: Buffer,
		description: string,
		threshold: number = 35
	): Promise<{ element: ScreenElement; confidence: number; reason: string; method: "accessibility" | "ocr" } | null> {

		// Step 1: Try accessibility-based detection first (fast)
		console.log(`[AI Element Finder] Trying accessibility-based detection for: "${description}"`);
		const textMatch = this.findElementByDescription(elements, description, threshold);

		if (textMatch && textMatch.score >= threshold) {
			console.log(`[AI Element Finder] ✅ Found via accessibility (score: ${textMatch.score})`);
			return {
				element: textMatch.element,
				confidence: textMatch.score,
				reason: textMatch.reason,
				method: "accessibility"
			};
		}

		// Step 2: Fallback to OCR if accessibility failed
		console.log(`[AI Element Finder] Accessibility failed, trying OCR...`);

		try {
			const ocrEngine = getOCREngine();
			await ocrEngine.initialize();

			// Perform OCR on screenshot
			const ocrResult = await ocrEngine.recognizeText(screenshotBuffer, {
				preprocess: true,
				minConfidence: 60
			});

			// Search for matching text in OCR results
			const matches = ocrEngine.findTextByDescription(ocrResult, description);

			if (matches.length === 0) {
				console.log(`[AI Element Finder] ❌ No matches found in OCR results`);
				return null;
			}

			const bestMatch = matches[0];
			console.log(`[AI Element Finder] ✅ Found via OCR: "${bestMatch.text}" (confidence: ${Math.round(bestMatch.confidence)})`);

			// Create synthetic ScreenElement from OCR result
			// Note: OCR gives us text + coordinates, but no type/label info
			const ocrElement: ScreenElement = {
				type: "OCR_ELEMENT",  // Special type to indicate OCR-found element
				text: bestMatch.text,
				label: "",
				rect: {
					x: Math.round(bestMatch.x - 25),  // Approximate touch area (50x50 around center)
					y: Math.round(bestMatch.y - 25),
					width: 50,
					height: 50
				}
			};

			return {
				element: ocrElement,
				confidence: bestMatch.confidence,
				reason: `OCR match: "${bestMatch.text}"`,
				method: "ocr"
			};

		} catch (error) {
			console.error(`[AI Element Finder] OCR failed:`, error);
			return null;
		}
	}
}
