/**
 * SessionKey Utilities
 *
 * This module provides utilities for parsing, validating, and managing
 * Seal SessionKey instances for time-limited decryption access.
 *
 * SessionKey Architecture:
 * - SessionKey is created with a TTL (time-to-live) in minutes
 * - User signs a personal message with their wallet
 * - SessionKey provides time-limited access to decrypt data
 * - Signature is verified by Seal key servers
 *
 * Best Practices (from Seal docs):
 * - Store SessionKey securely (HttpOnly cookies recommended)
 * - Validate expiration before each use
 * - Refresh SessionKey before expiration
 * - Never expose SessionKey to client-side JavaScript
 */

import type { SessionKey } from "@mysten/seal";

// ==========================================
// Type Definitions
// ==========================================

/**
 * SessionKey header format for HTTP transmission
 * Base64-encoded JSON containing signature and expiration
 */
export interface SessionKeyHeader {
	signature: string; // Base64-encoded signature
	expiresAt: number; // Unix timestamp in milliseconds
}

// ==========================================
// SessionKey Parsing & Validation
// ==========================================

/**
 * Parse SessionKey from HTTP header value
 *
 * Flow:
 * 1. Decode base64 → JSON
 * 2. Validate structure
 * 3. Check expiration
 * 4. Return SessionKey instance
 *
 * @param headerValue - X-Session-Key header value (base64 encoded JSON)
 * @returns Parsed SessionKey instance
 * @throws Error if invalid format or expired
 *
 * @example
 * ```typescript
 * const sessionKey = parseSessionKeyFromHeader(
 *   request.headers.get("X-Session-Key")
 * );
 * ```
 */
export function parseSessionKeyFromHeader(
	headerValue: string | null,
): SessionKey {
	if (!headerValue) {
		throw new Error("Missing X-Session-Key header");
	}

	try {
		// Decode base64 → JSON
		const decoded = Buffer.from(headerValue, "base64").toString("utf-8");
		const parsed = JSON.parse(decoded) as SessionKeyHeader;

		// Validate structure
		if (!parsed.signature || typeof parsed.expiresAt !== "number") {
			throw new Error("Invalid SessionKey format");
		}

		// Check expiration
		if (isExpired(parsed.expiresAt)) {
			throw new Error("SessionKey has expired");
		}

		// Reconstruct SessionKey from JSON
		// Note: SessionKey.fromJSON() might be available in future versions
		// For now, we assume the SessionKey can be reconstructed from the signature
		// This is a placeholder - actual implementation depends on @mysten/seal API
		const sessionKey = reconstructSessionKey(parsed);

		return sessionKey;
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(`Failed to parse SessionKey: ${error.message}`);
		}
		throw new Error("Failed to parse SessionKey: Unknown error");
	}
}

/**
 * Check if SessionKey is expired
 *
 * @param expiresAt - Expiration timestamp in milliseconds
 * @returns True if expired
 */
export function isExpired(expiresAt: number): boolean {
	return Date.now() >= expiresAt;
}

/**
 * Check if SessionKey is about to expire (within grace period)
 *
 * @param expiresAt - Expiration timestamp in milliseconds
 * @param graceMinutes - Grace period in minutes (default: 2)
 * @returns True if within grace period
 */
export function isExpiringSoon(
	expiresAt: number,
	graceMinutes: number = 2,
): boolean {
	const graceMs = graceMinutes * 60 * 1000;
	return Date.now() >= expiresAt - graceMs;
}

/**
 * Reconstruct SessionKey from parsed header data
 *
 * This is a helper function to rebuild the SessionKey instance.
 * Actual implementation depends on @mysten/seal internal structure.
 *
 * @param data - Parsed SessionKey header data
 * @returns SessionKey instance
 * @throws Error if reconstruction fails
 */
function reconstructSessionKey(_data: SessionKeyHeader): SessionKey {
	// TODO: Implement actual SessionKey reconstruction
	// This depends on @mysten/seal internal API
	// For now, we throw an error as a placeholder
	throw new Error(
		"SessionKey reconstruction not yet implemented. Use SessionKey.fromJSON() when available in @mysten/seal",
	);
}

// ==========================================
// SessionKey Serialization
// ==========================================

/**
 * Serialize SessionKey for HTTP transmission
 *
 * @param sessionKey - SessionKey instance
 * @returns Base64-encoded JSON string
 *
 * @example
 * ```typescript
 * const headerValue = serializeSessionKey(sessionKey);
 * response.headers.set("X-Session-Key", headerValue);
 * ```
 */
export function serializeSessionKey(_sessionKey: SessionKey): string {
	// TODO: Extract signature and expiresAt from SessionKey
	// This depends on @mysten/seal internal API
	const data: SessionKeyHeader = {
		signature: "", // Extract from sessionKey
		expiresAt: 0, // Extract from sessionKey
	};

	const json = JSON.stringify(data);
	return Buffer.from(json).toString("base64");
}

// ==========================================
// SessionKey Validation
// ==========================================

/**
 * Validate SessionKey instance
 *
 * Checks:
 * - SessionKey is not null/undefined
 * - SessionKey has not expired
 * - SessionKey signature is valid format
 *
 * @param sessionKey - SessionKey to validate
 * @throws Error if invalid
 */
export function validateSessionKey(sessionKey: SessionKey | null): void {
	if (!sessionKey) {
		throw new Error("SessionKey is null or undefined");
	}

	// TODO: Add more validation based on @mysten/seal API
	// For example:
	// - Check signature format
	// - Verify expiration timestamp
	// - Validate against specific wallet address
}

/**
 * Get remaining TTL for SessionKey
 *
 * @param expiresAt - Expiration timestamp in milliseconds
 * @returns Remaining time in milliseconds (0 if expired)
 */
export function getRemainingTTL(expiresAt: number): number {
	const remaining = expiresAt - Date.now();
	return Math.max(0, remaining);
}

/**
 * Format TTL for display
 *
 * @param ttlMs - TTL in milliseconds
 * @returns Human-readable string (e.g., "5m 30s")
 */
export function formatTTL(ttlMs: number): string {
	if (ttlMs <= 0) {
		return "Expired";
	}

	const seconds = Math.floor(ttlMs / 1000);
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;

	if (minutes > 0) {
		return `${minutes}m ${remainingSeconds}s`;
	}
	return `${remainingSeconds}s`;
}
