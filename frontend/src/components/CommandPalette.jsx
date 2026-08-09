import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "../theme";

export default function CommandPalette({ tabs, onNavigate }) {
  const { mode, toggleMode } = useTheme();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const inputRef = useRef(null);
  const listRef = useRef(null);

  const actions = useMemo(() => {
    const tabActions = tabs.map((tab) => ({
      id: `tab-${tab.id}`,
      label: `Go to ${tab.label}`,
      hint: "Navigate",
      keywords: tab.label,
      run: () => onNavigate(tab.id),
    }));

    return [
      ...tabActions,
      {
        id: "toggle-theme",
        label: mode === "dark" ? "Switch to light mode" : "Switch to dark mode",
        hint: "Appearance",
        keywords: "theme dark light mode appearance",
        run: () => toggleMode(),
      },
    ];
  }, [tabs, onNavigate, mode, toggleMode]);

  const filtered = useMemo(() => {
    const trimmed = query.trim().toLowerCase();

    if (!trimmed) {
      return actions;
    }

    return actions.filter((action) =>
      `${action.label} ${action.keywords || ""}`.toLowerCase().includes(trimmed)
    );
  }, [actions, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, open]);

  useEffect(() => {
    function handleGlobalKeydown(event) {
      const isCombo = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";

      if (isCombo) {
        event.preventDefault();
        setOpen((current) => !current);
        return;
      }

      if (event.key === "Escape" && open) {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", handleGlobalKeydown);

    return () => {
      window.removeEventListener("keydown", handleGlobalKeydown);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery("");

      window.setTimeout(() => {
        inputRef.current?.focus();
      }, 10);
    }
  }, [open]);

  useEffect(() => {
    const activeItem = listRef.current?.children[activeIndex];

    activeItem?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  function runAction(action) {
    if (!action) {
      return;
    }

    action.run();
    setOpen(false);
  }

  function handleInputKeydown(event) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, filtered.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      runAction(filtered[activeIndex]);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        className="command-hint"
        onClick={() => setOpen(true)}
        aria-label="Open command palette"
      >
        <kbd>&#8984;</kbd>
        <kbd>K</kbd>
      </button>
    );
  }

  return createPortal(
    <div className="command-overlay" onClick={() => setOpen(false)}>
      <div
        className="command-palette"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="command-input-row">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7.5" />
            <path d="m21 21-4.6-4.6" />
          </svg>

          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleInputKeydown}
            placeholder="Jump to a tab, toggle theme..."
            aria-label="Command palette search"
          />

          <kbd>Esc</kbd>
        </div>

        <div className="command-list" ref={listRef} role="listbox">
          {filtered.length === 0 && <div className="command-empty">No matching commands.</div>}

          {filtered.map((action, index) => (
            <button
              type="button"
              key={action.id}
              role="option"
              aria-selected={index === activeIndex}
              className={`command-item ${index === activeIndex ? "active" : ""}`}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => runAction(action)}
            >
              <span>{action.label}</span>
              <span className="command-item-hint">{action.hint}</span>
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
