import { useEffect, useRef, useState } from "react";

export interface CameraDevice {
	deviceId: string;
	label: string;
	groupId: string;
}

export function useCameraDevices(enabled: boolean = false) {
	const [devices, setDevices] = useState<CameraDevice[]>([]);
	const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const selectedDeviceIdRef = useRef(selectedDeviceId);
	selectedDeviceIdRef.current = selectedDeviceId;

	useEffect(() => {
		if (!enabled) return;
		let mounted = true;

		const loadDevices = async () => {
			try {
				setIsLoading(true);
				setError(null);

				// Enumerate without requesting a second stream — the recorder handles
				// the real acquisition; unlabeled devices fall back to their device ID.
				const allDevices = await navigator.mediaDevices.enumerateDevices();
				const videoInputs = allDevices
					.filter((device) => device.kind === "videoinput")
					.map((device) => ({
						deviceId: device.deviceId,
						label: device.label || `Camera ${device.deviceId.slice(0, 8)}`,
						groupId: device.groupId,
					}));

				if (mounted) {
					setDevices(videoInputs);
					const currentId = selectedDeviceIdRef.current;
					const stillAvailable = videoInputs.some((d) => d.deviceId === currentId);
					if (!currentId || !stillAvailable) {
						setSelectedDeviceId(videoInputs[0]?.deviceId ?? "");
					}
					setIsLoading(false);
				}
			} catch (err) {
				if (mounted) {
					setError(err instanceof Error ? err.message : "Failed to load cameras");
					setIsLoading(false);
				}
			}
		};

		loadDevices();

		navigator.mediaDevices.addEventListener("devicechange", loadDevices);
		return () => {
			mounted = false;
			navigator.mediaDevices.removeEventListener("devicechange", loadDevices);
		};
	}, [enabled]);

	return { devices, selectedDeviceId, setSelectedDeviceId, isLoading, error };
}
