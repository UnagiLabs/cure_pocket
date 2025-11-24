import type {
	Allergy,
	ImagingReport,
	LabResult,
	MedicalHistory,
	Medication,
} from "@/types";

export interface CreateMedicationPayload {
	walletAddress: string;
	medication: Omit<Medication, "id" | "suiObjectId" | "walrusBlobId">;
}

export interface CreateMedicationResponse {
	medication: Medication; // id, suiObjectId, walrusBlobId が埋まった状態
}

export interface FetchMedicationsResponse {
	medications: Medication[];
}

export interface CreateAllergyPayload {
	walletAddress: string;
	allergy: Omit<Allergy, "id" | "suiObjectId" | "walrusBlobId">;
}

export interface CreateAllergyResponse {
	allergy: Allergy;
}

export interface FetchAllergiesResponse {
	allergies: Allergy[];
}

export interface CreateMedicalHistoryPayload {
	walletAddress: string;
	history: Omit<MedicalHistory, "id" | "suiObjectId" | "walrusBlobId">;
}

export interface CreateMedicalHistoryResponse {
	history: MedicalHistory;
}

export interface FetchMedicalHistoriesResponse {
	histories: MedicalHistory[];
}

export interface CreateLabResultPayload {
	walletAddress: string;
	result: Omit<LabResult, "id" | "suiObjectId" | "walrusBlobId">;
}

export interface CreateLabResultResponse {
	result: LabResult;
}

export interface FetchLabResultsResponse {
	results: LabResult[];
}

export interface CreateImagingReportPayload {
	walletAddress: string;
	report: Omit<ImagingReport, "id" | "suiObjectId" | "walrusBlobId">;
}

export interface CreateImagingReportResponse {
	report: ImagingReport;
}

export interface FetchImagingReportsResponse {
	reports: ImagingReport[];
}

export interface CreateConsentTokenPayload {
	walletAddress: string;
	categories?: (
		| "medications"
		| "allergies"
		| "histories"
		| "labs"
		| "imaging"
		| "vitals"
	)[]; // 表示するカテゴリー
}

export interface CreateConsentTokenResponse {
	consentUrl: string; // doctor view URL
	expiresAt: string; // ISO date
	tokenId?: string;
	categories?: string[];
	durationHours?: number;
}

