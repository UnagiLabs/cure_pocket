# プロフィール暗号化保存機能 実装計画

**作成日**: 2025-11-21
**ステータス**: 実装中

## 📋 概要

パスポート保持者がプロフィール情報を入力・保存する際、Seal（IBE暗号化）で暗号化してWalrus（分散ストレージ）に保存し、パスポートのwalrus_blob_idとseal_idを更新する機能を実装します。

## 🔄 正しいフロー

### 前提
- ユーザーは既にパスポートをmint済み
- パスポートには初期値（空または仮値）のwalrus_blob_id, seal_idが設定されている

### プロフィール保存フロー
```
1. プロフィール入力完了
2. 「保存」ボタンクリック
3. seal_id生成（SHA256(address + "medical_passport")）
4. Profile → HealthData 変換
5. SessionKey作成・署名（ウォレット）
6. Seal暗号化（threshold IBE, 2-of-n）
7. Walrusアップロード → new_walrus_blob_id 取得
8. update_walrus_blob_id() 実行（既存関数）
9. update_seal_id() 実行（新規追加関数）
10. localStorage保存
11. 成功メッセージ表示
```

### データ表示フロー
```
1. アプリ起動 → パスポート所持確認
2. walrus_blob_id と seal_id 取得
3. Walrusからダウンロード
4. SessionKey準備
5. PTB構築（buildPatientAccessPTB）
6. Seal復号化
7. HealthData → Profile 変換
8. localStorageに保存
9. プロフィール画面表示
```

## 📁 実装ファイル構成

### コントラクト側（2ファイル更新）

#### 1. `contract/sources/accessor.move`
**追加内容**: `update_seal_id` エントリー関数

```move
/// Seal IDを更新するエントリー関数
///
/// ## 概要
/// MedicalPassportの`seal_id`フィールドを更新するエントリー関数。
/// プロフィール保存時に新しいseal_idを設定する際に使用。
///
/// ## 権限
/// - パスポートの所有者のみが更新可能
///
/// ## パラメータ
/// - `registry`: PassportRegistryへの参照
/// - `passport`: 更新対象のMedicalPassportへの可変参照
/// - `new_seal_id`: 新しいSeal ID（空文字列不可）
/// - `clock`: 現在時刻取得用のClock参照
/// - `ctx`: トランザクションコンテキスト
///
/// ## Aborts
/// - `E_EMPTY_SEAL_ID`: `new_seal_id`が空文字列
/// - `E_NO_ACCESS`: トランザクション送信者がパスポートの所有者ではない
entry fun update_seal_id(
    registry: &PassportRegistry,
    passport: &mut MedicalPassport,
    new_seal_id: String,
    clock: &Clock,
    ctx: &tx_context::TxContext
) {
    // バリデーション: new_seal_idが空文字列でないことを確認
    assert!(!string::is_empty(&new_seal_id), medical_passport::e_empty_seal_id());

    // アクセス制御: 送信者がパスポートの所有者であることを確認
    medical_passport::assert_passport_owner(
        registry,
        object::id(passport),
        tx_context::sender(ctx),
        seal_accessor::e_no_access()
    );

    // 内部関数を呼び出して更新
    medical_passport::update_seal_id_internal(passport, new_seal_id, clock);
}
```

#### 2. `contract/sources/medical_passport.move`
**追加内容**:
- `update_seal_id_internal` 内部関数
- `PassportSealUpdatedEvent` イベント構造体
- `E_EMPTY_SEAL_ID` エラーコードゲッター（既存利用）

