import { useState } from "react";
import { decrypt } from "eciesjs";
import CopyGlyph from "./CopyGlyph";
import Magnetic from "./Magnetic";

function removeHexPrefix(value) {
  return String(value || "")
    .trim()
    .replace(/^0x/i, "");
}

function removeWhitespace(value) {
  return String(value || "").replace(/\s+/g, "");
}

function isHex(value) {
  return /^[0-9a-fA-F]+$/.test(value);
}

function hexToBytes(hexValue) {
  if (hexValue.length % 2 !== 0) {
    throw new Error("Ciphertext HEX must contain an even number of characters.");
  }

  const result = new Uint8Array(hexValue.length / 2);

  for (let index = 0; index < hexValue.length; index += 2) {
    result[index / 2] = Number.parseInt(hexValue.slice(index, index + 2), 16);
  }

  return result;
}

function validatePrivateKey(privateKey) {
  if (!privateKey) {
    throw new Error("Private key is required.");
  }

  if (!isHex(privateKey)) {
    throw new Error("Private key must contain only hexadecimal characters.");
  }

  if (privateKey.length !== 64) {
    throw new Error("Private key must be exactly 64 hexadecimal characters.");
  }

  if (/^0+$/.test(privateKey)) {
    throw new Error("Private key cannot be zero.");
  }
}

function validateCiphertext(ciphertextHex) {
  if (!ciphertextHex) {
    throw new Error("Ciphertext HEX is required.");
  }

  if (!isHex(ciphertextHex)) {
    throw new Error("Ciphertext must contain only hexadecimal characters.");
  }

  if (ciphertextHex.length % 2 !== 0) {
    throw new Error("Ciphertext HEX must contain an even number of characters.");
  }

  if (ciphertextHex.length < 194) {
    throw new Error("Ciphertext is too short to be a valid ECIES payload.");
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
    throw new Error("Copy failed. Select and copy the message manually.");
  }
}

function DecryptMessage() {
  const [privateKey, setPrivateKey] = useState("");

  const [ciphertextHex, setCiphertextHex] = useState("");

  const [decryptedMessage, setDecryptedMessage] = useState("");

  const [status, setStatus] = useState("");

  const [error, setError] = useState("");

  const [loading, setLoading] = useState(false);

  const [showPrivateKey, setShowPrivateKey] = useState(false);

  const [copied, setCopied] = useState(false);

  function decryptMessage(event) {
    event.preventDefault();

    setError("");
    setStatus("");
    setDecryptedMessage("");
    setCopied(false);
    setLoading(true);

    try {
      const normalizedPrivateKey = removeHexPrefix(privateKey);

      const normalizedCiphertext = removeHexPrefix(removeWhitespace(ciphertextHex));

      validatePrivateKey(normalizedPrivateKey);

      validateCiphertext(normalizedCiphertext);

      const ciphertextBytes = hexToBytes(normalizedCiphertext);

      /*
       * Decryption happens entirely inside this browser.
       *
       * There is no fetch(), API call or request containing
       * the private key.
       */
      const plaintextBytes = decrypt(normalizedPrivateKey, ciphertextBytes);

      const plaintext = new TextDecoder("utf-8", {
        fatal: true,
      }).decode(plaintextBytes);

      setDecryptedMessage(plaintext);

      setStatus("Message decrypted locally. The private key was not sent to the backend.");
    } catch (decryptError) {
      console.error(
        "Local decryption failed:",
        decryptError instanceof Error ? decryptError.message : decryptError
      );

      setError("Decryption failed. Check that the private key and ciphertext belong together.");
    } finally {
      setLoading(false);
    }
  }

  async function copyMessage() {
    try {
      setError("");

      await copyText(decryptedMessage);

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch (copyError) {
      setError(copyError instanceof Error ? copyError.message : "Copy failed.");
    }
  }

  function clearForm() {
    setPrivateKey("");
    setCiphertextHex("");
    setDecryptedMessage("");
    setStatus("");
    setError("");
    setCopied(false);
    setShowPrivateKey(false);
  }

  return (
    <section className="panel">
      <div className="crypto-heading">
        <p className="eyebrow">LOCAL ECIES DECRYPTION</p>

        <h2>Decrypt Message</h2>

        <p className="muted">
          The private key and ciphertext are processed locally inside this browser. The
          Notebook backend is not involved in decryption.
        </p>
      </div>

      <div className="local-security-box">
        <strong>Private key stays on this device</strong>

        <p>
          This component does not make an API request. Your private key is held temporarily
          in this browser tab and is cleared when you press Clear, reload, close or navigate
          away from the page.
        </p>
      </div>

      <div className="private-key-warning">
        <strong>Important:</strong> only use this feature on a device and browser you trust.
        Browser extensions, malware, modified website JavaScript or screen-recording software
        could still capture entered information.
      </div>

      {error && <div className="alert">{error}</div>}

      {status && <div className="success-alert">{status}</div>}

      <form onSubmit={decryptMessage}>
        <label htmlFor="decrypt-private-key">Raw private key</label>

        <div className="private-key-row">
          <input
            id="decrypt-private-key"
            type={showPrivateKey ? "text" : "password"}
            value={privateKey}
            onChange={(event) => {
              setPrivateKey(event.target.value);
            }}
            placeholder="64 hexadecimal characters"
            spellCheck="false"
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="new-password"
            disabled={loading}
          />

          <button
            type="button"
            className="private-key-toggle"
            onClick={() => {
              setShowPrivateKey((currentValue) => !currentValue);
            }}
            disabled={loading}
          >
            {showPrivateKey ? "Hide" : "Show"}
          </button>
        </div>

        <p className="crypto-help">
          The key can be entered with or without the 0x prefix. It is never included in a
          network request by this component.
        </p>

        <label htmlFor="decrypt-ciphertext">Ciphertext HEX</label>

        <textarea
          id="decrypt-ciphertext"
          className="crypto-mono-input"
          value={ciphertextHex}
          onChange={(event) => {
            setCiphertextHex(event.target.value);
          }}
          placeholder="Paste the ciphertext hexadecimal text..."
          spellCheck="false"
          autoCapitalize="none"
          autoCorrect="off"
          disabled={loading}
        />

        <Magnetic strength={6}>
          <button
            className="primary-button"
            type="submit"
            disabled={loading || !privateKey.trim() || !ciphertextHex.trim()}
          >
            {loading ? "Decrypting locally..." : "Decrypt Message Locally"}
          </button>
        </Magnetic>
      </form>

      {decryptedMessage && (
        <div className="crypto-result entrance entrance-1">
          <div className="crypto-result-header">
            <strong>DECRYPTED MESSAGE</strong>

            <span className="muted">{decryptedMessage.length} characters</span>
          </div>

          <textarea value={decryptedMessage} readOnly />

          <button
            type="button"
            className="crypto-secondary-button crypto-full-button"
            onClick={copyMessage}
          >
            <CopyGlyph copied={copied} />
            <span>{copied ? "Copied" : "Copy Decrypted Message"}</span>
          </button>
        </div>
      )}

      <button
        type="button"
        className="crypto-secondary-button crypto-clear-button"
        onClick={clearForm}
        disabled={loading}
      >
        Clear Private Data
      </button>
    </section>
  );
}

export default DecryptMessage;
