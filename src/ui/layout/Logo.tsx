// Brand mark: an indigo tile with a white "T" drawn as a Git branch and an amber tip.
export function Logo({ size = 32 }: { size?: number }): React.JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 38 38" aria-hidden="true" focusable="false">
      <rect width="38" height="38" rx="10" fill="#4f46e5" />
      <path d="M13 9 V29" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M13 20 C13 15 25 17 25 12" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" />
      <circle cx="13" cy="29" r="3.4" fill="#fff" />
      <circle cx="25" cy="11" r="3.6" fill="#fbbf24" />
    </svg>
  )
}
