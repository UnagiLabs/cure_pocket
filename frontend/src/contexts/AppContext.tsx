"use client";

import { useCurrentAccount } from "@mysten/dapp-kit";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import type {
  Allergy,
  AppState,
  ImagingReport,
  LabResult,
  MedicalHistory,
  Medication,
  PatientProfile,
  UserSettings,
} from "@/types";

interface AppContextType extends AppState {
  setWalletAddress: (address: string | null) => void;
  setMedications: (medications: Medication[]) => void;
  addMedication: (medication: Medication) => void;
  updateMedication: (id: string, updates: Partial<Medication>) => void;
  deleteMedication: (id: string) => void;
  setAllergies: (allergies: Allergy[]) => void;
  addAllergy: (allergy: Allergy) => void;
  updateAllergy: (id: string, updates: Partial<Allergy>) => void;
  deleteAllergy: (id: string) => void;
  setMedicalHistories: (histories: MedicalHistory[]) => void;
  addMedicalHistory: (history: MedicalHistory) => void;
  updateMedicalHistory: (id: string, updates: Partial<MedicalHistory>) => void;
  deleteMedicalHistory: (id: string) => void;
  setLabResults: (results: LabResult[]) => void;
  addLabResult: (result: LabResult) => void;
  updateLabResult: (id: string, updates: Partial<LabResult>) => void;
  deleteLabResult: (id: string) => void;
  setImagingReports: (reports: ImagingReport[]) => void;
  addImagingReport: (report: ImagingReport) => void;
  updateImagingReport: (id: string, updates: Partial<ImagingReport>) => void;
  deleteImagingReport: (id: string) => void;
  updateSettings: (settings: Partial<UserSettings>) => void;
  setProfile: (profile: PatientProfile | null) => void;
  updateProfile: (updates: Partial<PatientProfile>) => void;
  setLoading: (loading: boolean) => void;
}

const defaultSettings: UserSettings = {
  theme: "classic-blue",
  locale: "en",
  analyticsOptIn: false,
  emergencyCard: {
    showName: false,
  },
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  // Mysten dApp Kitから現在のアカウント情報を取得
  const currentAccount = useCurrentAccount();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [medicalHistories, setMedicalHistories] = useState<MedicalHistory[]>(
    [],
  );
  const [labResults, setLabResults] = useState<LabResult[]>([]);
  const [imagingReports, setImagingReports] = useState<ImagingReport[]>([]);
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // ウォレットアドレスはdApp Kitから取得
  const walletAddress = currentAccount?.address || null;

  // Restore settings from localStorage on mount
  useEffect(() => {
    // Restore settings from localStorage
    const savedSettings = localStorage.getItem("userSettings");
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (e) {
        console.error("Failed to parse saved settings", e);
      }
    }
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("userSettings", JSON.stringify(settings));
  }, [settings]);

  // setWalletAddressはdApp Kitが管理するため、空実装（後方互換性のため）
  const setWalletAddress = (_address: string | null) => {
    // dApp Kitが自動的に管理するため、何もしない
    console.warn(
      "setWalletAddress is deprecated. Wallet address is managed by dApp Kit.",
    );
  };

  const addMedication = (medication: Medication) => {
    setMedications((prev) => [...prev, medication]);
  };

  const updateMedication = (id: string, updates: Partial<Medication>) => {
    setMedications((prev) =>
      prev.map((med) => (med.id === id ? { ...med, ...updates } : med)),
    );
  };

  const deleteMedication = (id: string) => {
    setMedications((prev) => prev.filter((med) => med.id !== id));
  };

  // Allergy CRUD operations
  const addAllergy = (allergy: Allergy) => {
    setAllergies((prev) => [...prev, allergy]);
  };

  const updateAllergy = (id: string, updates: Partial<Allergy>) => {
    setAllergies((prev) =>
      prev.map((allergy) =>
        allergy.id === id ? { ...allergy, ...updates } : allergy,
      ),
    );
  };

  const deleteAllergy = (id: string) => {
    setAllergies((prev) => prev.filter((allergy) => allergy.id !== id));
  };

  // MedicalHistory CRUD operations
  const addMedicalHistory = (history: MedicalHistory) => {
    setMedicalHistories((prev) => [...prev, history]);
  };

  const updateMedicalHistory = (
    id: string,
    updates: Partial<MedicalHistory>,
  ) => {
    setMedicalHistories((prev) =>
      prev.map((history) =>
        history.id === id ? { ...history, ...updates } : history,
      ),
    );
  };

  const deleteMedicalHistory = (id: string) => {
    setMedicalHistories((prev) => prev.filter((history) => history.id !== id));
  };

  // LabResult CRUD operations
  const addLabResult = (result: LabResult) => {
    setLabResults((prev) => [...prev, result]);
  };

  const updateLabResult = (id: string, updates: Partial<LabResult>) => {
    setLabResults((prev) =>
      prev.map((result) =>
        result.id === id ? { ...result, ...updates } : result,
      ),
    );
  };

  const deleteLabResult = (id: string) => {
    setLabResults((prev) => prev.filter((result) => result.id !== id));
  };

  // ImagingReport CRUD operations
  const addImagingReport = (report: ImagingReport) => {
    setImagingReports((prev) => [...prev, report]);
  };

  const updateImagingReport = (id: string, updates: Partial<ImagingReport>) => {
    setImagingReports((prev) =>
      prev.map((report) =>
        report.id === id ? { ...report, ...updates } : report,
      ),
    );
  };

  const deleteImagingReport = (id: string) => {
    setImagingReports((prev) => prev.filter((report) => report.id !== id));
  };

  const updateSettings = (newSettings: Partial<UserSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const updateProfile = (updates: Partial<PatientProfile>) => {
    setProfile((prev) => {
      if (!prev) {
        // 初期プロフィールを作成
        const defaultProfile: PatientProfile = {
          ageBand: null,
          gender: "unknown",
          country: null,
          preferredLanguage: null,
          smokingStatus: "unknown",
          alcoholUse: "unknown",
          exercise: "unknown",
          drugAllergies: [],
          foodAllergies: [],
          hasAnaphylaxisHistory: null,
          chronicConditions: [],
          surgeries: [],
          dataSharing: {
            preference: "deny",
            shareMedication: false,
            shareLabs: false,
            shareConditions: false,
            shareSurgeries: false,
            shareLifestyle: false,
            rewardsEnabled: false,
          },
          ...updates,
        };
        return defaultProfile;
      }
      return { ...prev, ...updates };
    });
  };

  const setLoading = (loading: boolean) => {
    setIsLoading(loading);
  };

  return (
    <AppContext.Provider
      value={{
        walletAddress,
        medications,
        allergies,
        medicalHistories,
        labResults,
        imagingReports,
        settings,
        profile,
        isLoading,
        setWalletAddress,
        setMedications,
        addMedication,
        updateMedication,
        deleteMedication,
        setAllergies,
        addAllergy,
        updateAllergy,
        deleteAllergy,
        setMedicalHistories,
        addMedicalHistory,
        updateMedicalHistory,
        deleteMedicalHistory,
        setLabResults,
        addLabResult,
        updateLabResult,
        deleteLabResult,
        setImagingReports,
        addImagingReport,
        updateImagingReport,
        deleteImagingReport,
        updateSettings,
        setProfile,
        updateProfile,
        setLoading,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
