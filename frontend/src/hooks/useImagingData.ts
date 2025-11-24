/**
 * useImagingData Hook
 *
 * React hook for loading and managing imaging data with caching and memory management.
 *
 * ## Features
 * - Load imaging binary data from Walrus
 * - Decrypt with Seal using SessionKey
 * - Generate Object URLs for display
 * - LRU cache for avoiding duplicate downloads
 * - Automatic memory cleanup
 * - Session key validation
 *
 * ## Usage
 * ```typescript
 * const {
 *   loadImage,
 *   getImageUrl,
 *   clearCache,
 *   isLoading,
 *   error,
 * } = useImagingData();
 *
 * // Load an image
 * await loadImage({
 *   blobId: "abc123...",
 *   sealId: "def456...",
 *   sessionKey,
 *   passportId: "0x789...",
 * });
 *
 * // Get the URL (from cache)
 * const imageUrl = getImageUrl("abc123...");
 *
 * // Display
 * {imageUrl && <img src={imageUrl} alt="X-ray" />}
 * ```
 */
"use client";

import { useSuiClient } from "@mysten/dapp-kit";
import type { SessionKey } from "@mysten/seal";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	decryptAndDisplayImage,
	getImagingErrorMessage,
	ImagingError,
	revokeImageObjectUrl,
} from "@/lib/imagingDisplay";

// ==========================================
// Type Definitions
// ==========================================

/**
 * Cache entry for imaging data
 */
interface CacheEntry {
	objectUrl: string;
	contentType: string;
	timestamp: number;
	accessCount: number;
}

/**
 * Loading state for a specific blob ID
 */
interface LoadingState {
	isLoading: boolean;
	error: string | null;
}

/**
 * Parameters for loading an image
 */
export interface LoadImageParams {
	blobId: string;
	sealId: string;
	sessionKey: SessionKey;
	passportId: string;
	registryId?: string;
}

/**
 * Hook return type
 */
export interface UseImagingDataReturn {
	/** Load and cache an imaging binary */
	loadImage: (params: LoadImageParams) => Promise<string | null>;
	/** Get cached image URL by blob ID */
	getImageUrl: (blobId: string) => string | null;
	/** Check if an image is currently loading */
	isLoading: (blobId: string) => boolean;
	/** Get error for a specific blob ID */
	getError: (blobId: string) => string | null;
	/** Clear all cached images */
	clearCache: () => void;
	/** Remove a specific image from cache */
	removeFromCache: (blobId: string) => void;
	/** Get cache statistics */
	getCacheStats: () => { size: number; entries: string[] };
}

// ==========================================
// Hook Implementation
// ==========================================

/**
 * Hook for managing imaging data with caching
 *
 * @param options - Configuration options
 * @returns Imaging data management functions
 */
