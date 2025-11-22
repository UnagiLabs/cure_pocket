"use client";

import { useCurrentAccount } from "@mysten/dapp-kit";
import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useState,
} from "react";
import { usePassport } from "@/hooks/usePassport";
import { useSessionKeyManager } from "@/hooks/useSessionKeyManager";
import {
	buildPatientAccessPTB,
	createSealClient,
	decryptHealthData,
} from "@/lib/seal";
import {
	getDataEntryBlobIds,
	getSuiClient,
	PASSPORT_REGISTRY_ID,
} from "@/lib/suiClient";
import { downloadFromWalrusByBlobId } from "@/lib/walrus";
import type {
	Allergy,
	AppState,
	ImagingReport,
	LabResult,
	MedicalHistory,
	Medication,
	PatientProfile,
	Prescription,
	UserSettings,
	VitalSign,
} from "@/types";
import type { BasicProfileData, ConditionsData } from "@/types/healthData";

interface AppContextType extends AppState {
	setWalletAddress: (address: string | null) => void;
	setMedications: (medications: Medication[]) => void;
	addMedication: (medication: Medication) => void;
	updateMedication: (id: string, updates: Partial<Medication>) => void;
	deleteMedication: (id: string) => void;
	setPrescriptions: (prescriptions: Prescription[]) => void;
	addPrescription: (prescription: Prescription) => void;
	updatePrescription: (id: string, updates: Partial<Prescription>) => void;
	deletePrescription: (id: string) => void;
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
	setVitalSigns: (vitalSigns: VitalSign[]) => void;
	addVitalSign: (vitalSign: VitalSign) => void;
	updateVitalSign: (id: string, updates: Partial<VitalSign>) => void;
	deleteVitalSign: (id: string) => void;
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
	const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
	const [allergies, setAllergies] = useState<Allergy[]>([]);
	const [medicalHistories, setMedicalHistories] = useState<MedicalHistory[]>(
		[],
	);
	const [labResults, setLabResults] = useState<LabResult[]>([]);
	const [imagingReports, setImagingReports] = useState<ImagingReport[]>([]);
	const [vitalSigns, setVitalSigns] = useState<VitalSign[]>([]);
	const [settings, setSettings] = useState<UserSettings>(defaultSettings);
	const [profile, setProfile] = useState<PatientProfile | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	// Passport and session key hooks
	const { passport, has_passport, loading: passportLoading } = usePassport();
	const {
		sessionKey,
		generateSessionKey,
		isValid: sessionKeyValid,
	} = useSessionKeyManager();

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

