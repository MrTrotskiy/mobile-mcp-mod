import { ActionableError, SwipeDirection, ScreenSize, ScreenElement, Orientation } from "./robot";
import { SessionManager } from "./session-manager";
import { DURATIONS } from "./config";

export interface SourceTreeElementRect {
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface SourceTreeElement {
	type: string;
	label?: string;
	name?: string;
	value?: string;
	rawIdentifier?: string;
	rect: SourceTreeElementRect;
	isVisible?: string; // "0" or "1"
	children?: Array<SourceTreeElement>;
}

export interface SourceTree {
	value: SourceTreeElement;
}

export class WebDriverAgent {

	private sessionManager: SessionManager;
	private readonly baseHeaders: Record<string, string>;

	constructor(private readonly host: string, private readonly port: number) {
		this.sessionManager = new SessionManager(host, port);

		// HTTP Keep-Alive headers for connection reuse
		// Reduces TCP handshake overhead on repeated requests
		this.baseHeaders = {
			"Connection": "keep-alive",
			"Keep-Alive": "timeout=60, max=100",
		};
	}

	/**
	 * Helper method for fetch with keep-alive headers
	 * Reuses TCP connections for better performance
	 */
	private async fetchWithKeepAlive(url: string, options?: RequestInit): Promise<Response> {
		const headers = {
			...this.baseHeaders,
			...(options?.headers || {}),
		};

		return fetch(url, {
			...options,
			headers,
		});
	}

	public async isRunning(): Promise<boolean> {
		const url = `http://${this.host}:${this.port}/status`;
		try {
			const response = await this.fetchWithKeepAlive(url);
			const json = await response.json();
			return response.status === 200 && json.value?.ready === true;
		} catch (error) {
			// console.error(`Failed to connect to WebDriverAgent: ${error}`);
			return false;
		}
	}

	/**
	 * Cleanup - dispose WebDriver session
	 * Should be called when Robot is disposed or tests are complete
	 */
	public async dispose(): Promise<void> {
		await this.sessionManager.dispose();
	}

	public async getScreenSize(): Promise<ScreenSize> {
		const sessionUrl = await this.sessionManager.getSession();
		const url = `${sessionUrl}/wda/screen`;
		const response = await this.fetchWithKeepAlive(url);
		const json = await response.json();
		return {
			width: json.value.screenSize.width,
			height: json.value.screenSize.height,
			scale: json.value.scale || 1,
		};
	}

