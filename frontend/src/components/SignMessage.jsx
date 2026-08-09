import { useEffect, useMemo, useState } from "react";

import TransportWebHID from "@ledgerhq/hw-transport-webhid";
import Eth from "@ledgerhq/hw-app-eth";

import {
  useAppKit,
  useAppKitAccount,
  useAppKitNetwork,
  useAppKitProvider,
  useDisconnect,
} from "@reown/appkit/react";

import { BrowserProvider, Signature, verifyMessage } from "ethers";

const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

const DEFAULT_DERIVATION_PATH = "44'/60'/0'/0/0";

const MAX_MESSAGE_LENGTH = 4096;

const TAB_STORAGE_KEY = "mynotebook-active-tab";

function normalizePath(value) {
  return value.trim().replace(/^m\//i, "");
}

function ensure0x(value = "") {
  return value.startsWith("0x") ? value : `0x${value}`;
}

function utf8ToHex(value) {
  return Array.from(new TextEncoder().encode(value))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function createUtcTimestamp() {
  return new Date().toISOString().slice(0, 19);
}

function shortenAddress(value = "") {
  if (!value) {
    return "—";
  }

  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

function wait(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

async function withLedger(callback) {
  let transport;

  try {
    transport = await TransportWebHID.create();

    const ethereumApp = new Eth(transport);

    return await callback(ethereumApp);
  } finally {
    if (transport) {
      await transport.close().catch(() => {});
    }
  }
}

function CopyButton({ value }) {
  const [copied, setCopied] = useState(false);

  async function copyValue() {
    try {
      await navigator.clipboard.writeText(value);

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 1200);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      className="ledger-button"
      onClick={copyValue}
      disabled={!value}
      style={{
        minHeight: "36px",
        padding: "0 13px",
        fontSize: "12px",
      }}
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function ResultCard({ label, value, monospace = true }) {
  return (
    <div
      className="block-card"
      style={{
        marginTop: "15px",
      }}
    >
      <div
        className="block-heading"
        style={{
          marginBottom: "14px",
          alignItems: "center",
        }}
      >
        <strong
          style={{
            color: "#94a3b8",
            fontSize: "13px",
            letterSpacing: "0.06em",
          }}
        >
          {label}
        </strong>

        <CopyButton value={value} />
      </div>

      <pre
        style={{
          color: "#f8fafc",
          fontFamily: monospace ? '"Cascadia Code", Consolas, monospace' : "inherit",
          lineHeight: "1.7",
          overflowWrap: "anywhere",
        }}
      >
        {value}
      </pre>
    </div>
  );
}

export default function SignMessage({ onAddedToNotebook }) {
  const { open } = useAppKit();
  const { disconnect } = useDisconnect();

  const {
    address: walletAddress,
    isConnected,
    status: accountStatus,
  } = useAppKitAccount({
    namespace: "eip155",
  });

  const { caipNetwork } = useAppKitNetwork();

  const { walletProvider } = useAppKitProvider("eip155");

  const [message, setMessage] = useState("");
  const [activeSource, setActiveSource] = useState("");

  const [ledgerAddress, setLedgerAddress] = useState("");

  const [derivationPath, setDerivationPath] = useState(DEFAULT_DERIVATION_PATH);

  const [timestampEnabled, setTimestampEnabled] = useState(false);

  const [status, setStatus] = useState("Choose a wallet or Ledger");

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [signedResult, setSignedResult] = useState(null);

  const [addBusy, setAddBusy] = useState(false);
  const [addError, setAddError] = useState("");
  const [addedBlock, setAddedBlock] = useState(null);

  const webHidSupported = useMemo(() => {
    return typeof navigator !== "undefined" && "hid" in navigator;
  }, []);

  const walletConnected = Boolean(isConnected && walletAddress && walletProvider);

  const ledgerConnected = Boolean(activeSource === "ledger" && ledgerAddress);

  useEffect(() => {
    if (isConnected && walletAddress) {
      setActiveSource("wallet");
      setLedgerAddress("");
      setStatus("Wallet connected");
      setError("");
    }
  }, [isConnected, walletAddress]);

  useEffect(() => {
    if (!isConnected && activeSource === "wallet") {
      setActiveSource("");
    }
  }, [isConnected, activeSource]);

  async function connectWallet() {
    try {
      setError("");

      setStatus("Waiting for wallet connection...");

      sessionStorage.setItem(TAB_STORAGE_KEY, "sign");

      await open({
        view: "Connect",
        namespace: "eip155",
      });
    } catch (connectError) {
      setStatus("Wallet connection failed");

      setError(connectError?.message || "Could not open wallet connection.");
    }
  }

  async function openWalletAccount() {
    try {
      setError("");

      await open({
        view: "Account",
      });
    } catch (accountError) {
      setError(accountError?.message || "Could not open wallet account.");
    }
  }

  async function disconnectWallet() {
    try {
      setBusy(true);
      setError("");

      setStatus("Disconnecting wallet...");

      await disconnect({
        namespace: "eip155",
      });

      setActiveSource("");
      setLedgerAddress("");
      setSignedResult(null);
      setAddedBlock(null);

      setStatus("Choose a wallet or Ledger");
    } catch (disconnectError) {
      setStatus("Wallet disconnect failed");

      setError(disconnectError?.message || "Could not disconnect wallet.");
    } finally {
      setBusy(false);
    }
  }

  async function changeWallet() {
    try {
      setBusy(true);
      setError("");

      setStatus("Changing wallet...");

      if (isConnected) {
        await disconnect({
          namespace: "eip155",
        });
      }

      setActiveSource("");
      setSignedResult(null);
      setAddedBlock(null);

      await wait(400);

      sessionStorage.setItem(TAB_STORAGE_KEY, "sign");

      await open({
        view: "Connect",
        namespace: "eip155",
      });

      setStatus("Waiting for wallet connection...");
    } catch (changeError) {
      setStatus("Could not change wallet");

      setError(changeError?.message || "Wallet change failed.");
    } finally {
      setBusy(false);
    }
  }

  async function connectLedger() {
    try {
      setBusy(true);
      setError("");

      setStatus("Connecting Ledger...");

      if (!webHidSupported) {
        throw new Error(
          "Direct Ledger connection requires desktop Chrome or Edge. On iPhone, connect Ledger Live through Connect Wallet."
        );
      }

      if (isConnected) {
        await disconnect({
          namespace: "eip155",
        });
      }

      const cleanPath = normalizePath(derivationPath);

      const account = await withLedger((ethereumApp) =>
        ethereumApp.getAddress(cleanPath, true, false)
      );

      setActiveSource("ledger");
      setLedgerAddress(account.address);

      setSignedResult(null);
      setStatus("Ledger connected");
    } catch (connectError) {
      setActiveSource("");
      setLedgerAddress("");

      setStatus("Ledger connection failed");

      setError(connectError?.message || "Could not connect Ledger.");
    } finally {
      setBusy(false);
    }
  }

  function disconnectLedger() {
    setActiveSource("");
    setLedgerAddress("");
    setSignedResult(null);
    setAddedBlock(null);

    setStatus("Choose a wallet or Ledger");

    setError("");
  }

  async function signPersonalMessage() {
    try {
      setBusy(true);
      setError("");
      setSignedResult(null);
      setAddedBlock(null);
      setAddError("");

      setStatus("Waiting for signature approval...");

      const trimmedMessage = message.trim();

      if (!trimmedMessage) {
        throw new Error("Enter a message first.");
      }

      const exactMessage = timestampEnabled
        ? `${trimmedMessage} ${createUtcTimestamp()}`
        : trimmedMessage;

      let generatedSignature;
      let currentSigningAddress;
      let walletUsed;

      if (activeSource === "wallet") {
        if (!walletConnected) {
          throw new Error("Wallet is not connected. Connect it again.");
        }

        sessionStorage.setItem(TAB_STORAGE_KEY, "sign");

        const provider = new BrowserProvider(walletProvider);

        const signer = await provider.getSigner();

        currentSigningAddress = await signer.getAddress();

        generatedSignature = await signer.signMessage(exactMessage);

        walletUsed = "Reown AppKit connected account";
      } else if (activeSource === "ledger") {
        if (!webHidSupported) {
          throw new Error("Direct Ledger signing is not supported on iPhone Safari.");
        }

        const cleanPath = normalizePath(derivationPath);

        const ledgerResult = await withLedger(async (ethereumApp) => {
          const account = await ethereumApp.getAddress(cleanPath, true, false);

          const ledgerSignature = await ethereumApp.signPersonalMessage(
            cleanPath,
            utf8ToHex(exactMessage)
          );

          return {
            account,
            ledgerSignature,
          };
        });

        const rawV =
          typeof ledgerResult.ledgerSignature.v === "string"
            ? parseInt(ledgerResult.ledgerSignature.v, 16)
            : Number(ledgerResult.ledgerSignature.v);

        const normalizedV = rawV < 27 ? rawV + 27 : rawV;

        generatedSignature = Signature.from({
          r: ensure0x(ledgerResult.ledgerSignature.r),
          s: ensure0x(ledgerResult.ledgerSignature.s),
          v: normalizedV,
        }).serialized;

        currentSigningAddress = ledgerResult.account.address;

        walletUsed = `Ledger Nano X — m/${cleanPath}`;
      } else {
        throw new Error("Connect a wallet or Ledger first.");
      }

      const recoveredAddress = verifyMessage(exactMessage, generatedSignature);

      if (recoveredAddress.toLowerCase() !== currentSigningAddress.toLowerCase()) {
        throw new Error("Signature verification failed.");
      }

      setSignedResult({
        valid: true,
        walletUsed,
        message: exactMessage,
        address: currentSigningAddress,
        signature: generatedSignature,
      });

      setStatus("Signature generated and verified");
    } catch (signError) {
      setStatus("Signing failed");

      setError(signError?.message || "Message signing failed.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmAddToNotebook() {
    if (!signedResult) {
      return;
    }

    try {
      setAddBusy(true);
      setAddError("");

      const response = await fetch(`${API_URL}/api/add-block`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          message: signedResult.message,
          signature: signedResult.signature,
        }),
      });

      const responseText = await response.text();

      let data = null;

      if (responseText.trim()) {
        try {
          data = JSON.parse(responseText);
        } catch {
          console.error("Invalid backend response:", responseText);

          throw new Error("Backend returned an invalid JSON response.");
        }
      }

      if (!response.ok) {
        throw new Error(
          data?.error || data?.message || `Request failed with HTTP ${response.status}.`
        );
      }

      if (!data?.block) {
        throw new Error("Backend response did not include the new entry.");
      }

      setAddedBlock(data.block);

      if (onAddedToNotebook) {
        onAddedToNotebook(data.block);
      }
    } catch (addBlockError) {
      console.error("Add to notebook error:", addBlockError);

      setAddError(addBlockError?.message || "Could not add this entry to your notebook.");
    } finally {
      setAddBusy(false);
    }
  }

  function declineAddToNotebook() {
    setSignedResult(null);
    setAddError("");
    setAddedBlock(null);
    setStatus("Discarded. Sign a new message whenever you're ready.");
  }

  const sourceConnected = activeSource === "wallet" ? walletConnected : ledgerConnected;

  const displayAddress = activeSource === "wallet" ? walletAddress || "" : ledgerAddress;

  let displayedStatus = status;

  if (walletConnected) {
    displayedStatus = `Wallet connected: ${shortenAddress(walletAddress)}`;
  } else if (ledgerConnected) {
    displayedStatus = `Ledger connected: ${shortenAddress(ledgerAddress)}`;
  } else if (accountStatus === "connecting" || accountStatus === "reconnecting") {
    displayedStatus = "Restoring wallet connection...";
  }

  return (
    <section className="sign-page">
      <div className="wallet-connect-panel">
        <div className="connect-copy">
          <p className="eyebrow">SIGNING SOURCE</p>

          <h2>Choose your signing device</h2>

          <p className="muted">Use Reown WalletConnect or your Ledger Nano X.</p>
        </div>

        {!walletConnected && !ledgerConnected && (
          <div className="wallet-buttons">
            <button
              type="button"
              className="wallet-button"
              onClick={connectWallet}
              disabled={busy}
            >
              Connect Wallet
            </button>

            <button
              type="button"
              className="ledger-button"
              onClick={connectLedger}
              disabled={busy || !webHidSupported}
            >
              Connect Ledger
            </button>
          </div>
        )}

        {walletConnected && (
          <div className="wallet-buttons">
            <button
              type="button"
              className="wallet-button"
              onClick={openWalletAccount}
              disabled={busy}
            >
              Wallet Account
            </button>

            <button
              type="button"
              className="ledger-button"
              onClick={changeWallet}
              disabled={busy}
            >
              Change Wallet
            </button>

            <button
              type="button"
              className="ledger-button"
              onClick={disconnectWallet}
              disabled={busy}
            >
              Disconnect
            </button>
          </div>
        )}

        {ledgerConnected && (
          <div className="wallet-buttons">
            <button
              type="button"
              className="ledger-button"
              onClick={disconnectLedger}
              disabled={busy}
            >
              Disconnect Ledger
            </button>
          </div>
        )}

        <div className={`connection-pill ${sourceConnected ? "connected" : ""}`}>
          <span className="connection-dot" />
          {displayedStatus}
        </div>

        {walletConnected && (
          <div className="wallet-details">
            <b>Address</b>

            <p>{shortenAddress(walletAddress)}</p>

            <b>Network</b>

            <p>{caipNetwork?.name || "Ethereum"}</p>
          </div>
        )}

        {activeSource === "ledger" && (
          <div className="ledger-path-box">
            <label htmlFor="ledger-path">Ledger derivation path</label>

            <div className="derivation-path">
              <span>m/</span>

              <input
                id="ledger-path"
                value={derivationPath}
                onChange={(event) => setDerivationPath(event.target.value)}
                disabled={busy}
              />
            </div>
          </div>
        )}
      </div>

      <div>
        <div className="sign-card">
          <span className="step-number">02</span>

          <div className="sign-card-heading">
            <h2>Sign your message</h2>

            <p>
              Sign the exact UTF-8 text using a connected wallet or the selected Ledger
              derivation path, then confirm the recovered Ethereum address.
            </p>
          </div>

          {error && <div className="alert">{error}</div>}

          <label className="timestamp-option">
            <input
              type="checkbox"
              checked={timestampEnabled}
              onChange={(event) => setTimestampEnabled(event.target.checked)}
              disabled={busy}
            />

            <span>Include a UTC timestamp in this signature</span>
          </label>

          <label className="field-label" htmlFor="sign-message">
            Message
          </label>

          <textarea
            id="sign-message"
            className="sign-message-input"
            value={message}
            onChange={(event) => {
              setMessage(event.target.value);

              setSignedResult(null);
              setAddedBlock(null);
              setAddError("");
            }}
            placeholder="Write today's thought..."
            maxLength={MAX_MESSAGE_LENGTH}
            disabled={busy}
          />

          <div className="message-information">
            <span>Review the exact message in your wallet or on your Ledger.</span>

            <span>
              {message.length} / {MAX_MESSAGE_LENGTH}
            </span>
          </div>

          <button
            type="button"
            className="sign-action-button"
            onClick={signPersonalMessage}
            disabled={busy || !sourceConnected || !message.trim()}
          >
            {busy
              ? "Waiting for approval..."
              : !sourceConnected
                ? "Connect a wallet first"
                : activeSource === "ledger"
                  ? "Sign with Ledger"
                  : "Sign with Wallet"}
          </button>

          <div className="signature-warning">
            Never approve an unknown message. A signature proves control of the Ethereum
            account and can be used for authentication.
          </div>
        </div>

        {signedResult && !addedBlock && (
          <section
            className="panel"
            style={{
              marginTop: "22px",
            }}
          >
            <div
              className="success-alert"
              style={{
                marginTop: 0,
                marginBottom: "18px",
              }}
            >
              <strong
                style={{
                  display: "block",
                  marginBottom: "7px",
                  fontSize: "13px",
                  letterSpacing: "0.08em",
                }}
              >
                VERIFICATION STATUS
              </strong>

              <div
                style={{
                  fontSize: "24px",
                  fontWeight: 900,
                  marginBottom: "8px",
                }}
              >
                VALID ✓
              </div>

              <span>The recovered address matches the signing Ethereum address.</span>
            </div>

            <ResultCard label="WALLET USED" value={signedResult.walletUsed} monospace={false} />

            <ResultCard
              label="EXACT MESSAGE SIGNED"
              value={signedResult.message}
              monospace={false}
            />

            <ResultCard label="SIGNING ETHEREUM ADDRESS" value={signedResult.address} />

            <ResultCard label="COMPLETE SIGNATURE" value={signedResult.signature} />

            {addError && <div className="alert">{addError}</div>}

            <div
              className="local-security-box"
              style={{
                marginTop: "18px",
              }}
            >
              <p className="muted" style={{ marginBottom: "14px" }}>
                Add this signed message to your notebook?
              </p>

              <div className="wallet-buttons">
                <button
                  type="button"
                  className="primary-button"
                  onClick={confirmAddToNotebook}
                  disabled={addBusy}
                >
                  {addBusy ? "Adding..." : "Yes, add to notebook"}
                </button>

                <button
                  type="button"
                  className="ledger-button"
                  onClick={declineAddToNotebook}
                  disabled={addBusy}
                >
                  No, discard
                </button>
              </div>
            </div>
          </section>
        )}

        {addedBlock && (
          <div
            className="success-alert"
            style={{
              marginTop: "22px",
            }}
          >
            Entry #{addedBlock.index} was added to your notebook.
          </div>
        )}

        {displayAddress && !signedResult && (
          <div
            className="connection-pill"
            style={{
              marginTop: "15px",
            }}
          >
            <span className="connection-dot" />
            Active signer: {shortenAddress(displayAddress)}
          </div>
        )}
      </div>
    </section>
  );
}
