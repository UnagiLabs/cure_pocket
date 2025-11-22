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
 * READ:  wallet → passport → walrus → decrypt → medications[]
 * WRITE: medications[] → encrypt → walrus → update passport
 */

import { type NextRequest, NextResponse } from "next/server";

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
 * 4. Download encrypted data from Walrus
 * 5. Build PTB for access control
 * 6. Decrypt data with Seal
 * 7. Return medications array
 *
 * Headers:
 * - X-Session-Key: {"signature":"base64...", "expiresAt":1234567890}
 *
 * Query Parameters:
 * - address: Wallet address (required)
 *
 * Response:
 * - 200: { medications: Medication[] }
 * - 400: Invalid request
 * - 401: Unauthorized (SessionKey invalid/expired)
 * - 404: Passport not found
 * - 500: Server error
 */
export async function GET(_request: NextRequest): Promise<NextResponse> {
	// TODO: Dynamic Fields対応
	// 新しいモデルでは、get_data_entry("medications")でblob_idsを取得してから
	// 各blob_idをWalrusからダウンロードする必要がある
	// 現在のAPIは旧モデル(単一walrus_blob_id)に依存しているため、
	// 完全な書き直しが必要です
	return errorResponse(
		"This API is not yet compatible with Dynamic Fields model. Please use frontend hooks instead.",
		501,
		"NOT_IMPLEMENTED",
	);
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
 * 2. Get wallet address and medications from body
 * 3. Fetch existing MedicalPassport
 * 4. Download and decrypt existing HealthData
 * 5. Update medications array
 * 6. Encrypt updated HealthData
 * 7. Upload to Walrus
 * 8. Return new blob reference
 *
 * Note: The client must call update_walrus_blob_id on-chain
 * to update the passport with the new blob ID.
 *
 * Headers:
 * - X-Session-Key: {"signature":"base64...", "expiresAt":1234567890}
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
export async function POST(_request: NextRequest): Promise<NextResponse> {
	// TODO: Dynamic Fields対応
	// 新しいモデルでは、get_data_entry("medications")でblob_idsを取得してから
	// 各blob_idをWalrusからダウンロードする必要がある
	// 現在のAPIは旧モデル(単一walrus_blob_id)に依存しているため、
	// 完全な書き直しが必要です
	return errorResponse(
		"This API is not yet compatible with Dynamic Fields model. Please use frontend hooks instead.",
		501,
		"NOT_IMPLEMENTED",
	);
}
