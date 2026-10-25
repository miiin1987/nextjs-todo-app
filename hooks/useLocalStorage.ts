"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * SSR安全なlocalStorageフック。
 * サーバーサイドでは initialValue を使い、クライアントで hydration 後に
 * localStorage から値を読み込む。
 */
function useLocalStorage<T>(key: string, initialValue: T) {
  // サーバーサイドでは initialValue をそのまま使う
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  // hydration が完了したかを追跡
  const [isHydrated, setIsHydrated] = useState(false);

  // クライアントでのみ localStorage から読み込む
  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item !== null) {
        setStoredValue(JSON.parse(item) as T);
      }
    } catch (error) {
      console.error(`[useLocalStorage] 読み込みエラー (key: ${key})`, error);
    } finally {
      setIsHydrated(true);
    }
  }, [key]);

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const next = value instanceof Function ? value(prev) : value;
        try {
          window.localStorage.setItem(key, JSON.stringify(next));
        } catch (error) {
          console.error(`[useLocalStorage] 書き込みエラー (key: ${key})`, error);
        }
        return next;
      });
    },
    [key]
  );

  return [storedValue, setValue, isHydrated] as const;
}

export default useLocalStorage;