```move
/// Seal更新イベント
///
/// ## 用途
/// - Seal ID更新の記録
/// - 監査証跡として使用
/// - オフチェーンでの更新履歴追跡
///
/// ## フィールド
/// - `passport_id`: 更新されたパスポートのID
/// - `old_seal_id`: 更新前のSeal ID
/// - `new_seal_id`: 更新後のSeal ID
/// - `timestamp_ms`: 更新実行時刻（ミリ秒）
public struct PassportSealUpdatedEvent has copy, drop {
    passport_id: object::ID,
    old_seal_id: String,
    new_seal_id: String,
    timestamp_ms: u64,
}

/// Seal IDを更新する内部関数
///
/// ## 概要
/// MedicalPassportの`seal_id`フィールドを更新し、
/// 更新イベントを発行するパッケージ内部関数。
///
/// ## パラメータ
/// - `passport`: 更新対象のMedicalPassportへの可変参照
/// - `new_seal_id`: 新しいSeal ID（空文字列不可）
/// - `clock`: 現在時刻取得用のClock参照
///
/// ## 副作用
/// - `passport.seal_id`が`new_seal_id`に更新される
/// - `PassportSealUpdatedEvent`イベントが発行される
public(package) fun update_seal_id_internal(
    passport: &mut MedicalPassport,
    new_seal_id: String,
    clock: &Clock
) {
    // セーフガード（二重バリデーション）
    assert!(!string::is_empty(&new_seal_id), E_EMPTY_SEAL_ID);

    // 現在のseal_idを保存（イベント発行時に使用）
    let old_seal_id = passport.seal_id;

    // seal_idを更新
    passport.seal_id = new_seal_id;

    // 現在時刻を取得
    let timestamp_ms = sui::clock::timestamp_ms(clock);

    // パスポートIDを取得
    let passport_id = object::id(passport);

    // 更新イベントを発行
    let updated_event = PassportSealUpdatedEvent {
        passport_id,
        old_seal_id,
        new_seal_id,
        timestamp_ms,
    };
    sui::event::emit(updated_event);
}
```

### フロントエンド側

#### 新規作成ファイル（6個）

##### 1. `frontend/src/lib/sealIdGenerator.ts`
```typescript
/**
 * Seal ID生成ユーティリティ
 *
 * ユーザーアドレスから決定論的にSeal IDを生成します。
 */

/**
 * アドレスからSeal IDを生成
 *
 * @param address - ユーザーのSuiアドレス
 * @returns SHA256ハッシュ化されたSeal ID
 */
export async function generateSealIdFromAddress(address: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(address + "medical_passport");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hashHex;
}
```

##### 2. `frontend/src/lib/profileConverter.ts`
```typescript
/**
 * プロフィールデータ変換ユーティリティ
 *
 * PatientProfile と HealthData 間の相互変換を行います。
 */

import type { PatientProfile, HealthData, Allergy, MedicalHistory } from "@/types";
import { v4 as uuidv4 } from "uuid";

/**
 * PatientProfile を HealthData に変換
 */
export function patientProfileToHealthData(profile: PatientProfile): HealthData {
  return {
    profile: profile,
    vitals: [],
    medications: [],
    allergies: convertProfileAllergies(profile),
    labResults: [],
    imagingStudies: [],
    medicalHistories: convertProfileHistories(profile),
  };
}

/**
 * HealthData から PatientProfile を抽出
 */
export function healthDataToPatientProfile(healthData: HealthData): PatientProfile {
  return healthData.profile;
}

/**
 * プロフィールのアレルギー情報をAllergy型に変換
 */
function convertProfileAllergies(profile: PatientProfile): Allergy[] {
  const allergies: Allergy[] = [];

  // 薬物アレルギー
  profile.drugAllergies?.forEach(drugAllergy => {
    allergies.push({
      id: uuidv4(),
      type: 'drug',
      substance: drugAllergy.label,
      severity: drugAllergy.severity || 'unknown',
      recordedAt: new Date().toISOString(),
    });
  });

  // 食物アレルギー
  profile.foodAllergies?.forEach(food => {
    allergies.push({
      id: uuidv4(),
      type: 'food',
      substance: food,
      severity: 'unknown',
      recordedAt: new Date().toISOString(),
    });
  });

  return allergies;
}

/**
 * プロフィールの履歴情報をMedicalHistory型に変換
 */
function convertProfileHistories(profile: PatientProfile): MedicalHistory[] {
  const histories: MedicalHistory[] = [];

  // 慢性疾患
  profile.chronicConditions?.forEach(condition => {
    histories.push({
      id: uuidv4(),
      category: 'chronic_condition',
      description: condition.label,
      code: condition.code,
      recordedAt: new Date().toISOString(),
    });
  });

  // 手術歴
  profile.surgeries?.forEach(surgery => {
    histories.push({
      id: uuidv4(),
      category: 'surgery',
      description: `${surgery.category}${surgery.note ? ': ' + surgery.note : ''}`,
      year: surgery.year,
      recordedAt: new Date().toISOString(),
    });
  });

  return histories;
}
```

