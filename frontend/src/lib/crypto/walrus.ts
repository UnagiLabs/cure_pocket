/**
 * Walrus Blob ストレージ統合モジュール
 *
 * このモジュールは、Walrus 分散型 Blob ストレージを使用して
 * 暗号化された医療データを保存・取得するためのユーティリティを提供します。
 *
 * Walrus アーキテクチャ:
 * - イレイジャーコーディングによる分散ストレージ
 * - オンチェーン参照付きコンテンツアドレス指定 Blob
 * - アップロード用 SDK writeBlobFlow（生の Uint8Array サポート）
 * - ダウンロード用 SDK readBlob（HTTP API フォールバック付き）
 *
 * API 選択の要点:
 * - writeBlobFlow: 生の Uint8Array 用（Seal 暗号化データ）- writeFilesFlow ではない
 * - readBlob: 生の Blob ダウンロード用 - getFiles ではない
 */

import { getFullnodeUrl } from "@mysten/sui/client";
import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import type { Transaction } from "@mysten/sui/transactions";
import { type WalrusClient, walrus } from "@mysten/walrus";
import type { WalrusBlobReference } from "@/types/healthData";

// ==========================================
// 環境設定
// ==========================================

/**
 * Sui ネットワーク設定
 */
const SUI_NETWORK = (process.env.NEXT_PUBLIC_SUI_NETWORK || "testnet") as
	| "mainnet"
	| "testnet";

/**
 * 最大 Blob サイズ（デフォルト 1MB）
 */
const MAX_BLOB_SIZE = 1 * 1024 * 1024;

/**
 * デフォルトのストレージエポック数（testnet では 1 エポック ≈ 1 日）
 * testnet にはエポック制限があり、SDK の例では epochs: 3 を使用
 * 本番環境では環境変数で設定可能
 */
const DEFAULT_EPOCHS = Number(process.env.NEXT_PUBLIC_WALRUS_EPOCHS) || 5;

/**
 * アップロードリレー設定（必須）
 * リレー未設定での直アクセスはサポートしない
 */
const resolvedUploadRelay =
	process.env.NEXT_PUBLIC_WALRUS_UPLOAD_RELAY ||
	(SUI_NETWORK === "testnet"
		? process.env.NEXT_PUBLIC_WALRUS_UPLOAD_RELAY_TESTNET
		: process.env.NEXT_PUBLIC_WALRUS_UPLOAD_RELAY_MAINNET);

if (!resolvedUploadRelay) {
	throw new Error(
		"[Walrus] Upload relay host is required. Set NEXT_PUBLIC_WALRUS_UPLOAD_RELAY or network-specific relay env.",
	);
}

const UPLOAD_RELAY_HOST: string = resolvedUploadRelay;

// ==========================================
// Walrus クライアントセットアップ
// ==========================================

// walrus メソッドを持つ拡張クライアントの型
interface WalrusExtendedClient extends SuiJsonRpcClient {
	walrus: WalrusClient;
}

/**
 * Walrus 対応 Sui クライアントを作成
 * $extend パターンを使用して walrus 機能を追加
 */
function createWalrusClient(): WalrusExtendedClient {
	// walrus オプションを構築
	const walrusOptions: Parameters<typeof walrus>[0] = {
		network: SUI_NETWORK,
	};

	// アップロードリレーは必須
	walrusOptions.uploadRelay = {
		host: UPLOAD_RELAY_HOST,
		sendTip: {
			max: 10_000, // MIST 単位の最大チップ
		},
	};

	// ブラウザ環境用の WASM URL を追加
	if (typeof window !== "undefined") {
		walrusOptions.wasmUrl =
			process.env.NEXT_PUBLIC_WALRUS_WASM_URL ||
			"https://unpkg.com/@mysten/walrus-wasm@latest/web/walrus_wasm_bg.wasm";
	}

	const baseClient = new SuiJsonRpcClient({
		url: getFullnodeUrl(SUI_NETWORK),
		network: SUI_NETWORK,
	});

	// walrus 機能で拡張
	// 型要件を満たすために明示的に name を渡す
	const walrusExtension = walrus({ ...walrusOptions, name: "walrus" as const });
	return baseClient.$extend(walrusExtension) as unknown as WalrusExtendedClient;
}

