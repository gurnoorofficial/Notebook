import { useState } from "react";

import Notebook from "./components/Notebook";
import SignMessage from "./components/SignMessage";
import EncryptMessage from "./components/EncryptMessage";
import DecryptMessage from "./components/DecryptMessage";
import VerifySignature from "./components/VerifySignature";

import "./App.css";

const TAB_STORAGE_KEY = "mynotebook-active-tab";

function getInitialTab() {
  const savedTab = sessionStorage.getItem(TAB_STORAGE_KEY);

  const allowedTabs = ["notebook", "sign", "encrypt", "decrypt", "verify-signature"];

  return allowedTabs.includes(savedTab) ? savedTab : "notebook";
}

function App() {
  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [notebookRefreshKey, setNotebookRefreshKey] = useState(0);
  const [verifyPrefill, setVerifyPrefill] = useState(null);

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

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1 className="brand-title">Notebook</h1>
        </div>

        <div className="app-status">
          <span />
          Backend connected
        </div>
      </header>

      <nav className="navigation">
        <button
          type="button"
          className={activeTab === "notebook" ? "active" : ""}
          onClick={() => changeTab("notebook")}
        >
          Notebook
        </button>

        <button
          type="button"
          className={activeTab === "sign" ? "active" : ""}
          onClick={() => changeTab("sign")}
        >
          Sign a Msg
        </button>

        <button
          type="button"
          className={activeTab === "encrypt" ? "active" : ""}
          onClick={() => changeTab("encrypt")}
        >
          Encrypt
        </button>

        <button
          type="button"
          className={activeTab === "decrypt" ? "active" : ""}
          onClick={() => changeTab("decrypt")}
        >
          Decrypt
        </button>

        <button
          type="button"
          className={activeTab === "verify-signature" ? "active" : ""}
          onClick={() => changeTab("verify-signature")}
        >
          Verify Signature
        </button>
      </nav>

      <main className="content">
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
