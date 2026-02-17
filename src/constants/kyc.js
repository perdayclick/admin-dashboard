/** KYC filter options for list pages (Workers, Employers) */
export const KYC_FILTER_OPTIONS = [
  { value: '', label: 'All KYC' },
  { value: 'APPROVED', label: 'Verified' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'REJECTED', label: 'Rejected' },
]

/** KYC status options for edit forms (admin verify) */
export const KYC_FORM_OPTIONS = [
  { value: '', label: '— No change —' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Verified' },
  { value: 'REJECTED', label: 'Rejected' },
]

/** Which KYC image is being rejected (RejectKYCEnum) – for Verify KYC images reject flow */
export const REJECT_KYC_IMAGE = {
  FRONT: 'FRONT',
  BACK: 'BACK',
  SELFIE: 'SELFIE',
}

export const REJECT_KYC_IMAGE_OPTIONS = [
  { value: REJECT_KYC_IMAGE.FRONT, label: 'Aadhaar front' },
  { value: REJECT_KYC_IMAGE.BACK, label: 'Aadhaar back' },
  { value: REJECT_KYC_IMAGE.SELFIE, label: 'Selfie' },
]
