import { cloneElement, useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "../hooks";

export default function Magnetic({ children, strength = 14 }) {
  const ref = useRef(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const node = ref.current;

    if (!node || reducedMotion) {
      return undefined;
    }

    function handleMove(event) {
      const rect = node.getBoundingClientRect();
      const relX = event.clientX - rect.left - rect.width / 2;
      const relY = event.clientY - rect.top - rect.height / 2;
      const x = (relX / (rect.width / 2)) * strength;
      const y = (relY / (rect.height / 2)) * strength;

      node.style.setProperty("--magnet-x", `${x.toFixed(2)}px`);
      node.style.setProperty("--magnet-y", `${y.toFixed(2)}px`);
    }

    function handleLeave() {
      node.style.setProperty("--magnet-x", "0px");
      node.style.setProperty("--magnet-y", "0px");
    }

    node.addEventListener("mousemove", handleMove);
    node.addEventListener("mouseleave", handleLeave);

    return () => {
      node.removeEventListener("mousemove", handleMove);
      node.removeEventListener("mouseleave", handleLeave);
    };
  }, [reducedMotion, strength]);

  const existingRef = children.ref;

  return cloneElement(children, {
    ref: (node) => {
      ref.current = node;

      if (typeof existingRef === "function") {
        existingRef(node);
      } else if (existingRef && typeof existingRef === "object") {
        existingRef.current = node;
      }
    },
    className: `${children.props.className || ""} magnetic`.trim(),
  });
}
