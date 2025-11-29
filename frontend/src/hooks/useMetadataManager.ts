/**
 * useMetadataManager Hook (v3.0.0)
 *
 * 汎用的なメタデータ管理フック
 *
 * ## 機能
 * - メタデータBlobの読み込み・保存
 * - データBlobの暗号化・復号化
 * - パーティション管理（entry追加・更新・削除）
 *
 * ## アーキテクチャ
 * - SBT DataEntry → メタデータBlob → データBlob[] の2層構造
 * - 同じデータ種のメタデータとデータBlobは全て同一seal_idで暗号化
 */
"use client";

import {
	useCurrentAccount,
	useSignAndExecuteTransaction,
	useSuiClient,
} from "@mysten/dapp-kit";
import { useCallback, useMemo } from "react";
import { usePassport } from "@/hooks/usePassport";
import { useSessionKeyManager } from "@/hooks/useSessionKeyManager";
import { useUpdatePassportData } from "@/hooks/useUpdatePassportData";
import {
	buildPatientAccessPTB,
	calculateThreshold,
	createSealClient,
	decryptHealthData,
	encryptHealthData,
	SEAL_KEY_SERVERS,
} from "@/lib/seal";
import { generateSealId } from "@/lib/sealIdGenerator";
import { getDataEntry, PASSPORT_REGISTRY_ID } from "@/lib/suiClient";
import { downloadFromWalrusByBlobId, uploadToWalrus } from "@/lib/walrus";
import type { DataType } from "@/types/healthData";
import {
	type BaseMetadata,
	type BaseMetadataEntry,
	createEmptyMetadata,
} from "@/types/metadata";

// ==========================================
// 型定義
// ==========================================

/**
 * メタデータマネージャのオプション
 */
export interface UseMetadataManagerOptions {
	/** データ種別 */
	dataType: DataType;
}

/**
 * メタデータマネージャの返り値
 */
export interface MetadataManager<TEntry extends BaseMetadataEntry> {
	/** メタデータの読み込み（復号化含む） */
	loadMetadata: () => Promise<BaseMetadata<TEntry> | null>;

	/** メタデータの保存（暗号化・アップロード・SBT更新含む） */
	saveMetadata: (metadata: BaseMetadata<TEntry>) => Promise<void>;

	/** 特定entryのデータBlob復号化 */
	loadDataBlob: <TData>(entry: TEntry) => Promise<TData>;

	/** データBlobの暗号化・アップロード（blobId返却） */
	uploadDataBlob: <TData>(data: TData) => Promise<string>;

	/** entryの追加/更新（パーティションキーベース） */
	upsertEntry: (
		metadata: BaseMetadata<TEntry>,
		newEntry: TEntry,
		partitionKey: keyof TEntry | null,
	) => BaseMetadata<TEntry>;

	/** entryの削除 */
	removeEntry: (
		metadata: BaseMetadata<TEntry>,
		partitionKeyValue: string,
		partitionKey: keyof TEntry | null,
	) => BaseMetadata<TEntry>;

	/** 新規メタデータかどうかを確認 */
	isNewEntry: () => Promise<boolean>;

	/** seal_idを取得 */
	getSealId: () => Promise<string>;
}

/**
 * 汎用メタデータ管理フック
 *
 * @param options - メタデータマネージャのオプション
 * @returns メタデータマネージャ
 */
