import { useCallback, useEffect, useMemo, useState } from "react";
import { MdCheck } from "react-icons/md";
import { useScopedT } from "@/contexts/I18nContext";
import { isMac as getIsMac } from "@/utils/platformUtils";
import { Button } from "../ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import styles from "./SourceSelector.module.css";
import { getSourceSelectorRecoveryState, type ScreenAccessStatus } from "./sourceSelectorRecovery";

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
	const [isMac, setIsMac] = useState(false);
	const [screenAccessStatus, setScreenAccessStatus] = useState<ScreenAccessStatus>("unknown");
	const [loadError, setLoadError] = useState<string | null>(null);
	const [isResettingPermission, setIsResettingPermission] = useState(false);

	const fetchSources = useCallback(async () => {
		setLoading(true);
		setLoadError(null);
		try {
			const macPlatform = await getIsMac();
			const screenStatusResult = await window.electronAPI.getScreenAccessStatus();

			setIsMac(macPlatform);
			setScreenAccessStatus((screenStatusResult.status || "unknown") as ScreenAccessStatus);
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
			setSources([]);
			setLoadError(error instanceof Error ? error.message : String(error));
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void fetchSources();
	}, [fetchSources]);

	const screenSources = sources.filter((s) => s.id.startsWith("screen:"));
	const windowSources = sources.filter((s) => s.id.startsWith("window:"));
	const recoveryState = useMemo(
		() =>
			getSourceSelectorRecoveryState({
				isMac,
				sourceCount: sources.length,
				screenAccessStatus,
			}),
		[isMac, screenAccessStatus, sources.length],
	);

	const handleSourceSelect = (source: DesktopSource) => setSelectedSource(source);
	const handleShare = async () => {
		if (selectedSource) await window.electronAPI.selectSource(selectedSource);
	};
	const handleOpenScreenSettings = async () => {
		await window.electronAPI.openScreenCaptureSettings();
	};
	const handleResetPermission = async () => {
		setIsResettingPermission(true);
		try {
			await window.electronAPI.resetScreenCapturePermission();
			await fetchSources();
		} finally {
			setIsResettingPermission(false);
		}
	};

	const renderRecoveryState = () => {
		if (recoveryState === "none") {
			return null;
		}

		let title = t("sourceSelector.empty.title");
		let description = t("sourceSelector.empty.description");

		if (recoveryState === "screen-permission-blocked") {
			title = t("sourceSelector.permissionBlocked.title");
			description = t("sourceSelector.permissionBlocked.description");
		} else if (recoveryState === "screen-permission-stale") {
			title = t("sourceSelector.permissionStale.title");
			description = t("sourceSelector.permissionStale.description");
		} else if (recoveryState === "screen-permission-missing") {
			title = t("sourceSelector.permissionMissing.title");
			description = t("sourceSelector.permissionMissing.description");
		}

		return (
			<div className="h-full flex items-center justify-center px-3">
				<div className="max-w-sm w-full rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left">
					<div className="text-sm font-medium text-white">{title}</div>
					<p className="mt-2 text-xs leading-5 text-zinc-400">{description}</p>
					{loadError && <p className="mt-2 text-[11px] text-amber-300">{loadError}</p>}
					<div className="mt-4 flex flex-wrap gap-2">
						<Button
							type="button"
							variant="secondary"
							onClick={() => void fetchSources()}
							className="text-xs"
						>
							{t("sourceSelector.actions.retry")}
						</Button>
						{isMac && (
							<Button
								type="button"
								variant="ghost"
								onClick={() => void handleOpenScreenSettings()}
								className="text-xs text-zinc-300 hover:text-white"
							>
								{t("sourceSelector.actions.openSettings")}
							</Button>
						)}
						{isMac && recoveryState === "screen-permission-stale" && (
							<Button
								type="button"
								onClick={() => void handleResetPermission()}
								disabled={isResettingPermission}
								className="text-xs bg-[#34B27B] text-white hover:bg-[#34B27B]/80 disabled:opacity-50"
							>
								{isResettingPermission
									? t("sourceSelector.actions.resetting")
									: t("sourceSelector.actions.resetPermission")}
							</Button>
						)}
					</div>
				</div>
			</div>
		);
	};

	if (loading) {
		return (
			<div
				className={`h-full flex items-center justify-center ${styles.glassContainer}`}
				style={{ minHeight: "100vh" }}
			>
				<div className="text-center">
					<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#34B27B] mx-auto mb-2" />
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
						className="w-full aspect-video object-cover rounded-lg"
					/>
					{isSelected && (
						<div className="absolute -top-1.5 -right-1.5">
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
					<TabsList className="grid grid-cols-2 mb-3 bg-white/5 rounded-full">
						<TabsTrigger
							value="screens"
							className="data-[state=active]:bg-white/15 data-[state=active]:text-white text-zinc-400 rounded-full text-xs py-1 transition-all"
						>
							{t("sourceSelector.screens", { count: String(screenSources.length) })}
						</TabsTrigger>
						<TabsTrigger
							value="windows"
							className="data-[state=active]:bg-white/15 data-[state=active]:text-white text-zinc-400 rounded-full text-xs py-1 transition-all"
						>
							{t("sourceSelector.windows", { count: String(windowSources.length) })}
						</TabsTrigger>
					</TabsList>
					<div className="flex-1 min-h-0">
						{sources.length === 0 ? (
							renderRecoveryState()
						) : (
							<>
								<TabsContent value="screens" className="h-full mt-0">
									<div
										className={`grid grid-cols-2 gap-3 h-[280px] overflow-y-auto pr-1 auto-rows-min ${styles.sourceGridScroll}`}
									>
										{screenSources.map(renderSourceCard)}
									</div>
								</TabsContent>
								<TabsContent value="windows" className="h-full mt-0">
									<div
										className={`grid grid-cols-2 gap-3 h-[280px] overflow-y-auto pr-1 auto-rows-min ${styles.sourceGridScroll}`}
									>
										{windowSources.map(renderSourceCard)}
									</div>
								</TabsContent>
							</>
						)}
					</div>
				</Tabs>
			</div>
			<div className="p-3 flex justify-center gap-2">
				<Button
					variant="ghost"
					onClick={() => window.close()}
					className="px-5 py-1 text-xs text-zinc-400 hover:text-white hover:bg-white/5 rounded-full"
				>
					{tc("actions.cancel")}
				</Button>
				<Button
					onClick={handleShare}
					disabled={!selectedSource}
					className="px-5 py-1 text-xs bg-[#34B27B] text-white hover:bg-[#34B27B]/80 disabled:opacity-30 disabled:bg-zinc-700 rounded-full"
				>
					{tc("actions.share")}
				</Button>
			</div>
		</div>
	);
}
