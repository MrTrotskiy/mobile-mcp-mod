/**
 * Device Lock Manager
 *
 * Manages locks on mobile devices to prevent concurrent access.
 * Essential for parallel test execution where multiple tests
 * might try to use the same device simultaneously.
 *
 * Features:
 * - Device-level locking (one test per device at a time)
 * - Automatic lock release on error
 * - Timeout support for lock acquisition
 * - Queue management for waiting tests
 */

import { ActionableError } from "./robot";

// Lock information for a device
interface DeviceLock {
	deviceId: string;
	ownerId: string;      // Test/process that owns the lock
	acquiredAt: number;   // Timestamp when lock was acquired
	expiresAt: number;    // Timestamp when lock expires (if timeout set)
}

// Waiting request for a lock
interface LockRequest {
	deviceId: string;
	ownerId: string;
	resolve: () => void;
	reject: (error: Error) => void;
	requestedAt: number;
}

/**
 * Global device lock manager singleton
 * Ensures only one instance manages all device locks
 */
class DeviceLockManager {
	private locks: Map<string, DeviceLock> = new Map();
	private queue: LockRequest[] = [];
	private lockCheckInterval: NodeJS.Timeout | null = null;

	constructor() {
		// Start periodic check for expired locks
		this.startLockMonitoring();
	}

	/**
	 * Start monitoring locks for expiration
	 */
	private startLockMonitoring(): void {
		// Check every second for expired locks
		this.lockCheckInterval = setInterval(() => {
			this.checkExpiredLocks();
		}, 1000);
	}

	/**
	 * Check for and release expired locks
	 */
	private checkExpiredLocks(): void {
		const now = Date.now();

		for (const [deviceId, lock] of this.locks.entries()) {
			if (lock.expiresAt && lock.expiresAt < now) {
				console.warn(`⚠️  Lock expired for device ${deviceId} (owner: ${lock.ownerId})`);
				this.releaseLock(deviceId, lock.ownerId);
			}
		}
	}

	/**
	 * Acquire a lock on a device
	 *
	 * @param deviceId - Device to lock
	 * @param ownerId - ID of the test/process acquiring lock
	 * @param timeout - Max time to wait for lock (ms). 0 = fail immediately, undefined = wait forever
	 * @param lockDuration - Max time to hold lock (ms). undefined = no expiration
	 * @returns Promise that resolves when lock is acquired
	 */
	public async acquireLock(
		deviceId: string,
		ownerId: string,
		timeout?: number,
		lockDuration?: number
	): Promise<void> {
		// Check if device is already locked
		const existingLock = this.locks.get(deviceId);

		if (!existingLock) {
			// Device is free, acquire immediately
			this.setLock(deviceId, ownerId, lockDuration);
			return;
		}

		// Device is locked by someone else
		if (existingLock.ownerId === ownerId) {
			// Already own the lock - this is reentrant, just update expiration
			if (lockDuration) {
				existingLock.expiresAt = Date.now() + lockDuration;
			}
			return;
		}

		// Need to wait for lock
		if (timeout === 0) {
			// Fail immediately if timeout is 0
			throw new ActionableError(
				`Device ${deviceId} is locked by ${existingLock.ownerId} (acquired ${Date.now() - existingLock.acquiredAt}ms ago)`
			);
		}

		// Wait for lock with timeout
		return new Promise<void>((resolve, reject) => {
			const request: LockRequest = {
				deviceId,
				ownerId,
				resolve: () => {
					this.setLock(deviceId, ownerId, lockDuration);
					resolve();
				},
				reject,
				requestedAt: Date.now(),
			};

			this.queue.push(request);

			// Set timeout if specified
			if (timeout !== undefined) {
				setTimeout(() => {
					// Check if still in queue
					const index = this.queue.indexOf(request);
					if (index !== -1) {
						this.queue.splice(index, 1);
						reject(new ActionableError(
							`Timeout waiting for lock on device ${deviceId} (waited ${Date.now() - request.requestedAt}ms)`
						));
					}
				}, timeout);
			}
		});
	}

	/**
	 * Release a lock on a device
	 *
	 * @param deviceId - Device to unlock
	 * @param ownerId - ID of the test/process releasing lock (must match owner)
	 */
	public releaseLock(deviceId: string, ownerId: string): void {
		const lock = this.locks.get(deviceId);

		if (!lock) {
			// No lock to release - this is OK (idempotent)
			return;
		}

		if (lock.ownerId !== ownerId) {
			console.warn(
				`⚠️  Attempted to release lock on ${deviceId} by ${ownerId}, but lock is owned by ${lock.ownerId}`
			);
			return;
		}

		// Release the lock
		this.locks.delete(deviceId);

		// Process queue - give lock to next waiting request
		this.processQueue(deviceId);
	}

	/**
	 * Process queue for a specific device
	 * Find first request waiting for this device and resolve it
	 */
	private processQueue(deviceId: string): void {
		const index = this.queue.findIndex(req => req.deviceId === deviceId);

		if (index !== -1) {
			const request = this.queue.splice(index, 1)[0];
			request.resolve();
		}
	}

	/**
	 * Set lock on a device
	 */
	private setLock(deviceId: string, ownerId: string, lockDuration?: number): void {
		const lock: DeviceLock = {
			deviceId,
			ownerId,
			acquiredAt: Date.now(),
			expiresAt: lockDuration ? Date.now() + lockDuration : 0,
		};

		this.locks.set(deviceId, lock);
	}

	/**
	 * Check if device is locked
	 */
	public isLocked(deviceId: string): boolean {
		return this.locks.has(deviceId);
	}

	/**
	 * Get information about current lock on device
	 */
	public getLockInfo(deviceId: string): DeviceLock | null {
		return this.locks.get(deviceId) || null;
	}

	/**
	 * Get all currently locked devices
	 */
	public getLockedDevices(): string[] {
		return Array.from(this.locks.keys());
	}

	/**
	 * Release all locks (cleanup)
	 */
	public releaseAll(): void {
		this.locks.clear();

		// Reject all pending requests
		this.queue.forEach(req => {
			req.reject(new ActionableError("Device lock manager is shutting down"));
		});
		this.queue = [];
	}

	/**
	 * Cleanup and stop monitoring
	 */
	public shutdown(): void {
		if (this.lockCheckInterval) {
			clearInterval(this.lockCheckInterval);
			this.lockCheckInterval = null;
		}
		this.releaseAll();
	}
}

// Global singleton instance
let globalLockManager: DeviceLockManager | null = null;

/**
 * Get the global device lock manager instance
 */
export function getDeviceLockManager(): DeviceLockManager {
	if (!globalLockManager) {
		globalLockManager = new DeviceLockManager();
	}
	return globalLockManager;
}

/**
 * Helper function to execute code with device lock
 * Automatically acquires and releases lock
 *
 * @param deviceId - Device to lock
 * @param ownerId - ID of the test/process
 * @param fn - Function to execute while holding lock
 * @param timeout - Max time to wait for lock (ms)
 * @param lockDuration - Max time to hold lock (ms)
 */
export async function withDeviceLock<T>(
	deviceId: string,
	ownerId: string,
	fn: () => Promise<T>,
	timeout?: number,
	lockDuration?: number
): Promise<T> {
	const manager = getDeviceLockManager();

	try {
		// Acquire lock
		await manager.acquireLock(deviceId, ownerId, timeout, lockDuration);

		// Execute function
		return await fn();
	} finally {
		// Always release lock, even on error
		manager.releaseLock(deviceId, ownerId);
	}
}