export function useMetadataManager<TEntry extends BaseMetadataEntry>(
	options: UseMetadataManagerOptions,
): MetadataManager<TEntry> {
	const { dataType } = options;

	const suiClient = useSuiClient();
	const currentAccount = useCurrentAccount();
	const { mutateAsync: signAndExecuteTransaction } =
		useSignAndExecuteTransaction();
	const { passport } = usePassport();
	const { sessionKey } = useSessionKeyManager();
	const { updatePassportData } = useUpdatePassportData();

	/**
	 * seal_idを取得
	 */
	const getSealId = useCallback(async (): Promise<string> => {
		if (!currentAccount?.address) {
			throw new Error("Wallet not connected");
		}
		return generateSealId(currentAccount.address, dataType);
	}, [currentAccount, dataType]);

	/**
	 * 新規エントリかどうかを確認
	 */
	const isNewEntry = useCallback(async (): Promise<boolean> => {
		if (!passport) {
			return true;
		}
		const entry = await getDataEntry(passport.id, dataType);
		return entry === null;
	}, [passport, dataType]);

	/**
	 * メタデータの読み込み
	 */
	const loadMetadata =
		useCallback(async (): Promise<BaseMetadata<TEntry> | null> => {
			if (!passport || !sessionKey || !currentAccount?.address) {
				console.log("[MetadataManager] Prerequisites not met, returning null");
				return null;
			}

			try {
				// SBTからEntryDataを取得
				const entry = await getDataEntry(passport.id, dataType);
				if (!entry) {
					console.log(`[MetadataManager] No entry found for ${dataType}`);
					return null;
				}

				const { metadataBlobId, sealId } = entry;
				console.log(
					`[MetadataManager] Loading metadata blob: ${metadataBlobId}`,
				);

				// メタデータBlobをダウンロード
				const encryptedData = await downloadFromWalrusByBlobId(metadataBlobId);

				// 復号化用のPTBを構築
				const txBytes = await buildPatientAccessPTB({
					passportObjectId: passport.id,
					registryObjectId: PASSPORT_REGISTRY_ID,
					suiClient,
					sealId,
					dataType,
				});

				// 復号化
				const sealClient = createSealClient(suiClient);
				const decryptedData = await decryptHealthData({
					encryptedData,
					sealClient,
					sessionKey,
					txBytes,
					sealId,
				});

				console.log(`[MetadataManager] Metadata loaded successfully`);
				return decryptedData as unknown as BaseMetadata<TEntry>;
			} catch (err) {
				console.error("[MetadataManager] Failed to load metadata:", err);
				throw err;
			}
		}, [passport, sessionKey, currentAccount, dataType, suiClient]);

	/**
	 * メタデータの保存
	 */
	const saveMetadata = useCallback(
		async (metadata: BaseMetadata<TEntry>): Promise<void> => {
			if (!passport || !currentAccount?.address) {
				throw new Error("Prerequisites not met");
			}

			try {
				const sealId = await getSealId();

				// メタデータを更新
				const updatedMetadata: BaseMetadata<TEntry> = {
					...metadata,
					updated_at: Date.now(),
				};

				console.log(`[MetadataManager] Saving metadata for ${dataType}`);

				// 暗号化
				const sealClient = createSealClient(suiClient);
				const threshold = calculateThreshold(SEAL_KEY_SERVERS.length);
				const { encryptedObject } = await encryptHealthData({
					healthData: updatedMetadata as unknown as never,
					sealClient,
					sealId,
					threshold,
				});

				// Walrusにアップロード
				const walrusRef = await uploadToWalrus(encryptedObject, {
					signAndExecuteTransaction,
					owner: currentAccount.address,
				});
				console.log(`[MetadataManager] Metadata uploaded: ${walrusRef.blobId}`);

				// 新規か既存かを判定
				const isNew = await isNewEntry();

				// SBTを更新
				await updatePassportData({
					passportId: passport.id,
					dataType,
					metadataBlobId: walrusRef.blobId,
					replace: !isNew,
				});

				console.log(`[MetadataManager] SBT updated successfully`);
			} catch (err) {
				console.error("[MetadataManager] Failed to save metadata:", err);
				throw err;
			}
		},
		[
			passport,
			currentAccount,
			dataType,
			getSealId,
			isNewEntry,
			suiClient,
			signAndExecuteTransaction,
			updatePassportData,
		],
	);

	/**
	 * データBlobの読み込み
	 */
	const loadDataBlob = useCallback(
		async <TData>(entry: TEntry): Promise<TData> => {
			if (!passport || !sessionKey || !currentAccount?.address) {
				throw new Error("Prerequisites not met");
			}

			try {
				const sealId = await getSealId();
				console.log(`[MetadataManager] Loading data blob: ${entry.blob_id}`);

				// データBlobをダウンロード
				const encryptedData = await downloadFromWalrusByBlobId(entry.blob_id);

				// 復号化用のPTBを構築
				const txBytes = await buildPatientAccessPTB({
					passportObjectId: passport.id,
					registryObjectId: PASSPORT_REGISTRY_ID,
					suiClient,
					sealId,
					dataType,
				});

				// 復号化
				const sealClient = createSealClient(suiClient);
				const decryptedData = await decryptHealthData({
					encryptedData,
					sealClient,
					sessionKey,
					txBytes,
					sealId,
				});

				return decryptedData as unknown as TData;
			} catch (err) {
				console.error("[MetadataManager] Failed to load data blob:", err);
				throw err;
			}
		},
		[passport, sessionKey, currentAccount, dataType, getSealId, suiClient],
	);

	/**
	 * データBlobのアップロード
	 */
	const uploadDataBlob = useCallback(
		async <TData>(data: TData): Promise<string> => {
			if (!currentAccount?.address) {
				throw new Error("Wallet not connected");
			}

			try {
				const sealId = await getSealId();
				console.log(`[MetadataManager] Uploading data blob for ${dataType}`);

				// 暗号化
				const sealClient = createSealClient(suiClient);
				const threshold = calculateThreshold(SEAL_KEY_SERVERS.length);
				const { encryptedObject } = await encryptHealthData({
					healthData: data as unknown as never,
					sealClient,
					sealId,
					threshold,
				});

				// Walrusにアップロード
				const walrusRef = await uploadToWalrus(encryptedObject, {
					signAndExecuteTransaction,
					owner: currentAccount.address,
				});
				console.log(
					`[MetadataManager] Data blob uploaded: ${walrusRef.blobId}`,
				);

				return walrusRef.blobId;
			} catch (err) {
				console.error("[MetadataManager] Failed to upload data blob:", err);
				throw err;
			}
		},
		[currentAccount, dataType, getSealId, suiClient, signAndExecuteTransaction],
	);

	/**
	 * entryの追加/更新
	 */
	const upsertEntry = useCallback(
		(
			metadata: BaseMetadata<TEntry>,
			newEntry: TEntry,
			partitionKey: keyof TEntry | null,
		): BaseMetadata<TEntry> => {
			const entries = [...metadata.entries];

			if (partitionKey === null) {
				// パーティションキーなし: 常に最初のentryを置き換え
				return {
					...metadata,
					entries: [newEntry],
					updated_at: Date.now(),
				};
			}

			// パーティションキーでentry検索
			const existingIndex = entries.findIndex(
				(entry) => entry[partitionKey] === newEntry[partitionKey],
			);

			if (existingIndex >= 0) {
				// 既存entryを更新
				entries[existingIndex] = newEntry;
			} else {
				// 新規entry追加
				entries.push(newEntry);
			}

			return {
				...metadata,
				entries,
				updated_at: Date.now(),
			};
		},
		[],
	);

	/**
	 * entryの削除
	 */
	const removeEntry = useCallback(
		(
			metadata: BaseMetadata<TEntry>,
			partitionKeyValue: string,
			partitionKey: keyof TEntry | null,
		): BaseMetadata<TEntry> => {
			if (partitionKey === null) {
				// パーティションキーなし: 全entryをクリア
				return {
					...metadata,
					entries: [],
					updated_at: Date.now(),
				};
			}

			// パーティションキーでentryをフィルタリング
			const entries = metadata.entries.filter(
				(entry) => entry[partitionKey] !== partitionKeyValue,
			);

			return {
				...metadata,
				entries,
				updated_at: Date.now(),
			};
		},
		[],
	);

	return useMemo(
		() => ({
			loadMetadata,
			saveMetadata,
			loadDataBlob,
			uploadDataBlob,
			upsertEntry,
			removeEntry,
			isNewEntry,
			getSealId,
		}),
		[
			loadMetadata,
			saveMetadata,
			loadDataBlob,
			uploadDataBlob,
			upsertEntry,
			removeEntry,
			isNewEntry,
			getSealId,
		],
	);
}

/**
 * 空のメタデータを作成するヘルパー
 */
export { createEmptyMetadata };
