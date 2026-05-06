import React from "react";

export const ADMIN_AUTO_REFRESH_MS = 15000;

export function useAutoRefresh(callback, options = {}) {
  const { enabled = true, intervalMs = ADMIN_AUTO_REFRESH_MS } = options;
  const callbackRef = React.useRef(callback);

  React.useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  React.useEffect(() => {
    if (!enabled) return undefined;

    const refresh = () => {
      callbackRef.current?.();
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };

    const intervalId = window.setInterval(refresh, intervalMs);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [enabled, intervalMs]);
}