	// Initialize profile data from encrypted storage
	useEffect(() => {
		/**
		 * Load and decrypt profile data from Walrus storage
		 */
		async function initializeProfileData() {
			// Skip if no wallet connected
			if (!currentAccount?.address) {
				return;
			}

			// Skip if still loading passport
			if (passportLoading) {
				return;
			}

			// Skip if no passport
			if (!has_passport || !passport) {
				console.log("[AppContext] No passport found, skipping data load");
				return;
			}

			// TODO: Dynamic Fields対応
			// 現在はseal_idの存在のみチェック
			// 将来的にはDynamic Fieldsから各data_typeのblob_idsを取得する必要がある
			if (!passport.sealId) {
				console.log("[AppContext] Passport has no seal_id, skipping data load");
				return;
			}

			// Skip if profile already loaded
			if (profile !== null) {
				return;
			}

			setIsLoading(true);

			try {
				console.log("[AppContext] Initializing profile data from passport...");

				// Step 1: Ensure SessionKey is valid
				console.log("[AppContext] Checking SessionKey...");
				if (!sessionKey || !sessionKeyValid) {
					console.log("[AppContext] Generating new SessionKey...");
					await generateSessionKey();
					return; // useEffect will re-run after sessionKey is created
				}

				// Step 2: Load basic_profile data from Dynamic Fields
				console.log("[AppContext] Loading basic_profile data...");
				const basicProfileBlobIds = await getDataEntryBlobIds(
					passport.id,
					"basic_profile",
				);

				if (basicProfileBlobIds.length === 0) {
					console.log(
						"[AppContext] No basic_profile data found, user needs to complete profile setup",
					);
					setIsLoading(false);
					return;
				}

				// Use the latest blob (last element in array)
				const latestBlobId =
					basicProfileBlobIds[basicProfileBlobIds.length - 1];
				console.log(
					"[AppContext] Downloading basic_profile blob:",
					latestBlobId,
				);

				// Step 3: Download encrypted data from Walrus
				const encryptedData = await downloadFromWalrusByBlobId(latestBlobId);

				// Step 4: Build transaction bytes for decryption
				const suiClient = getSuiClient();
				const txBytes = await buildPatientAccessPTB({
					passportObjectId: passport.id,
					registryObjectId: PASSPORT_REGISTRY_ID,
					suiClient,
					sealId: passport.sealId,
				});

				// Step 5: Create Seal client and decrypt
				const sealClient = createSealClient(suiClient);
				const decryptedData = await decryptHealthData({
					encryptedData,
					sealClient,
					sessionKey,
					txBytes,
					sealId: passport.sealId,
				});

				// Step 6: Convert BasicProfileData to PatientProfile
				const basicProfileData = decryptedData as BasicProfileData;

				// Manual conversion from BasicProfileData to PatientProfile
				// (healthDataToPatientProfile expects old HealthData format)
				const birthYear = basicProfileData.profile.birth_year;
				const currentYear = new Date().getFullYear();
				const age = currentYear - birthYear;

				let ageBand: PatientProfile["ageBand"] = null;
				if (age >= 10 && age < 20) ageBand = "10s";
				else if (age >= 20 && age < 30) ageBand = "20s";
				else if (age >= 30 && age < 40) ageBand = "30s";
				else if (age >= 40 && age < 50) ageBand = "40s";
				else if (age >= 50 && age < 60) ageBand = "50s";
				else if (age >= 60 && age < 70) ageBand = "60s";
				else if (age >= 70 && age < 80) ageBand = "70s";
				else if (age >= 80) ageBand = "80plus";

				const decryptedProfile: PatientProfile = {
					birthDate: null,
					ageBand,
					gender:
						basicProfileData.profile.gender === "other"
							? "unknown"
							: (basicProfileData.profile.gender as
									| "male"
									| "female"
									| "unknown"),
					country: basicProfileData.profile.country || null,
					preferredLanguage: null,
					heightCm: basicProfileData.profile.biometrics?.height_cm,
					weightKg: basicProfileData.profile.biometrics?.weight_kg,
					bloodType: basicProfileData.profile
						.blood_type as PatientProfile["bloodType"],
					smokingStatus: "unknown",
					alcoholUse: "unknown",
					exercise: "unknown",
					drugAllergies: basicProfileData.allergies
						.filter((a) => a.substance.code_type === "rxnorm")
						.map((a) => ({
							name: a.substance.name,
							severity: a.severity as "mild" | "moderate" | "severe",
						})),
					foodAllergies: basicProfileData.allergies
						.filter((a) => a.substance.code_type === "food")
						.map((a) => a.substance.name),
					hasAnaphylaxisHistory: basicProfileData.allergies.some(
						(a) => a.severity === "severe",
					),
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
				};
				setProfile(decryptedProfile);

				// Set allergies from basic_profile
				if (basicProfileData.allergies) {
					const convertedAllergies = basicProfileData.allergies.map(
						(allergy) => ({
							id: allergy.id,
							substance: allergy.substance.name,
							severity: allergy.severity as "mild" | "moderate" | "severe",
							symptoms: allergy.reaction || "",
							onsetDate: new Date().toISOString().split("T")[0],
							notes: "",
						}),
					);
					setAllergies(convertedAllergies);
				}

				console.log("[AppContext] Profile loaded successfully");

				// Step 7: Load conditions data (optional - may not exist)
				try {
					const conditionsBlobIds = await getDataEntryBlobIds(
						passport.id,
						"conditions",
					);

					if (conditionsBlobIds.length > 0) {
						const latestConditionsBlobId =
							conditionsBlobIds[conditionsBlobIds.length - 1];
						console.log(
							"[AppContext] Downloading conditions blob:",
							latestConditionsBlobId,
						);

						const encryptedConditionsData = await downloadFromWalrusByBlobId(
							latestConditionsBlobId,
						);
						const decryptedConditionsData = await decryptHealthData({
							encryptedData: encryptedConditionsData,
							sealClient,
							sessionKey,
							txBytes,
							sealId: passport.sealId,
						});

						const conditionsData = decryptedConditionsData as ConditionsData;

						// Convert Condition[] to MedicalHistory[]
						const medicalHistories: MedicalHistory[] =
							conditionsData.conditions.map((condition) => ({
								id: condition.id,
								type: "condition" as const,
								diagnosis: condition.name.en,
								diagnosisDate: condition.onset_date || "",
								status:
									condition.status === "resolved"
										? ("resolved" as const)
										: ("chronic" as const),
								description: condition.note || "",
								icd10Code: condition.codes.icd10,
								resolvedDate:
									condition.status === "resolved"
										? condition.note?.match(/完治日: (\d{4}-\d{2}-\d{2})/)?.[1]
										: undefined,
								notes: condition.note || "",
							}));

						setMedicalHistories(medicalHistories);

						console.log("[AppContext] Conditions loaded successfully");
					}
				} catch (conditionsError) {
					console.log(
						"[AppContext] No conditions data found or failed to load:",
						conditionsError,
					);
					// This is not critical - user may not have entered conditions yet
				}
			} catch (error) {
				console.error("[AppContext] Failed to initialize profile data:", error);
				// Don't block the app on decryption failure
				// User can still use the app and save new data
			} finally {
				setIsLoading(false);
			}
		}

		initializeProfileData();
	}, [
		currentAccount,
		passport,
		has_passport,
		passportLoading,
		profile,
		sessionKey,
		sessionKeyValid,
		generateSessionKey,
	]);

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

