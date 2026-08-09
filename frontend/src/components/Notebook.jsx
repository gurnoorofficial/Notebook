import { forwardRef, useEffect, useMemo, useState } from "react";
import CopyGlyph from "./CopyGlyph";
import Magnetic from "./Magnetic";
import Blocky from "./Blocky";
import QrReveal from "./QrReveal";
import { useCountUp, useInView } from "../hooks";
import { useToast } from "./Toast";
import { useLoadingBar } from "./LoadingBar";
import { verifyChain } from "../chainVerify";

const API_URL = import.meta.env.VITE_API_URL || "";

const PAGE_SIZE = 24;

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

const CopyButton = forwardRef(function CopyButton(
  { value, defaultLabel, onError, className = "" },
  ref
) {
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
    <button ref={ref} type="button" className={className} onClick={handleCopy} disabled={!value}>
      <CopyGlyph copied={copied} />
      <span>{copied ? "Copied" : defaultLabel}</span>
    </button>
  );
});

function ChainConnector({ valid }) {
  return (
    <div className={`chain-connector ${valid ? "valid" : "broken"}`} aria-hidden="true">
      <span className="chain-stub" />

      <span className="chain-links">
        <span className="chain-link chain-link-a" />
        <span className="chain-link chain-link-b" />
      </span>

      <span className="chain-stub" />
    </div>
  );
}

function NotebookEntry({ block, chainInfo, onVerifyEntry, onError }) {
  const [ref, inView] = useInView();

  function createBlockJson() {
    return JSON.stringify(block, null, 2);
  }

  const verified = Boolean(chainInfo?.valid);

  return (
    <article
      ref={ref}
      className={`block-card explorer-card reveal ${inView ? "is-visible" : ""}`}
    >
      <div className="block-heading">
        <div className="block-heading-id">
          <Blocky seed={block.eth_address || String(block.index)} size={30} />

          <div>
            <span className="block-number">Entry #{block.index}</span>

            <p>{block.timestamp || "No timestamp"}</p>
          </div>
        </div>

        <span
          className={verified ? "valid-badge" : "invalid-badge"}
          title={verified ? "Hash, signature and chain link verified in your browser" : "Verification failed — see details"}
        >
          {verified ? "✓ Verified" : "⚠ Broken"}
        </span>
      </div>

      <div className="message-box explorer-message-box">
        <strong>Message</strong>

        <pre>{block.message || "No message"}</pre>
      </div>

      <div className="block-copy-actions">
        <Magnetic strength={6}>
          <CopyButton
            value={block.message}
            defaultLabel="Copy Message"
            className="block-copy-button primary"
            onError={onError}
          />
        </Magnetic>

        <CopyButton
          value={createBlockJson()}
          defaultLabel="Copy JSON"
          className="block-copy-button"
          onError={onError}
        />
      </div>

      <dl className="block-details">
        <div className="ownership-item">
          <dt>Ownership</dt>

          <div className="ownership-row">
            <dd className="ownership-address" title={block.eth_address || ""}>
              {block.eth_address || "—"}
            </dd>

            <QrReveal value={block.eth_address} />

            <CopyButton
              value={block.eth_address}
              defaultLabel="Copy"
              className="ownership-copy"
              onError={onError}
            />
          </div>
        </div>

        <div className="ownership-item">
          <dt>Signature</dt>

          <div className="ownership-row">
            <dd className="ownership-address" title={block.signature || ""}>
              {block.signature || "—"}
            </dd>

            <QrReveal value={block.signature} />

            <CopyButton
              value={block.signature}
              defaultLabel="Copy"
              className="ownership-copy"
              onError={onError}
            />
          </div>
        </div>

        <div className="ownership-item">
          <dt>Hash</dt>

          <div className="ownership-row">
            <dd className="ownership-address" title={block.hash || ""}>
              {block.hash || "—"}
            </dd>

            <QrReveal value={block.hash} />

            <CopyButton
              value={block.hash}
              defaultLabel="Copy"
              className="ownership-copy"
              onError={onError}
            />
          </div>
        </div>

        <div className="ownership-item">
          <dt>Previous Hash</dt>

          <div className="ownership-row">
            <dd className="ownership-address" title={block.previous_hash || ""}>
              {block.previous_hash || "—"}
            </dd>

            <CopyButton
              value={block.previous_hash}
              defaultLabel="Copy"
              className="ownership-copy"
              onError={onError}
            />
          </div>
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
  );
}

function SkeletonEntry() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-line w-30" />
      <div className="skeleton-line h-60" />
      <div className="skeleton-line w-100" />
      <div className="skeleton-line w-70 last" />
    </div>
  );
}

function matchesQuery(block, query) {
  if (!query) {
    return true;
  }

  const needle = query.toLowerCase();

  return (
    (block.message || "").toLowerCase().includes(needle) ||
    (block.eth_address || "").toLowerCase().includes(needle) ||
    (block.hash || "").toLowerCase().includes(needle)
  );
}

