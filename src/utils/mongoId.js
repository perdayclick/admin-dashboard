/** 24-char hex MongoDB ObjectId string (strict enough for admin filters). */
export function isMongoObjectIdString(s) {
  if (s == null || typeof s !== 'string') return false
  return /^[a-fA-F0-9]{24}$/.test(s.trim())
}
