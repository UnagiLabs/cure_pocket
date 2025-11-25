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
import { calculateAgeBandFromDate } from "@/lib/profileConverter";
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
	UserSettings,
	VitalSign,
} from "@/types";
import type {
	BasicProfileData,
	ConditionsData,
	ImagingStudyV2,
	LabResultsData,
	MedicationsData,
	SelfMetricsData,
} from "@/types/healthData";

/**
 * Loading states for different data types
 */
interface LoadingStates {
	basic_profile: boolean;
	conditions: boolean;
	medications: boolean;
	lab_results: boolean;
	vitals: boolean;
	imaging: boolean;
}

interface AppContextType extends AppState {
	loadingStates: LoadingStates;
	isLoadingProfile: boolean;
	refetchProfile: () => Promise<void>;
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
	const [isLoadingProfile, setIsLoadingProfile] = useState(false);
	const [isGeneratingSessionKey, setIsGeneratingSessionKey] = useState(false);

	// Loading states for individual data types
	const [loadingStates, setLoadingStates] = useState<LoadingStates>({
		basic_profile: false,
		conditions: false,
		medications: false,
		lab_results: false,
		vitals: false,
		imaging: false,
	});

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
		async function initializeProfileData() {
			// Early return conditions
			if (!currentAccount?.address || passportLoading) {
				setIsLoadingProfile(false);
				return;
			}

			if (!has_passport || !passport) {
				console.log("[AppContext] No passport found, skipping data load");
				setIsLoadingProfile(false);
				return;
			}

			if (!passport.sealId) {
				console.log("[AppContext] Passport has no seal_id, skipping data load");
				setIsLoadingProfile(false);
				return;
			}

			// Skip if already generating SessionKey
			if (isGeneratingSessionKey) {
				console.log(
					"[AppContext] SessionKey generation in progress, waiting...",
				);
				return;
			}

			// Step 1: Ensure SessionKey is valid
			if (!sessionKey || !sessionKeyValid) {
				console.log("[AppContext] SessionKey invalid, generating new one...");
				setIsLoadingProfile(true);
				setIsGeneratingSessionKey(true);
				try {
					await generateSessionKey();
					console.log(
						"[AppContext] SessionKey generation completed, will retry profile load",
					);
				} catch (error) {
					console.error("[AppContext] SessionKey generation failed:", error);
					setIsLoadingProfile(false);
				} finally {
					setIsGeneratingSessionKey(false);
				}
				// Don't continue - the effect will re-run when sessionKey changes
				return;
			}

			// Skip if profile already loaded
			if (profile !== null) {
				setIsLoadingProfile(false);
				return;
			}

			setIsLoading(true);
			setIsLoadingProfile(true);

			try {
				console.log("[AppContext] Initializing profile data from passport...");

				// Step 2: Setup decryption infrastructure
				const suiClient = getSuiClient();
				const txBytes = await buildPatientAccessPTB({
					passportObjectId: passport.id,
					registryObjectId: PASSPORT_REGISTRY_ID,
					suiClient,
					sealId: passport.sealId,
				});
				const sealClient = createSealClient(suiClient);

				// Step 3: Load basic_profile (required)
				setLoadingStates((prev) => ({ ...prev, basic_profile: true }));
				const basicProfileBlobIds = await getDataEntryBlobIds(
					passport.id,
					"basic_profile",
				);

				if (basicProfileBlobIds.length === 0) {
					console.log(
						"[AppContext] No basic_profile data found, user needs to complete profile setup",
					);
					setIsLoading(false);
					setLoadingStates((prev) => ({ ...prev, basic_profile: false }));
					return;
				}

				const latestBlobId =
					basicProfileBlobIds[basicProfileBlobIds.length - 1];
				const encryptedData = await downloadFromWalrusByBlobId(latestBlobId);
				const decryptedData = await decryptHealthData({
					encryptedData,
					sealClient,
					sessionKey,
					txBytes,
					sealId: passport.sealId,
				});

				const basicProfileData = decryptedData as BasicProfileData;
				const birthDate = basicProfileData.profile.birth_date || null;
				const calculatedAgeBand = birthDate
					? calculateAgeBandFromDate(birthDate)
					: null;

				const decryptedProfile: PatientProfile = {
					birthDate: birthDate,
					ageBand: calculatedAgeBand,
					gender:
						basicProfileData.profile.gender === "other"
							? "unknown"
							: (basicProfileData.profile.gender as
									| "male"
									| "female"
									| "unknown"),
					country: basicProfileData.profile.nationality || null,
					preferredLanguage: null,
					heightCm: undefined,
					weightKg: undefined,
					bloodType: basicProfileData.profile
						.blood_type as PatientProfile["bloodType"],
					smokingStatus: "unknown",
					alcoholUse: "unknown",
					exercise: "unknown",
					drugAllergies: [],
					foodAllergies: basicProfileData.profile.allergies || [],
					hasAnaphylaxisHistory: false,
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

				if (
					basicProfileData.profile.allergies &&
					basicProfileData.profile.allergies.length > 0
				) {
					const convertedAllergies = basicProfileData.profile.allergies.map(
						(allergyName, index) => ({
							id: `allergy-${index}`,
							substance: allergyName,
							severity: "moderate" as const,
							symptoms: "",
							onsetDate: new Date().toISOString().split("T")[0],
							notes: "",
						}),
					);
					setAllergies(convertedAllergies);
				}

				setLoadingStates((prev) => ({ ...prev, basic_profile: false }));
				console.log("[AppContext] Profile loaded successfully");

				// Step 4: Load additional data types in parallel
				const dataLoadPromises = [
					// Load conditions
					(async () => {
						setLoadingStates((prev) => ({ ...prev, conditions: true }));
						try {
							const conditionsBlobIds = await getDataEntryBlobIds(
								passport.id,
								"conditions",
							);

							if (conditionsBlobIds.length > 0) {
								const latestConditionsBlobId =
									conditionsBlobIds[conditionsBlobIds.length - 1];
								const encryptedConditionsData =
									await downloadFromWalrusByBlobId(latestConditionsBlobId);
								const decryptedConditionsData = await decryptHealthData({
									encryptedData: encryptedConditionsData,
									sealClient,
									sessionKey,
									txBytes,
									sealId: passport.sealId,
								});

								const conditionsData =
									decryptedConditionsData as ConditionsData;
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
												? condition.note?.match(
														/完治日: (\d{4}-\d{2}-\d{2})/,
													)?.[1]
												: undefined,
										notes: condition.note || "",
									}));

								setMedicalHistories(medicalHistories);
								console.log("[AppContext] Conditions loaded successfully");
							}
						} catch (error) {
							console.log(
								"[AppContext] No conditions data or failed to load:",
								error,
							);
						} finally {
							setLoadingStates((prev) => ({ ...prev, conditions: false }));
						}
					})(),

					// Load medications
					(async () => {
						setLoadingStates((prev) => ({ ...prev, medications: true }));
						try {
							const medicationsBlobIds = await getDataEntryBlobIds(
								passport.id,
								"medications",
							);

							if (medicationsBlobIds.length > 0) {
								const latestMedicationsBlobId =
									medicationsBlobIds[medicationsBlobIds.length - 1];
								const encryptedMedicationsData =
									await downloadFromWalrusByBlobId(latestMedicationsBlobId);
								const decryptedMedicationsData = await decryptHealthData({
									encryptedData: encryptedMedicationsData,
									sealClient,
									sessionKey,
									txBytes,
									sealId: passport.sealId,
								});

								const medicationsData =
									decryptedMedicationsData as MedicationsData;
								const convertedMedications: Medication[] =
									medicationsData.medications.map((med) => ({
										id: med.id,
										name: med.name.en,
										genericName: med.name.local,
										strength: undefined,
										form: undefined,
										dose: med.dosage,
										frequency: undefined,
										timing: undefined,
										startDate: med.start_date,
										endDate: med.end_date,
										reason: undefined,
										clinic: med.prescriber,
										warning: undefined,
										status: med.status === "active" ? "active" : "stopped",
									}));

								setMedications(convertedMedications);
								console.log("[AppContext] Medications loaded successfully");
							}
						} catch (error) {
							console.log(
								"[AppContext] No medications data or failed to load:",
								error,
							);
						} finally {
							setLoadingStates((prev) => ({ ...prev, medications: false }));
						}
					})(),

					// Load lab_results
					(async () => {
						setLoadingStates((prev) => ({ ...prev, lab_results: true }));
						try {
							const labResultsBlobIds = await getDataEntryBlobIds(
								passport.id,
								"lab_results",
							);

							if (labResultsBlobIds.length > 0) {
								const latestLabResultsBlobId =
									labResultsBlobIds[labResultsBlobIds.length - 1];
								const encryptedLabResultsData =
									await downloadFromWalrusByBlobId(latestLabResultsBlobId);
								const decryptedLabResultsData = await decryptHealthData({
									encryptedData: encryptedLabResultsData,
									sealClient,
									sessionKey,
									txBytes,
									sealId: passport.sealId,
								});

								const labResultsData =
									decryptedLabResultsData as LabResultsData;
								const convertedLabResults: LabResult[] = [];

								for (const labResult of labResultsData.lab_results) {
									for (const item of labResult.items) {
										convertedLabResults.push({
											id: `${labResult.id}-${item.codes.loinc || Math.random()}`,
											testName: item.name.en,
											value: item.value.toString(),
											unit: item.unit,
											referenceRange:
												item.range_low !== undefined &&
												item.range_high !== undefined
													? `${item.range_low}-${item.range_high}`
													: undefined,
											testDate: labResult.date,
											testedBy: undefined,
											category: labResult.category,
											notes: undefined,
										});
									}
								}

								setLabResults(convertedLabResults);
								console.log("[AppContext] Lab results loaded successfully");
							}
						} catch (error) {
							console.log(
								"[AppContext] No lab results data or failed to load:",
								error,
							);
						} finally {
							setLoadingStates((prev) => ({ ...prev, lab_results: false }));
						}
					})(),

					// Load self_metrics (vitals)
					(async () => {
						setLoadingStates((prev) => ({ ...prev, vitals: true }));
						try {
							const vitalsBlobIds = await getDataEntryBlobIds(
								passport.id,
								"self_metrics",
							);

							if (vitalsBlobIds.length > 0) {
								const latestVitalsBlobId =
									vitalsBlobIds[vitalsBlobIds.length - 1];
								const encryptedVitalsData =
									await downloadFromWalrusByBlobId(latestVitalsBlobId);
								const decryptedVitalsData = await decryptHealthData({
									encryptedData: encryptedVitalsData,
									sealClient,
									sessionKey,
									txBytes,
									sealId: passport.sealId,
								});

								const vitalsData =
									decryptedVitalsData as unknown as SelfMetricsData;
								const convertedVitals: VitalSign[] =
									vitalsData.self_metrics.map((metric) => {
										// Convert metric_type to VitalSignType
										let type: VitalSign["type"] = "heart-rate";
										if (metric.metric_type === "blood_pressure") {
											type = "blood-pressure";
										} else if (metric.metric_type === "heart_rate") {
											type = "heart-rate";
										} else if (metric.metric_type === "blood_glucose") {
											type = "blood-glucose";
										} else if (metric.metric_type === "temperature") {
											type = "temperature";
										} else if (metric.metric_type === "weight") {
											type = "weight";
										}

										return {
											id: metric.id,
											type: type,
											recordedAt: metric.recorded_at,
											systolic: metric.systolic,
											diastolic: metric.diastolic,
											value: metric.value,
											unit: metric.unit,
											notes: metric.notes,
										};
									});

								setVitalSigns(convertedVitals);
								console.log("[AppContext] Vitals loaded successfully");
							}
						} catch (error) {
							console.log(
								"[AppContext] No vitals data or failed to load:",
								error,
							);
						} finally {
							setLoadingStates((prev) => ({ ...prev, vitals: false }));
						}
					})(),

					// Load imaging
					(async () => {
						setLoadingStates((prev) => ({ ...prev, imaging: true }));
						try {
							const imagingBlobIds = await getDataEntryBlobIds(
								passport.id,
								"imaging_meta",
							);

							if (imagingBlobIds.length > 0) {
								const latestImagingBlobId =
									imagingBlobIds[imagingBlobIds.length - 1];
								const encryptedImagingData =
									await downloadFromWalrusByBlobId(latestImagingBlobId);
								const decryptedImagingData = await decryptHealthData({
									encryptedData: encryptedImagingData,
									sealClient,
									sessionKey,
									txBytes,
									sealId: passport.sealId,
								});

								// Cast to ImagingMetaData which contains imaging_meta: ImagingStudyV2[]
								const imagingMetaData = decryptedImagingData as unknown as {
									meta: unknown;
									imaging_meta: ImagingStudyV2[];
								};

								const convertedImaging: ImagingReport[] =
									imagingMetaData.imaging_meta.map((study) => {
										// Convert modality to ImagingType
										let type: ImagingReport["type"] = "other";
										const modalityLower = study.modality.toLowerCase();
										if (modalityLower.includes("ct")) {
											type = "ct";
										} else if (
											modalityLower.includes("mr") ||
											modalityLower.includes("mri")
										) {
											type = "mri";
										} else if (
											modalityLower.includes("us") ||
											modalityLower.includes("ultrasound")
										) {
											type = "ultrasound";
										} else if (
											modalityLower.includes("cr") ||
											modalityLower.includes("xr") ||
											modalityLower.includes("xray")
										) {
											type = "xray";
										}

										return {
											id: study.study_uid,
											type: type,
											bodyPart: study.body_site,
											examDate: study.performed_at || "",
											performedBy: study.facility,
											summary: study.report?.summary || "",
											findings: study.report?.findings,
											impression: study.report?.impression,
										};
									});

								setImagingReports(convertedImaging);
								console.log("[AppContext] Imaging loaded successfully");
							}
						} catch (error) {
							console.log(
								"[AppContext] No imaging data or failed to load:",
								error,
							);
						} finally {
							setLoadingStates((prev) => ({ ...prev, imaging: false }));
						}
					})(),
				];

				await Promise.allSettled(dataLoadPromises);
				console.log("[AppContext] All data loading completed");
			} catch (error) {
				console.error("[AppContext] Failed to initialize profile data:", error);
				setIsLoadingProfile(false);
			} finally {
				setIsLoading(false);
				setIsLoadingProfile(false);
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
		isGeneratingSessionKey,
	]);

	// setWalletAddressはdApp Kitが管理するため、空実装
	const setWalletAddress = (_address: string | null) => {
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

	const refetchProfile = async () => {
		console.log("[AppContext] Manual profile refetch requested");
		// Reset profile state to trigger reload
		setProfile(null);
		setIsLoadingProfile(true);
	};

	return (
		<AppContext.Provider
			value={{
				walletAddress,
				medications,
				prescriptions: [],
				allergies,
				medicalHistories,
				labResults,
				imagingReports,
				vitalSigns,
				settings,
				profile,
				isLoading,
				isLoadingProfile,
				loadingStates,
				refetchProfile,
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
