export type ThemeId =
  | 'classic-blue'
  | 'mint-clinic'
  | 'sakura-notebook'
  | 'midnight-travel'
  | 'soft-warm-gradient';

export type LocaleId = 'en' | 'ja' | 'zh' | 'fr' | 'pt';

export type MedicationForm = 'tablet' | 'capsule' | 'liquid' | 'other';

export type MedicationStatus = 'active' | 'stopped';

export type TimingOfDay = 'morning' | 'afternoon' | 'evening' | 'night' | 'asNeeded';

export interface Medication {
  id: string; // UUID
  name: string; // Drug name (localized display)
  genericName?: string;
  strength?: string; // e.g. "5mg"
  form?: MedicationForm;
  dose?: string; // e.g. "1 tablet"
  frequency?: string; // e.g. "twice daily"
  timing?: TimingOfDay; // Time of day to take
  startDate?: string; // ISO date
  endDate?: string; // ISO date or undefined
  reason?: string; // Indication text
  clinic?: string; // Clinic or doctor name
  warning?: string; // Special warnings
  status: MedicationStatus;

  // Backend-linked metadata
  suiObjectId?: string; // MedicationEntry object ID
  walrusBlobId?: string; // Walrus blob ID
}

/**
 * アレルギー情報
 */
export type AllergySeverity = 'mild' | 'moderate' | 'severe' | 'life-threatening';

export interface Allergy {
  id: string; // UUID
  substance: string; // アレルギー物質名
  severity: AllergySeverity; // 重症度
  symptoms?: string; // 症状の説明
  onsetDate?: string; // ISO date - 発症日
  diagnosedBy?: string; // 診断した医療機関・医師名
  notes?: string; // その他のメモ

  // Backend-linked metadata
  suiObjectId?: string; // AllergyEntry object ID
  walrusBlobId?: string; // Walrus blob ID
}

/**
 * 基礎疾患・既往歴・手術歴
 */
export type MedicalHistoryType = 'condition' | 'surgery' | 'procedure' | 'other';

export interface MedicalHistory {
  id: string; // UUID
  type: MedicalHistoryType; // タイプ（基礎疾患、手術歴など）
  diagnosis: string; // 診断名・手術名
  diagnosisDate?: string; // ISO date - 診断日・手術日
  diagnosedBy?: string; // 診断した医療機関・医師名
  description?: string; // 詳細説明
  status?: 'active' | 'resolved' | 'chronic'; // 状態（進行中、治癒、慢性など）
  notes?: string; // その他のメモ

  // Backend-linked metadata
  suiObjectId?: string; // HistoryEntry object ID
  walrusBlobId?: string; // Walrus blob ID
}

/**
 * 検査値（血液検査など）
 */
export interface LabResult {
  id: string; // UUID
  testName: string; // 検査名（例：HbA1c、総コレステロール）
  value: string; // 検査値
  unit?: string; // 単位（例：mg/dL、%）
  referenceRange?: string; // 基準範囲（例：70-100）
  testDate: string; // ISO date - 検査日
  testedBy?: string; // 検査機関名
  category?: string; // カテゴリー（例：血液検査、尿検査）
  notes?: string; // その他のメモ

  // Backend-linked metadata
  suiObjectId?: string; // LabEntry object ID
  walrusBlobId?: string; // Walrus blob ID
}

/**
 * 画像レポート（レントゲン・CT・MRIなど）
 */
export type ImagingType = 'xray' | 'ct' | 'mri' | 'ultrasound' | 'other';

export interface ImagingReport {
  id: string; // UUID
  type: ImagingType; // 画像タイプ
  bodyPart?: string; // 検査部位（例：胸部、腹部）
  examDate: string; // ISO date - 検査実施日
  performedBy?: string; // 実施機関名
  summary: string; // 要約・所見
  findings?: string; // 所見の詳細
  impression?: string; // 診断的所見
  // 将来的には画像ファイルへの参照を追加
  imageUrl?: string; // 画像ファイルのURL（将来的に実装）

