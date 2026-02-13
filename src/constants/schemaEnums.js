/** Match backend config/constants for Worker & Employer schemas */

export const AVAILABILITY_STATUS = {
  AVAILABLE: 'AVAILABLE',
  WORKING: 'WORKING',
  INACTIVE: 'INACTIVE',
  ON_LEAVE: 'ON_LEAVE',
}

export const AVAILABILITY_OPTIONS = [
  { value: '', label: '— Select —' },
  { value: AVAILABILITY_STATUS.AVAILABLE, label: 'Available' },
  { value: AVAILABILITY_STATUS.WORKING, label: 'Working' },
  { value: AVAILABILITY_STATUS.INACTIVE, label: 'Inactive' },
  { value: AVAILABILITY_STATUS.ON_LEAVE, label: 'On leave' },
]

export const WORKER_LEVEL = {
  BEGINNER: 'BEGINNER',
  SKILLED: 'SKILLED',
  TRUSTED: 'TRUSTED',
  VERIFIED_PRO: 'VERIFIED_PRO',
}

export const WORKER_LEVEL_OPTIONS = [
  { value: '', label: '— Select —' },
  { value: WORKER_LEVEL.BEGINNER, label: 'Beginner' },
  { value: WORKER_LEVEL.SKILLED, label: 'Skilled' },
  { value: WORKER_LEVEL.TRUSTED, label: 'Trusted' },
  { value: WORKER_LEVEL.VERIFIED_PRO, label: 'Verified Pro' },
]

export const VERIFICATION_TYPE = {
  BASIC: 'BASIC',
  KYC: 'KYC',
}

export const VERIFICATION_TYPE_OPTIONS = [
  { value: '', label: '— Select —' },
  { value: VERIFICATION_TYPE.BASIC, label: 'Basic' },
  { value: VERIFICATION_TYPE.KYC, label: 'KYC' },
]