##### 3. `frontend/src/hooks/useSessionKeyManager.ts`
```typescript
/**
 * SessionKey管理hook
 *
 * Seal復号化に必要なSessionKeyの作成・管理を行います。
 */

import { useState, useEffect } from "react";
import { SessionKey } from "@mysten/seal";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useSuiClient } from "@mysten/dapp-kit";
import { fromHEX } from "@mysten/bcs";

const SESSION_KEY_STORAGE_KEY = "cure_pocket_session_key";
const SESSION_KEY_TTL_MS = 10 * 60 * 1000; // 10分

interface SessionKeyData {
  key: string; // シリアライズされたSessionKey
  expiresAt: number;
}

export function useSessionKeyManager() {
  const { currentAccount } = useCurrentAccount();
  const suiClient = useSuiClient();
  const [sessionKey, setSessionKey] = useState<SessionKey | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // SessionStorageから既存のSessionKeyを読み込み
  useEffect(() => {
    const loadSessionKey = () => {
      try {
        const stored = sessionStorage.getItem(SESSION_KEY_STORAGE_KEY);
        if (!stored) return;

        const data: SessionKeyData = JSON.parse(stored);
        if (Date.now() > data.expiresAt) {
          // 期限切れ
          sessionStorage.removeItem(SESSION_KEY_STORAGE_KEY);
          return;
        }

        // SessionKeyを復元（実装はSeal SDKに依存）
        // TODO: SessionKeyのシリアライズ/デシリアライズ実装
      } catch (err) {
        console.error("Failed to load session key:", err);
      }
    };

    loadSessionKey();
  }, []);

  const createSessionKey = async (signPersonalMessage: (msg: Uint8Array) => Promise<{ signature: string }>) => {
    if (!currentAccount) {
      throw new Error("Wallet not connected");
    }

    setIsLoading(true);
    setError(null);

    try {
      // SessionKey作成
      const newSessionKey = await SessionKey.create({
        address: currentAccount.address,
        packageId: fromHEX(process.env.NEXT_PUBLIC_PACKAGE_ID!),
        ttlMin: 10,
        suiClient,
      });

      // 署名
      const message = newSessionKey.getPersonalMessage();
      const { signature } = await signPersonalMessage(message);
      newSessionKey.setPersonalMessageSignature(signature);

      // 保存
      setSessionKey(newSessionKey);
      const expiresAt = Date.now() + SESSION_KEY_TTL_MS;

      // TODO: SessionKeyのシリアライズ実装
      // sessionStorage.setItem(SESSION_KEY_STORAGE_KEY, JSON.stringify({ key: ..., expiresAt }));

      return newSessionKey;
    } catch (err) {
      const error = err as Error;
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const getOrCreateSessionKey = async (signPersonalMessage: (msg: Uint8Array) => Promise<{ signature: string }>) => {
    if (sessionKey && isValid()) {
      return sessionKey;
    }
    return await createSessionKey(signPersonalMessage);
  };

  const clearSessionKey = () => {
    setSessionKey(null);
    sessionStorage.removeItem(SESSION_KEY_STORAGE_KEY);
  };

  const isValid = (): boolean => {
    if (!sessionKey) return false;

    const stored = sessionStorage.getItem(SESSION_KEY_STORAGE_KEY);
    if (!stored) return false;

    try {
      const data: SessionKeyData = JSON.parse(stored);
      return Date.now() < data.expiresAt;
    } catch {
      return false;
    }
  };

  return {
    sessionKey,
    createSessionKey,
    getOrCreateSessionKey,
    clearSessionKey,
    isValid: isValid(),
    isLoading,
    error,
  };
}
```

