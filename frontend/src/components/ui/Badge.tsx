import { useApp } from "@/contexts/AppContext";
import { themes } from "@/lib/themes";

interface BadgeProps {
	children: React.ReactNode;
	type?: "default" | "primary" | "alert" | "gold";
}

export function Badge({ children, type = "default" }: BadgeProps) {
	const { settings } = useApp();
	const theme = themes[settings.theme];

	let bgColor = "#f1f5f9";
	let textColor = "#64748b";

	if (type === "primary") {
		bgColor = `${theme.colors.primary}20`;
		textColor = theme.colors.primary;
	} else if (type === "alert") {
		bgColor = `${theme.colors.accent}20`;
		textColor = theme.colors.accent;
	} else if (type === "gold") {
		bgColor = "#F6E05E20";
		textColor = "#D69E2E";
	}

	return (
		<span
			className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider"
			style={{
				backgroundColor: bgColor,
				color: textColor,
			}}
		>
			{children}
		</span>
	);
}