  // Backend-linked metadata
  suiObjectId?: string; // ImagingEntry object ID
  walrusBlobId?: string; // Walrus blob ID
}

/**
 * バイタルデータ
 */
export type VitalSignType =
  | 'blood-pressure'
  | 'heart-rate'
  | 'blood-glucose'
  | 'temperature'
  | 'weight';

export interface VitalSign {
  id: string; // UUID
  type: VitalSignType; // バイタルタイプ
  recordedAt: string; // ISO date-time - 記録日時

  // タイプ別の値
  systolic?: number; // 最高血圧（血圧の場合）
  diastolic?: number; // 最低血圧（血圧の場合）
  value?: number; // 心拍数、血糖値、体温、体重など
  unit: string; // 'mmHg', 'bpm', 'mg/dL', '°C', 'kg' など

  notes?: string; // メモ（例：測定条件、体調など）

  // Backend-linked metadata
  suiObjectId?: string; // VitalSignEntry object ID
  walrusBlobId?: string; // Walrus blob ID
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

/**
 * 患者プロフィール
 */
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

export type CountryCode = string; // ISO 3166-1 alpha-2

export type SmokingStatus = 'never' | 'former' | 'current' | 'unknown';
export type AlcoholUse = 'none' | 'light' | 'moderate' | 'heavy' | 'unknown';
export type ExerciseFrequency = 'none' | '1-2/week' | '3-5/week' | 'daily' | 'unknown';

export type SurgeryCategory =
  | 'cardiac'
  | 'orthopedic'
  | 'gi'
  | 'gynecology'
  | 'urology'
  | 'ophthalmology'
  | 'other';

export type DataSharingPreference = 'allow' | 'deny' | 'ask-every-time';

export interface DrugAllergy {
  name: string;
  severity: 'mild' | 'moderate' | 'severe';
}

export interface ChronicCondition {
  label: string;
  code?: string; // ICD-10等
}

export interface Surgery {
  category: SurgeryCategory;
  year?: number;
  note?: string;
}

export interface EmergencyContact {
  label?: string;
  contactInfo?: string;
  preferredEmergencyLanguage?: string;
}

export interface DataSharing {
  preference: DataSharingPreference;
  shareMedication: boolean;
  shareLabs: boolean;
  shareConditions: boolean;
  shareSurgeries: boolean;
  shareLifestyle: boolean;
  rewardsEnabled: boolean;
}

export interface PatientProfile {
  // 基本情報
  name?: string; // ユーザー名（SBT実装前の一時的な保存用）
  ageBand: AgeBand | null;
  gender: Gender;
  country: CountryCode | null;
  preferredLanguage: string | null;
  bloodType?: 'A' | 'B' | 'O' | 'AB' | 'unknown';
  heightCm?: number;
  weightKg?: number;

  // 生活習慣
  smokingStatus: SmokingStatus;
  alcoholUse: AlcoholUse;
  exercise: ExerciseFrequency;

  // 医療上のアラート
  drugAllergies: DrugAllergy[];
  foodAllergies: string[];
  hasAnaphylaxisHistory: boolean | null;

  // 基礎疾患・慢性疾患
  chronicConditions: ChronicCondition[];

  // 手術歴
  surgeries: Surgery[];

  // 緊急連絡情報
  emergencyContact?: EmergencyContact;

  // データ共有設定
  dataSharing: DataSharing;

  // メタ情報
  updatedAt?: string;
}

export interface AppState {
  walletAddress: string | null;
  medications: Medication[];
  allergies: Allergy[];
  medicalHistories: MedicalHistory[];
  labResults: LabResult[];
  imagingReports: ImagingReport[];
  vitalSigns: VitalSign[];
  settings: UserSettings;
  profile: PatientProfile | null;
  isLoading: boolean;
}

// Theme configuration
export interface ThemeConfig {
  id: ThemeId;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
  };
}