// シングルトンクライアントインスタンス
let walrusClient: ReturnType<typeof createWalrusClient> | null = null;

/**
 * Walrus クライアントインスタンスを取得または作成
 */
function getWalrusClient() {
	if (!walrusClient) {
		walrusClient = createWalrusClient();
	}
	return walrusClient;
}

// ==========================================
// 型定義
// ==========================================

/**
 * トランザクション実行関数の型
 * dapp-kit の signAndExecuteTransaction と互換性あり
 */
export type TransactionExecutor = (params: {
	transaction: Transaction;
}) => Promise<{ digest: string }>;

/**
 * writeBlobFlow を使用したアップロード操作のオプション
 */
export interface UploadOptions {
	/** トランザクションに署名して実行する関数（dapp-kit から） */
	signAndExecuteTransaction: TransactionExecutor;
	/** Blob の所有者アドレス */
	owner: string;
	/** ストレージエポック数（デフォルト: DEFAULT_EPOCHS） */
	epochs?: number;
	/** 後で削除可能かどうか（医療データではデフォルト: false） */
	deletable?: boolean;
}

/**
 * ダウンロード操作のオプション（署名者は不要）
 */
export interface DownloadOptions {
	/** オプションのタイムアウト（ミリ秒） */
	timeout?: number;
}

// ==========================================
// Walrus コア関数
// ==========================================

/**
 * SDK writeBlobFlow を使用して暗号化データを Walrus にアップロード
 *
 * SDK の writeBlobFlow は生の Uint8Array を直接処理します。
 * これは Seal 暗号化データに適した API です（writeFilesFlow ではない）。
 *
 * アップロードフロー:
 * 1. データサイズを検証
 * 2. 生の Uint8Array で writeBlobFlow を作成
 * 3. Blob をエンコード
 * 4. オンチェーンに登録（トランザクションに署名して実行）
 * 5. リレーにアップロード
 * 6. オンチェーンで認証（トランザクションに署名して実行）
 * 7. Blob 情報を取得して参照を返す
 *
 * @param data - アップロードする暗号化データ（Uint8Array）
 * @param options - signAndExecuteTransaction を含むアップロードオプション
 * @returns Walrus blob 参照
 * @throws アップロード失敗またはデータがサイズ制限を超えた場合はエラー
 */
export async function uploadToWalrus(
	data: Uint8Array,
	options: UploadOptions,
): Promise<WalrusBlobReference> {
	const {
		signAndExecuteTransaction,
		owner,
		epochs = DEFAULT_EPOCHS,
		deletable = false,
	} = options;

	// サイズを検証
	if (data.length > MAX_BLOB_SIZE) {
		throw new Error(
			`Data size ${data.length} bytes exceeds maximum ${MAX_BLOB_SIZE} bytes`,
		);
	}

	try {
		console.log(
			`[Walrus] Uploading ${data.length} bytes via SDK writeBlobFlow for ${epochs} epochs...`,
		);

		const client = getWalrusClient();

		// ステップ 1: 生の Uint8Array でフローを作成（WalrusFile ではない）
		const flow = client.walrus.writeBlobFlow({ blob: data });

		// ステップ 2: Blob をエンコード
		console.log("[Walrus] Encoding blob...");
		await flow.encode();

		// ステップ 3: オンチェーンに登録
		console.log("[Walrus] Registering blob on-chain...");
		const registerTx = flow.register({ epochs, owner, deletable });
		const { digest: registerDigest } = await signAndExecuteTransaction({
			transaction: registerTx,
		});
		console.log(`[Walrus] Register transaction: ${registerDigest}`);

		// ステップ 4: リレーにアップロード
		console.log("[Walrus] Uploading to relay...");
		await flow.upload({ digest: registerDigest });

		// ステップ 5: オンチェーンで認証
		console.log("[Walrus] Certifying blob on-chain...");
		const certifyTx = flow.certify();
		const { digest: certifyDigest } = await signAndExecuteTransaction({
			transaction: certifyTx,
		});
		console.log(`[Walrus] Certify transaction: ${certifyDigest}`);

		// ステップ 6: Blob 情報を取得
		const { blobId } = await flow.getBlob();
		console.log(`[Walrus] Upload complete, blobId: ${blobId}`);

		return {
			blobId,
			uploadedAt: Date.now(),
			size: data.length,
		};
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(`Failed to upload to Walrus: ${error.message}`);
		}
		throw new Error("Failed to upload to Walrus: Unknown error");
	}
}