	// Prescription CRUD operations
	const addPrescription = (prescription: Prescription) => {
		setPrescriptions((prev) => [...prev, prescription]);
	};

	const updatePrescription = (id: string, updates: Partial<Prescription>) => {
		setPrescriptions((prev) =>
			prev.map((prescription) =>
				prescription.id === id ? { ...prescription, ...updates } : prescription,
			),
		);
	};

	const deletePrescription = (id: string) => {
		setPrescriptions((prev) =>
			prev.filter((prescription) => prescription.id !== id),
		);
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

	// VitalSign CRUD operations
	const addVitalSign = (vitalSign: VitalSign) => {
		setVitalSigns((prev) => [...prev, vitalSign]);
	};

	const updateVitalSign = (id: string, updates: Partial<VitalSign>) => {
		setVitalSigns((prev) =>
			prev.map((vital) => (vital.id === id ? { ...vital, ...updates } : vital)),
		);
	};

	const deleteVitalSign = (id: string) => {
		setVitalSigns((prev) => prev.filter((vital) => vital.id !== id));
	};

	const updateSettings = (newSettings: Partial<UserSettings>) => {
		setSettings((prev) => ({ ...prev, ...newSettings }));
	};

	const updateProfile = (updates: Partial<PatientProfile>) => {
		setProfile((prev) => {
			if (!prev) {
				// 初期プロフィールを作成
				const defaultProfile: PatientProfile = {
					birthDate: null,
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
				prescriptions,
				allergies,
				medicalHistories,
				labResults,
				imagingReports,
				vitalSigns,
				settings,
				profile,
				isLoading,
				setWalletAddress,
				setMedications,
				addMedication,
				updateMedication,
				deleteMedication,
				setPrescriptions,
				addPrescription,
				updatePrescription,
				deletePrescription,
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
				setVitalSigns,
				addVitalSign,
				updateVitalSign,
				deleteVitalSign,
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