	public async sendKeys(keys: string) {
		const sessionUrl = await this.sessionManager.getSession();
		const url = `${sessionUrl}/wda/keys`;
		await this.fetchWithKeepAlive(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ value: [keys] }),
		});
	}

	public async pressButton(button: string) {
		const _map = {
			"HOME": "home",
			"VOLUME_UP": "volumeup",
			"VOLUME_DOWN": "volumedown",
		};

		if (button === "ENTER") {
			await this.sendKeys("\n");
			return;
		}

		// Type assertion to check if button is a key of _map
		if (!(button in _map)) {
			throw new ActionableError(`Button "${button}" is not supported`);
		}

		const sessionUrl = await this.sessionManager.getSession();
		const url = `${sessionUrl}/wda/pressButton`;
		const response = await this.fetchWithKeepAlive(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				name: button,
			}),
		});

		return response.json();
	}

	public async tap(x: number, y: number) {
		const sessionUrl = await this.sessionManager.getSession();
		const url = `${sessionUrl}/actions`;
		await this.fetchWithKeepAlive(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				actions: [
					{
						type: "pointer",
						id: "finger1",
						parameters: { pointerType: "touch" },
						actions: [
							{ type: "pointerMove", duration: 0, x, y },
							{ type: "pointerDown", button: 0 },
							{ type: "pause", duration: 100 },
							{ type: "pointerUp", button: 0 }
						]
					}
				]
			}),
		});
	}

	public async longPress(x: number, y: number) {
		const sessionUrl = await this.sessionManager.getSession();
		const url = `${sessionUrl}/actions`;
		await this.fetchWithKeepAlive(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				actions: [
					{
						type: "pointer",
						id: "finger1",
						parameters: { pointerType: "touch" },
						actions: [
							{ type: "pointerMove", duration: 0, x, y },
							{ type: "pointerDown", button: 0 },
							{ type: "pause", duration: 500 },
							{ type: "pointerUp", button: 0 }
						]
					}
				]
			}),
		});
	}

	private isVisible(rect: SourceTreeElementRect): boolean {
		return rect.x >= 0 && rect.y >= 0;
	}

	private filterSourceElements(source: SourceTreeElement): Array<ScreenElement> {
		const output: ScreenElement[] = [];

		const acceptedTypes = ["TextField", "Button", "Switch", "Icon", "SearchField", "StaticText", "Image"];

		if (acceptedTypes.includes(source.type)) {
			if (source.isVisible === "1" && this.isVisible(source.rect)) {
				if (source.label !== null || source.name !== null || source.rawIdentifier !== null) {
					output.push({
						type: source.type,
						label: source.label,
						name: source.name,
						value: source.value,
						identifier: source.rawIdentifier,
						rect: {
							x: source.rect.x,
							y: source.rect.y,
							width: source.rect.width,
							height: source.rect.height,
						},
					});
				}
			}
		}

		if (source.children) {
			for (const child of source.children) {
				output.push(...this.filterSourceElements(child));
			}
		}

		return output;
	}

	public async getPageSource(): Promise<SourceTree> {
		const url = `http://${this.host}:${this.port}/source/?format=json`;
		const response = await this.fetchWithKeepAlive(url);
		const json = await response.json();
		return json as SourceTree;
	}

	public async getElementsOnScreen(): Promise<ScreenElement[]> {
		const source = await this.getPageSource();
		return this.filterSourceElements(source.value);
	}

	public async openUrl(url: string): Promise<void> {
		const sessionUrl = await this.sessionManager.getSession();
		await this.fetchWithKeepAlive(`${sessionUrl}/url`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ url }),
		});
	}

	public async getScreenshot(): Promise<Buffer> {
		const url = `http://${this.host}:${this.port}/screenshot`;
		const response = await this.fetchWithKeepAlive(url);
		const json = await response.json();
		return Buffer.from(json.value, "base64");
	}

	public async swipe(direction: SwipeDirection): Promise<void> {
		const sessionUrl = await this.sessionManager.getSession();
		const screenSize = await this.getScreenSize();
		let x0: number, y0: number, x1: number, y1: number;
		// Use 60% of the width/height for swipe distance
		const verticalDistance = Math.floor(screenSize.height * 0.6);
		const horizontalDistance = Math.floor(screenSize.width * 0.6);
		const centerX = Math.floor(screenSize.width / 2);
		const centerY = Math.floor(screenSize.height / 2);

		switch (direction) {
			case "up":
				x0 = x1 = centerX;
				y0 = centerY + Math.floor(verticalDistance / 2);
				y1 = centerY - Math.floor(verticalDistance / 2);
				break;
			case "down":
				x0 = x1 = centerX;
				y0 = centerY - Math.floor(verticalDistance / 2);
				y1 = centerY + Math.floor(verticalDistance / 2);
				break;
			case "left":
				y0 = y1 = centerY;
				x0 = centerX + Math.floor(horizontalDistance / 2);
				x1 = centerX - Math.floor(horizontalDistance / 2);
				break;
			case "right":
				y0 = y1 = centerY;
				x0 = centerX - Math.floor(horizontalDistance / 2);
				x1 = centerX + Math.floor(horizontalDistance / 2);
				break;
			default:
				throw new ActionableError(`Swipe direction "${direction}" is not supported`);
		}

		const url = `${sessionUrl}/actions`;
		const response = await this.fetchWithKeepAlive(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				actions: [
					{
						type: "pointer",
						id: "finger1",
						parameters: { pointerType: "touch" },
						actions: [
							{ type: "pointerMove", duration: 0, x: x0, y: y0 },
							{ type: "pointerDown", button: 0 },
							{ type: "pointerMove", duration: DURATIONS.swipe, x: x1, y: y1 },
							{ type: "pointerUp", button: 0 }
						]
					}
				]
			}),
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new ActionableError(`WebDriver actions request failed: ${response.status} ${errorText}`);
		}

		// Clear actions to ensure they complete
		await this.fetchWithKeepAlive(`${sessionUrl}/actions`, {
			method: "DELETE",
		});
	}

	public async swipeFromCoordinate(x: number, y: number, direction: SwipeDirection, distance: number = 400): Promise<void> {
		const sessionUrl = await this.sessionManager.getSession();
		// Use simple coordinates like the working swipe method
		const x0 = x;
		const y0 = y;
		let x1 = x;
		let y1 = y;

		// Calculate target position based on direction and distance
		switch (direction) {
			case "up":
				y1 = y - distance; // Move up by specified distance
				break;
			case "down":
				y1 = y + distance; // Move down by specified distance
				break;
			case "left":
				x1 = x - distance; // Move left by specified distance
				break;
			case "right":
				x1 = x + distance; // Move right by specified distance
				break;
			default:
				throw new ActionableError(`Swipe direction "${direction}" is not supported`);
		}

		const url = `${sessionUrl}/actions`;
		const response = await this.fetchWithKeepAlive(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				actions: [
					{
						type: "pointer",
						id: "finger1",
						parameters: { pointerType: "touch" },
						actions: [
							{ type: "pointerMove", duration: 0, x: x0, y: y0 },
							{ type: "pointerDown", button: 0 },
							{ type: "pointerMove", duration: DURATIONS.swipe, x: x1, y: y1 },
							{ type: "pointerUp", button: 0 }
						]
					}
				]
			}),
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new ActionableError(`WebDriver actions request failed: ${response.status} ${errorText}`);
		}

		// Clear actions to ensure they complete
		await this.fetchWithKeepAlive(`${sessionUrl}/actions`, {
			method: "DELETE",
		});
	}

	public async setOrientation(orientation: Orientation): Promise<void> {
		const sessionUrl = await this.sessionManager.getSession();
		const url = `${sessionUrl}/orientation`;
		await this.fetchWithKeepAlive(url, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				orientation: orientation.toUpperCase()
			})
		});
	}

	public async getOrientation(): Promise<Orientation> {
		const sessionUrl = await this.sessionManager.getSession();
		const url = `${sessionUrl}/orientation`;
		const response = await this.fetchWithKeepAlive(url);
		const json = await response.json();
		return json.value.toLowerCase() as Orientation;
	}
}
