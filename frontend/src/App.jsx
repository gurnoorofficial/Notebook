import { useEffect, useLayoutEffect, useRef, useState } from "react";

import About from "./components/About";
import Notebook from "./components/Notebook";
import SignMessage from "./components/SignMessage";
import EncryptMessage from "./components/EncryptMessage";
import DecryptMessage from "./components/DecryptMessage";
import VerifySignature from "./components/VerifySignature";
import ThemeControls from "./components/ThemeControls";
import CommandPalette from "./components/CommandPalette";
import { usePrefersReducedMotion } from "./hooks";
import { useLoadingBar } from "./components/LoadingBar";

import "./App.css";

const TAB_STORAGE_KEY = "mynotebook-active-tab";

const TABS = [
  { id: "about", label: "About" },
  { id: "notebook", label: "Notebook" },
  { id: "sign", label: "Sign a Msg" },
  { id: "encrypt", label: "Encrypt" },
  { id: "decrypt", label: "Decrypt" },
  { id: "verify-signature", label: "Verify Signature" },
];

function getInitialTab() {
  const savedTab = sessionStorage.getItem(TAB_STORAGE_KEY);

  const allowedTabs = TABS.map((tab) => tab.id);

  return allowedTabs.includes(savedTab) ? savedTab : "about";
}

function useSpotlight() {
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (reducedMotion) {
      return undefined;
    }

    function handleMove(event) {
      const card = event.target.closest(
        ".panel, .wallet-connect-panel, .sign-card, .block-card"
      );

      if (!card) {
        return;
      }

      const rect = card.getBoundingClientRect();

      card.style.setProperty("--mx", `${((event.clientX - rect.left) / rect.width) * 100}%`);
      card.style.setProperty("--my", `${((event.clientY - rect.top) / rect.height) * 100}%`);
    }

    document.addEventListener("mousemove", handleMove, { passive: true });

    return () => {
      document.removeEventListener("mousemove", handleMove);
    };
  }, [reducedMotion]);
}

function useParallax() {
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (reducedMotion) {
      return undefined;
    }

    let frame = null;

    function handleMove(event) {
      if (frame) {
        return;
      }

      frame = requestAnimationFrame(() => {
        const x = (event.clientX / window.innerWidth - 0.5) * 18;
        const y = (event.clientY / window.innerHeight - 0.5) * 18;

        document.documentElement.style.setProperty("--parallax-x", x.toFixed(2));
        document.documentElement.style.setProperty("--parallax-y", y.toFixed(2));

        frame = null;
      });
    }

    window.addEventListener("mousemove", handleMove, { passive: true });

    return () => {
      window.removeEventListener("mousemove", handleMove);

      if (frame) {
        cancelAnimationFrame(frame);
      }
    };
  }, [reducedMotion]);
}

