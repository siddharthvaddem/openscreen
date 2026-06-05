export interface AnnotationStickerPreset {
	id: string;
	label: string;
	dataUrl: string;
}

const SVG_SIZE = 128;

function createStickerSvg(id: string, label: string, body: string): string {
	return [
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SVG_SIZE} ${SVG_SIZE}" data-sticker-id="${id}" aria-label="${label}">`,
		body,
		"</svg>",
	].join("");
}

function createStickerDataUrl(id: string, label: string, body: string): string {
	return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(createStickerSvg(id, label, body))}`;
}

export const ANNOTATION_STICKER_PRESETS: AnnotationStickerPreset[] = [
	{
		id: "check",
		label: "Check",
		dataUrl: createStickerDataUrl(
			"check",
			"Check",
			'<circle cx="64" cy="64" r="54" fill="#34B27B"/><path d="M38 66.5 55.5 84 91 44" fill="none" stroke="#fff" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>',
		),
	},
	{
		id: "cross",
		label: "Cross",
		dataUrl: createStickerDataUrl(
			"cross",
			"Cross",
			'<circle cx="64" cy="64" r="54" fill="#F04438"/><path d="M45 45 83 83M83 45 45 83" fill="none" stroke="#fff" stroke-width="13" stroke-linecap="round"/>',
		),
	},
	{
		id: "warning",
		label: "Warning",
		dataUrl: createStickerDataUrl(
			"warning",
			"Warning",
			'<path d="M64 13 119 111H9L64 13Z" fill="#FACC15"/><path d="M64 45v30" stroke="#18181B" stroke-width="12" stroke-linecap="round"/><circle cx="64" cy="93" r="7" fill="#18181B"/>',
		),
	},
	{
		id: "question",
		label: "Question",
		dataUrl: createStickerDataUrl(
			"question",
			"Question",
			'<circle cx="64" cy="64" r="54" fill="#38BDF8"/><path d="M48 49c2.5-10 11-16 22-14 10 1.8 17 8 17 18 0 15-15 17-21 27" fill="none" stroke="#06121F" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/><circle cx="64" cy="96" r="7" fill="#06121F"/>',
		),
	},
	{
		id: "number-1",
		label: "Number 1",
		dataUrl: createStickerDataUrl(
			"number-1",
			"Number 1",
			'<rect x="18" y="18" width="92" height="92" rx="24" fill="#FFFFFF"/><path d="M57 48 70 39v51" fill="none" stroke="#111827" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>',
		),
	},
	{
		id: "number-2",
		label: "Number 2",
		dataUrl: createStickerDataUrl(
			"number-2",
			"Number 2",
			'<rect x="18" y="18" width="92" height="92" rx="24" fill="#FFFFFF"/><path d="M47 50c5-10 26-13 33 0 9 17-21 25-31 43h37" fill="none" stroke="#111827" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>',
		),
	},
	{
		id: "number-3",
		label: "Number 3",
		dataUrl: createStickerDataUrl(
			"number-3",
			"Number 3",
			'<rect x="18" y="18" width="92" height="92" rx="24" fill="#FFFFFF"/><path d="M49 43h33L63 62c17 0 25 9 22 20-4 15-25 17-38 7" fill="none" stroke="#111827" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>',
		),
	},
	{
		id: "click-target",
		label: "Click target",
		dataUrl: createStickerDataUrl(
			"click-target",
			"Click target",
			'<circle cx="64" cy="64" r="46" fill="none" stroke="#FB7185" stroke-width="10"/><circle cx="64" cy="64" r="23" fill="none" stroke="#FB7185" stroke-width="8"/><circle cx="64" cy="64" r="8" fill="#FB7185"/>',
		),
	},
	{
		id: "arrow-up-right",
		label: "Arrow up right",
		dataUrl: createStickerDataUrl(
			"arrow-up-right",
			"Arrow up right",
			'<rect x="17" y="17" width="94" height="94" rx="25" fill="#A78BFA"/><path d="M43 85 85 43M56 43h29v29" fill="none" stroke="#fff" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>',
		),
	},
	{
		id: "command",
		label: "Command",
		dataUrl: createStickerDataUrl(
			"command",
			"Command",
			'<rect x="17" y="17" width="94" height="94" rx="25" fill="#18181B"/><path d="M48 48h32v32H48zM48 48c-17 0-17-26 0-26 15 0 0 26 0 26ZM80 48s-15-26 0-26c17 0 17 26 0 26ZM48 80s-15 26 0 26c17 0 17-26 0-26ZM80 80s15 26 0 26c-17 0 0-26 0-26Z" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>',
		),
	},
	{
		id: "spotlight",
		label: "Spotlight",
		dataUrl: createStickerDataUrl(
			"spotlight",
			"Spotlight",
			'<circle cx="64" cy="64" r="54" fill="#F59E0B" opacity=".22"/><circle cx="64" cy="64" r="38" fill="#F59E0B" opacity=".42"/><circle cx="64" cy="64" r="18" fill="#F59E0B"/><path d="M64 14v18M64 96v18M14 64h18M96 64h18" stroke="#F59E0B" stroke-width="8" stroke-linecap="round"/>',
		),
	},
	{
		id: "play",
		label: "Play",
		dataUrl: createStickerDataUrl(
			"play",
			"Play",
			'<circle cx="64" cy="64" r="54" fill="#0F172A"/><path d="M52 41 91 64 52 87V41Z" fill="#34B27B"/>',
		),
	},
];
