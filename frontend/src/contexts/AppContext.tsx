'use client';

import type { AppState, Medication, UserSettings } from '@/types';
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { walletService } from '@/lib/walletService';

interface AppContextType extends AppState {
  setWalletAddress: (address: string | null) => void;
  setMedications: (medications: Medication[]) => void;
  addMedication: (medication: Medication) => void;
  updateMedication: (id: string, updates: Partial<Medication>) => void;
  deleteMedication: (id: string) => void;
  updateSettings: (settings: Partial<UserSettings>) => void;
  setLoading: (loading: boolean) => void;
}

const defaultSettings: UserSettings = {
  theme: 'classic-blue',
  locale: 'en',
  analyticsOptIn: false,
  emergencyCard: {
    showName: false,
  },
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [walletAddress, setWalletAddressState] = useState<string | null>(null);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(false);

  // Restore wallet and settings from localStorage on mount
  useEffect(() => {
    walletService.restore();
    const address = walletService.getAddress();
    setWalletAddressState(address);

    // Restore settings from localStorage
    const savedSettings = localStorage.getItem('userSettings');
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (e) {
        console.error('Failed to parse saved settings', e);
      }
    }
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('userSettings', JSON.stringify(settings));
  }, [settings]);

  const setWalletAddress = (address: string | null) => {
    setWalletAddressState(address);
  };

  const addMedication = (medication: Medication) => {
    setMedications((prev) => [...prev, medication]);
  };

  const updateMedication = (id: string, updates: Partial<Medication>) => {
    setMedications((prev) =>
      prev.map((med) => (med.id === id ? { ...med, ...updates } : med))
    );
  };

  const deleteMedication = (id: string) => {
    setMedications((prev) => prev.filter((med) => med.id !== id));
  };

  const updateSettings = (newSettings: Partial<UserSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const setLoading = (loading: boolean) => {
    setIsLoading(loading);
  };

  return (
    <AppContext.Provider
      value={{
        walletAddress,
        medications,
        settings,
        isLoading,
        setWalletAddress,
        setMedications,
        addMedication,
        updateMedication,
        deleteMedication,
        updateSettings,
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
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
