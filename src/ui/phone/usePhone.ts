import { useEffect, useState } from 'react'

/** Too small for the app: narrower than an iPad mini, or too short for the picture and terminal side by side. */
export const PHONE_QUERY = '(max-width: 743px), (max-height: 499px)'

export function isPhone(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(PHONE_QUERY).matches
}

/** True on a phone-width screen; follows rotation and window resizes. */
export function usePhone(): boolean {
  const [phone, setPhone] = useState(isPhone)
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia(PHONE_QUERY)
    const on = () => setPhone(mq.matches)
    on()
    mq.addEventListener?.('change', on)
    return () => mq.removeEventListener?.('change', on)
  }, [])
  return phone
}
