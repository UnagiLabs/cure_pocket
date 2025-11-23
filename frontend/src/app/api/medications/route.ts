/**
 * Medications API Routes
 *
 * GET /api/medications - Retrieve medications for a wallet address
 * POST /api/medications - Add/update medications for a wallet address
 *
 * Authentication:
 * - SessionKey required in X-Session-Key header (base64 encoded JSON)
 * - Wallet address required in query parameter or request body
 *
 * Data Flow:
 * READ:  wallet → passport → dynamic fields → blob_ids → walrus → decrypt → medications[]
 * WRITE: medications[] → encrypt → walrus → blob_id (client updates on-chain)
 */

import type { SessionKey } from "@mysten/seal";
import { type NextRequest, NextResponse } from "next/server";
import {
	buildPatientAccessPTB,
	createSealClient,
	decryptHealthData,
	encryptHealthData,
} from "@/lib/seal";
import { parseSessionKeyFromHeader } from "@/lib/sessionKey";
import {
	getDataEntryBlobIds,
	getMedicalPassport,
	getPassportIdByAddress,
	getSuiClient,
} from "@/lib/suiClient";
import { downloadFromWalrusByBlobId, uploadToWalrus } from "@/lib/walrus";
import type { HealthData, Medication } from "@/types/healthData";

// ==========================================
// Environment Configuration
// ==========================================

const PASSPORT_REGISTRY_ID = process.env.NEXT_PUBLIC_PASSPORT_REGISTRY_ID || "";

// ==========================================
// Type Definitions
// ==========================================

/**
 * Error response format
 */
interface ErrorResponse {
	error: string;
	code?: string;
}

/**
 * GET response format
 */
interface GetMedicationsResponse {
	medications: Medication[];
	totalBlobs: number;
}

/**
 * POST request format
 */
interface PostMedicationsRequest {
	address: string;
	medications: Medication[];
}

/**
 * POST response format
 */
interface PostMedicationsResponse {
	blobId: string;
	message: string;
}

// ==========================================
// Helper Functions
// ==========================================

/**
 * Create error response
 */
function errorResponse(
	message: string,
	status: number = 500,
	code?: string,
): NextResponse<ErrorResponse> {
	return NextResponse.json(
		{
			error: message,
			code,
		},
		{ status },
	);
}

// ==========================================
// GET /api/medications
// ==========================================

