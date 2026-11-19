/**
 * GTA6 Trim mark: two trim handles from a video timeline closing in on a cut,
 * with the playhead standing on the cut point.
 */
export function TrimMark({ className = "", color = "currentColor" }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none">
      {/* trim handles */}
      <path d="M8.5 5H4.5v14h4" stroke={color} strokeWidth="2.6" strokeLinecap="square" />
      <path d="M15.5 5h4v14h-4" stroke={color} strokeWidth="2.6" strokeLinecap="square" />
      {/* playhead */}
      <path d="M12 7.5V21" stroke={color} strokeWidth="2.2" strokeLinecap="square" />
      <path d="M9.4 2.5h5.2L12 6.2z" fill={color} />
    </svg>
  );
}
