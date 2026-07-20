import React, { useState, useEffect } from 'react';

/**
 * Shared hook for persisting state in localStorage.
 * Supports cross-tab synchronization via StorageEvent and custom storage_sync events.
 */
function useLocalStorage<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`[useLocalStorage] Failed to read key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // Read the freshest value from localStorage first to prevent overwriting concurrent edits
      const currentLocalStorageItem = window.localStorage.getItem(key);
      const freshValue = currentLocalStorageItem ? JSON.parse(currentLocalStorageItem) : storedValue;

      const valueToStore = value instanceof Function ? value(freshValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));

      // Dispatch custom event to sync other hooks on the same page
      window.dispatchEvent(new Event('storage_sync'));
    } catch (error) {
      console.error(`[useLocalStorage] Failed to write key "${key}":`, error);
    }
  };

  useEffect(() => {
    const handleStorageChange = (e: Event) => {
      if (e instanceof StorageEvent) {
        if (e.key === key) {
          try {
            const val = e.newValue ? JSON.parse(e.newValue) : initialValue;
            setStoredValue(val);
          } catch (err) {
            console.error(`[useLocalStorage] Failed to sync key "${key}":`, err);
          }
        }
      } else {
        try {
          const item = window.localStorage.getItem(key);
          if (item) {
            setStoredValue(JSON.parse(item));
          }
        } catch (err) {
          console.error(`[useLocalStorage] Failed to sync key "${key}" from storage_sync:`, err);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('storage_sync', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('storage_sync', handleStorageChange);
    };
  }, [key, initialValue]);

  return [storedValue, setValue];
}

export default useLocalStorage;
