/**
 * Device frame definitions for wrapping recordings in device mockups.
 *
 * Each frame defines its image path and the screen area within that image
 * where the video content should be rendered. The screen area is specified
 * as percentages of the frame image dimensions.
 */

import browserSvg from "../../public/frames/browser.svg";
import macbookSvg from "../../public/frames/macbook.svg";

export interface DeviceFrameDefinition {
	id: string;
	label: string;
	/** Resolved URL to the frame image (SVG) */
	imagePath: string;
	/** Screen area within the frame as percentage of frame dimensions */
	screen: {
		x: number; // left edge as % of width
		y: number; // top edge as % of height
		width: number; // screen width as % of frame width
		height: number; // screen height as % of frame height
	};
}

export const DEVICE_FRAMES: DeviceFrameDefinition[] = [
	{
		id: "macbook",
		label: "MacBook",
		imagePath: macbookSvg,
		screen: { x: 11.5, y: 3.5, width: 77, height: 81 },
	},
	{
		id: "browser",
		label: "Browser",
		imagePath: browserSvg,
		screen: { x: 1.5, y: 7, width: 97, height: 91.5 },
	},
];

export function getDeviceFrame(id: string): DeviceFrameDefinition | undefined {
	return DEVICE_FRAMES.find((f) => f.id === id);
}