/**
 * フォールバックダウンロード用 HTTP Aggregator URL
 */
const WALRUS_AGGREGATORS = [
	"https://aggregator.walrus-testnet.walrus.space",
	"https://walrus-testnet-aggregator.mystenlabs.com",
];

/**
 * HTTP API を使用して Walrus から Blob をダウンロード（フォールバック方式）
 *
 * 生の Blob データで動作する信頼性の高い方式です。
 * SDK メソッドが失敗した場合のフォールバックとして使用されます。
 *
 * @param blobId - Walrus blob ID
 * @returns 暗号化データ（Uint8Array）
 * @throws すべてのアグリゲーターが失敗した場合はエラー
 */
async function downloadViaHttpApi(blobId: string): Promise<Uint8Array> {
	for (const aggregator of WALRUS_AGGREGATORS) {
		const url = `${aggregator}/v1/${blobId}`;
		try {
			const response = await fetch(url);
			if (response.ok) {
				const arrayBuffer = await response.arrayBuffer();
				console.log(
					`[Walrus] HTTP API download success from ${aggregator}, size: ${arrayBuffer.byteLength}`,
				);
				return new Uint8Array(arrayBuffer);
			}
			console.log(
				`[Walrus] HTTP API ${aggregator} returned ${response.status}`,
			);
		} catch (error) {
			console.log(`[Walrus] HTTP API ${aggregator} failed:`, error);
		}
	}
	throw new Error(`Blob not found via HTTP API: ${blobId}`);
}

/**
 * SDK readBlob を使用して blob ID から Walrus の Blob をダウンロード
 *
 * ダウンロードフロー（フォールバック付き）:
 * 1. SDK readBlob を試行（生の Blob アクセス - writeBlobFlow アップロードと対応）
 * 2. readBlob が失敗した場合、HTTP API にフォールバック
 *
 * 注: writeBlobFlow は生の Blob を保存するため、readBlob を使用（getFiles ではない）
 *
 * @param blobId - Walrus blob ID（コンテンツアドレス指定）
 * @param _options - オプションのダウンロードオプション
 * @returns 暗号化データ（Uint8Array）
 * @throws ダウンロード失敗または Blob が見つからない場合はエラー
 */
export async function downloadFromWalrusByBlobId(
	blobId: string,
	_options?: DownloadOptions,
): Promise<Uint8Array> {
	const client = getWalrusClient();

	// 戦略 1: SDK readBlob（writeBlobFlow アップロードと対応）
	try {
		console.log("[Walrus] Downloading via SDK readBlob...");
		const data = await client.walrus.readBlob({ blobId });
		if (data && data.length > 0) {
			console.log(`[Walrus] SDK readBlob success, size: ${data.length}`);
			return data;
		}
	} catch (error) {
		console.log("[Walrus] SDK readBlob failed:", error);
	}

	// 戦略 2: HTTP API フォールバック
	try {
		console.log("[Walrus] Trying HTTP API fallback...");
		const data = await downloadViaHttpApi(blobId);
		return data;
	} catch (error) {
		console.log("[Walrus] HTTP API fallback failed:", error);
	}

	throw new Error(`Blob not found: ${blobId}. All download strategies failed.`);
}

/**
 * Sui オブジェクト ID から Walrus の Blob をダウンロード
 *
 * 注: SDK はダウンロードに blobId を必要とします。この関数は最初に
 * Sui オブジェクトから blobId を取得し、その後ダウンロードします。
 *
 * @param objectId - Sui blob オブジェクト ID
 * @returns 暗号化データ（Uint8Array）
 * @throws ダウンロード失敗または Blob が見つからない場合はエラー
 */
