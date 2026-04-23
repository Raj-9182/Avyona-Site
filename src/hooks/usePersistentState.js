import { useEffect, useState } from "react";
import { readStorage, writeStorage } from "../../Frontend/utils/storefront";

export function usePersistentState(key, fallback, options = {}) {
  const { removeWhenNull = false } = options;
  const [state, setState] = useState(() => readStorage(key, fallback));

  useEffect(() => {
    if (removeWhenNull && (state === null || state === undefined)) {
      window.localStorage.removeItem(key);
      return;
    }
    writeStorage(key, state);
  }, [key, removeWhenNull, state]);

  return [state, setState];
}