export const apiClient = {
	async fetchMedications(
		walletAddress: string,
	): Promise<FetchMedicationsResponse> {
		const res = await fetch(`/api/medications?wallet=${walletAddress}`);
		if (!res.ok) throw new Error("Failed to fetch medications");
		return res.json();
	},

	async createMedication(
		payload: CreateMedicationPayload,
	): Promise<CreateMedicationResponse> {
		const res = await fetch("/api/medications", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		});
		if (!res.ok) throw new Error("Failed to create medication");
		return res.json();
	},

	async updateMedication(
		id: string,
		updates: Partial<Medication>,
	): Promise<CreateMedicationResponse> {
		const res = await fetch(`/api/medications/${id}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(updates),
		});
		if (!res.ok) throw new Error("Failed to update medication");
		return res.json();
	},

	async deleteMedication(id: string): Promise<void> {
		const res = await fetch(`/api/medications/${id}`, {
			method: "DELETE",
		});
		if (!res.ok) throw new Error("Failed to delete medication");
	},

	async createConsentToken(
		payload: CreateConsentTokenPayload,
	): Promise<CreateConsentTokenResponse> {
		const res = await fetch("/api/consent-token", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		});
		if (!res.ok) throw new Error("Failed to create consent token");
		return res.json();
	},

	// Allergy API methods
	async fetchAllergies(walletAddress: string): Promise<FetchAllergiesResponse> {
		const res = await fetch(`/api/allergies?wallet=${walletAddress}`);
		if (!res.ok) throw new Error("Failed to fetch allergies");
		return res.json();
	},

	async createAllergy(
		payload: CreateAllergyPayload,
	): Promise<CreateAllergyResponse> {
		const res = await fetch("/api/allergies", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		});
		if (!res.ok) throw new Error("Failed to create allergy");
		return res.json();
	},

	async updateAllergy(
		id: string,
		updates: Partial<Allergy>,
	): Promise<CreateAllergyResponse> {
		const res = await fetch(`/api/allergies/${id}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(updates),
		});
		if (!res.ok) throw new Error("Failed to update allergy");
		return res.json();
	},

	async deleteAllergy(id: string): Promise<void> {
		const res = await fetch(`/api/allergies/${id}`, {
			method: "DELETE",
		});
		if (!res.ok) throw new Error("Failed to delete allergy");
	},

	// MedicalHistory API methods
	async fetchMedicalHistories(
		walletAddress: string,
	): Promise<FetchMedicalHistoriesResponse> {
		const res = await fetch(`/api/histories?wallet=${walletAddress}`);
		if (!res.ok) throw new Error("Failed to fetch medical histories");
		return res.json();
	},

	async createMedicalHistory(
		payload: CreateMedicalHistoryPayload,
	): Promise<CreateMedicalHistoryResponse> {
		const res = await fetch("/api/histories", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		});
		if (!res.ok) throw new Error("Failed to create medical history");
		return res.json();
	},

	async updateMedicalHistory(
		id: string,
		updates: Partial<MedicalHistory>,
	): Promise<CreateMedicalHistoryResponse> {
		const res = await fetch(`/api/histories/${id}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(updates),
		});
		if (!res.ok) throw new Error("Failed to update medical history");
		return res.json();
	},

	async deleteMedicalHistory(id: string): Promise<void> {
		const res = await fetch(`/api/histories/${id}`, {
			method: "DELETE",
		});
		if (!res.ok) throw new Error("Failed to delete medical history");
	},

	// LabResult API methods
	async fetchLabResults(
		walletAddress: string,
	): Promise<FetchLabResultsResponse> {
		const res = await fetch(`/api/labs?wallet=${walletAddress}`);
		if (!res.ok) throw new Error("Failed to fetch lab results");
		return res.json();
	},

	async createLabResult(
		payload: CreateLabResultPayload,
	): Promise<CreateLabResultResponse> {
		const res = await fetch("/api/labs", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		});
		if (!res.ok) throw new Error("Failed to create lab result");
		return res.json();
	},

	async updateLabResult(
		id: string,
		updates: Partial<LabResult>,
	): Promise<CreateLabResultResponse> {
		const res = await fetch(`/api/labs/${id}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(updates),
		});
		if (!res.ok) throw new Error("Failed to update lab result");
		return res.json();
	},

	async deleteLabResult(id: string): Promise<void> {
		const res = await fetch(`/api/labs/${id}`, {
			method: "DELETE",
		});
		if (!res.ok) throw new Error("Failed to delete lab result");
	},

	// ImagingReport API methods
	async fetchImagingReports(
		walletAddress: string,
	): Promise<FetchImagingReportsResponse> {
		const res = await fetch(`/api/imaging?wallet=${walletAddress}`);
		if (!res.ok) throw new Error("Failed to fetch imaging reports");
		return res.json();
	},

	async createImagingReport(
		payload: CreateImagingReportPayload,
	): Promise<CreateImagingReportResponse> {
		const res = await fetch("/api/imaging", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		});
		if (!res.ok) throw new Error("Failed to create imaging report");
		return res.json();
	},

	async updateImagingReport(
		id: string,
		updates: Partial<ImagingReport>,
	): Promise<CreateImagingReportResponse> {
		const res = await fetch(`/api/imaging/${id}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(updates),
		});
		if (!res.ok) throw new Error("Failed to update imaging report");
		return res.json();
	},

	async deleteImagingReport(id: string): Promise<void> {
		const res = await fetch(`/api/imaging/${id}`, {
			method: "DELETE",
		});
		if (!res.ok) throw new Error("Failed to delete imaging report");
	},
};
