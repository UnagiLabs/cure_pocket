import type { ReactNode } from "react";
import { useApp } from "@/contexts/AppContext";
import { themes } from "@/lib/themes";

interface SectionTitleProps {
	children: ReactNode;
	action?: boolean;
	onActionClick?: () => void;
}

export function SectionTitle({ children, action, onActionClick }: SectionTitleProps) {
	const { settings } = useApp();
	const theme = themes[settings.theme];

	return (
		<div className="flex justify-between items-end mb-4 px-1">
			<h2
				className="text-lg font-bold tracking-wide"
				style={{ color: theme.colors.text }}
			>
				{children}
			</h2>
			{action && (
				<button
					onClick={onActionClick}
					className="text-xs font-medium hover:opacity-70 transition-opacity"
					style={{ color: theme.colors.primary }}
				>
					すべて見る
				</button>
			)}
		</div>
	);
}
