export default function CopyGlyph({ copied }) {
  return (
    <span className={`copy-glyph ${copied ? "is-copied" : ""}`} aria-hidden="true">
      <svg
        className="glyph-copy"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="9" y="9" width="12" height="12" rx="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </svg>

      <svg
        className="glyph-check"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 12.5 9.5 18 20 6" pathLength="1" />
      </svg>
    </span>
  );
}
