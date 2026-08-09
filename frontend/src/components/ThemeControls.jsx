import { ACCENTS, useTheme } from "../theme";

export default function ThemeControls() {
  const { mode, toggleMode, accent, setAccent } = useTheme();

  return (
    <div className="theme-controls">
      <div className="accent-picker" role="group" aria-label="Accent color">
        {ACCENTS.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`accent-swatch ${accent === option.id ? "active" : ""}`}
            style={{ "--swatch-color": option.swatch }}
            onClick={() => setAccent(option.id)}
            aria-pressed={accent === option.id}
            aria-label={`${option.label} accent`}
            title={`${option.label} accent`}
          />
        ))}
      </div>

      <button
        type="button"
        className="theme-toggle"
        onClick={toggleMode}
        aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        aria-pressed={mode === "dark"}
        title={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      >
        <span className="theme-toggle-track">
          <span className="theme-toggle-thumb">
            <svg viewBox="0 0 24 24" className="icon-sun" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="4.4" />
              <path d="M12 2.5v2.4M12 19.1v2.4M4.2 4.2l1.7 1.7M18.1 18.1l1.7 1.7M2.5 12h2.4M19.1 12h2.4M4.2 19.8l1.7-1.7M18.1 5.9l1.7-1.7" />
            </svg>
            <svg viewBox="0 0 24 24" className="icon-moon" fill="currentColor" stroke="none">
              <path d="M20.2 14.9A8.8 8.8 0 1 1 9.1 3.8a7 7 0 0 0 11.1 11.1Z" />
            </svg>
          </span>
        </span>
      </button>
    </div>
  );
}
