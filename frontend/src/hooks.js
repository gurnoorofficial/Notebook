import { useEffect, useRef, useState } from "react";

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return false;
    }

    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return undefined;
    }

    const query = window.matchMedia("(prefers-reduced-motion: reduce)");

    function handleChange(event) {
      setReduced(event.matches);
    }

    query.addEventListener("change", handleChange);

    return () => {
      query.removeEventListener("change", handleChange);
    };
  }, []);

  return reduced;
}

export function useLocalStorage(key, defaultValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = window.localStorage.getItem(key);

      return stored === null ? defaultValue : JSON.parse(stored);
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage unavailable (private browsing, quota). Ignore.
    }
  }, [key, value]);

  return [value, setValue];
}

export function useInView(options) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const node = ref.current;

    if (!node) {
      return undefined;
    }

    if (reducedMotion || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return undefined;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true);
        observer.unobserve(node);
      }
    }, options || { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [reducedMotion, options]);

  return [ref, inView];
}

export function useCountUp(target, duration = 600) {
  const [displayValue, setDisplayValue] = useState(target);
  const previousRef = useRef(target);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const from = previousRef.current;
    const to = target;

    if (reducedMotion || from === to || Number.isNaN(from) || Number.isNaN(to)) {
      previousRef.current = to;
      setDisplayValue(to);
      return undefined;
    }

    let frame;
    const start = performance.now();

    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(from + (to - from) * eased);

      setDisplayValue(current);

      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        previousRef.current = to;
      }
    }

    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [target, duration, reducedMotion]);

  return displayValue;
}