function App() {
  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [notebookRefreshKey, setNotebookRefreshKey] = useState(0);
  const [verifyPrefill, setVerifyPrefill] = useState(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0, ready: false });
  const [entranceDone, setEntranceDone] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const navRef = useRef(null);
  const tabRefs = useRef({});
  const { start: startLoadingBar, done: finishLoadingBar } = useLoadingBar();

  useSpotlight();
  useParallax();

  useEffect(() => {
    // The entrance animation leaves a `transform` on these elements while it
    // runs (even the resting `none` keyframe briefly holds during fill-mode).
    // A lingering transform turns the element into a containing block for
    // fixed-position descendants and can trip WebKit compositing quirks, so
    // drop the classes entirely once the animation has had time to finish.
    const timer = window.setTimeout(() => setEntranceDone(true), 850);

    return () => window.clearTimeout(timer);
  }, []);

  const entranceClass = (variant) => (entranceDone ? "" : `entrance ${variant}`);

  function changeTab(tabName) {
    if (tabName === activeTab) {
      return;
    }

    sessionStorage.setItem(TAB_STORAGE_KEY, tabName);
    setActiveTab(tabName);

    startLoadingBar();
    window.setTimeout(finishLoadingBar, 260);
  }

  function verifyEntry(block) {
    setVerifyPrefill({
      message: block.message || "",
      signature: block.signature || "",
    });

    changeTab("verify-signature");
  }

  useEffect(() => {
    if (!drawerOpen) {
      return undefined;
    }

    function handleKeydown(event) {
      if (event.key === "Escape") {
        setDrawerOpen(false);
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeydown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeydown);
    };
  }, [drawerOpen]);

  useLayoutEffect(() => {
    function measure() {
      const activeButton = tabRefs.current[activeTab];
      const nav = navRef.current;

      if (!activeButton || !nav) {
        return;
      }

      const navRect = nav.getBoundingClientRect();
      const buttonRect = activeButton.getBoundingClientRect();

      setIndicator({
        left: buttonRect.left - navRect.left,
        width: buttonRect.width,
        ready: true,
      });
    }

    measure();

    window.addEventListener("resize", measure);

    return () => {
      window.removeEventListener("resize", measure);
    };
  }, [activeTab]);

  const activeTabLabel = TABS.find((tab) => tab.id === activeTab)?.label || "Notebook";

  return (
    <div className="shell">
      <div className="mobile-topbar">
        <button
          type="button"
          className="mobile-menu-button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>

        <span className="mobile-topbar-title">{activeTabLabel}</span>

        <span className="mobile-topbar-status" aria-label="Backend connected" title="Backend connected">
          <span />
        </span>
      </div>

      {drawerOpen && (
        <div className="mobile-drawer-overlay" onClick={() => setDrawerOpen(false)}>
          <div
            className="mobile-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mobile-drawer-head">
              <div>
                <p className="eyebrow">Proof Ledger &middot; Ethereum</p>
                <h1 className="brand-title">Notebook</h1>
              </div>

              <button
                type="button"
                className="mobile-drawer-close"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>

            <nav className="mobile-drawer-nav">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={activeTab === tab.id ? "active" : ""}
                  onClick={() => {
                    changeTab(tab.id);
                    setDrawerOpen(false);
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            <div className="mobile-drawer-foot">
              <ThemeControls />

              <div className="app-status">
                <span />
                Backend connected
              </div>
            </div>
          </div>
        </div>
      )}

      <header className={`app-header ${entranceClass("entrance-1")}`}>
        <div>
          <p className="eyebrow">Proof Ledger &middot; Ethereum</p>
          <h1 className="brand-title">Notebook</h1>
        </div>

        <div className="header-controls">
          <ThemeControls />
          <CommandPalette tabs={TABS} onNavigate={changeTab} />

          <div className="app-status">
            <span />
            Backend connected
          </div>
        </div>
      </header>

      <nav className={`navigation ${entranceClass("entrance-2")}`} ref={navRef}>
        <span
          className="nav-indicator"
          style={{
            transform: `translateX(${indicator.left}px)`,
            width: `${indicator.width}px`,
            opacity: indicator.ready ? 1 : 0,
          }}
        />

        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            ref={(node) => {
              tabRefs.current[tab.id] = node;
            }}
            className={activeTab === tab.id ? "active" : ""}
            onClick={() => changeTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main className={`app-content ${entranceClass("entrance-3")}`}>
        {activeTab === "about" && <About />}

        {activeTab === "notebook" && (
          <Notebook refreshKey={notebookRefreshKey} onVerifyEntry={verifyEntry} />
        )}

        {activeTab === "sign" && (
          <SignMessage
            onAddedToNotebook={() => {
              setNotebookRefreshKey((key) => key + 1);
              changeTab("notebook");
            }}
          />
        )}

        {activeTab === "encrypt" && <EncryptMessage />}

        {activeTab === "decrypt" && <DecryptMessage />}

        {activeTab === "verify-signature" && <VerifySignature prefill={verifyPrefill} />}
      </main>
    </div>
  );
}

export default App;
