/**
 * Seal暗号化サービス統合
 *
 * このモジュールは、Mysten LabsのSealアイデンティティベース暗号化サービスを使用して
 * 医療データを暗号化・復号化するためのユーティリティを提供します。
 *
 * Sealアーキテクチャ:
 * - しきい値暗号化を使用したアイデンティティベース暗号化（IBE）
 * - Moveスマートコントラクトポリシーによるアクセス制御
 * - 時間制限付きアクセスのためのウォレット署名付きSessionKey
 * - ポリシー検証のためのProgrammable Transaction Blocks（PTB）
 *
 * 公式ドキュメント: https://seal-docs.wal.app/
 */

import { fromHex } from "@mysten/bcs";
import { EncryptedObject, SealClient, SessionKey } from "@mysten/seal";
import type { SuiClient } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import type { HealthData } from "@/types/healthData";

// ==========================================
// 環境設定
// ==========================================

/**
 * 環境変数から取得するSeal KeyServer ObjectIds
 * カンマ区切りのキーサーバーオブジェクトIDのリスト
 */
export const SEAL_KEY_SERVERS =
	process.env.NEXT_PUBLIC_SEAL_KEY_SERVERS?.split(",")
		.map((id) => id.trim())
		.filter(Boolean) || [];

/**
 * キーサーバーの数に基づいて適切なしきい値を計算
 * - 1サーバー: threshold = 1（単一障害点だが機能する）
 * - 2サーバー以上: threshold = 2（冗長性とセキュリティのため推奨）
 *
 * @param keyServerCount - 設定されたキーサーバーの数
 * @returns 適切なしきい値（1または2）
 *
 * @example
 * ```typescript
 * calculateThreshold(1) // 1を返す
 * calculateThreshold(2) // 2を返す
 * calculateThreshold(5) // 2を返す
 * ```
 */
export function calculateThreshold(keyServerCount: number): number {
	return Math.min(2, Math.max(1, keyServerCount));
}

/**
 * SessionKeyのTTL（分単位、デフォルト: 10分）
 */
const DEFAULT_SESSION_TTL_MIN = 10;

/**
 * アクセス制御ポリシー用のパッケージID
 */
const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID || "";
const CLOCK_OBJECT_ID = "0x6";

/**
 * キーサーバー検索用のSuiネットワーク
 */
export const SUI_NETWORK = (process.env.NEXT_PUBLIC_SUI_NETWORK || "testnet") as
	| "mainnet"
	| "testnet"
	| "devnet"
	| "localnet";

/**
 * オンチェーンメタデータに対してキーサーバーURLを検証
 * 本番環境ではエンドポイントのなりすましを防ぐために有効化
 */
const VERIFY_KEY_SERVERS =
	(process.env.NEXT_PUBLIC_SEAL_VERIFY_KEY_SERVERS || "").toLowerCase() ===
	"true";

// ==========================================
// コアSeal関数
// ==========================================

/**
 * デフォルトのTestnetキーサーバー（Studio Miraiオープンテストネット）
 * 環境変数が設定されていない場合のフォールバックとして使用
 */
const TESTNET_DEFAULT_KEY_SERVERS = [
	"0x164ac3d2b3b8694b8181c13f671950004765c23f270321a45fdd04d40cccf0f2",
];

/**
 * ネットワーク用の許可リストキーサーバーを取得
 *
 * @param network - Suiネットワーク（testnet、mainnet、devnet）
 * @returns キーサーバーオブジェクトIDの配列
 */
export function resolveKeyServers(
	network: "mainnet" | "testnet" | "devnet" | "localnet",
): string[] {
	if (SEAL_KEY_SERVERS.length > 0) {
		return SEAL_KEY_SERVERS;
	}

	// Testnetフォールバック: デフォルトのキーサーバーを使用
	if (network === "testnet") {
		console.warn(
			"[resolveKeyServers] NEXT_PUBLIC_SEAL_KEY_SERVERS not set, using default testnet key servers",
		);
		return TESTNET_DEFAULT_KEY_SERVERS;
	}

	// @mysten/seal v0.9.xではSDKヘルパーが利用できないため、環境設定が必要
	throw new Error(
		`No Seal key servers configured for ${network}. Set NEXT_PUBLIC_SEAL_KEY_SERVERS.`,
	);
}

