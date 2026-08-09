import { createContext, useCallback, useContext, useRef, useState } from "react";

const LoadingBarContext = createContext(null);

export function LoadingBarProvider({ children }) {
  const [state, setState] = useState({ visible: false, progress: 0, finishing: false });
  const timerRef = useRef(null);

  const start = useCallback(() => {
    window.clearInterval(timerRef.current);

    setState({ visible: true, progress: 12, finishing: false });

    timerRef.current = window.setInterval(() => {
      setState((current) => {
        if (!current.visible || current.progress >= 82) {
          return current;
        }

        return { ...current, progress: current.progress + (82 - current.progress) * 0.14 };
      });
    }, 140);
  }, []);

  const done = useCallback(() => {
    window.clearInterval(timerRef.current);

    setState((current) => ({ ...current, progress: 100, finishing: true }));

    window.setTimeout(() => {
      setState({ visible: false, progress: 0, finishing: false });
    }, 260);
  }, []);

  return (
    <LoadingBarContext.Provider value={{ start, done }}>
      {children}
      <div
        className={`top-loading-bar ${state.visible ? "visible" : ""} ${
          state.finishing ? "finishing" : ""
        }`}
        style={{ width: `${state.progress}%` }}
        aria-hidden="true"
      />
    </LoadingBarContext.Provider>
  );
}

export function useLoadingBar() {
  const context = useContext(LoadingBarContext);

  if (!context) {
    throw new Error("useLoadingBar must be used inside a LoadingBarProvider.");
  }

  return context;
}