##### 4. `frontend/src/hooks/useEncryptAndStore.ts`
```typescript
/**
 * 暗号化→保存統合hook
 *
 * プロフィールデータの暗号化とWalrus保存を統合して実行します。
 */

import { useState } from "react";
import type { PatientProfile } from "@/types";
import { patientProfileToHealthData } from "@/lib/profileConverter";
import { generateSealIdFromAddress } from "@/lib/sealIdGenerator";
import { createSealClient, encryptHealthData } from "@/lib/seal";
import { uploadToWalrus } from "@/lib/walrus";
import { useSuiClient, useCurrentAccount } from "@mysten/dapp-kit";

interface EncryptAndStoreProgress {
  step: number;
  message: string;
}

interface EncryptAndStoreOptions {
  onSuccess?: (walrusBlobId: string, sealId: string) => void;
  onError?: (error: Error) => void;
  onProgress?: (progress: EncryptAndStoreProgress) => void;
}

export function useEncryptAndStore(options?: EncryptAndStoreOptions) {
  const suiClient = useSuiClient();
  const { currentAccount } = useCurrentAccount();
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<EncryptAndStoreProgress>({ step: 0, message: "" });
  const [error, setError] = useState<Error | null>(null);

  const updateProgress = (step: number, message: string) => {
    const newProgress = { step, message };
    setProgress(newProgress);
    options?.onProgress?.(newProgress);
  };

  const encryptAndStore = async (profile: PatientProfile) => {
    if (!currentAccount) {
      throw new Error("Wallet not connected");
    }

    setIsLoading(true);
    setError(null);

    try {
      // Step 1: seal_id生成
      updateProgress(1, "Seal IDを生成中...");
      const sealId = await generateSealIdFromAddress(currentAccount.address);

      // Step 2: Profile → HealthData変換
      updateProgress(2, "データを変換中...");
      const healthData = patientProfileToHealthData(profile);

      // Step 3: SealClient初期化
      updateProgress(3, "暗号化の準備中...");
      const sealClient = createSealClient(suiClient);

      // Step 4: Seal暗号化
      updateProgress(4, "データを暗号化中...");
      const { encryptedObject, backupKey } = await encryptHealthData({
        healthData,
        sealClient,
        sealId,
        threshold: 2,
      });

      // Step 5: Walrusアップロード
      updateProgress(5, "Walrusに保存中...");
      const { blobId } = await uploadToWalrus(encryptedObject);

      updateProgress(6, "完了！");
      options?.onSuccess?.(blobId, sealId);

      return {
        walrusBlobId: blobId,
        sealId,
        backupKey,
      };
    } catch (err) {
      const error = err as Error;
      setError(error);
      options?.onError?.(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    encryptAndStore,
    isLoading,
    progress,
    error,
  };
}
```

##### 5. `frontend/src/hooks/useDecryptAndFetch.ts`
```typescript
/**
 * 取得→復号化統合hook
 *
 * Walrusからのデータ取得とSeal復号化を統合して実行します。
 */

import { useState, useEffect } from "react";
import type { PatientProfile } from "@/types";
import { healthDataToPatientProfile } from "@/lib/profileConverter";
import { downloadFromWalrusByBlobId } from "@/lib/walrus";
import { createSealClient, decryptHealthData, buildPatientAccessPTB } from "@/lib/seal";
import { useSuiClient } from "@mysten/dapp-kit";
import type { SessionKey } from "@mysten/seal";

interface UseDecryptAndFetchOptions {
  passportObjectId: string;
  walrusBlobId: string;
  sealId: string;
  sessionKey: SessionKey | null;
  autoFetch?: boolean;
}

export function useDecryptAndFetch(options: UseDecryptAndFetchOptions) {
  const suiClient = useSuiClient();
  const [data, setData] = useState<PatientProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchAndDecrypt = async () => {
    if (!options.sessionKey) {
      throw new Error("SessionKey is required");
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. Walrusからダウンロード
      const encryptedData = await downloadFromWalrusByBlobId(options.walrusBlobId);

      // 2. SealClient初期化
      const sealClient = createSealClient(suiClient);

      // 3. PTB構築
      const txBytes = await buildPatientAccessPTB({
        passportObjectId: options.passportObjectId,
        registryObjectId: process.env.NEXT_PUBLIC_PASSPORT_REGISTRY_ID!,
        suiClient,
        sealId: options.sealId,
      });

      // 4. 復号化
      const healthData = await decryptHealthData({
        encryptedData,
        sealClient,
        sessionKey: options.sessionKey,
        txBytes,
        sealId: options.sealId,
      });

      // 5. HealthData → Profile変換
      const profile = healthDataToPatientProfile(healthData);
      setData(profile);

      return profile;
    } catch (err) {
      const error = err as Error;
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // 自動取得
  useEffect(() => {
    if (options.autoFetch && options.sessionKey && !data) {
      fetchAndDecrypt();
    }
  }, [options.autoFetch, options.sessionKey, options.walrusBlobId]);

  return {
    fetchAndDecrypt,
    data,
    isLoading,
    error,
  };
}
```