/**
 * Sealクライアントを作成して初期化
 *
 * @param suiClient - Suiブロックチェーンクライアント
 * @returns 初期化されたSealClientインスタンス
 * @throws KeyServer設定が無効な場合にエラーをスロー
 */
// SealClientをキャッシュして再作成を回避（キー取得/認証プロンプトを削減）
let cachedSealClient: { key: string; client: SealClient } | null = null;

export function createSealClient(suiClient: SuiClient): SealClient {
	// キーサーバーオブジェクトIDを取得
	const serverObjectIds = resolveKeyServers(SUI_NETWORK);

	if (serverObjectIds.length === 0) {
		throw new Error(
			"No Seal key servers configured. Set NEXT_PUBLIC_SEAL_KEY_SERVERS or use allowlisted servers.",
		);
	}

	const serverKey = `${SUI_NETWORK}:${VERIFY_KEY_SERVERS}:${serverObjectIds.join(
		",",
	)}`;

	if (cachedSealClient && cachedSealClient.key === serverKey) {
		return cachedSealClient.client;
	}

	// 等しい重みでサーバー設定を作成
	const serverConfigs = serverObjectIds.map((objectId) => ({
		objectId,
		weight: 1,
	}));

	// SealClientを初期化
	const client = new SealClient({
		suiClient,
		serverConfigs,
		verifyKeyServers: VERIFY_KEY_SERVERS,
	});

	cachedSealClient = { key: serverKey, client };
	return client;
}

/**
 * 時間制限付き復号アクセス用のSessionKeyを作成
 *
 * SessionKeyフロー（公式API）:
 * 1. SessionKey.create()でSessionKeyを作成
 * 2. getPersonalMessage()でパーソナルメッセージを取得
 * 3. ユーザーがウォレットでメッセージに署名
 * 4. setPersonalMessageSignature()で署名を設定
 *
 * @param options - SessionKey作成オプション
 * @returns 初期化されたSessionKey（まだ署名されていない）
 */
export async function createSessionKey(options: {
	address: string;
	suiClient: SuiClient;
	ttlMin?: number;
}): Promise<SessionKey> {
	const { address, suiClient, ttlMin = DEFAULT_SESSION_TTL_MIN } = options;

	// SessionKeyを作成
	const sessionKey = await SessionKey.create({
		address,
		packageId: PACKAGE_ID,
		ttlMin,
		suiClient,
	});

	return sessionKey;
}

/**
 * Sealのしきい値IBEを使用して医療データを暗号化
 *
 * 公式APIフロー:
 * 1. threshold、packageId、id、dataを指定してclient.encrypt()を呼び出し
 * 2. { encryptedObject, key }を返す
 * 3. encryptedObjectはWalrusに保存される
 * 4. keyはバックアップ/復旧に使用可能
 *
 * @param params - 暗号化パラメータ
 * @returns 暗号化されたデータと対称鍵
 */