/**
 * GET /api/medications?address={walletAddress}
 *
 * Retrieve medications for a wallet address.
 *
 * Flow:
 * 1. Parse SessionKey from header
 * 2. Get wallet address from query parameter
 * 3. Fetch MedicalPassport from blockchain
 * 4. Get blob_ids from Dynamic Fields ("medications")
 * 5. Download each blob from Walrus
 * 6. Build PTB for patient access
 * 7. Decrypt each blob with Seal
 * 8. Merge medications arrays from all blobs
 * 9. Return medications array
 *
 * Headers:
 * - X-Session-Key: base64(JSON) with signature and expiresAt
 *
 * Query Parameters:
 * - address: Wallet address (required)
 *
 * Response:
 * - 200: { medications: Medication[], totalBlobs: number }
 * - 400: Invalid request
 * - 401: Unauthorized (SessionKey invalid/expired)
 * - 404: Passport not found
 * - 500: Server error
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
	try {
		// 1. Parse SessionKey from header
		const sessionKeyHeader = request.headers.get("X-Session-Key");
		let sessionKey: SessionKey;
		try {
			sessionKey = parseSessionKeyFromHeader(sessionKeyHeader);
		} catch (error) {
			return errorResponse(
				error instanceof Error ? error.message : "Invalid SessionKey",
				401,
				"INVALID_SESSION_KEY",
			);
		}

		// 2. Get wallet address from query parameter
		const { searchParams } = new URL(request.url);
		const address = searchParams.get("address");

		if (!address) {
			return errorResponse("Missing address parameter", 400, "MISSING_ADDRESS");
		}

		// 3. Fetch MedicalPassport from blockchain
		const suiClient = getSuiClient();
		const passportId = await getPassportIdByAddress(address);

		if (!passportId) {
			return errorResponse(
				"MedicalPassport not found for this address",
				404,
				"PASSPORT_NOT_FOUND",
			);
		}

		const passport = await getMedicalPassport(passportId);

		// 4. Get blob_ids from Dynamic Fields
		const blobIds = await getDataEntryBlobIds(passportId, "medications");

		if (blobIds.length === 0) {
			// No medications data yet - return empty array
			return NextResponse.json({
				medications: [],
				totalBlobs: 0,
			});
		}

		// 5-8. Download, decrypt, and merge medications from all blobs
		const sealClient = createSealClient(suiClient);
		const allMedications: Medication[] = [];

		for (const blobId of blobIds) {
			try {
				// 5. Download encrypted data from Walrus
				const encryptedData = await downloadFromWalrusByBlobId(blobId);

				// 6. Build PTB for patient access
				const txBytes = await buildPatientAccessPTB({
					passportObjectId: passportId,
					registryObjectId: PASSPORT_REGISTRY_ID,
					suiClient,
					sealId: passport.sealId,
				});

				// 7. Decrypt with Seal
				const healthData = await decryptHealthData({
					encryptedData,
					sealClient,
					sessionKey,
					txBytes,
					sealId: passport.sealId,
				});

				// 8. Merge medications
				if (healthData.medications && Array.isArray(healthData.medications)) {
					allMedications.push(...healthData.medications);
				}
			} catch (error) {
				console.error(`Failed to process blob ${blobId}:`, error);
				// Continue processing other blobs even if one fails
			}
		}

		// 9. Return medications array
		return NextResponse.json({
			medications: allMedications,
			totalBlobs: blobIds.length,
		} satisfies GetMedicationsResponse);
	} catch (error) {
		console.error("GET /api/medications error:", error);
		return errorResponse(
			error instanceof Error ? error.message : "Internal server error",
			500,
			"INTERNAL_ERROR",
		);
	}
}

// ==========================================
// POST /api/medications
// ==========================================

/**
 * POST /api/medications
 *
 * Add or update medications for a wallet address.
 *
 * Flow:
 * 1. Parse SessionKey from header
 * 2. Parse request body (address + medications)
 * 3. Fetch MedicalPassport from blockchain
 * 4. Construct HealthData object
 * 5. Encrypt with Seal
 * 6. Upload to Walrus
 * 7. Return blob_id (client must update on-chain)
 *
 * Note: This API only encrypts and uploads data.
 * The client must call replace_data_entry on-chain to update the passport.
 *
 * Headers:
 * - X-Session-Key: base64(JSON) with signature and expiresAt
 *
 * Request Body:
 * {
 *   "address": "0x...",
 *   "medications": Medication[]
 * }
 *
 * Response:
 * - 200: { blobId: string, message: string }
 * - 400: Invalid request
 * - 401: Unauthorized
 * - 404: Passport not found
 * - 500: Server error
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
	try {
		// 1. Parse SessionKey from header (validation only, not used for encryption)
		const sessionKeyHeader = request.headers.get("X-Session-Key");
		try {
			parseSessionKeyFromHeader(sessionKeyHeader);
		} catch (error) {
			return errorResponse(
				error instanceof Error ? error.message : "Invalid SessionKey",
				401,
				"INVALID_SESSION_KEY",
			);
		}

		// 2. Parse request body
		const body = (await request.json()) as PostMedicationsRequest;

		if (!body.address) {
			return errorResponse(
				"Missing address in request body",
				400,
				"MISSING_ADDRESS",
			);
		}

		if (!body.medications || !Array.isArray(body.medications)) {
			return errorResponse(
				"Invalid medications array",
				400,
				"INVALID_MEDICATIONS",
			);
		}

		// 3. Fetch MedicalPassport from blockchain
		const suiClient = getSuiClient();
		const passportId = await getPassportIdByAddress(body.address);

		if (!passportId) {
			return errorResponse(
				"MedicalPassport not found for this address",
				404,
				"PASSPORT_NOT_FOUND",
			);
		}

		const passport = await getMedicalPassport(passportId);

		// 4. Construct HealthData object
		const healthData: HealthData = {
			meta: {
				schema_version: "1.0.0",
				updated_at: Date.now(),
				generator: "CurePocket_API_v1",
			},
			profile: {
				birth_date: "1900-01-01",
				nationality: passport.countryCode,
				gender: "other",
				allergies: [],
				blood_type: "Unknown",
			},
			medications: body.medications,
			conditions: [],
			lab_results: [],
			imaging: [],
			allergies: [],
		};

		// 5. Encrypt with Seal
		const sealClient = createSealClient(suiClient);
		const { encryptedObject } = await encryptHealthData({
			healthData,
			sealClient,
			sealId: passport.sealId,
		});

		// 6. Upload to Walrus
		const blobRef = await uploadToWalrus(encryptedObject);

		// 7. Return blob_id
		return NextResponse.json({
			blobId: blobRef.blobId,
			message:
				"Data encrypted and uploaded. Call replace_data_entry on-chain to update passport.",
		} satisfies PostMedicationsResponse);
	} catch (error) {
		console.error("POST /api/medications error:", error);
		return errorResponse(
			error instanceof Error ? error.message : "Internal server error",
			500,
			"INTERNAL_ERROR",
		);
	}
}