##### 6. `frontend/src/hooks/useUpdatePassportData.ts`
```typescript
/**
 * パスポート更新hook
 *
 * walrus_blob_idとseal_idの両方を更新するトランザクションを実行します。
 */

import { useState } from "react";
import { Transaction } from "@mysten/sui/transactions";
import { useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";

interface UseUpdatePassportDataOptions {
  onSuccess?: (digest: string) => void;
  onError?: (error: Error) => void;
}

export function useUpdatePassportData(options?: UseUpdatePassportDataOptions) {
  const suiClient = useSuiClient();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updatePassportData = async (
    passportObjectId: string,
    newWalrusBlobId: string,
    newSealId: string
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const tx = new Transaction();

      // 1. update_walrus_blob_id 呼び出し
      tx.moveCall({
        target: `${process.env.NEXT_PUBLIC_PACKAGE_ID}::accessor::update_walrus_blob_id`,
        arguments: [
          tx.object(process.env.NEXT_PUBLIC_PASSPORT_REGISTRY_ID!),
          tx.object(passportObjectId),
          tx.pure.string(newWalrusBlobId),
          tx.object("0x6"), // Clock
        ],
      });

      // 2. update_seal_id 呼び出し
      tx.moveCall({
        target: `${process.env.NEXT_PUBLIC_PACKAGE_ID}::accessor::update_seal_id`,
        arguments: [
          tx.object(process.env.NEXT_PUBLIC_PASSPORT_REGISTRY_ID!),
          tx.object(passportObjectId),
          tx.pure.string(newSealId),
          tx.object("0x6"), // Clock
        ],
      });

      // トランザクション実行
      return new Promise<string>((resolve, reject) => {
        signAndExecute(
          { transaction: tx },
          {
            onSuccess: (result) => {
              options?.onSuccess?.(result.digest);
              resolve(result.digest);
            },
            onError: (err) => {
              setError(err as Error);
              options?.onError?.(err as Error);
              reject(err);
            },
          }
        );
      });
    } catch (err) {
      const error = err as Error;
      setError(error);
      options?.onError?.(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    updatePassportData,
    isLoading,
    error,
  };
}
```

#### 既存ファイル更新（3個）

##### 1. `frontend/src/app/[locale]/app/profile/page.tsx`
**更新内容**: プロフィール保存処理の統合

