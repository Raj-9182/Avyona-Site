import { useEffect, useState } from "react";
import { readStorage, writeStorage } from "../utils/storefront";

export function usePersistentState(key, fallback, options = {}) {
  const { removeWhenNull = false, migrate } = options;
  const [state, setState] = useState(() => {
    const storedValue = readStorage(key, fallback);
    if (typeof migrate !== "function") return storedValue;

    try {
      return migrate(storedValue);
    } catch {
      return fallback;
    }
  });

  useEffect(() => {
    if (removeWhenNull && (state === null || state === undefined)) {
      window.localStorage.removeItem(key);
      return;
    }
    writeStorage(key, state);
  }, [key, removeWhenNull, state]);

  return [state, setState];
}
