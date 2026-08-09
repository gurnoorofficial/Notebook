import { useEffect, useState } from "react";
import Magnetic from "./Magnetic";

const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

export default function VerifySignature({ prefill }) {
  const [message, setMessage] = useState(prefill?.message || "");
  const [signature, setSignature] = useState(prefill?.signature || "");
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!prefill) {
      return;
    }

    setMessage(prefill.message || "");
    setSignature(prefill.signature || "");
    setResult(null);
    setError("");
    setStatus("Entry loaded from your notebook. Ready to verify.");
  }, [prefill]);

  async function verifySignature() {
    try {
      setBusy(true);
      setError("");
      setStatus("Verifying signature...");
      setResult(null);

      if (!message.trim()) {
        throw new Error("Message is required.");
      }

      if (!signature.trim()) {
        throw new Error("Ethereum signature is required.");
      }

      const response = await fetch(`${API_URL}/api/verify-signature`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          message,
          signature: signature.trim(),
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

      if (!data) {
        throw new Error("Backend returned an empty response.");
      }

      if (!response.ok || !data.valid) {
        throw new Error(
          data?.error || data?.message || "Signature is invalid for this message."
        );
      }

      setResult({
        valid: true,
        recoveredAddress: data.recovered_address,
        recoveredPublicKey: data.recovered_public_key,
        message: data.message ?? message,
      });

      setStatus("Signature verified successfully.");
    } catch (verifyError) {
      console.error("Verify signature error:", verifyError);

      setResult(null);

      setError(verifyError?.message || "Could not verify signature.");

      setStatus("");
    } finally {
      setBusy(false);
    }
  }

  function clearForm() {
    setMessage("");
    setSignature("");
    setResult(null);
    setStatus("");
    setError("");
  }

  return (
    <section className="panel">
      <p className="eyebrow">SIGNATURE VERIFICATION</p>
      <h2>Verify Signature</h2>

      <p className="muted">
        Recover the Ethereum address that signed a message and confirm the signature is
        valid.
      </p>

      {error && <div className="alert">{error}</div>}

      {status && <div className="success-alert">{status}</div>}

      <label>Message</label>

      <textarea
        value={message}
        onChange={(event) => {
          setMessage(event.target.value);
          setResult(null);
        }}
        placeholder="Enter the exact message that was signed"
        disabled={busy}
      />

      <label>Ethereum signature</label>

      <textarea
        value={signature}
        onChange={(event) => {
          setSignature(event.target.value);
          setResult(null);
        }}
        placeholder="Enter the 0x signature"
        disabled={busy}
      />

      <Magnetic strength={6}>
        <button
          type="button"
          className="primary-button"
          onClick={verifySignature}
          disabled={busy || !message.trim() || !signature.trim()}
        >
          {busy ? "Verifying..." : "Verify Signature"}
        </button>
      </Magnetic>

      {result && (
        <div className="block-card entrance entrance-1" style={{ marginTop: "18px" }}>
          <div className="block-heading">
            <strong>VERIFICATION STATUS</strong>
            <span className="valid-badge">VALID</span>
          </div>

          <div className="message-box">
            <strong>Recovered Ethereum address</strong>
            <pre>{result.recoveredAddress}</pre>
          </div>

          <div className="message-box" style={{ marginTop: "14px" }}>
            <strong>Recovered public key</strong>
            <pre>{result.recoveredPublicKey}</pre>
          </div>
        </div>
      )}

      <button
        type="button"
        className="crypto-secondary-button crypto-clear-button"
        onClick={clearForm}
        disabled={busy}
      >
        Clear
      </button>
    </section>
  );
}
