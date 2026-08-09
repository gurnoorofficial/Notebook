import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

export default function QrReveal({ value, label = "QR" }) {
  const [dataUrl, setDataUrl] = useState(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function handleOutside(event) {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutside);

    return () => {
      document.removeEventListener("mousedown", handleOutside);
    };
  }, [open]);

  async function toggle() {
    if (open) {
      setOpen(false);
      return;
    }

    if (!value) {
      return;
    }

    if (!dataUrl) {
      try {
        setBusy(true);

        const url = await QRCode.toDataURL(value, {
          margin: 1,
          width: 220,
          color: {
            dark: "#1c1e15",
            light: "#f4efe4",
          },
        });

        setDataUrl(url);
      } catch {
        setBusy(false);
        return;
      } finally {
        setBusy(false);
      }
    }

    setOpen(true);
  }

  return (
    <span className="qr-reveal" ref={wrapRef}>
      <button
        type="button"
        className="ownership-copy"
        onClick={toggle}
        disabled={!value || busy}
        aria-expanded={open}
      >
        {busy ? "..." : label}
      </button>

      {open && (
        <span className="qr-popover" role="dialog" aria-label="QR code">
          {dataUrl && <img src={dataUrl} alt="" width={140} height={140} />}
        </span>
      )}
    </span>
  );
}
