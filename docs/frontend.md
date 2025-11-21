
# CurePocket Frontend Spec (Next.js, Multilang + Sui + Walrus/Seal)

## 0. Overview

CurePocket は「グローバルお薬パスポート」です。

- モバイルフレンドリーな Web アプリ（スマホ前提）
- **Connect Sui Wallet** による認証
- ウォレットアドレスごとに 1つの `MedicationVault`（Sui Object）を持つ
- **Walrus** に暗号化した薬データ JSON を保存（本番では Seal で鍵管理）
- フロントエンドは Next.js + TypeScript
- バックエンド（Sui / Walrus / Seal 連携）は専用 API 経由で呼び出す構成にする

### この仕様書の前提

- フロントエンドは **Next.js App Router** を推奨（`app/`）
- i18n（多言語対応）：  
  - 日本語 / 英語 / 中国語 / フランス語 / ポルトガル語 をカバー
- コントラクト呼び出し：
  - **最低限1回は実際に Sui コントラクト + Walrus + Seal を叩く**前提  
  - フロントは `/api/*` 経由で呼び出す（API ルート or 別バックエンド）。  
    → Sui/Walrus/Seal への実コールはサーバ側実装、フロントは型どおりに fetch する。

---

## 1. Tech Stack

- Framework: **Next.js 14+ (App Router)**
- Language: **TypeScript**
- Styling: 任意（Tailwind CSS 推奨）
- State management: React hooks + Context or Zustand
- i18n:
  - 任意のライブラリ（`next-intl`, `next-i18next` など）  
  - 最低限：`t('key')` 形式で文言管理し、言語切替に対応できる実装

---

## 2. i18n Requirements

### 2.1 対応言語

- `en` – English  
- `ja` – Japanese  
- `zh` – Chinese (Simplified)  
- `fr` – French  
- `pt` – Portuguese (Brazil or general)

### 2.2 基本方針

- すべてのテキストは **ハードコードせず** `t('namespace.key')` で取得
- 言語リソースは JSON に分割（例：`locales/en/common.json` など）
- 初回ロード時：
  - ブラウザの `navigator.language` を見てデフォルト言語を決定
- ユーザー設定で言語変更可能（Settings画面）
  - 言語選択は `UserSettings.locale` に保持し、LocalStorage などで永続化

### 2.3 代表的なキー例

```jsonc
// example: locales/en/common.json
{
  "appName": "CurePocket",
  "tagline": "Your global, privacy-preserving medication passport.",
  "actions": {
    "connectWallet": "Connect Sui Wallet",
    "addMedication": "Add medication",
    "save": "Save",
    "cancel": "Cancel"
  },
  "tabs": {
    "home": "Home",
    "add": "Add",
    "card": "Card",
    "settings": "Settings"
  },
  "home": {
    "title": "Your Pocket Today",
    "activeCount": "{{count}} active medications"
  },
  "settings": {
    "title": "Settings",
    "theme": "Notebook theme",
    "language": "Language",
    "analyticsOptIn": "Share anonymized data for research",
    "analyticsDescription": "Your personal records are always encrypted. Only aggregated, anonymized statistics may be used when you opt in."
  }
}
````

各言語で同じキー構造を維持すること。

### 2.4 Language Switcher

* `LanguageSelector` コンポーネントを作る
* 設定画面から変更可能、ヘッダー右上に小さなドロップダウンがあってもよい
* 選択言語は `UserSettings.locale` + LocalStorage に保存

---

## 3. Routes / Pages

* `/` : Landing + Connect Wallet + language selector
* `/app` : メインアプリ（Home/Add/Card/Settings）

### 3.1 `/` – Landing & Connect Wallet

**表示要素：**

* ロゴ / アプリ名（`t('appName')`）
* サブタイトル（`t('tagline')`）
* 短い説明文（2〜3行、すべて i18n）
* `Connect Sui Wallet` ボタン（`t('actions.connectWallet')`）
* Language Switcher（右上 or 下部）

**挙動：**

* `Connect Wallet` → `walletService.connect()` を呼び出す
* ウォレットアドレスを `AppState.walletAddress` に保存
* 成功したら `/app` に push
* ウォレット接続は Sui Wallet Kit を想定（実装は後追い可能）

---

## 4. Global State & Types

### 4.1 TypeScript types

```ts
export type ThemeId =
  | 'classic-blue'
  | 'mint-clinic'
  | 'sakura-notebook'
  | 'midnight-travel';

export type LocaleId = 'en' | 'ja' | 'zh' | 'fr' | 'pt';

export interface Medication {
  id: string;              // UUID
  name: string;            // Drug name (localized display)
  genericName?: string;
  strength?: string;       // e.g. "5mg"
  form?: 'tablet' | 'capsule' | 'liquid' | 'other';
  dose?: string;           // e.g. "1 tablet"
  frequency?: string;      // e.g. "twice daily"
  startDate?: string;      // ISO date
  endDate?: string;        // ISO date or undefined
  reason?: string;         // Indication text
  status: 'active' | 'stopped';

