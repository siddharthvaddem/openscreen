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
				className={`${styles.sourceCard} ${isSelected ? styles.selected : ""} p-2`}
				onClick={() => handleSourceSelect(source)}
			>
				<div className="relative mb-1.5">
					<img
						src={source.thumbnail || ""}
						alt={source.name}
						className="w-full aspect-video object-cover rounded-xl [corner-shape:squircle] "
					/>
					{isSelected && (
						<div className="absolute -top-1 -right-1">
							<div className={styles.checkBadge}>
								<MdCheck size={12} className="text-white" />
							</div>
						</div>
					)}
				</div>
				<div className="flex items-center gap-1.5">
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
			<div className="flex-1 flex flex-col w-full px-4 pt-4">
				<Tabs
					defaultValue={screenSources.length === 0 ? "windows" : "screens"}
					className="flex-1 flex flex-col"
				>
					<TabsList className="grid grid-cols-2 mb-3 bg-white/5 rounded-[14px] squircle ">
						<TabsTrigger
							value="screens"
							className="data-[state=active]:bg-white/15 data-[state=active]:text-white text-zinc-400 rounded-[12px] squircle text-xs py-1.5 transition-all"
						>
							{t("sourceSelector.screens", { count: String(screenSources.length) })}
						</TabsTrigger>
						<TabsTrigger
							value="windows"
							className="data-[state=active]:bg-white/15 data-[state=active]:text-white text-zinc-400 rounded-[12px] squircle text-xs py-1.5 transition-all"
						>
							{t("sourceSelector.windows", { count: String(windowSources.length) })}
						</TabsTrigger>
					</TabsList>
					<div className="flex-1 min-h-0">
						<TabsContent value="screens" className="h-full mt-0">
							<div
								className={`grid grid-cols-2 gap-3 h-[280px] overflow-y-auto pt-1 pr-1.5 auto-rows-min ${styles.sourceGridScroll}`}
							>
								{screenSources.map(renderSourceCard)}
							</div>
						</TabsContent>
						<TabsContent value="windows" className="h-full mt-0">
							<div
								className={`grid grid-cols-2 gap-3 h-[280px] overflow-y-auto pt-1 pr-1.5 auto-rows-min ${styles.sourceGridScroll}`}
							>
								{windowSources.map(renderSourceCard)}
							</div>
						</TabsContent>
					</div>
				</Tabs>
			</div>
			<div className="p-3 justify-center flex gap-2">
				<Button
					variant="ghost"
					onClick={() => window.close()}
					className="px-5 py-1 text-xs text-zinc-400 hover:text-white active:scale-95 transition-transform duration-150 hover:bg-white/5 rounded-full"
				>
					{tc("actions.cancel")}
				</Button>
				<Button
					onClick={handleShare}
					disabled={!selectedSource}
					className="px-5 py-1 text-xs bg-[#34B27B] text-white active:scale-95 transition-transform duration-150 hover:bg-[#34B27B]/80 disabled:opacity-30 disabled:bg-zinc-700 rounded-full"
				>
					{tc("actions.share")}
				</Button>
			</div>
		</div>
	);
}
