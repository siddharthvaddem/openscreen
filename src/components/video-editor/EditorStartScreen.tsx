import { FolderOpen, Monitor, Upload } from "lucide-react";
import type { ReactNode } from "react";
import { useScopedT } from "@/contexts/I18nContext";

interface EditorStartScreenProps {
	onStartRecording: () => void | Promise<void>;
	onImportVideo: () => void | Promise<void>;
	onOpenProject: () => void | Promise<void>;
}

function ActionCard({
	icon,
	title,
	description,
	onClick,
	primary = false,
}: {
	icon: ReactNode;
	title: string;
	description: string;
	onClick: () => void | Promise<void>;
	primary?: boolean;
}) {
	return (
		<button
			type="button"
			onClick={() => void onClick()}
			className={`group rounded-3xl border text-left transition-all duration-200 ${
				primary
					? "border-[#34B27B]/30 bg-[#34B27B]/10 hover:bg-[#34B27B]/16 hover:border-[#34B27B]/40"
					: "border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/15"
			} p-5 sm:p-6`}
		>
			<div
				className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl ${
					primary ? "bg-[#34B27B] text-white" : "bg-white/8 text-white"
				}`}
			>
				{icon}
			</div>
			<div className="text-lg font-semibold tracking-[-0.02em] text-white group-hover:text-white/95">
				{title}
			</div>
			<div className="mt-2 text-sm leading-6 text-white/55">{description}</div>
		</button>
	);
}

export function EditorStartScreen({
	onStartRecording,
	onImportVideo,
	onOpenProject,
}: EditorStartScreenProps) {
	const t = useScopedT("editor");

	return (
		<div className="flex h-screen flex-col bg-[#09090b] text-slate-200 overflow-hidden">
			<div className="flex min-h-0 flex-1 items-center justify-center px-6 py-10">
				<div className="w-full max-w-5xl">
					<div className="mx-auto max-w-2xl text-center">
						<div className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-white/35">
							Auto Screen
						</div>
						<h1 className="text-4xl font-semibold tracking-[-0.05em] text-white sm:text-5xl">
							{t("startScreen.title")}
						</h1>
						<p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-white/55 sm:text-base">
							{t("startScreen.description")}
						</p>
					</div>

					<div className="mx-auto mt-10 grid max-w-4xl gap-4 md:grid-cols-2">
						<ActionCard
							icon={<Monitor size={22} />}
							title={t("startScreen.record.title")}
							description={t("startScreen.record.description")}
							onClick={onStartRecording}
							primary
						/>
						<ActionCard
							icon={<Upload size={22} />}
							title={t("startScreen.import.title")}
							description={t("startScreen.import.description")}
							onClick={onImportVideo}
						/>
					</div>

					<div className="mt-6 text-center">
						<button
							type="button"
							onClick={() => void onOpenProject()}
							className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/[0.08] hover:text-white"
						>
							<FolderOpen size={16} />
							<span>{t("startScreen.openProject")}</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
