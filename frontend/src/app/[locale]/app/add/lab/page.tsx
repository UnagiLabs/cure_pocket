"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { LabForm } from "@/components/forms/LabForm";
import { getTheme } from "@/lib/themes";
import { useApp } from "@/contexts/AppContext";

/**
 * 検査値の追加フォームページ
 */
export default function AddLabPage() {
	const t = useTranslations();
	const router = useRouter();
	const locale = useLocale();
	const { settings } = useApp();
	const theme = getTheme(settings.theme);

	return (
		<div className="p-4 md:p-6">
			{/* Header */}
			<div className="mb-6 md:mb-8">
				<h1
					className="text-lg font-bold md:text-2xl"
					style={{ color: theme.colors.text }}
				>
					{t("labs.add")}
				</h1>
			</div>

			{/* Form: reuse LabForm so Add > 検査値 でも同じUI */}
			<LabForm
				onSaved={() => {
					// After saving, go back to main app dashboard
					router.push(`/${locale}/app/labs`);
				}}
				onCancel={() => {
					router.back();
				}}
			/>
		</div>
	);
}
