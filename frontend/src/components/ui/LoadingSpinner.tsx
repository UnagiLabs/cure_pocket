interface LoadingSpinnerProps {
	size?: "sm" | "md" | "lg";
	className?: string;
	message?: string;
}

export default function LoadingSpinner({
	size = "md",
	className = "",
	message,
}: LoadingSpinnerProps) {
	const sizeClasses = {
		sm: "w-4 h-4 border-2",
		md: "w-8 h-8 border-4",
		lg: "w-12 h-12 border-4",
	};

	return (
		<div
			className={`flex flex-col items-center justify-center gap-3 ${className}`}
		>
			{/* biome-ignore lint/a11y/useSemanticElements: role="status" is the correct ARIA pattern for loading spinners */}
			<div
				className={`${sizeClasses[size]} animate-spin rounded-full border-gray-300 border-t-primary dark:border-gray-600 dark:border-t-primary`}
				role="status"
				aria-label="Loading"
			/>
			{message && (
				<p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
			)}
		</div>
	);
}