```typescript
// 追加import
import { useEncryptAndStore } from "@/hooks/useEncryptAndStore";
import { useUpdatePassportData } from "@/hooks/useUpdatePassportData";
import { useSessionKeyManager } from "@/hooks/useSessionKeyManager";
import { useOwnedPassport } from "@/hooks/useOwnedPassport";

// コンポーネント内
export default function ProfilePage() {
  // ... 既存のstate ...

  const [isSaving, setIsSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState({ step: 0, message: "" });

  const { passport } = useOwnedPassport();
  const { encryptAndStore } = useEncryptAndStore({
    onProgress: setSaveProgress,
  });
  const { updatePassportData } = useUpdatePassportData();
  const { getOrCreateSessionKey } = useSessionKeyManager();

  const handleSaveProfile = async () => {
    if (!passport) {
      toast.error("パスポートが見つかりません");
      return;
    }

    setIsSaving(true);

    try {
      // 1. SessionKey準備（必要に応じて作成）
      setSaveProgress({ step: 1, message: "認証情報を準備中..." });
      // const sessionKey = await getOrCreateSessionKey(...); // 実装は別途

      // 2. 暗号化→Walrus保存
      setSaveProgress({ step: 2, message: "データを暗号化・保存中..." });
      const { walrusBlobId, sealId } = await encryptAndStore(profile);

      // 3. パスポート更新
      setSaveProgress({ step: 3, message: "パスポートを更新中..." });
      await updatePassportData(
        passport.objectId,
        walrusBlobId,
        sealId
      );

      // 4. localStorage保存
      updateProfile(profile);

      setSaveProgress({ step: 4, message: "完了！" });
      toast.success("プロフィールを保存しました");

      // 新規登録時はホームへ
      if (isNewUser) {
        router.push("/app");
      }
    } catch (error) {
      console.error("Profile save error:", error);
      toast.error("保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  // UIに保存ボタンとプログレス表示を追加
  return (
    <div>
      {/* ... 既存のフォーム ... */}

      {isSaving && (
        <div className="mt-4 p-4 bg-blue-50 rounded">
          <p className="text-sm text-blue-700">
            {saveProgress.message}
          </p>
          <div className="mt-2 h-2 bg-blue-200 rounded">
            <div
              className="h-2 bg-blue-600 rounded transition-all"
              style={{ width: `${(saveProgress.step / 4) * 100}%` }}
            />
          </div>
        </div>
      )}

      <button
        onClick={handleSaveProfile}
        disabled={isSaving}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
      >
        {isSaving ? "保存中..." : "保存"}
      </button>
    </div>
  );
}
```

##### 2. `frontend/src/contexts/AppContext.tsx`
**更新内容**: 初期化時のデータ取得統合

```typescript
// 追加import
import { useDecryptAndFetch } from "@/hooks/useDecryptAndFetch";
import { useSessionKeyManager } from "@/hooks/useSessionKeyManager";
import { useOwnedPassport } from "@/hooks/useOwnedPassport";

// AppProvider内
export function AppProvider({ children }: { children: React.ReactNode }) {
  // ... 既存のstate ...

  const { passport } = useOwnedPassport();
  const { sessionKey, getOrCreateSessionKey } = useSessionKeyManager();
  const { fetchAndDecrypt } = useDecryptAndFetch({
    passportObjectId: passport?.objectId || "",
    walrusBlobId: passport?.walrusBlobId || "",
    sealId: passport?.sealId || "",
    sessionKey,
    autoFetch: false, // 手動で制御
  });

  // パスポート所持確認 & 初回データ取得
  useEffect(() => {
    const initializeProfile = async () => {
      // localStorageにデータがあれば使用
      const storedProfile = localStorage.getItem("profile");
      if (storedProfile) {
        setProfile(JSON.parse(storedProfile));
        return;
      }

      // パスポートがあり、walrus_blob_idが設定されていれば取得
      if (passport && passport.walrusBlobId && passport.walrusBlobId !== "") {
        try {
          // SessionKey準備
          // const sk = await getOrCreateSessionKey(...);

          // データ取得・復号化
          const profileData = await fetchAndDecrypt();
          if (profileData) {
            setProfile(profileData);
            localStorage.setItem("profile", JSON.stringify(profileData));
          }
        } catch (error) {
          console.error("Failed to fetch profile:", error);
        }
      }
    };

    initializeProfile();
  }, [passport]);

  // ... rest of the context ...
}
```

##### 3. `frontend/src/lib/seal.ts`
**更新内容**: 必要に応じてヘルパー関数を拡張（既存機能で十分な可能性あり）

## ⚙️ 実装フェーズ

### Phase 1: コントラクト拡張（1-2時間）
- [ ] `accessor.move`に`update_seal_id`関数追加
- [ ] `medical_passport.move`に`update_seal_id_internal`関数追加
- [ ] `PassportSealUpdatedEvent`構造体追加
- [ ] コントラクトのビルド・テスト
- [ ] テストネットに再デプロイ
- [ ] 新しいPACKAGE_IDを`.env`に設定