export async function downloadFromWalrusByObjectId(
	objectId: string,
): Promise<Uint8Array> {
	try {
		const client = getWalrusClient();

		// blobId を抽出するために Blob オブジェクトを取得
		const blobObject = await client.getObject({
			id: objectId,
			options: { showContent: true },
		});

		if (!blobObject.data?.content) {
			throw new Error(`Blob object not found: ${objectId}`);
		}

		// オブジェクトコンテンツから blobId を抽出
		const content = blobObject.data.content;
		if (content.dataType !== "moveObject") {
			throw new Error(`Invalid blob object type: ${objectId}`);
		}

		const fields = content.fields as Record<string, unknown>;
		const blobId = fields.blob_id as string;

		if (!blobId) {
			throw new Error(`No blobId found in object: ${objectId}`);
		}

		// blobId を使用してダウンロード
		return downloadFromWalrusByBlobId(blobId);
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(`Failed to download from Walrus: ${error.message}`);
		}
		throw new Error("Failed to download from Walrus: Unknown error");
	}
}

/**
 * Walrus に Blob が存在するか確認
 *
 * @param blobId - 確認する Walrus blob ID
 * @returns Blob が存在する場合は true、そうでなければ false
 */
export async function blobExists(blobId: string): Promise<boolean> {
	try {
		const client = getWalrusClient();
		// readBlob を使用して存在確認（writeBlobFlow アップロードパターンと対応）
		const data = await client.walrus.readBlob({ blobId });
		return data && data.length > 0;
	} catch {
		return false;
	}
}

/**
 * Walrus から Blob を削除（削除可能な場合）
 *
 * 注: deletable=true で作成された Blob のみ削除可能です。
 * 医療データは通常、削除不可にすべきです。
 *
 * @param blobId - 削除する Walrus blob ID
 * @param signAndExecuteTransaction - トランザクション実行関数
 * @returns 削除された場合は true、そうでなければ false
 */
export async function deleteBlob(
	blobId: string,
	_signAndExecuteTransaction?: TransactionExecutor,
): Promise<boolean> {
	console.warn(
		`Walrus blob deletion attempted: ${blobId}. Medical data should typically be non-deletable.`,
	);

	// TODO: SDK が対応したら削除を実装
	// 現時点では警告をログ出力して false を返す
	return false;
}

/**
 * コンテンツをダウンロードせずに Blob メタデータを取得
 *
 * 注: 正確なサイズを取得するためにコンテンツ全体をダウンロードします。
 * 大きな Blob の場合は、より軽量なチェックの使用を検討してください。
 *
 * @param blobId - Walrus blob ID
 * @returns Blob メタデータ
 * @throws Blob が見つからない場合はエラー
 */
export async function getBlobMetadata(blobId: string): Promise<{
	size: number;
	contentType: string;
	certified: boolean;
}> {
	try {
		const client = getWalrusClient();
		// writeBlobFlow アップロードパターンに合わせて readBlob を使用
		const data = await client.walrus.readBlob({ blobId });

		if (!data || data.length === 0) {
			throw new Error(`Blob not found: ${blobId}`);
		}

		return {
			size: data.length,
			contentType: "application/octet-stream",
			certified: true,
		};
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(`Failed to get blob metadata: ${error.message}`);
		}
		throw new Error("Failed to get blob metadata: Unknown error");
	}
}

/**
 * Blob のストレージコストを見積もり
 *
 * コストは以下に依存:
 * - Blob サイズ（ストレージ要件を決定）
 * - エポック数（ストレージ期間）
 * - 現在の WAL/SUI 価格
 *
 * @param sizeBytes - Blob のサイズ（バイト）
 * @param epochs - ストレージエポック数
 * @returns 推定コスト（MIST 単位、1 SUI = 1,000,000,000 MIST）
 */
export function estimateStorageCost(
	sizeBytes: number,
	epochs: number = DEFAULT_EPOCHS,
): number {
	// 概算: KB あたり エポックあたり 約 0.001 WAL
	// これは概算であり、実際のコストはネットワーク状況に依存
	const sizeKB = Math.ceil(sizeBytes / 1024);
	return sizeKB * epochs * 1_000_000; // MIST 単位のコスト（概算）
}

/**
 * Walrus クライアントをリセット
 *
 * エポック変更時に RetryableWalrusClientError が発生した場合に便利です。
 */
export function resetWalrusClient(): void {
	const client = getWalrusClient();
	client.walrus.reset();
}