export async function encryptHealthData<T = HealthData>(params: {
	healthData: T;
	sealClient: SealClient;
	sealId: string; // 16進数文字列（パッケージプレフィックスなし）
	threshold?: number;
}): Promise<{ encryptedObject: Uint8Array; backupKey: Uint8Array }> {
	const { healthData, sealClient, sealId, threshold } = params;

	// 無効な暗号化オブジェクトの作成を防ぐため、暗号化前にキーサーバーを検証
	const serverObjectIds = resolveKeyServers(SUI_NETWORK);
	if (serverObjectIds.length === 0) {
		throw new Error(
			"[encryptHealthData] Cannot encrypt: No key servers configured. " +
				"Ensure NEXT_PUBLIC_SEAL_KEY_SERVERS is set.",
		);
	}

	// しきい値が提供されていない場合、キーサーバー数に基づいて計算
	const effectiveThreshold =
		threshold ?? calculateThreshold(serverObjectIds.length);

	console.log("[encryptHealthData] Using key servers:", serverObjectIds);
	console.log("[encryptHealthData] Using threshold:", effectiveThreshold);
	console.log("[encryptHealthData] sealId:", sealId);

	// JSONにシリアライズ
	const json = JSON.stringify(healthData);
	const data = new TextEncoder().encode(json);

	// Sealで暗号化
	// sealId（16進数文字列）をそのまま渡す
	// Seal SDKは内部でfromHex()を使用してバイナリに変換する
	const { encryptedObject, key: backupKey } = await sealClient.encrypt({
		threshold: effectiveThreshold,
		packageId: PACKAGE_ID,
		id: sealId,
		data,
	});

	return { encryptedObject, backupKey };
}

/**
 * SessionKeyとPTBを使用して医療データを復号
 *
 * 公式APIフロー:
 * 1. seal_approve*関数呼び出しでPTBを作成
 * 2. onlyTransactionKind: trueでPTBをビルド
 * 3. client.decrypt({ data, sessionKey, txBytes })を呼び出し
 * 4. 復号されたUint8Arrayを返す
 *
 * @param params - 復号パラメータ
 * @returns 復号されたHealthData
 * @throws アクセスが拒否された場合、または復号に失敗した場合にエラーをスロー
 */
export async function decryptHealthData(params: {
	encryptedData: Uint8Array;
	sealClient: SealClient;
	sessionKey: SessionKey;
	txBytes: Uint8Array;
	sealId?: string;
}): Promise<HealthData> {
	const { encryptedData, sealClient, sessionKey, txBytes, sealId } = params;

	console.log("[decryptHealthData] Starting decryption...");
	console.log(
		`[decryptHealthData] sealId: ${sealId ? `${sealId.substring(0, 20)}...` : "not provided"}`,
	);
	console.log(
		`[decryptHealthData] encryptedData length: ${encryptedData.length}`,
	);

	// 復号前に暗号化オブジェクトのメタデータを検証
	// これにより、ユーザーフレンドリーなエラーメッセージで破損データを早期に検出
	try {
		const parsed = EncryptedObject.parse(encryptedData);
		console.log(`[decryptHealthData] parsed.id: ${parsed.id}`);
		console.log(`[decryptHealthData] parsed.threshold: ${parsed.threshold}`);
		console.log(`[decryptHealthData] parsed.services:`, parsed.services);

		// 破損した暗号化メタデータをチェック（threshold=0または空のservices）
		// これは、誤設定されたSEALキーサーバーでデータが暗号化された場合に発生
		if (
			parsed.threshold === 0 ||
			!parsed.services ||
			parsed.services.length === 0
		) {
			console.error(
				"[decryptHealthData] Corrupted encryption metadata detected:",
				{
					threshold: parsed.threshold,
					servicesCount: parsed.services?.length ?? 0,
				},
			);
			throw new Error(
				"DATA_CORRUPTED: This data was encrypted with invalid settings and cannot be decrypted. Please re-register your information.",
			);
		}

		// オプション: seal_idが提供されている場合、一致を確認
		if (sealId) {
			const normalize = (value: string): string => {
				if (!value) return "";
				let normalized = value.startsWith("0x") ? value.slice(2) : value;
				normalized = normalized.toLowerCase();
				return normalized;
			};

			const normalizedParsedId = normalize(parsed.id);
			const normalizedSealId = normalize(sealId);
			console.log(
				`[decryptHealthData] normalized parsed.id: ${normalizedParsedId.substring(0, 20)}...`,
			);
			console.log(
				`[decryptHealthData] normalized sealId: ${normalizedSealId.substring(0, 20)}...`,
			);

			if (normalizedParsedId !== normalizedSealId) {
				// 形式の違いにより不一致が発生する可能性があるため、警告のみで復号は継続
				console.warn(
					`[decryptHealthData] seal_id形式不一致（復号は継続）: parsed=${normalizedParsedId.substring(0, 20)}, expected=${normalizedSealId.substring(0, 20)}`,
				);
			}
			console.log("[decryptHealthData] seal_id match verified");
		}
	} catch (parseError) {
		// DATA_CORRUPTEDエラーは上流での適切な処理のため、そのまま再スロー
		if (
			parseError instanceof Error &&
			parseError.message.startsWith("DATA_CORRUPTED:")
		) {
			throw parseError;
		}
		console.error(
			"[decryptHealthData] EncryptedObject.parse or validation failed:",
			parseError,
		);
		throw parseError;
	}

	// Sealで復号
	try {
		console.log("[decryptHealthData] Calling sealClient.decrypt...");
		console.log(
			"[decryptHealthData] sessionKey expired:",
			sessionKey.isExpired(),
		);
		console.log("[decryptHealthData] txBytes length:", txBytes.length);

		const decryptedBytes = await sealClient.decrypt({
			data: encryptedData,
			sessionKey,
			txBytes,
		});
		console.log(
			`[decryptHealthData] Decrypted ${decryptedBytes.length} bytes successfully`,
		);

		// JSONをパース
		const json = new TextDecoder().decode(decryptedBytes);
		const healthData = JSON.parse(json) as HealthData;
		console.log("[decryptHealthData] Successfully parsed health data");

		return healthData;
	} catch (decryptError) {
		console.error("[decryptHealthData] decrypt failed:", decryptError);
		console.error("[decryptHealthData] error type:", typeof decryptError);
		console.error(
			"[decryptHealthData] error constructor:",
			(decryptError as Error)?.constructor?.name,
		);
		// エラーがundefinedの場合、説明的なメッセージでラップ
		if (decryptError === undefined) {
			throw new Error(
				"Seal SDK decrypt() rejected with undefined. Check network tab for key server response.",
			);
		}
		throw decryptError;
	}
}