### Phase 2: フロントエンド基盤実装（3-4時間）
- [ ] `lib/sealIdGenerator.ts`実装
- [ ] `lib/profileConverter.ts`実装
- [ ] `hooks/useSessionKeyManager.ts`実装
- [ ] `hooks/useEncryptAndStore.ts`実装
- [ ] `hooks/useDecryptAndFetch.ts`実装
- [ ] `hooks/useUpdatePassportData.ts`実装
- [ ] 単体テスト実装

### Phase 3: UI統合（2-3時間）
- [ ] `app/[locale]/app/profile/page.tsx`の保存処理更新
- [ ] プログレス表示UI実装
- [ ] エラーハンドリングUI実装
- [ ] `contexts/AppContext.tsx`のデータ取得統合
- [ ] トーストメッセージ統合

### Phase 4: テスト（2-3時間）
- [ ] 単体テスト実行・修正
- [ ] 統合テスト（暗号化→保存→更新→復号化フロー）
- [ ] E2Eテスト（実際のUI操作）
- [ ] 手動QA（各ブラウザ、エラーケース）

### Phase 5: ドキュメント（1時間）
- [ ] コードコメント整備
- [ ] README更新
- [ ] 実装完了報告

## 🚨 エラーハンドリング

### 主要なエラーケース
1. **ウォレット未接続** → 接続促すモーダル表示
2. **署名拒否** → 「署名が必要です」メッセージ + 再試行ボタン
3. **パスポート未所持** → 「パスポートが必要です」メッセージ
4. **Walrusアップロード失敗** → エラー詳細 + 再試行ボタン
5. **暗号化失敗** → エラーログ + サポート案内
6. **復号化失敗** → アクセス権限エラー or データ破損エラー
7. **パスポート更新失敗** → トランザクションエラー詳細表示
8. **ガス不足** → 「SUIトークンが不足しています」+ 購入リンク

### エラーハンドリングパターン
```typescript
try {
  // 処理
} catch (error) {
  if (error instanceof WalletNotConnectedError) {
    showWalletConnectModal();
  } else if (error instanceof UserRejectedSignatureError) {
    toast.error("署名が必要です。再度お試しください。");
  } else if (error instanceof WalrusUploadError) {
    if (error.reason === 'size_exceeded') {
      toast.error("データが大きすぎます。");
    } else {
      toast.error("アップロードに失敗しました。", { action: "再試行" });
    }
  } else {
    console.error(error);
    toast.error("予期しないエラーが発生しました。");
  }
}
```

## 🔒 セキュリティ考慮事項

### 暗号化
1. ✅ E2E暗号化（Seal IBE, threshold 2-of-n）
2. ✅ ブロックチェーンベースのアクセス制御
3. ✅ オンチェーンには暗号化データの参照のみ
4. ✅ Walrusにも暗号化済みデータのみ保存

### アクセス制御
1. ✅ 所有者のみ更新可能（PassportRegistryで確認）
2. ✅ イベント発行による監査証跡
3. ✅ Sealキーサーバーによる復号化制御

### データ管理
1. ⚠️ backupKey管理はユーザー責任（ダウンロード提供）
2. ⚠️ localStorage平文保存（将来改善検討）
3. ✅ SessionKey有効期限管理（10分）

## 📊 期待される成果

実装完了後：
- ✅ パスポート保持者がプロフィール入力・保存可能
- ✅ データはSealで暗号化、Walrusに保存
- ✅ パスポートのwalrus_blob_idとseal_idが自動更新
- ✅ 既存ユーザーはWalrusから暗号化データを取得・復号化可能
- ✅ セキュアなE2E暗号化による医療データ保護
- ✅ 分散ストレージ（Walrus）+ ブロックチェーン（Sui）の統合

## 🔄 次のステップ

1. ✅ この実装計画を`docs/implementation-plan.md`として記録
2. Phase 1: コントラクト拡張から実装開始
3. 各Phaseごとにテスト・検証
4. 完成後、本番デプロイ準備

---

**最終更新**: 2025-11-21
**ステータス**: Phase 0完了（計画策定）→ Phase 1開始準備中
