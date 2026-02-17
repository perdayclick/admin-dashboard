/**
 * Get the latest image URL from a KYC image field.
 * Field can be: array of { image, timestamp } (new format) or legacy string.
 */
export function getLatestKycImage(field) {
  if (!field) return null;
  if (Array.isArray(field) && field.length > 0) {
    const last = field[field.length - 1];
    return last && typeof last.image === 'string' ? last.image : null;
  }
  return typeof field === 'string' && field.trim() ? field.trim() : null;
}

/**
 * Check if KYC has any document/selfie images (supports array or legacy string).
 */
export function hasAnyKycImages(kyc) {
  if (!kyc) return false;
  return !!(
    getLatestKycImage(kyc.aadhaarFrontImage) ||
    getLatestKycImage(kyc.aadhaarBackImage) ||
    getLatestKycImage(kyc.selfieImage)
  );
}

/** Image type enum values for reject flow */
export const KYC_IMAGE_TYPE = { FRONT: 'FRONT', BACK: 'BACK', SELFIE: 'SELFIE' }

const TYPE_LABELS = { FRONT: 'Aadhaar front', BACK: 'Aadhaar back', SELFIE: 'Selfie' }

/**
 * Normalize a KYC image field to array of { image } (handles array of { image, timestamp } or legacy string).
 */
function toImageList(field) {
  if (!field) return [];
  if (Array.isArray(field)) {
    return field.map((e) => (e && typeof e.image === 'string' ? e.image : null)).filter(Boolean);
  }
  if (typeof field === 'string' && field.trim()) return [field.trim()];
  return [];
}

/**
 * Get all KYC images as a flat list with type and label for the reject flow.
 * Each item: { imageType: 'FRONT'|'BACK'|'SELFIE', imageUrl: string, label: string }.
 */
export function getAllKycImageItems(kyc) {
  if (!kyc) return [];
  const items = [];
  const types = [
    { key: 'aadhaarFrontImage', imageType: KYC_IMAGE_TYPE.FRONT },
    { key: 'aadhaarBackImage', imageType: KYC_IMAGE_TYPE.BACK },
    { key: 'selfieImage', imageType: KYC_IMAGE_TYPE.SELFIE },
  ];
  types.forEach(({ key, imageType }) => {
    const urls = toImageList(kyc[key]);
    const baseLabel = TYPE_LABELS[imageType];
    urls.forEach((url, index) => {
      items.push({
        imageType,
        imageUrl: url,
        label: urls.length > 1 ? `${baseLabel} (${index + 1})` : baseLabel,
      });
    });
  });
  return items;
}