/**
 * 同意ベースアクセス用のSealAuthPayloadバイトを構築
 *
 * レイアウト（BCS）:
 *  - vector<u8> secret
 *  - address target_passport_id
 *  - vector<u8> requested_scope (UTF-8)
 */
export function buildSealAuthPayloadBytes(params: {
	secret: string;
	passportId: string;
	dataType: string;
}): Uint8Array {
	const secretBytes = new TextEncoder().encode(params.secret);
	const scopeBytes = new TextEncoder().encode(params.dataType);
	const passportBytes = fromHex(normalizeSuiAddress(params.passportId));

	const encodeVecU8 = (bytes: Uint8Array): Uint8Array => {
		const len = bytes.length;
		const uleb = encodeUleb128(len);
		return concatBytes(uleb, bytes);
	};

	return concatBytes(
		encodeVecU8(secretBytes),
		passportBytes,
		encodeVecU8(scopeBytes),
	);
}

/**
 * 同意ベースアクセス用のPTBを構築（seal_approve_consent）
 *
 * @param params - PTBパラメータ
 * @returns Seal検証用のトランザクションバイト
 */
export async function buildConsentAccessPTB(params: {
	passportObjectId: string; // MedicalPassport object ID
	consentTokenObjectId: string;
	dataType: string; // Data type being accessed (e.g., "medications")
	sealId: string; // Seal ID (hex string) for encryption identity
	payload: Uint8Array; // BCS-encoded SealAuthPayload
	suiClient: SuiClient;
}): Promise<Uint8Array> {
	const {
		passportObjectId,
		consentTokenObjectId,
		dataType,
		sealId,
		suiClient,
		payload,
	} = params;

	if (!PACKAGE_ID) {
		throw new Error("NEXT_PUBLIC_PACKAGE_ID not configured");
	}

	const tx = new Transaction();

	// seal_approve_consent(id, auth_payload, consent_token, passport, data_type, clock)を呼び出し
	tx.moveCall({
		target: `${PACKAGE_ID}::accessor::seal_approve_consent`,
		arguments: [
			tx.pure.vector("u8", Array.from(fromHex(sealId))), // id (Seal ID)
			tx.pure.vector("u8", Array.from(payload)), // auth_payload (SealAuthPayload)
			tx.object(consentTokenObjectId), // ConsentToken
			tx.object(passportObjectId), // MedicalPassport
			tx.pure.string(dataType), // data_type
			tx.object(CLOCK_OBJECT_ID), // Clock
		],
	});

	// onlyTransactionKind: trueでトランザクションバイトをビルド
	const txBytes = await tx.build({
		client: suiClient,
		onlyTransactionKind: true,
	});

	return txBytes;
}

