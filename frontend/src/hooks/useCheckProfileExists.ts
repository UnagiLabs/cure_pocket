import { useEffect, useState } from "react";
import { usePassport } from "@/hooks/usePassport";
import { getDataEntryBlobIds } from "@/lib/suiClient";

/**
 * Check if basic_profile data exists in the passport's Dynamic Fields
 *
 * @returns {Object} - { profileExists: boolean, loading: boolean }
 */
export function useCheckProfileExists() {
	const { passport, has_passport } = usePassport();
	const [profileExists, setProfileExists] = useState<boolean>(false);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		async function checkProfile() {
			// Reset state when dependencies change
			setLoading(true);
			setProfileExists(false);

			if (!has_passport || !passport) {
				setLoading(false);
				return;
			}

			try {
				const blobIds = await getDataEntryBlobIds(passport.id, "basic_profile");
				setProfileExists(blobIds.length > 0);
			} catch (error) {
				console.error(
					"[useCheckProfileExists] Failed to check profile existence:",
					error,
				);
				setProfileExists(false);
			} finally {
				setLoading(false);
			}
		}

		checkProfile();
	}, [has_passport, passport]);

	return { profileExists, loading };
}
