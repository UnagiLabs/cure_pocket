import type { Medication } from '@/types';

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
  expiresAt: string; // ISO date
}

export const apiClient = {
  async fetchMedications(
    walletAddress: string
  ): Promise<FetchMedicationsResponse> {
    const res = await fetch(`/api/medications?wallet=${walletAddress}`);
    if (!res.ok) throw new Error('Failed to fetch medications');
    return res.json();
  },

  async createMedication(
    payload: CreateMedicationPayload
  ): Promise<CreateMedicationResponse> {
    const res = await fetch('/api/medications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to create medication');
    return res.json();
  },

  async updateMedication(
    id: string,
    updates: Partial<Medication>
  ): Promise<CreateMedicationResponse> {
    const res = await fetch(`/api/medications/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update medication');
    return res.json();
  },

  async deleteMedication(id: string): Promise<void> {
    const res = await fetch(`/api/medications/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete medication');
  },

  async createConsentToken(
    walletAddress: string
  ): Promise<CreateConsentTokenResponse> {
    const res = await fetch('/api/consent-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress }),
    });
    if (!res.ok) throw new Error('Failed to create consent token');
    return res.json();
  },
};
