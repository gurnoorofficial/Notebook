import { useState } from "react";
import { encrypt } from "eciesjs";
import CopyGlyph from "./CopyGlyph";
import Magnetic from "./Magnetic";

function removeHexPrefix(value) {
  return String(value || "")
    .trim()
    .replace(/^0x/i, "");
}

function isHex(value) {
  return /^[0-9a-fA-F]+$/.test(value);
}

function bytesToHex(bytes) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function validatePublicKey(publicKey) {
  if (!publicKey) {
    throw new Error("Friend's public key is required.");
  }

  if (!isHex(publicKey)) {
    throw new Error("Public key must contain only hexadecimal characters.");
  }

  if (publicKey.length !== 66 && publicKey.length !== 130) {
    throw new Error(
      "Public key must be a 33-byte compressed key or a 65-byte uncompressed key."
    );
  }

  const prefix = publicKey.slice(0, 2).toLowerCase();

  if (publicKey.length === 66 && prefix !== "02" && prefix !== "03") {
    throw new Error("Compressed public key must start with 02 or 03.");
  }

  if (publicKey.length === 130 && prefix !== "04") {
    throw new Error("Uncompressed public key must start with 04.");
  }
}

async function copyText(value) {
  const text = String(value || "");

  if (!text) {
    throw new Error("Nothing to copy.");
  }

  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);

      return;
    } catch {
      // Continue to fallback.
    }
  }

  const textarea = document.createElement("textarea");

  textarea.value = text;
  textarea.setAttribute("readonly", "");

  textarea.style.position = "fixed";
  textarea.style.top = "0";
  textarea.style.left = "-9999px";
  textarea.style.opacity = "0";
  textarea.style.fontSize = "16px";

  document.body.appendChild(textarea);

  textarea.focus();
  textarea.select();

  textarea.setSelectionRange(0, textarea.value.length);

  const copied = document.execCommand("copy");

  textarea.remove();

  if (!copied) {
    throw new Error("Copy failed. Select and copy the ciphertext manually.");
  }
}

function downloadCiphertext(ciphertextHex) {
  if (!ciphertextHex) {
    return;
  }

  const blob = new Blob([ciphertextHex], {
    type: "text/plain;charset=utf-8",
  });

  const objectUrl = URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = objectUrl;
  link.download = "ciphertext.txt";
  link.style.display = "none";

  document.body.appendChild(link);

  link.click();
  link.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 1000);
}

function EncryptMessage() {
  const [publicKey, setPublicKey] = useState("");

  const [message, setMessage] = useState("");

  const [ciphertextHex, setCiphertextHex] = useState("");

  const [status, setStatus] = useState("");

  const [error, setError] = useState("");

  const [loading, setLoading] = useState(false);

  const [copied, setCopied] = useState(false);

  function encryptMessage(event) {
    event.preventDefault();

    setError("");
    setStatus("");
    setCiphertextHex("");
    setCopied(false);
    setLoading(true);

    try {
      const normalizedPublicKey = removeHexPrefix(publicKey);

      validatePublicKey(normalizedPublicKey);

      if (!message.length) {
        throw new Error("Secret message is required.");
      }

      const plaintextBytes = new TextEncoder().encode(message);

      /*
       * Encryption happens locally inside the user's browser.
       *
       * No public key, message or ciphertext is sent to the
       * Notebook backend.
       */
      const ciphertextBytes = encrypt(normalizedPublicKey, plaintextBytes);

      const resultHex = bytesToHex(ciphertextBytes);

      setCiphertextHex(resultHex);

      setStatus("Encrypted successfully on this device. No data was sent to the backend.");
    } catch (encryptError) {
      setError(
        encryptError instanceof Error ? encryptError.message : "Message encryption failed."
      );
    } finally {
      setLoading(false);
    }
  }

  async function copyCiphertext() {
    try {
      setError("");

      await copyText(ciphertextHex);

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch (copyError) {
      setError(copyError instanceof Error ? copyError.message : "Copy failed.");
    }
  }

  function clearForm() {
    setPublicKey("");
    setMessage("");
    setCiphertextHex("");
    setStatus("");
    setError("");
    setCopied(false);
  }

  return (
    <section className="panel">
      <div className="crypto-heading">
        <p className="eyebrow">LOCAL ECIES ENCRYPTION</p>

        <h2>Encrypt Message</h2>

        <p className="muted">
          The recipient&apos;s secp256k1 public key and your message are processed locally
          inside this browser. No encryption request is sent to the Notebook backend.
        </p>
      </div>

      <div className="local-security-box">
        <strong>Local-device encryption</strong>

        <p>
          This operation runs in your browser. The backend does not receive the public key,
          message or ciphertext.
        </p>
      </div>

      {error && <div className="alert">{error}</div>}

      {status && <div className="success-alert">{status}</div>}

      <form onSubmit={encryptMessage}>
        <label htmlFor="encrypt-public-key">Friend&apos;s full public key</label>

        <textarea
          id="encrypt-public-key"
          className="crypto-mono-input"
          value={publicKey}
          onChange={(event) => {
            setPublicKey(event.target.value);
          }}
          placeholder="04... uncompressed key or 02/03... compressed key"
          spellCheck="false"
          autoCapitalize="none"
          autoCorrect="off"
          disabled={loading}
        />

        <p className="crypto-help">Enter a secp256k1 public key with or without the 0x prefix.</p>

        <label htmlFor="encrypt-message">Secret message</label>

        <textarea
          id="encrypt-message"
          value={message}
          onChange={(event) => {
            setMessage(event.target.value);
          }}
          placeholder="Enter the secret message..."
          disabled={loading}
        />

        <Magnetic strength={6}>
          <button
            className="primary-button"
            type="submit"
            disabled={loading || !publicKey.trim() || !message.length}
          >
            {loading ? "Encrypting locally..." : "Encrypt Message Locally"}
          </button>
        </Magnetic>
      </form>

      {ciphertextHex && (
        <div className="crypto-result entrance entrance-1">
          <div className="crypto-result-header">
            <strong>Ciphertext HEX</strong>

            <span className="muted">{ciphertextHex.length} hex characters</span>
          </div>

          <textarea value={ciphertextHex} readOnly spellCheck="false" />

          <div className="crypto-actions">
            <button type="button" className="crypto-secondary-button" onClick={copyCiphertext}>
              <CopyGlyph copied={copied} />
              <span>{copied ? "Copied" : "Copy Ciphertext"}</span>
            </button>

            <button
              type="button"
              className="crypto-secondary-button"
              onClick={() => {
                downloadCiphertext(ciphertextHex);
              }}
            >
              Download ciphertext.txt
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        className="crypto-secondary-button crypto-clear-button"
        onClick={clearForm}
        disabled={loading}
      >
        Clear
      </button>
    </section>
  );
}

export default EncryptMessage;