  // Backend-linked metadata
  suiObjectId?: string;    // MedicationEntry object ID
  walrusBlobId?: string;   // Walrus blob ID
}

export interface EmergencyCardSettings {
  showName: boolean;
  displayName?: string;
  ageBand?: string;
  country?: string;
  allergies?: string;
}

export interface UserSettings {
  theme: ThemeId;
  locale: LocaleId;
  analyticsOptIn: boolean;
  emergencyCard: EmergencyCardSettings;
}

export interface AppState {
  walletAddress: string | null;
  medications: Medication[];
  settings: UserSettings;
  isLoading: boolean;
}
```

### 4.2 State 管理

* `AppContext` or `Zustand` で `AppState` を一元管理
* 初期設定は、言語のみブラウザの設定を参照して決定
* `medications` はログイン後に API から取得

---

## 5. Contract / API Integration（重要）

フロントエンドは直接 Sui / Walrus / Seal には触らず、
**Next.js API Route もしくは別のバックエンドエンドポイント**を叩く。

### 5.1 API クライアント層

`lib/apiClient.ts` 的なモジュールを用意：

```ts
export interface CreateMedicationPayload {
  walletAddress: string;
  medication: Omit<Medication, 'id' | 'suiObjectId' | 'walrusBlobId'>;
}

export interface CreateMedicationResponse {
  medication: Medication; // id, suiObjectId, walrusBlobId が埋まった状態
}

export interface FetchMedicationsResponse {
  medications: Medication[];
}

export interface CreateConsentTokenResponse {
  consentUrl: string; // doctor view URL
  expiresAt: string;  // ISO date
}

export const apiClient = {
  async fetchMedications(walletAddress: string): Promise<FetchMedicationsResponse> {
    const res = await fetch('/api/medications?wallet=' + walletAddress);
    if (!res.ok) throw new Error('Failed to fetch medications');
    return res.json();
  },

  async createMedication(payload: CreateMedicationPayload): Promise<CreateMedicationResponse> {
    const res = await fetch('/api/medications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to create medication');
    return res.json();
  },

  async createConsentToken(walletAddress: string): Promise<CreateConsentTokenResponse> {
    const res = await fetch('/api/consent-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress }),
    });
    if (!res.ok) throw new Error('Failed to create consent token');
    return res.json();
  },
};
```

### 5.2 バックエンド側でやるべきこと（コメントのみ）

* `/api/medications`:

  * `POST`：

    * 受け取った薬データ（FHIR風JSONなど）を暗号化 → Walrus にアップロード
    * 返ってきた `walrusBlobId` を使って Sui 上で `MedicationEntry` オブジェクトを作成
    * 作成されたオブジェクト ID（`suiObjectId`）と `walrusBlobId` をレスポンスで返す
  * `GET`：

    * 指定ウォレットの `MedicationVault` / `MedicationEntry` を Sui から読み出す
    * 表示用の `Medication[]` にマッピングして返す

* `/api/consent-token`:

  * 指定ウォレットに紐づく Vault に対して **Seal で鍵アクセスを一時発行**
  * Sui で `ConsentToken` オブジェクトをミント
  * 医療者ビュー用 URL（例：`/doctor/view?token=...`）を返す
    → フロントはこれを QR にエンコードするだけでOK

* `/api/analytics/submit`:

  * Payloadは2つのトップレベルで分離して送信すること
    * `stats_payload`: Anonymous Stats JSON（docs/data_schema.md §6）
    * `reward_claim`: `{ walletAddress, signature }`（SBT所有証明など）
  * バックエンドは受信時に`stats_payload`と`reward_claim`を即座に分離し、別DBテーブルへ保存し、相互の参照を保持しないこと。

※ フロントからは「Sui / Walrus / Seal を使っている」ことが分かるように、
`Medication` に `suiObjectId` / `walrusBlobId` を保持する。

---

## 6. Screens / Tabs

### 6.1 `/app` Layout

**コンポーネント例：**

* `AppLayout`（ヘッダー＋ボトムタブ）
* `HomeScreen`
* `AddMedicationScreen`
* `EmergencyCardScreen`
* `SettingsScreen`

ヘッダー：

* 左：アプリ名（`t('appName')`）
* 右：Language Switcher（アイコン＋ドロップダウン）

下部タブ（ボトムナビ）：

* `Home` / `Add` / `Card` / `Settings`
* ラベルは `t('tabs.home')` など

---

### 6.2 Home Tab – Medication List

* タイトル：`t('home.title')`
* サブ：`t('home.activeCount', { count: activeCount })`
* `MedicationCard` リスト表示

`MedicationCard`：

* 薬名
* 一般名（あれば）
* `dose` + `frequency`
* ステータスバッジ
* Tap で `MedicationDetailModal` 表示

ロード時：

* `walletAddress` がなければ `/` にリダイレクト
* あれば `apiClient.fetchMedications(walletAddress)` を呼び、`AppState.medications` を更新

---

### 6.3 Add Tab – Add Medication

* 説明テキスト：`t('add.title')` 的なキーを用意

* 上に `Scan QR / Barcode` ボタン（まだ実装しなくて良いが UI は用意）

* 以下フォーム（i18nラベル）：

  * Drug name
  * Generic name (optional)
  * Strength
  * Form (select)
  * Dose
  * Frequency
  * Start date
  * End date (optional)
  * Reason

* `Save` ボタン：

  * `apiClient.createMedication({ walletAddress, medication: formValue })` を呼び出す
  * 成功したら Home に戻る or トースト表示

---

### 6.4 Medication Detail

* 画面またはモーダルとして実装
* 表示内容：

  * 名前、一般名、強さ、用量、用法
  * 期間、理由
  * `suiObjectId` / `walrusBlobId` は UI 上では小さく「Tech info」セクションに表示してもよい
* ボタン：

  * `Mark as stopped`（status 更新）
  * `Edit`（フォーム再利用）

※ status 更新も将来的にはコントラクト呼び出しになる想定だが、
MVPではローカル状態だけでもよい。

---

### 6.5 Card Tab – Emergency Card

* タイトル：`Emergency Card`
* 説明テキスト（i18n）
* プレビューカード：

  * `displayName`, `ageBand`, `country`, `allergies`
  * Active medications（英語表記でもOK）
* QRコード：

  * `apiClient.createConsentToken(walletAddress)` を呼び出して
    返ってきた `consentUrl` を QR にエンコードして表示
* `Generate new link` ボタンで再発行可能

※ ここで少なくとも **1回は Seal/Sui を実際に叩く** API が存在することになる。

---

### 6.6 Settings Tab – Theme & Settings

#### 6.6.1 ThemeSelector

* テーマ候補：

  * `classic-blue`
  * `mint-clinic`
  * `sakura-notebook`
  * `midnight-travel`

* 各テーマをカードサムネイルで表示し、選択時に `UserSettings.theme` を更新。

* 選択済みテーマは `AppLayout` に反映（色・背景）

#### 6.6.2 Language Settings

* 言語リスト（`en`, `ja`, `zh`, `fr`, `pt`）をドロップダウンで表示
* 選択した値で i18n コンテキストを切替
* 設定はローカル保存

#### 6.6.3 Privacy / Analytics

* トグル：

  * `t('settings.analyticsOptIn')`
* 説明テキスト：

  * `t('settings.analyticsDescription')`
  * Opt-in時は「端末内で匿名化・集計（Stats JSON生成）」のみ実行し、PHIをサーバーへ送らない。送信するのは匿名化済み統計データと報酬請求情報（分離送信）のみ。

---

## 7. Wallet Handling

`walletService.ts` のようなラッパーを用意：

```ts
export interface WalletService {
  connect(): Promise<string>;     // returns walletAddress
  disconnect(): Promise<void>;
}

