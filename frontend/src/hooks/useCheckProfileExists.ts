import { useCallback, useEffect, useState } from "react";
import { usePassport } from "@/hooks/usePassport";
import { getDataEntry } from "@/lib/suiClient";

/**
 * Check if basic_profile data exists in the passport's Dynamic Fields (v3.0.0)
 *
 * @returns {Object} - { profileExists: boolean, loading: boolean, error: string | null, refetch: () => void }
 */
export function useCheckProfileExists() {
	const { passport, has_passport } = usePassport();
	const [profileExists, setProfileExists] = useState<boolean>(false);
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);

	const checkProfile = useCallback(async () => {
		// Reset state when checking
		setLoading(true);
		setProfileExists(false);
		setError(null);

		if (!has_passport || !passport) {
			setLoading(false);
			return;
		}

		try {
			// v3.0.0: Check if EntryData exists (contains metadataBlobId)
			const entryData = await getDataEntry(passport.id, "basic_profile");
			setProfileExists(entryData !== null && !!entryData.metadataBlobId);
			setError(null);
		} catch (err) {
			console.error(
				"[useCheckProfileExists] Failed to check profile existence:",
				err,
			);
			setProfileExists(false);

			// Distinguish network errors from other errors
			if (err instanceof Error) {
				if (
					err.message.includes("fetch") ||
					err.message.includes("network") ||
					err.message.includes("timeout")
				) {
					setError("ネットワークエラー: プロフィール確認に失敗しました");
				} else {
					setError(`エラー: ${err.message}`);
				}
			} else {
				setError("プロフィール確認中に不明なエラーが発生しました");
			}
		} finally {
			setLoading(false);
		}
	}, [has_passport, passport?.id]);

	useEffect(() => {
		checkProfile();
	}, [checkProfile]);

	return { profileExists, loading, error, refetch: checkProfile };
}
