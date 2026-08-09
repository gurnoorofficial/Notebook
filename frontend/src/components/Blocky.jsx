import { useMemo } from "react";
import { blockyDataUrl } from "../blockies";

export default function Blocky({ seed, size = 28 }) {
  const src = useMemo(() => {
    if (!seed) {
      return null;
    }

    try {
      return blockyDataUrl(seed);
    } catch {
      return null;
    }
  }, [seed]);

  if (!src) {
    return <span className="blocky-placeholder" style={{ width: size, height: size }} />;
  }

  return (
    <img
      className="blocky-avatar"
      src={src}
      alt=""
      width={size}
      height={size}
      style={{ width: size, height: size }}
    />
  );
}