/**
 * 患者専用アクセス用のPTBを構築（seal_approve_patient_only）
 *
 * 公式API要件:
 * - seal_approve*関数呼び出しでPTBを構築
 * - onlyTransactionKind: trueを使用
 * - PTBはdry_run_transaction_block経由でキーサーバーによって評価される
 *
 * @param params - PTBパラメータ
 * @returns Seal検証用のトランザクションバイト
 */
export async function buildPatientAccessPTB(params: {
	passportObjectId: string;
	registryObjectId: string;
	suiClient: SuiClient;
	sealId: string;
	dataType: string;
}): Promise<Uint8Array> {
	const { passportObjectId, registryObjectId, suiClient, sealId, dataType } =
		params;

	const tx = new Transaction();

	// seal_approve_patient_only(id, passport, registry, data_type)を呼び出し
	// 最初の引数はバイナリバイトとしてのアイデンティティ（seal_id）
	// sealIdは16進数文字列で、fromHex()を使用してバイナリにデコードされる
	// これは、Seal SDKが暗号化中にidを内部的に処理する方法と一致
	tx.moveCall({
		target: `${PACKAGE_ID}::accessor::seal_approve_patient_only`,
		arguments: [
			tx.pure.vector("u8", Array.from(fromHex(sealId))), // 16進数デコードされたバイナリ
			tx.object(passportObjectId),
			tx.object(registryObjectId),
			tx.pure.string(dataType), // スコープベースアクセス用のデータ型
		],
	});

	// onlyTransactionKind: trueでトランザクションバイトをビルド
	const txBytes = await tx.build({
		client: suiClient,
		onlyTransactionKind: true,
	});

	return txBytes;
}

/**
 * ヘルパー: ウォレットでSessionKeyに署名
 *
 * これはフロントエンドで実行すべきクライアント側の操作です。
 * 使用例:
 *
 * const sessionKey = await createSessionKey({ address, suiClient });
 * const message = sessionKey.getPersonalMessage();
 * const { signature } = await wallet.signPersonalMessage(message);
 * sessionKey.setPersonalMessageSignature(signature);
 *
 * @param sessionKey - SessionKeyインスタンス
 * @param signPersonalMessage - ウォレットのsignPersonalMessage関数
 */
export async function signSessionKey(
	sessionKey: SessionKey,
	signPersonalMessage: (message: Uint8Array) => Promise<{ signature: string }>,
): Promise<void> {
	const message = sessionKey.getPersonalMessage();
	const { signature } = await signPersonalMessage(message);
	await sessionKey.setPersonalMessageSignature(signature);
}

// ==========================================
// 内部ヘルパー
// ==========================================

function encodeUleb128(value: number): Uint8Array {
	const bytes: number[] = [];
	let val = value >>> 0;
	do {
		let byte = val & 0x7f;
		val >>>= 7;
		if (val !== 0) {
			byte |= 0x80;
		}
		bytes.push(byte);
	} while (val !== 0);
	return new Uint8Array(bytes);
}

function concatBytes(...arrays: Uint8Array[]): Uint8Array {
	const total = arrays.reduce((sum, arr) => sum + arr.length, 0);
	const result = new Uint8Array(total);
	let offset = 0;
	for (const arr of arrays) {
		result.set(arr, offset);
		offset += arr.length;
	}
	return result;
}
