const SUPPORTED_BACKGROUND_IMAGE_TYPES = new Set(["image/jpeg", "image/jpg", "image/png"]);
const SUPPORTED_BACKGROUND_IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png"]);

export const BACKGROUND_IMAGE_ACCEPT = ".jpg,.jpeg,.png,image/jpeg,image/png";

export function isSupportedBackgroundImageType(type: string, fileName: string): boolean {
	const normalizedType = type.trim().toLowerCase();
	if (SUPPORTED_BACKGROUND_IMAGE_TYPES.has(normalizedType)) {
		return true;
	}

	if (normalizedType) {
		return false;
	}

	const lowerName = fileName.trim().toLowerCase();
	return [...SUPPORTED_BACKGROUND_IMAGE_EXTENSIONS].some((extension) =>
		lowerName.endsWith(extension),
	);
}
