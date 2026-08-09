import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "";

function fingerprint(value = "") {
  if (!value) {
    return "—";
  }

  return String(value).slice(0, 16);
}

async function copyToClipboard(value) {
  const text = String(value ?? "");

  if (!text) {
    throw new Error("Nothing to copy.");
  }

  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch (clipboardError) {
      console.warn("Clipboard API failed. Using fallback.", clipboardError);
    }
  }

  const textarea = document.createElement("textarea");

  textarea.value = text;
  textarea.setAttribute("readonly", "");

  textarea.style.position = "fixed";
  textarea.style.top = "0";
  textarea.style.left = "-9999px";
  textarea.style.width = "1px";
  textarea.style.height = "1px";
  textarea.style.opacity = "0";
  textarea.style.fontSize = "16px";
  textarea.style.pointerEvents = "none";

  document.body.appendChild(textarea);

  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);

  let copied;

  try {
    copied = document.execCommand("copy");
  } finally {
    textarea.remove();
  }

  if (!copied) {
    throw new Error("Copy failed. Please select and copy the text manually.");
  }
}

function CopyButton({ value, defaultLabel, onError, className = "" }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      onError("");
      await copyToClipboard(value);

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1400);
    } catch (copyError) {
      onError(copyError?.message || "Could not copy to clipboard.");
    }
  }

  return (
    <button type="button" className={className} onClick={handleCopy} disabled={!value}>
      {copied ? "Copied" : defaultLabel}
    </button>
  );
}