export function useImagingData(options?: {
	/** Maximum cache size (default: 50) */
	maxCacheSize?: number;
	/** Cache TTL in milliseconds (default: 30 minutes) */
	cacheTtl?: number;
}): UseImagingDataReturn {
	const suiClient = useSuiClient();

	const maxCacheSize = options?.maxCacheSize || 50;
	const cacheTtl = options?.cacheTtl || 30 * 60 * 1000; // 30 minutes

	// Cache: blob ID -> CacheEntry
	const cacheRef = useRef<Map<string, CacheEntry>>(new Map());

	// Loading states: blob ID -> LoadingState
	const [loadingStates, setLoadingStates] = useState<Map<string, LoadingState>>(
		new Map(),
	);

	/**
	 * Update loading state for a blob ID
	 */
	const setLoadingState = useCallback(
		(blobId: string, state: Partial<LoadingState>) => {
			setLoadingStates((prev) => {
				const newMap = new Map(prev);
				const existing = newMap.get(blobId) || {
					isLoading: false,
					error: null,
				};
				newMap.set(blobId, { ...existing, ...state });
				return newMap;
			});
		},
		[],
	);

	/**
	 * Evict least recently used cache entry
	 */
	const evictLRU = useCallback(() => {
		const cache = cacheRef.current;

		if (cache.size === 0) return;

		// Find entry with lowest access count and oldest timestamp
		let lruBlobId: string | null = null;
		let minScore = Number.POSITIVE_INFINITY;

		for (const [blobId, entry] of cache.entries()) {
			// Score = access count (lower is better) + age penalty
			const age = Date.now() - entry.timestamp;
			const score = entry.accessCount - age / 1000000; // Age penalty
			if (score < minScore) {
				minScore = score;
				lruBlobId = blobId;
			}
		}

		if (lruBlobId) {
			const entry = cache.get(lruBlobId);
			if (entry) {
				// Revoke Object URL to free memory
				revokeImageObjectUrl(entry.objectUrl);
				cache.delete(lruBlobId);
				console.log(`[useImagingData] Evicted LRU entry: ${lruBlobId}`);
			}
		}
	}, []);

	/**
	 * Add entry to cache
	 */
	const addToCache = useCallback(
		(blobId: string, objectUrl: string, contentType: string) => {
			const cache = cacheRef.current;

			// Evict if cache is full
			if (cache.size >= maxCacheSize) {
				evictLRU();
			}

			cache.set(blobId, {
				objectUrl,
				contentType,
				timestamp: Date.now(),
				accessCount: 1,
			});

			console.log(`[useImagingData] Cached: ${blobId}`);
		},
		[maxCacheSize, evictLRU],
	);

	/**
	 * Load an imaging binary and cache it
	 */
	const loadImage = useCallback(
		async (params: LoadImageParams): Promise<string | null> => {
			const { blobId, sealId, sessionKey, passportId, registryId } = params;

			// Check if already cached
			const cached = cacheRef.current.get(blobId);
			if (cached) {
				// Check TTL
				const age = Date.now() - cached.timestamp;
				if (age < cacheTtl) {
					// Update access count
					cached.accessCount++;
					console.log(`[useImagingData] Cache hit: ${blobId}`);
					return cached.objectUrl;
				}

				// Expired, remove from cache
				revokeImageObjectUrl(cached.objectUrl);
				cacheRef.current.delete(blobId);
				console.log(`[useImagingData] Cache expired: ${blobId}`);
			}

			// Check if already loading
			const loadingState = loadingStates.get(blobId);
			if (loadingState?.isLoading) {
				console.log(`[useImagingData] Already loading: ${blobId}`);
				return null;
			}

			// Start loading
			setLoadingState(blobId, { isLoading: true, error: null });

			try {
				console.log(`[useImagingData] Loading: ${blobId}`);

				const objectUrl = await decryptAndDisplayImage({
					blobId,
					sealId,
					sessionKey,
					passportId,
					suiClient,
					registryId,
				});

				// Add to cache
				addToCache(blobId, objectUrl, "image/*"); // Content type unknown at this point

				// Update loading state
				setLoadingState(blobId, { isLoading: false, error: null });

				return objectUrl;
			} catch (error) {
				console.error(`[useImagingData] Load failed: ${blobId}`, error);

				let errorMessage = "Failed to load image";

				if (error instanceof ImagingError) {
					errorMessage = getImagingErrorMessage(error);
				} else if (error instanceof Error) {
					errorMessage = error.message;
				}

				// Update loading state with error
				setLoadingState(blobId, { isLoading: false, error: errorMessage });

				return null;
			}
		},
		[suiClient, cacheTtl, loadingStates, setLoadingState, addToCache],
	);

	/**
	 * Get cached image URL
	 */
	const getImageUrl = useCallback(
		(blobId: string): string | null => {
			const cached = cacheRef.current.get(blobId);

			if (!cached) {
				return null;
			}

			// Check TTL
			const age = Date.now() - cached.timestamp;
			if (age >= cacheTtl) {
				// Expired
				revokeImageObjectUrl(cached.objectUrl);
				cacheRef.current.delete(blobId);
				return null;
			}

			// Update access count
			cached.accessCount++;

			return cached.objectUrl;
		},
		[cacheTtl],
	);

	/**
	 * Check if image is loading
	 */
	const isLoading = useCallback(
		(blobId: string): boolean => {
			return loadingStates.get(blobId)?.isLoading ?? false;
		},
		[loadingStates],
	);

	/**
	 * Get error for blob ID
	 */
	const getError = useCallback(
		(blobId: string): string | null => {
			return loadingStates.get(blobId)?.error ?? null;
		},
		[loadingStates],
	);

	/**
	 * Clear all cached images
	 */
	const clearCache = useCallback(() => {
		const cache = cacheRef.current;

		// Revoke all Object URLs
		for (const entry of cache.values()) {
			revokeImageObjectUrl(entry.objectUrl);
		}

		cache.clear();
		console.log("[useImagingData] Cache cleared");
	}, []);

	/**
	 * Remove specific image from cache
	 */
	const removeFromCache = useCallback((blobId: string) => {
		const cache = cacheRef.current;
		const entry = cache.get(blobId);

		if (entry) {
			revokeImageObjectUrl(entry.objectUrl);
			cache.delete(blobId);
			console.log(`[useImagingData] Removed from cache: ${blobId}`);
		}
	}, []);

	/**
	 * Get cache statistics
	 */
	const getCacheStats = useCallback(() => {
		const cache = cacheRef.current;
		return {
			size: cache.size,
			entries: Array.from(cache.keys()),
		};
	}, []);

	/**
	 * Clean up all Object URLs on unmount
	 */
	useEffect(() => {
		return () => {
			const cache = cacheRef.current;
			for (const entry of cache.values()) {
				revokeImageObjectUrl(entry.objectUrl);
			}
			cache.clear();
			console.log("[useImagingData] Cleanup on unmount");
		};
	}, []);

	return {
		loadImage,
		getImageUrl,
		isLoading,
		getError,
		clearCache,
		removeFromCache,
		getCacheStats,
	};
}

/**
 * Hook for loading a single image with simplified API
 *
 * @param blobId - Blob ID to load
 * @param params - Decryption parameters
 * @returns Image URL and loading state
 *
 * @example
 * ```typescript
 * const { imageUrl, isLoading, error } = useImage("abc123...", {
 *   sealId: "def456...",
 *   sessionKey,
 *   passportId: "0x789...",
 * });
 *
 * return (
 *   <div>
 *     {isLoading && <p>Loading...</p>}
 *     {error && <p>Error: {error}</p>}
 *     {imageUrl && <img src={imageUrl} alt="Medical imaging" />}
 *   </div>
 * );
 * ```
 */
export function useImage(
	blobId: string | null,
	params: Omit<LoadImageParams, "blobId"> | null,
) {
	const imaging = useImagingData();
	const [imageUrl, setImageUrl] = useState<string | null>(null);

	useEffect(() => {
		if (!blobId || !params) {
			setImageUrl(null);
			return;
		}

		// Check cache first
		const cached = imaging.getImageUrl(blobId);
		if (cached) {
			setImageUrl(cached);
			return;
		}

		// Load image
		imaging
			.loadImage({
				blobId,
				...params,
			})
			.then((url) => {
				if (url) {
					setImageUrl(url);
				}
			})
			.catch((err) => {
				console.error("[useImage] Load failed:", err);
			});
	}, [blobId, params, imaging]);

	return {
		imageUrl,
		isLoading: blobId ? imaging.isLoading(blobId) : false,
		error: blobId ? imaging.getError(blobId) : null,
	};
}
