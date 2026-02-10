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