export default function Notebook({ refreshKey, onVerifyEntry }) {
  const [blocks, setBlocks] = useState([]);
  const [status, setStatus] = useState("Loading notebook...");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadBlocks() {
    try {
      setLoading(true);
      setError("");
      setStatus("Loading notebook...");

      const response = await fetch(`${API_URL}/api/chain`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      const responseText = await response.text();

      if (!response.ok) {
        let errorMessage = `Backend request failed with HTTP ${response.status}.`;

        try {
          const errorData = JSON.parse(responseText);

          errorMessage = errorData?.error || errorData?.message || errorMessage;
        } catch {
          if (responseText) {
            errorMessage = responseText;
          }
        }

        throw new Error(errorMessage);
      }

      let data;

      try {
        data = JSON.parse(responseText);
      } catch {
        console.error("Invalid backend response:", responseText);

        throw new Error("Backend returned an invalid JSON response.");
      }

      let loadedBlocks = [];

      if (Array.isArray(data)) {
        loadedBlocks = data;
      } else if (data && Array.isArray(data.chain)) {
        loadedBlocks = data.chain;
      } else {
        throw new Error("Backend returned an invalid notebook format.");
      }

      setBlocks(loadedBlocks);

      setStatus(
        loadedBlocks.length === 1 ? "1 entry loaded" : `${loadedBlocks.length} entries loaded`
      );
    } catch (loadError) {
      console.error("Notebook load error:", loadError);

      setBlocks([]);

      setError(loadError?.message || "Could not load notebook.");

      setStatus("Failed to load notebook");
    } finally {
      setLoading(false);
    }
  }

  function downloadBlockchain() {
    try {
      setError("");

      if (blocks.length === 0) {
        throw new Error("Notebook is empty. There is nothing to download.");
      }

      const blockchainData = {
        chain: blocks,
      };

      const jsonText = JSON.stringify(blockchainData, null, 2);

      const blob = new Blob([jsonText], {
        type: "application/json;charset=utf-8",
      });

      const downloadUrl = URL.createObjectURL(blob);

      const downloadLink = document.createElement("a");

      downloadLink.href = downloadUrl;
      downloadLink.download = "mynotebook.json";
      downloadLink.style.display = "none";

      document.body.appendChild(downloadLink);

      downloadLink.click();
      downloadLink.remove();

      window.setTimeout(() => {
        URL.revokeObjectURL(downloadUrl);
      }, 1000);

      setStatus(
        blocks.length === 1
          ? "1 entry loaded — mynotebook.json downloaded"
          : `${blocks.length} entries loaded — mynotebook.json downloaded`
      );
    } catch (downloadError) {
      setError(downloadError?.message || "Could not download mynotebook.json.");
    }
  }

  function createBlockJson(block) {
    return JSON.stringify(block, null, 2);
  }

  const newestFirstBlocks = [...blocks].sort((blockA, blockB) => blockB.index - blockA.index);

  useEffect(() => {
    loadBlocks();
  }, [refreshKey]);

  return (
    <section className="panel explorer-panel">
      <style>{`
        .explorer-panel {
          overflow: hidden;
        }

        .explorer-top-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .explorer-top-button {
          min-height: 46px;
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 14px;
          padding: 0 17px;
          background: rgba(30, 41, 59, 0.92);
          color: #f8fafc;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          -webkit-appearance: none;
          appearance: none;
          -webkit-tap-highlight-color: transparent;
          transition:
            transform 0.15s ease,
            border-color 0.15s ease,
            background 0.15s ease,
            opacity 0.15s ease;
        }

        .explorer-top-button:hover {
          border-color: rgba(56, 189, 248, 0.38);
          background: rgba(30, 41, 59, 1);
        }

        .explorer-top-button:active {
          transform: scale(0.98);
        }

        .explorer-top-button:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .explorer-card {
          overflow: hidden;
        }

        .explorer-message-box {
          overflow: hidden;
        }

        .explorer-message-box pre {
          white-space: pre-wrap;
          overflow-wrap: anywhere;
          word-break: break-word;
          max-width: 100%;
          margin-bottom: 0;
        }

        .block-copy-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-top: 15px;
          margin-bottom: 18px;
        }

        .block-copy-button {
          width: 100%;
          min-height: 48px;
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 14px;
          padding: 0 14px;
          background: rgba(15, 23, 42, 0.92);
          color: #e2e8f0;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          -webkit-appearance: none;
          appearance: none;
          -webkit-tap-highlight-color: transparent;
          transition:
            transform 0.15s ease,
            border-color 0.15s ease,
            background 0.15s ease,
            opacity 0.15s ease;
        }

        .block-copy-button:hover {
          border-color: rgba(56, 189, 248, 0.36);
          background: rgba(15, 23, 42, 1);
        }

        .block-copy-button:active {
          transform: scale(0.98);
        }

        .block-copy-button.primary {
          background: linear-gradient(
            135deg,
            rgba(14, 116, 144, 0.98),
            rgba(2, 132, 199, 0.98)
          );
          border-color: rgba(56, 189, 248, 0.46);
          color: #ffffff;
        }

        .block-copy-button.primary:hover {
          background: linear-gradient(
            135deg,
            rgba(8, 145, 178, 1),
            rgba(2, 132, 199, 1)
          );
        }

        .block-copy-button:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .explorer-card .block-details {
          margin-top: 0;
        }

        .ownership-row {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }

        .ownership-row dd {
          flex: 1;
          min-width: 0;
        }

        .block-details .ownership-item {
          grid-column: 1 / -1;
        }

        .block-details dd.ownership-address {
          display: block;
          overflow-x: auto;
          overflow-y: hidden;
          white-space: nowrap;
          text-overflow: clip;
          padding-bottom: 2px;
        }

        .ownership-copy {
          flex: 0 0 auto;
          min-height: 30px;
          padding: 0 11px;
          border: 1px solid rgba(148, 163, 184, 0.3);
          border-radius: 8px;
          background: #161a28;
          color: #f8fafc;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          -webkit-appearance: none;
          appearance: none;
          -webkit-tap-highlight-color: transparent;
        }

        .ownership-copy:hover:not(:disabled) {
          background: #1e2636;
        }

        .ownership-copy:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .explorer-error {
          margin-bottom: 18px;
        }

        .explorer-api-info {
          margin-top: 8px;
          font-size: 12px;
          opacity: 0.65;
          overflow-wrap: anywhere;
        }

        .entry-verify-row {
          display: flex;
          justify-content: flex-end;
          margin-top: 16px;
        }

        @media (max-width: 640px) {
          .entry-verify-row {
            justify-content: stretch;
          }

          .entry-verify-row .ownership-copy {
            width: 100%;
            min-height: 42px;
            font-size: 13px;
          }
          .explorer-panel .section-header {
            display: flex;
            flex-direction: column;
            align-items: stretch;
            gap: 16px;
          }

          .explorer-top-actions {
            display: grid;
            grid-template-columns: 1fr;
            width: 100%;
          }

          .explorer-top-button {
            width: 100%;
            min-height: 50px;
            border-radius: 15px;
          }

          .explorer-card {
            border-radius: 18px;
          }

          .explorer-card .block-heading {
            align-items: flex-start;
            gap: 12px;
          }

          .explorer-card .block-heading p {
            overflow-wrap: anywhere;
          }

          .block-copy-actions {
            grid-template-columns: 1fr;
            gap: 10px;
          }

          .block-copy-button {
            min-height: 50px;
            border-radius: 15px;
            font-size: 15px;
          }

          .explorer-message-box pre {
            font-size: 14px;
            line-height: 1.65;
          }

          .explorer-card .block-details {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="section-header">
        <div>
          <p className="eyebrow">SIGNED ENTRIES</p>

          <h2>Notebook</h2>

          <p className="muted">{status}</p>

          {API_URL && <p className="explorer-api-info">Backend: {API_URL}</p>}
        </div>

        <div className="explorer-top-actions">
          <button
            type="button"
            className="explorer-top-button"
            onClick={downloadBlockchain}
            disabled={loading || blocks.length === 0}
          >
            Download mynotebook.json
          </button>

          <button
            type="button"
            className="explorer-top-button"
            onClick={loadBlocks}
            disabled={loading}
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {error && <div className="alert explorer-error">{error}</div>}

      {!loading && !error && blocks.length === 0 && (
        <div className="empty-state">
          <h3>No entries yet</h3>

          <p>Your notebook is empty. Signed thoughts and messages will appear here.</p>
        </div>
      )}

      <div className="block-list">
        {newestFirstBlocks.map((block) => (
          <article
            className="block-card explorer-card"
            key={block.hash || `${block.index}-${block.timestamp}`}
          >
            <div className="block-heading">
              <div>
                <span className="block-number">Entry #{block.index}</span>

                <p>{block.timestamp || "No timestamp"}</p>
              </div>

              <span className="valid-badge">Stored</span>
            </div>

            <div className="message-box explorer-message-box">
              <strong>Message</strong>

              <pre>{block.message || "No message"}</pre>
            </div>

            <div className="block-copy-actions">
              <CopyButton
                value={block.message}
                defaultLabel="Copy Message"
                className="block-copy-button primary"
                onError={setError}
              />

              <CopyButton
                value={createBlockJson(block)}
                defaultLabel="Copy JSON"
                className="block-copy-button"
                onError={setError}
              />
            </div>

            <dl className="block-details">
              <div className="ownership-item">
                <dt>Ownership</dt>

                <div className="ownership-row">
                  <dd className="ownership-address" title={block.eth_address || ""}>
                    {block.eth_address || "—"}
                  </dd>

                  <CopyButton
                    value={block.eth_address}
                    defaultLabel="Copy"
                    className="ownership-copy"
                    onError={setError}
                  />
                </div>
              </div>

              <div className="ownership-item">
                <dt>Signature</dt>

                <div className="ownership-row">
                  <dd className="ownership-address" title={block.signature || ""}>
                    {block.signature || "—"}
                  </dd>

                  <CopyButton
                    value={block.signature}
                    defaultLabel="Copy"
                    className="ownership-copy"
                    onError={setError}
                  />
                </div>
              </div>

              <div className="ownership-item">
                <dt>Hash</dt>

                <div className="ownership-row">
                  <dd className="ownership-address" title={block.hash || ""}>
                    {block.hash || "—"}
                  </dd>

                  <CopyButton
                    value={block.hash}
                    defaultLabel="Copy"
                    className="ownership-copy"
                    onError={setError}
                  />
                </div>
              </div>

              <div>
                <dt>Previous Fingerprint</dt>

                <dd title={block.previous_hash || ""}>{fingerprint(block.previous_hash)}</dd>
              </div>
            </dl>

            <div className="entry-verify-row">
              <button
                type="button"
                className="ownership-copy"
                onClick={() => onVerifyEntry && onVerifyEntry(block)}
              >
                Verify Signature
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
