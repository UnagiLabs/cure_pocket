
# CurePocket – Patient Profile Page Spec (for Frontend / AI Coding)

このドキュメントは、CurePocket の **「患者プロフィール（Patient Profile）」ページ** を  
フロントエンド（例：Next.js + TypeScript）で実装するための仕様です。

目的：
- 患者が自分で「ヘルスパスポート」の基本情報を登録・更新できるようにする
- **匿名性を保ちながら**、医療的に重要な情報を構造化して保持する
- 将来的に FHIR / ATC / LOINC などの国際標準と接続しやすい形にする

---

## 0. 全体仕様

- ページ名：`Patient Profile` / 日本語表示：「プロフィール」
- 用途：  
  - ヘルスパスポートに紐づく「自分の基本ヘルス情報」の編集
  - 緊急時や統計解析の基礎となる属性情報の登録
- 前提：
  - ユーザーはすでに **Connect Wallet** 済み
  - `walletAddress` ごとに 1つのプロファイルを持つ
- 保存先：
  - Care Layer 用データとして、暗号化された JSON を Walrus に保存（バックエンド側担当）
  - フロントは JSON を編集できるフォームとして実装

---

## 1. データ構造（TypeScript インターフェース）

```ts
export type Gender = 'male' | 'female' | 'other' | 'unknown';
export type AgeBand =
  | '10s'
  | '20s'
  | '30s'
  | '40s'
  | '50s'
  | '60s'
  | '70s'
  | '80plus';

export type CountryCode = string; // ISO 3166-1 alpha-2 を想定（"JP", "US" など）

export type SmokingStatus = 'never' | 'former' | 'current' | 'unknown';
export type AlcoholUse = 'none' | 'light' | 'moderate' | 'heavy' | 'unknown';
export type ExerciseFrequency = 'none' | '1-2/week' | '3-5/week' | 'daily' | 'unknown';

export type AllergySeverity = 'mild' | 'moderate' | 'severe';

export type ChronicConditionCode = string; // 将来的に ICD-10 / SNOMED CT を想定
export type SurgeryCategory =
  | 'cardiac'
  | 'orthopedic'
  | 'gi'
  | 'gynecology'
  | 'urology'
  | 'ophthalmology'
  | 'other';

export type DataSharingPreference = 'allow' | 'deny' | 'ask-every-time';

export interface PatientProfile {
  // 1. 基本情報
  ageBand: AgeBand | null;
  gender: Gender;
  country: CountryCode | null;
  preferredLanguage: string | null; // "ja", "en", "zh", "fr", "pt" など
  bloodType?: 'A' | 'B' | 'O' | 'AB' | 'unknown';

  heightCm?: number; // optional
  weightKg?: number; // optional

  smokingStatus: SmokingStatus;
  alcoholUse: AlcoholUse;
  exercise: ExerciseFrequency;

  // 2. 医療上のアラート
  drugAllergies: {
    name: string; // フリーテキスト or 後で標準コードと紐づけ
    severity: AllergySeverity;
  }[];
  foodAllergies: string[]; // 簡易な文字列配列
  hasAnaphylaxisHistory: boolean | null;

  // 3. 基礎疾患・慢性疾患
  chronicConditions: {
    label: string;            // UI 表示用ラベル（例: "Type 2 Diabetes"）
    code?: ChronicConditionCode; // ICD-10 等があれば
  }[];

  // 4. 手術歴
  surgeries: {
    category: SurgeryCategory;
    year?: number;            // 西暦（例: 2018）
    note?: string;            // 自由記載
  }[];

  // 5. 緊急情報
  emergencyContact?: {
    label?: string;           // 例: "Mother", "Friend"
    contactInfo?: string;     // 電話番号 or メッセージID（暗号化保存前提）
    preferredEmergencyLanguage?: string; // "ja", "en" など
  };

  // 6. データ共有設定（Analytics）
  dataSharing: {
    preference: DataSharingPreference;
    shareMedication: boolean;
    shareLabs: boolean;
    shareConditions: boolean;
    shareSurgeries: boolean;
    shareLifestyle: boolean;
    rewardsEnabled: boolean; // 報酬受取を希望するか
  };

  // メタ情報
  updatedAt?: string; // ISO date string
}
````

---

## 2. UI セクション構成

プロフィールページは、以下のセクションに分けて表示する：

1. 個人基本情報（Basic Info）
2. 医療上の重要アラート（Critical Alerts）
3. 基礎疾患・慢性疾患（Chronic Conditions）
4. 手術歴（Surgical History）
5. 生活習慣（Lifestyle）
6. 緊急連絡情報（Emergency Info）
7. データ共有設定（Data Sharing / Analytics）

### 共通UI要件

* モバイルファースト（1カラム）
* 各セクションはカード形式で区切る
* Save ボタンはページ下部に固定（モバイルでも押しやすく）

---

## 3. 各セクション詳細

### 3.1 個人基本情報（Basic Info）

**目的**：匿名性を保ちつつ、最低限の背景情報を保持する。

フィールド：

1. **Age band（年齢帯）**

   * 型: `AgeBand`
   * UI: セレクトボックス
   * 候補:

     * 10–19 / 20–29 / 30–39 / 40–49 / 50–59 / 60–69 / 70–79 / 80+
   * 必須: はい

2. **Gender（性別）**

   * 型: `Gender`
   * UI: ラジオボタン
   * 候補:

     * Male / Female / Other / Prefer not to say → 内部的には `other` / `unknown`
   * 必須: はい

3. **Country（居住国）**

   * 型: `CountryCode`
   * UI: セレクト（国一覧）
   * 必須: 推奨（null可）

4. **Preferred language（利用言語）**

   * 型: string (locale code)
   * UI: セレクト（ja/en/zh/fr/pt）
   * 必須: 推奨

5. **Blood type（血液型）**

   * 型: `'A' | 'B' | 'O' | 'AB' | 'unknown'`
   * UI: セレクト
   * 必須: 任意（未選択でもOK）

6. **Height（身長, cm）**

   * 型: number
   * UI: 数値入力
   * 必須: 任意

7. **Weight（体重, kg）**

   * 型: number
   * UI: 数値入力
   * 必須: 任意
   * UI側で BMI を計算して表示してもよい（保存は任意）

---

### 3.2 医療上のアラート（Critical Alerts）

**目的**：緊急時・診療時に最優先で見る情報。

1. **Drug allergies（薬剤アレルギー）**

   * 型: `drugAllergies[]`
   * UI:

     * 「+ アレルギーを追加」ボタンで行追加
     * 各行：

       * name（テキスト、例: "Penicillin", "Aspirin"）
       * severity（セレクト: Mild / Moderate / Severe）
   * 必須: 任意（0件でもよい）

2. **Food allergies（食物アレルギー）**

   * 型: `foodAllergies[]`
   * UI: チップ入力 or テキスト＋追加
   * 必須: 任意

3. **Anaphylaxis history（アナフィラキシー歴）**

   * 型: boolean | null
   * UI: ラジオ：

     * Yes / No / Not sure
   * 必須: 推奨

---

### 3.3 基礎疾患・慢性疾患（Chronic Conditions）

**目的**：診療・統計で重要な慢性疾患を簡易に記録。

1. **Chronic conditions（チェックボックスリスト）**

   * 型: `chronicConditions[]`（内部的にはラベル＋コード）
   * UI: 代表的な疾患をチェックボックスで表示し、
     「その他（自由記載）」を1つ用意。
   * 例：

     * Hypertension（高血圧）
     * Type 2 Diabetes
     * Dyslipidemia
     * Heart failure
     * Atrial fibrillation
     * Asthma / COPD
     * CKD
     * Depression / Anxiety
     * Cancer (with note)
     * Autoimmune disease (with note)
   * 必須: 任意（0件でもOK）

---

### 3.4 手術歴（Surgical History）

**目的**：大きな手術歴をざっくり把握。

1. **Surgeries（手術歴）**

   * 型: `surgeries[]`
   * UI:

     * 「+ 手術を追加」ボタン
     * 各行：

       * category（セレクト）

         * Cardiac / Orthopedic / GI / Gynecology / Urology / Ophthalmology / Other
       * year（数値, YYYY, 任意）
       * note（テキスト, 任意）
   * 必須: 任意（なしでOK）

---

### 3.5 生活習慣（Lifestyle）

**目的**：疫学・統計・リスク評価に使える程度の情報を簡易に。

1. **Smoking（喫煙）**

   * 型: `SmokingStatus`
   * UI:

     * Never / Former / Current / Prefer not to say
   * 必須: 推奨

2. **Alcohol（飲酒）**

   * 型: `AlcoholUse`
   * UI:

     * None / Light / Moderate / Heavy / Prefer not to say
   * 必須: 推奨

3. **Exercise（運動習慣）**

   * 型: `ExerciseFrequency`
   * UI:

     * None / 1–2 days per week / 3–5 days per week / Daily / Prefer not to say
   * 必須: 任意

---

### 3.6 緊急連絡情報（Emergency Info）

**目的**：Emergency Card に載せる、任意の緊急連絡。

1. **Emergency contact label**

   * 型: string
   * 例: "Mother", "Friend"
   * 必須: 任意

2. **Emergency contact info**

   * 型: string
   * 例: 電話番号 / メッセージIDなど
   * 必須: 任意（入力されていればCare Layerで暗号化保存推奨）

3. **Preferred emergency language**

   * 型: string（"ja"/"en"/…）
   * 必須: 任意

---

### 3.7 データ共有設定（Data Sharing / Analytics）

**目的**：匿名統計への参加意思・対象データをユーザー自身が決める。

1. **Data sharing preference**

   * 型: `DataSharingPreference`
   * UI:

     * Allow (許可する)
     * Deny (許可しない)
     * Ask every time（その都度確認）
   * 必須: はい（初期値: Deny or Ask）

2. **Data categories**

   * 型: boolean flags
   * UI: チェックボックス群

     * Share anonymized medication data（薬: ATC/RxNorm）
     * Share anonymized lab data（検査値）
     * Share anonymized condition data（基礎疾患）
     * Share anonymized surgery data（手術歴）
     * Share anonymized lifestyle data（生活習慣）
   * 必須: 任意（preferenceがAllowのときだけ有効）

3. **Rewards enabled**

   * 型: boolean
   * UI:

     * 「データが研究に利用されたとき、報酬を受け取る」
   * 必須: 任意（デフォルトOFFでも可）

---

## 4. バリデーションとUXメモ

* 数値項目（身長・体重・年など）は、現実的な範囲チェックをする（例：身長 100–230cm）。
* すべての入力は「いつでも後から編集できる」前提。
* 「保存しました」トースト表示を用意。
* セクションごとの説明文を短く付けて、
  利用者（一般ユーザー）が医療用語に怖気づかないようにする。

---

## 5. API インターフェース（例）

フロントエンドからは、`PatientProfile` をそのまま JSON として送受信できればよい。

```ts
// GET /api/profile?wallet=0x...
interface GetProfileResponse {
  profile: PatientProfile | null; // 初回は null の可能性あり
}

// POST /api/profile
interface SaveProfileRequest {
  walletAddress: string;
  profile: PatientProfile;
}

interface SaveProfileResponse {
  success: boolean;
  profile: PatientProfile;
}
```

バックエンド側では：

* `profile` JSON を暗号化して Walrus に保存
* その Blob ID を `MedicalVault` から参照することを想定

---

## 6. 実装のゴール

* プロフィールページで **全項目が表示・編集・保存できること**
* 再度ページを開いたときに、保存済みデータが正しくフォームに反映されること
* モバイル画面で操作しやすい UI であること

この仕様に沿って、Next.js + TypeScript で
`/app/profile` もしくは `PatientProfile` コンポーネントを実装してください。


