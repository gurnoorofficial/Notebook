import { useEffect, useLayoutEffect, useRef, useState } from "react";

import Notebook from "./components/Notebook";
import SignMessage from "./components/SignMessage";
import EncryptMessage from "./components/EncryptMessage";
import DecryptMessage from "./components/DecryptMessage";
import VerifySignature from "./components/VerifySignature";
import ThemeControls from "./components/ThemeControls";
import CommandPalette from "./components/CommandPalette";
import { usePrefersReducedMotion } from "./hooks";

import "./App.css";

const TAB_STORAGE_KEY = "mynotebook-active-tab";

const TABS = [
  { id: "notebook", label: "Notebook" },
  { id: "sign", label: "Sign a Msg" },
  { id: "encrypt", label: "Encrypt" },
  { id: "decrypt", label: "Decrypt" },
  { id: "verify-signature", label: "Verify Signature" },
];

function getInitialTab() {
  const savedTab = sessionStorage.getItem(TAB_STORAGE_KEY);

  const allowedTabs = TABS.map((tab) => tab.id);

  return allowedTabs.includes(savedTab) ? savedTab : "notebook";
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

  const navRef = useRef(null);
  const tabRefs = useRef({});

  useSpotlight();
  useParallax();

  function changeTab(tabName) {
    sessionStorage.setItem(TAB_STORAGE_KEY, tabName);
    setActiveTab(tabName);
  }

  function verifyEntry(block) {
    setVerifyPrefill({
      message: block.message || "",
      signature: block.signature || "",
    });

    changeTab("verify-signature");
  }

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

  return (
    <div className="shell">
      <header className="app-header entrance entrance-1">
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

      <nav className="navigation entrance entrance-2" ref={navRef}>
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

      <main className="app-content entrance entrance-3">
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
