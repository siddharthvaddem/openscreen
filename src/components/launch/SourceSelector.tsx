import { useEffect, useState } from "react";
import { MdCheck } from "react-icons/md";
import { useScopedT } from "@/contexts/I18nContext";
import { Button } from "../ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import styles from "./SourceSelector.module.css";

interface DesktopSource {
	id: string;
	name: string;
	thumbnail: string | null;
	display_id: string;
	appIcon: string | null;
}

export function SourceSelector() {
	const t = useScopedT("launch");
	const tc = useScopedT("common");
	const [sources, setSources] = useState<DesktopSource[]>([]);
	const [selectedSource, setSelectedSource] = useState<DesktopSource | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		async function fetchSources() {
			setLoading(true);
			try {
				const rawSources = await window.electronAPI.getSources({
					types: ["screen", "window"],
					thumbnailSize: { width: 320, height: 180 },
					fetchWindowIcons: true,
				});
				setSources(
					rawSources.map((source) => ({
						id: source.id,
						name:
							source.id.startsWith("window:") && source.name.includes(" — ")
								? source.name.split(" — ")[1] || source.name
								: source.name,
						thumbnail: source.thumbnail,
						display_id: source.display_id,
						appIcon: source.appIcon,
					})),
				);
			} catch (error) {
				console.error("Error loading sources:", error);
			} finally {
				setLoading(false);
			}
		}
		fetchSources();
	}, []);

	const screenSources = sources.filter((s) => s.id.startsWith("screen:"));
	const windowSources = sources.filter((s) => s.id.startsWith("window:"));

	const handleSourceSelect = (source: DesktopSource) => setSelectedSource(source);
	const handleShare = async () => {
		if (selectedSource) await window.electronAPI.selectSource(selectedSource);
	};

	if (loading) {
		return (
			<div
				className={`h-full flex items-center justify-center ${styles.glassContainer}`}
				style={{ minHeight: "100vh" }}
			>
				<div className="text-center">
					<div className="animate-spin duration-500 rounded-[50%] h-6 w-6 border-2 border-b-transparent border-[#34B27B] mx-auto mb-2" />
					<p className="text-xs text-zinc-400">{t("sourceSelector.loading")}</p>
				</div>
			</div>
		);
	}

	const renderSourceCard = (source: DesktopSource) => {
		const isSelected = selectedSource?.id === source.id;
		return (
			<div
				key={source.id}
				className={`${styles.sourceCard} ${isSelected ? styles.selected : ""} p-1.5`}
				onClick={() => handleSourceSelect(source)}
			>
				<div className="relative mb-1.5 overflow-hidden rounded-lg border border-white/[0.06] bg-black/30">
					<img
						src={source.thumbnail || ""}
						alt={source.name}
						className="w-full aspect-video object-cover"
					/>
					{isSelected && (
						<div className="absolute right-1.5 top-1.5">
							<div className={styles.checkBadge}>
								<MdCheck size={11} className="text-white" />
							</div>
						</div>
					)}
				</div>
				<div className="flex items-center gap-1.5 px-1 pb-0.5">
					{source.appIcon && (
						<img src={source.appIcon} alt="" className={`${styles.icon} flex-shrink-0`} />
					)}
					<div className={`${styles.name} truncate`}>{source.name}</div>
				</div>
			</div>
		);
	};

	return (
		<div className={`min-h-screen flex flex-col ${styles.glassContainer}`}>
			<div className="flex-1 flex flex-col w-full px-3.5 pt-3.5">
				<Tabs
					defaultValue={screenSources.length === 0 ? "windows" : "screens"}
					className="flex-1 flex flex-col"
				>
					<TabsList className="mb-3 grid h-8 grid-cols-2 rounded-xl border border-white/[0.06] bg-white/[0.04] p-0.5">
						<TabsTrigger
							value="screens"
							className="rounded-lg py-1 text-[11px] text-zinc-400 transition-all data-[state=active]:bg-white/[0.12] data-[state=active]:text-white"
						>
							{t("sourceSelector.screens", { count: String(screenSources.length) })}
						</TabsTrigger>
						<TabsTrigger
							value="windows"
							className="rounded-lg py-1 text-[11px] text-zinc-400 transition-all data-[state=active]:bg-white/[0.12] data-[state=active]:text-white"
						>
							{t("sourceSelector.windows", { count: String(windowSources.length) })}
						</TabsTrigger>
					</TabsList>
					<div className="flex-1 min-h-0">
						<TabsContent value="screens" className="h-full mt-0">
							<div
								className={`grid h-[282px] auto-rows-min grid-cols-2 gap-2.5 overflow-y-auto pr-1.5 pt-1 ${styles.sourceGridScroll}`}
							>
								{screenSources.map(renderSourceCard)}
							</div>
						</TabsContent>
						<TabsContent value="windows" className="h-full mt-0">
							<div
								className={`grid h-[282px] auto-rows-min grid-cols-2 gap-2.5 overflow-y-auto pr-1.5 pt-1 ${styles.sourceGridScroll}`}
							>
								{windowSources.map(renderSourceCard)}
							</div>
						</TabsContent>
					</div>
				</Tabs>
			</div>
			<div className="flex justify-center gap-2 border-t border-white/[0.06] p-3">
				<Button
					variant="ghost"
					onClick={() => window.close()}
					className="h-8 rounded-lg px-5 text-[11px] text-zinc-400 transition-transform duration-150 hover:bg-white/5 hover:text-white active:scale-95"
				>
					{tc("actions.cancel")}
				</Button>
				<Button
					onClick={handleShare}
					disabled={!selectedSource}
					className="h-8 rounded-lg bg-[#34B27B] px-5 text-[11px] font-semibold text-white transition-transform duration-150 hover:bg-[#34B27B]/85 active:scale-95 disabled:bg-zinc-700 disabled:opacity-30"
				>
					{tc("actions.share")}
				</Button>
			</div>
		</div>
	);
}
