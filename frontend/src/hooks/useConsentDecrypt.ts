"use client";

import { useSuiClient } from "@mysten/dapp-kit";
import type { SessionKey } from "@mysten/seal";
import { useCallback, useState } from "react";
import {
	buildConsentAccessPTB,
	buildSealAuthPayloadBytes,
	createSealClient,
	decryptHealthData,
} from "@/lib/seal";
import { downloadFromWalrusByBlobId } from "@/lib/walrus";
import type { HealthData } from "@/types/healthData";

export type ConsentDecryptionStage =
	| "idle"
	| "fetching"
	| "building_ptb"
	| "decrypting"
	| "completed"
	| "error";

export interface ConsentDecryptionParams {
	blobId: string;
	/** Seal ID retrieved from EntryData (required for decryption verification) */
	sealId: string;
	passportId: string;
	consentTokenId: string;
	dataType: string;
	secret: string;
	sessionKey: SessionKey;
}

export interface ConsentDecryptionResult {
	data: HealthData;
	blobId: string;
}

export interface UseConsentDecryptReturn {
	decryptWithConsent: (
		params: ConsentDecryptionParams,
	) => Promise<ConsentDecryptionResult>;
	stage: ConsentDecryptionStage;
	error: string | null;
	reset: () => void;
}

/**
 * Decrypt Walrus blob with Seal consent flow
 *
 * 1. Download encrypted blob
 * 2. Build SealAuthPayload (secret + passportId + scope)
 * 3. Build PTB for `seal_approve_consent`
 * 4. Decrypt with Seal + SessionKey
 */
export function useConsentDecrypt(): UseConsentDecryptReturn {
	const suiClient = useSuiClient();
	const [stage, setStage] = useState<ConsentDecryptionStage>("idle");
	const [error, setError] = useState<string | null>(null);

	const reset = useCallback(() => {
		setStage("idle");
		setError(null);
	}, []);

	const decryptWithConsent = useCallback(
		async (
			params: ConsentDecryptionParams,
		): Promise<ConsentDecryptionResult> => {
			const {
				blobId,
				sealId,
				passportId,
				consentTokenId,
				dataType,
				secret,
				sessionKey,
			} = params;

			setStage("fetching");
			setError(null);

			try {
				// 1. Walrus download
				const encryptedData = await downloadFromWalrusByBlobId(blobId);

				// 2. Build SealAuthPayload
				setStage("building_ptb");
				const payload = buildSealAuthPayloadBytes({
					secret,
					passportId,
					dataType,
				});

				// 3. Build PTB for consent path
				const txBytes = await buildConsentAccessPTB({
					passportObjectId: passportId,
					consentTokenObjectId: consentTokenId,
					dataType,
					sealId,
					payload,
					suiClient,
				});

				// 4. Decrypt with Seal (using seal_id from EntryData)
				setStage("decrypting");
				const sealClient = createSealClient(suiClient);
				const data = await decryptHealthData({
					encryptedData,
					sealClient,
					sessionKey,
					txBytes,
					sealId, // Pass seal_id for verification
				});

				setStage("completed");
				return { data, blobId };
			} catch (err) {
				setStage("error");
				const message =
					err instanceof Error ? err.message : "Consent decryption failed";
				setError(message);
				throw err;
			}
		},
		[suiClient],
	);

	return {
		decryptWithConsent,
		stage,
		error,
		reset,
	};
}