export const walletService: WalletService = {
  async connect() {
    // MVP: integrate Sui dApp Kit or mock
    // Return example: "0x1234abcd..."
    return '0xDEMO_WALLET_ADDRESS';
  },
  async disconnect() {
    // no-op for now
  },
};
```

* 初期段階はモック実装でOK
* 後から Sui Wallet Kit 接続に差し替えられるよう抽象化しておく

---

## 8. Design Guidelines

* モバイルファースト（幅 375px 前後を基準）
* カード型UI、角丸多めで「お薬手帳」感
* 色の印象：

  * 医療的な信頼（ブルー系）＋ やさしさ（パステル）
* 多言語前提：

  * 文言で横幅がかなり変わるので、余裕のあるレイアウトにする
  * テキストをボタン内部で折り返せるように（固定幅にしない）

---

## 9. Nice to Have

* 多言語切り替え時のスムーズなトランジション
* simple Toastコンポーネント（保存成功 / エラー）
* `Analytics` 用のダミーメトリクス表示（「あなたのデータはこう使われます」のUI）

---

## 10. 非機能要件

* TypeScript 型が崩れないように定義
* i18n キーは型安全でなくても良いが、可能ならヘルパーで補完
* UIはSSR/CSRどちらでもよいが、ウォレット接続やブラウザAPI利用部分は `"use client"` コンポーネントで実装する

---

## 11. Analytics Logic (New Section)

### 11.1 generateAnonymousStats 要件

クライアントサイドで以下の順序で処理する関数を用意する:

1. Walrusから暗号化データを取得し、Seal経由の許可された鍵で端末内復号。
2. 18識別子を含む再同定リスクのあるフィールドを除去し、匿名化ルール（年齢バンド/国コード/ATC上位/ICD上位/LOINC+フラグのみ）でサマリ抽出。
3. 抽出結果をStats JSON（docs/data_schema.md §6）として構築。
4. `/api/analytics/submit` に送信するが、`stats_payload` と `reward_claim` を分離してpostする。

### 11.2 実装メモ

- ブラウザ内メモリで完結させ、ローカルストレージに生データを残さない。
- 送信キューがある場合も、生データではなくStats JSONのみをバッファする。
