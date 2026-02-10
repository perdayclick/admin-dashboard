import { initials } from '../../utils/format'

/**
 * Avatar with initials or optional image.
 * @param {string} [nameOrEmail] - Used to derive initials
 * @param {string} [src] - Optional image URL
 * @param {string} [className] - Additional class (e.g. mgmt-avatar)
 */
export default function Avatar({ nameOrEmail, src, className = 'mgmt-avatar' }) {
  if (src) {
    return <img src={src} alt="" className={className} />
  }
  return <span className={className}>{initials(nameOrEmail)}</span>
}
