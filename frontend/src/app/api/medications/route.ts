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

import { type ExportedSessionKey, SessionKey } from "@mysten/seal";
import { type NextRequest, NextResponse } from "next/server";
import {
  buildPatientAccessPTB,
  createSealClient,
  decryptHealthData,
  encryptHealthData,
} from "@/lib/seal";
import { getPassportByAddress, getSuiClient } from "@/lib/suiClient";
import { downloadFromWalrusByBlobId, uploadToWalrus } from "@/lib/walrus";
import type { Medication } from "@/types";

// ==========================================
// Type Definitions
// ==========================================

/**
 * Error response format
 */
interface ErrorResponse {
  error: string;
  message?: string;
  code?: string;
}

// ==========================================
// Helper Functions
// ==========================================

/**
 * Parse SessionKey from request header
 *
 * Expected header format:
 * X-Session-Key: {"signature":"base64...", "expiresAt":1234567890}
 *
 * @param request - Next.js request object
 * @returns Parsed SessionKey with Uint8Array signature
 * @throws Error if header missing or invalid
 */
function parseSessionKey(
  request: NextRequest,
  suiClient: ReturnType<typeof getSuiClient>,
): SessionKey {
  const headerValue = request.headers.get("X-Session-Key");

  if (!headerValue) {
    throw new Error("Missing X-Session-Key header");
  }

  try {
    // Allow either raw JSON or base64-encoded JSON
    let jsonString = headerValue;
    try {
      const decoded = Buffer.from(headerValue, "base64").toString("utf8");
      if (decoded.trim().startsWith("{")) {
        jsonString = decoded;
      }
    } catch {
      // not base64, assume raw JSON
    }

    const exported = JSON.parse(jsonString) as ExportedSessionKey;
    return SessionKey.import(exported, suiClient);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to parse SessionKey: ${error.message}`);
    }
    throw new Error("Failed to parse SessionKey");
  }
}

/**
 * Validate SessionKey expiration
 *
 * @param sessionKey - SessionKey to validate
 * @throws Error if expired
 */
function validateSessionKey(sessionKey: SessionKey): void {
  if (sessionKey.isExpired()) {
    throw new Error("SessionKey has expired");
  }
}

/**
 * Create error response
 *
 * @param message - Error message
 * @param status - HTTP status code
 * @param code - Error code
 * @returns NextResponse with error
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
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const suiClient = getSuiClient();
    // 1. Parse and validate SessionKey
    const sessionKey = parseSessionKey(request, suiClient);
    validateSessionKey(sessionKey);

    // 2. Get wallet address from query
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("address");

    if (!walletAddress) {
      return errorResponse("Missing address parameter", 400, "MISSING_ADDRESS");
    }

    // 3. Fetch MedicalPassport
    const passport = await getPassportByAddress(walletAddress);

    if (!passport) {
      return errorResponse(
        `No MedicalPassport found for address ${walletAddress}`,
        404,
        "PASSPORT_NOT_FOUND",
      );
    }

    // 4. Download encrypted data from Walrus
    const encryptedData = await downloadFromWalrusByBlobId(
      passport.walrusBlobId,
    );

    // 5. Build PTB for patient-only access
    const registryId = process.env.NEXT_PUBLIC_PASSPORT_REGISTRY_ID || "";

    const accessPolicyTxBytes = await buildPatientAccessPTB({
      passportObjectId: passport.id,
      registryObjectId: registryId,
      suiClient,
      sealId: passport.sealId,
    });

    // 6. Decrypt with Seal
    const sealClient = createSealClient(suiClient);

    const healthData = await decryptHealthData({
      encryptedData,
      sealClient,
      sessionKey,
      txBytes: accessPolicyTxBytes,
      sealId: passport.sealId,
    });

    // 7. Return medications
    return NextResponse.json({
      medications: healthData.medications,
    });
  } catch (error) {
    console.error("GET /api/medications error:", error);

    if (error instanceof Error) {
      // Handle specific error types
      if (error.message.includes("SessionKey")) {
        return errorResponse(error.message, 401, "INVALID_SESSION_KEY");
      }
      if (error.message.includes("not found")) {
        return errorResponse(error.message, 404, "NOT_FOUND");
      }
      if (error.message.includes("Missing")) {
        return errorResponse(error.message, 400, "BAD_REQUEST");
      }

      return errorResponse(error.message, 500, "INTERNAL_ERROR");
    }

    return errorResponse("Internal server error", 500, "UNKNOWN_ERROR");
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
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const suiClient = getSuiClient();
    // 1. Parse and validate SessionKey
    const sessionKey = parseSessionKey(request, suiClient);
    validateSessionKey(sessionKey);

    // 2. Parse request body
    const body = (await request.json()) as {
      address: string;
      medications: Medication[];
    };

    if (!body.address) {
      return errorResponse(
        "Missing address in request body",
        400,
        "MISSING_ADDRESS",
      );
    }

    if (!Array.isArray(body.medications)) {
      return errorResponse(
        "Invalid medications array",
        400,
        "INVALID_MEDICATIONS",
      );
    }

    // 3. Fetch MedicalPassport
    const passport = await getPassportByAddress(body.address);

    if (!passport) {
      return errorResponse(
        `No MedicalPassport found for address ${body.address}`,
        404,
        "PASSPORT_NOT_FOUND",
      );
    }

    // 4. Download and decrypt existing HealthData
    const encryptedData = await downloadFromWalrusByBlobId(
      passport.walrusBlobId,
    );

    const registryId = process.env.NEXT_PUBLIC_PASSPORT_REGISTRY_ID || "";

    const accessPolicyTxBytes = await buildPatientAccessPTB({
      passportObjectId: passport.id,
      registryObjectId: registryId,
      suiClient,
      sealId: passport.sealId,
    });

    const sealClient = createSealClient(suiClient);

    const healthData = await decryptHealthData({
      encryptedData,
      sealClient,
      sessionKey,
      txBytes: accessPolicyTxBytes,
      sealId: passport.sealId,
    });

    // 5. Update medications
    healthData.medications = body.medications;

    // Update metadata
    healthData.meta = {
      schema_version: "1.0.0",
      updated_at: Date.now(),
      generator: "CurePocket_Web_v1",
    };

    // 6. Encrypt updated HealthData
    const { encryptedObject: encryptedPayload } = await encryptHealthData({
      healthData,
      sealClient,
      sealId: passport.sealId,
      threshold: 2,
    });

    // 7. Upload to Walrus
    const blobReference = await uploadToWalrus(encryptedPayload);

    // 8. Return new blob reference
    // Note: Client must call update_walrus_blob_id on-chain
    return NextResponse.json({
      blobId: blobReference.blobId,
      message:
        "Data uploaded successfully. Call update_walrus_blob_id on-chain to update passport.",
    });
  } catch (error) {
    console.error("POST /api/medications error:", error);

    if (error instanceof Error) {
      if (error.message.includes("SessionKey")) {
        return errorResponse(error.message, 401, "INVALID_SESSION_KEY");
      }
      if (error.message.includes("not found")) {
        return errorResponse(error.message, 404, "NOT_FOUND");
      }
      if (
        error.message.includes("Missing") ||
        error.message.includes("Invalid")
      ) {
        return errorResponse(error.message, 400, "BAD_REQUEST");
      }

      return errorResponse(error.message, 500, "INTERNAL_ERROR");
    }

    return errorResponse("Internal server error", 500, "UNKNOWN_ERROR");
  }
}