export default function Notebook({ refreshKey, onVerifyEntry }) {
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const toast = useToast();
  const { start: startLoadingBar, done: finishLoadingBar } = useLoadingBar();
  const animatedCount = useCountUp(blocks.length, 700);

  const chainStatus = useMemo(() => verifyChain(blocks), [blocks]);

  async function loadBlocks() {
    try {
      setLoading(true);
      setError("");
      startLoadingBar();

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
    } catch (loadError) {
      console.error("Notebook load error:", loadError);

      setBlocks([]);

      setError(loadError?.message || "Could not load notebook.");
    } finally {
      setLoading(false);
      finishLoadingBar();
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
      downloadLink.download = "notebook.json";
      downloadLink.style.display = "none";

      document.body.appendChild(downloadLink);

      downloadLink.click();
      downloadLink.remove();

      window.setTimeout(() => {
        URL.revokeObjectURL(downloadUrl);
      }, 1000);

      toast("notebook.json downloaded", "success");
    } catch (downloadError) {
      setError(downloadError?.message || "Could not download notebook.json.");
    }
  }

  const newestFirstBlocks = [...blocks].sort((blockA, blockB) => blockB.index - blockA.index);
  const filteredBlocks = newestFirstBlocks.filter((block) => matchesQuery(block, query));
  const visibleBlocks = filteredBlocks.slice(0, visibleCount);
  const hasMore = filteredBlocks.length > visibleBlocks.length;

  const statusText = loading
    ? "Loading notebook..."
    : error
      ? "Failed to load notebook"
      : blocks.length === 1
        ? "1 entry loaded"
        : `${animatedCount} entries loaded`;

  useEffect(() => {
    loadBlocks();
  }, [refreshKey]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [query, blocks]);

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
          border: 1px solid var(--hairline);
          border-radius: 14px;
          padding: 0 17px;
          background: var(--surface-sunken);
          color: var(--ink);
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
          border-color: var(--hairline-strong);
          background: var(--surface-hover);
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

        .block-heading-id {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .blocky-avatar,
        .blocky-placeholder {
          flex: 0 0 auto;
          box-sizing: border-box;
          padding: 5px;
          border-radius: 10px;
          border: 1px solid var(--hairline);
          background: var(--surface-sunken);
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
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          width: 100%;
          min-height: 48px;
          border: 1px solid var(--hairline);
          border-radius: 14px;
          padding: 0 14px;
          background: var(--surface-sunken);
          color: var(--ink-dim);
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
          border-color: var(--hairline-strong);
          background: var(--surface-hover);
        }

        .block-copy-button:active {
          transform: scale(0.98);
        }

        .block-copy-button.primary {
          background: linear-gradient(135deg, var(--accent-bright), var(--accent));
          border-color: var(--hairline-strong);
          color: var(--accent-ink);
        }

        .block-copy-button.primary:hover {
          filter: brightness(1.06);
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
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .block-details dd.ownership-address::-webkit-scrollbar {
          display: none;
          height: 0;
        }

        .ownership-copy {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          flex: 0 0 auto;
          min-height: 30px;
          padding: 0 11px;
          border: 1px solid var(--hairline);
          border-radius: 8px;
          background: var(--surface-sunken);
          color: var(--ink);
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          -webkit-appearance: none;
          appearance: none;
          -webkit-tap-highlight-color: transparent;
        }

        .ownership-copy:hover:not(:disabled) {
          border-color: var(--hairline-strong);
          background: var(--surface-hover);
        }

        .ownership-copy:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .qr-reveal {
          position: relative;
          flex: 0 0 auto;
        }

        .qr-popover {
          position: absolute;
          z-index: 20;
          bottom: calc(100% + 10px);
          right: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 156px;
          height: 156px;
          padding: 8px;
          border: 1px solid var(--hairline-strong);
          border-radius: 12px;
          background: var(--surface-raised);
          box-shadow: 0 18px 40px rgba(0, 0, 0, 0.35);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          animation: paletteIn 0.18s var(--ease-out) both;
        }

        .qr-popover img {
          width: 100%;
          height: 100%;
          border-radius: 6px;
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

        .skeleton-stack {
          display: grid;
          gap: 18px;
        }

        .search-row {
          position: relative;
          margin-bottom: 20px;
        }

        .search-row svg {
          position: absolute;
          top: 50%;
          left: 15px;
          transform: translateY(-50%);
          width: 16px;
          height: 16px;
          color: var(--ink-faint);
          pointer-events: none;
        }

        .search-row input {
          width: 100%;
          min-height: 46px;
          padding: 0 15px 0 42px;
          border: 1px solid var(--hairline);
          border-radius: 13px;
          outline: none;
          background: var(--surface-sunken);
          color: var(--ink);
          font-size: 14px;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .search-row input:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent);
        }

        .search-empty {
          padding: 40px 20px;
          color: var(--ink-faint);
          text-align: center;
          font-size: 14px;
        }

        .chain-connector {
          display: flex;
          flex-direction: column;
          align-items: center;
          height: 46px;
          margin: -9px 0;
        }

        .chain-stub {
          flex: 1;
          min-height: 5px;
          width: 2px;
          background: var(--hairline-strong);
          transition: background 0.3s ease;
        }

        .chain-connector.valid .chain-stub {
          background: var(--success);
          opacity: 0.4;
        }

        .chain-connector.broken .chain-stub {
          background: var(--danger);
          opacity: 0.5;
        }

        .chain-links {
          position: relative;
          flex: 0 0 auto;
          width: 24px;
          height: 27px;
        }

        .chain-link {
          position: absolute;
          left: 50%;
          box-sizing: border-box;
          border: 3px solid var(--hairline-strong);
          border-radius: 999px;
          background: var(--surface-sunken);
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.1);
          transition: border-color 0.3s ease, box-shadow 0.3s ease, transform 0.3s ease,
            top 0.3s ease, bottom 0.3s ease;
        }

        .chain-link-a {
          top: 0;
          width: 13px;
          height: 17px;
          transform: translateX(-50%);
        }

        .chain-link-b {
          bottom: 0;
          width: 21px;
          height: 13px;
          transform: translateX(-50%);
        }

        .chain-connector.valid .chain-link {
          border-color: var(--success);
          box-shadow: 0 0 7px color-mix(in srgb, var(--success) 55%, transparent),
            inset 0 1px 1px rgba(255, 255, 255, 0.15);
        }

        .chain-connector.broken .chain-link {
          border-color: var(--danger);
          box-shadow: 0 0 7px color-mix(in srgb, var(--danger) 55%, transparent),
            inset 0 1px 1px rgba(255, 255, 255, 0.15);
        }

        .chain-connector.broken .chain-link-a {
          top: -3px;
          transform: translateX(-78%) rotate(-16deg);
        }

        .chain-connector.broken .chain-link-b {
          bottom: -3px;
          transform: translateX(-22%) rotate(12deg);
        }

        .chain-origin-cap {
          display: flex;
          align-items: center;
          gap: 10px;
          justify-content: center;
          margin: 2px 0 4px;
          color: var(--ink-faint);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .chain-origin-cap::before,
        .chain-origin-cap::after {
          content: "";
          width: 28px;
          height: 1px;
          background: var(--hairline-strong);
        }

        .load-more-row {
          display: flex;
          justify-content: center;
          margin-top: 22px;
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

          .qr-popover {
            right: auto;
            left: 50%;
            transform: translateX(-50%);
          }
        }
      `}</style>

      <div className="section-header">
        <div>
          <p className="eyebrow">SIGNED ENTRIES</p>

          <h2>Notebook</h2>

          <p className="muted">{statusText}</p>

          {API_URL && <p className="explorer-api-info">Backend: {API_URL}</p>}
        </div>

        <div className="explorer-top-actions">
          <button
            type="button"
            className="explorer-top-button"
            onClick={downloadBlockchain}
            disabled={loading || blocks.length === 0}
          >
            Download notebook.json
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

      {blocks.length > 0 && (
        <div className="search-row">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7.5" />
            <path d="m21 21-4.6-4.6" />
          </svg>

          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by message, address or hash..."
            aria-label="Search notebook entries"
          />
        </div>
      )}

      {loading && blocks.length === 0 && (
        <div className="skeleton-stack">
          <SkeletonEntry />
          <SkeletonEntry />
        </div>
      )}

      {!loading && !error && blocks.length === 0 && (
        <div className="empty-state">
          <span className="empty-state-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 3.5h9.5A2.5 2.5 0 0 1 18 6v14.5H8A2.5 2.5 0 0 1 5.5 18V6A2.5 2.5 0 0 1 6 3.5Z" />
              <path d="M18 20.5H8" />
              <path d="M9 8h6M9 11.5h6M9 15h4" />
            </svg>
          </span>

          <h3>No entries yet</h3>

          <p>Your notebook is empty. Signed thoughts and messages will appear here.</p>
        </div>
      )}

      {blocks.length > 0 && filteredBlocks.length === 0 && (
        <div className="search-empty">No entries match &ldquo;{query}&rdquo;.</div>
      )}

      <div className="block-list">
        {visibleBlocks.map((block, position) => {
          const isLastVisible = position === visibleBlocks.length - 1;
          const isGenesis = block.index === 0;

          return (
            <div key={block.hash || `${block.index}-${block.timestamp}`}>
              <NotebookEntry
                block={block}
                chainInfo={chainStatus.get(block.index)}
                onVerifyEntry={onVerifyEntry}
                onError={setError}
              />

              {!query && isGenesis && <div className="chain-origin-cap">Genesis</div>}

              {!query && !isGenesis && (!isLastVisible || !hasMore) && (
                <ChainConnector valid={Boolean(chainStatus.get(block.index)?.linkValid)} />
              )}
            </div>
          );
        })}
      </div>

      {hasMore && (
        <div className="load-more-row">
          <button
            type="button"
            className="explorer-top-button"
            onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
          >
            Load {Math.min(PAGE_SIZE, filteredBlocks.length - visibleBlocks.length)} more
            {" "}
            ({filteredBlocks.length - visibleBlocks.length} remaining)
          </button>
        </div>
      )}
    </section>
  );
}
