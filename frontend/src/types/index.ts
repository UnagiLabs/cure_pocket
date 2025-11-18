export type ThemeId =
  | 'classic-blue'
  | 'mint-clinic'
  | 'sakura-notebook'
  | 'midnight-travel';

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
