import type { ReactNode } from "react";
import { useApp } from "@/contexts/AppContext";
import { themes } from "@/lib/themes";

interface GlassCardProps {
	children: ReactNode;
	className?: string;
	onClick?: () => void;
}

export function GlassCard({
	children,
	className = "",
	onClick,
}: GlassCardProps) {
	const { settings } = useApp();
	const theme = themes[settings.theme];

	if (onClick) {
		return (
			<button
				type="button"
				onClick={onClick}
				className={`
				bg-white/80 backdrop-blur-md
				border border-white/40
				shadow-sm
				rounded-2xl
				p-5 transition-all duration-300 hover:scale-[1.01]
				cursor-pointer
				${className}
			`}
				style={{
					backgroundColor:
						theme.id === "midnight-travel"
							? `${theme.colors.surface}cc`
							: undefined,
					borderColor:
						theme.id === "midnight-travel"
							? `${theme.colors.textSecondary}40`
							: undefined,
				}}
			>
				{children}
			</button>
		);
	}

	return (
		<div
			className={`
				bg-white/80 backdrop-blur-md
				border border-white/40
				shadow-sm
				rounded-2xl
				p-5 transition-all duration-300 hover:scale-[1.01]
				${className}
			`}
			style={{
				backgroundColor:
					theme.id === "midnight-travel"
						? `${theme.colors.surface}cc`
						: undefined,
				borderColor:
					theme.id === "midnight-travel"
						? `${theme.colors.textSecondary}40`
						: undefined,
			}}
		>
			{children}
		</div>
	);
}
