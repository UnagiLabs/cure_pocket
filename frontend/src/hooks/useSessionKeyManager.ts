/**
 * useSessionKeyManager Hook
 *
 * Manages Seal SessionKey lifecycle with automatic renewal and wallet signing.
 *
 * ## Features
 * - SessionKey creation with wallet signature
 * - 10-minute TTL management
 * - Automatic renewal before expiration
 * - Error handling and retry logic
 *
 * ## SessionKey Flow
 * 1. Create SessionKey with SessionKey.create()
 * 2. Get personal message to sign
 * 3. User signs message with wallet
 * 4. Set signature to complete SessionKey initialization
 *
 * ## Usage
 * ```typescript
 * const { sessionKey, isValid, generateSessionKey, isLoading, error } = useSessionKeyManager();
 *
 * // Generate new session key when needed
 * await generateSessionKey();
 *
 * // Check if session key is still valid
 * if (isValid) {
 *   // Use sessionKey for decryption
 * }
 * ```
 */
"use client";

import {
	useCurrentAccount,
	useSignPersonalMessage,
	useSuiClient,
} from "@mysten/dapp-kit";
import { SessionKey } from "@mysten/seal";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * SessionKey TTL in minutes (default: 10 minutes)
 */
const DEFAULT_SESSION_TTL_MIN = 10;

/**
 * Auto-renewal trigger threshold in minutes (renew when 2 minutes remaining)
 */
const RENEWAL_THRESHOLD_MIN = 2;

/**
 * Package ID for access control policies
 */
const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID || "";

/**
 * SessionKey manager state
 */
interface SessionKeyState {
	/** Current SessionKey instance */
	sessionKey: SessionKey | null;
	/** Expiration timestamp in milliseconds */
	expiresAt: number | null;
	/** Whether the session key is currently valid */
	isValid: boolean;
	/** Whether session key generation is in progress */
	isLoading: boolean;
	/** Error message if generation failed */
	error: string | null;
}

/**
 * Hook return type
 */
export interface UseSessionKeyManagerReturn {
	/** Current SessionKey instance (null if not generated) */
	sessionKey: SessionKey | null;
	/** Whether the session key is currently valid (not expired) */
	isValid: boolean;
	/** Generate a new session key with wallet signature */
	generateSessionKey: () => Promise<void>;
	/** Whether session key generation is in progress */
	isLoading: boolean;
	/** Error message if generation failed */
	error: string | null;
	/** Time until expiration in milliseconds (null if no session key) */
	timeUntilExpiration: number | null;
}

/**
 * SessionKey lifecycle manager hook
 *
 * @param ttlMin - SessionKey TTL in minutes (default: 10)
 * @param autoRenew - Enable automatic renewal before expiration (default: true)
 * @returns SessionKey manager state and controls
 */
export function useSessionKeyManager(
	ttlMin = DEFAULT_SESSION_TTL_MIN,
	autoRenew = true,
): UseSessionKeyManagerReturn {
	const currentAccount = useCurrentAccount();
	const suiClient = useSuiClient();
	const { mutateAsync: signPersonalMessage } = useSignPersonalMessage();

	const [state, setState] = useState<SessionKeyState>({
		sessionKey: null,
		expiresAt: null,
		isValid: false,
		isLoading: false,
		error: null,
	});

	// Renewal timer reference
	const renewalTimerRef = useRef<NodeJS.Timeout | null>(null);

	/**
	 * Clear renewal timer
	 */
	const clearRenewalTimer = useCallback(() => {
		if (renewalTimerRef.current) {
			clearTimeout(renewalTimerRef.current);
			renewalTimerRef.current = null;
		}
	}, []);

	/**
	 * Check if session key is still valid
	 */
	const checkValidity = useCallback(() => {
		if (!state.expiresAt) return false;
		return Date.now() < state.expiresAt;
	}, [state.expiresAt]);

	/**
	 * Generate a new SessionKey with wallet signature
	 */
	const generateSessionKey = useCallback(async () => {
		if (!currentAccount?.address) {
			setState((prev) => ({
				...prev,
				error: "Wallet not connected",
				isLoading: false,
			}));
			return;
		}

		if (!PACKAGE_ID) {
			setState((prev) => ({
				...prev,
				error: "Package ID not configured",
				isLoading: false,
			}));
			return;
		}

		setState((prev) => ({
			...prev,
			isLoading: true,
			error: null,
		}));

		try {
			// Step 1: Create SessionKey
			const newSessionKey = await SessionKey.create({
				address: currentAccount.address,
				packageId: PACKAGE_ID,
				ttlMin,
				suiClient,
			});

			// Step 2: Get personal message to sign
			const personalMessage = newSessionKey.getPersonalMessage();

			// Step 3: Request wallet signature
			const signatureResult = await signPersonalMessage({
				message: personalMessage,
			});

			// Step 4: Set signature to complete SessionKey initialization
			// ✅ Pass signature directly (no conversion needed)
			newSessionKey.setPersonalMessageSignature(signatureResult.signature);

			// Calculate expiration time
			const expiresAt = Date.now() + ttlMin * 60 * 1000;

			// Update state
			setState({
				sessionKey: newSessionKey,
				expiresAt,
				isValid: true,
				isLoading: false,
				error: null,
			});

			console.log(
				`[SessionKey] Generated successfully, expires at ${new Date(expiresAt).toISOString()}`,
			);
		} catch (error) {
			console.error("[SessionKey] Generation failed:", error);
			setState((prev) => ({
				...prev,
				sessionKey: null,
				expiresAt: null,
				isValid: false,
				isLoading: false,
				error:
					error instanceof Error
						? error.message
						: "Failed to generate session key",
			}));
		}
	}, [currentAccount, suiClient, signPersonalMessage, ttlMin]);

	/**
	 * Schedule auto-renewal before expiration
	 */
	const scheduleAutoRenewal = useCallback(() => {
		if (!autoRenew || !state.expiresAt) return;

		clearRenewalTimer();

		const timeUntilRenewal =
			state.expiresAt - Date.now() - RENEWAL_THRESHOLD_MIN * 60 * 1000;

		if (timeUntilRenewal > 0) {
			renewalTimerRef.current = setTimeout(() => {
				console.log("[SessionKey] Auto-renewing session key");
				generateSessionKey();
			}, timeUntilRenewal);
		}
	}, [autoRenew, state.expiresAt, generateSessionKey, clearRenewalTimer]);

	/**
	 * Effect: Update validity status periodically
	 */
	useEffect(() => {
		const validityCheckInterval = setInterval(() => {
			const isValid = checkValidity();
			setState((prev) => {
				if (prev.isValid !== isValid) {
					return { ...prev, isValid };
				}
				return prev;
			});
		}, 1000); // Check every second

		return () => clearInterval(validityCheckInterval);
	}, [checkValidity]);

	/**
	 * Effect: Schedule auto-renewal when session key is generated
	 */
	useEffect(() => {
		scheduleAutoRenewal();
		return () => clearRenewalTimer();
	}, [scheduleAutoRenewal, clearRenewalTimer]);

	/**
	 * Calculate time until expiration
	 */
	const timeUntilExpiration = state.expiresAt
		? Math.max(0, state.expiresAt - Date.now())
		: null;

	return {
		sessionKey: state.sessionKey,
		isValid: state.isValid,
		generateSessionKey,
		isLoading: state.isLoading,
		error: state.error,
		timeUntilExpiration,
	};
}
