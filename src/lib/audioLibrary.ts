import rawAudioLibrary from "./audioLibrary.json";

export type AudioLibraryCategory = "music" | "hook";

export interface AudioLibraryItem {
	id: string;
	name: string;
	fileName: string;
	url: string;
	category: AudioLibraryCategory;
	tags: string[];
}

export const AUDIO_LIBRARY = rawAudioLibrary as AudioLibraryItem[];
