import type { IStorageManager } from './interfaces.js';
import type { ExportData } from './types.js';

export class StorageManager implements IStorageManager {
  isExtensionContext = typeof chrome !== "undefined" && !!chrome.storage;
  isWorkerContext = typeof window === "undefined";

  async get<T>(key: string): Promise<T | null> {
    if (this.isExtensionContext) {
      return (await chrome.storage.local.get(key))[key] || null;
    }
    if (!this.isWorkerContext) {
      const t = localStorage.getItem(key);
      return t ? JSON.parse(t) as T : null;
    }
    throw new Error("No valid storage available in this context");
  }

  async set(key: string, value: unknown): Promise<void> {
    if (this.isExtensionContext) {
      await chrome.storage.local.set({ [key]: value });
      return;
    }
    if (!this.isWorkerContext) {
      localStorage.setItem(key, JSON.stringify(value));
      return;
    }
    throw new Error("No valid storage available in this context");
  }

  async remove(key: string): Promise<void> {
    if (this.isExtensionContext) {
      await chrome.storage.local.remove(key);
      return;
    }
    if (!this.isWorkerContext) {
      localStorage.removeItem(key);
      return;
    }
    throw new Error("No valid storage available in this context");
  }

  async clear(): Promise<void> {
    if (this.isExtensionContext) {
      await chrome.storage.local.clear();
      return;
    }
    if (!this.isWorkerContext) {
      localStorage.clear();
      return;
    }
    throw new Error("No valid storage available in this context");
  }

  async getQuotaInfo(): Promise<{ used: number; available: number }> {
    try {
      if (this.isExtensionContext) {
        const used = await chrome.storage.local.getBytesInUse();
        const quota = chrome.storage.local.QUOTA_BYTES || 5242880; // 5MB default
        return {
          used,
          available: quota - used
        };
      } else {
        const estimate = await navigator.storage?.estimate();
        return {
          used: estimate?.usage || 0,
          available: estimate?.quota || 0
        };
      }
    } catch (error) {
      console.error(`[StorageManager] Error getting quota info:`, error);
      return { used: 0, available: 0 };
    }
  }

  async backup(): Promise<ExportData> {
    try {
      const keys = await this.getAllKeys();
      const data: Record<string, any> = {};
      
      for (const key of keys) {
        data[key] = await this.get(key);
      }

      return {
        metadata: {
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href,
          extensionId: this.isExtensionContext ? chrome.runtime?.id : undefined,
          manifestVersion: this.isExtensionContext ? chrome.runtime?.getManifest()?.manifest_version : undefined,
          version: '1.0.0',
          environment: process.env.NODE_ENV || 'production'
        },
        systemHealth: data.systemHealth || {},
        performanceMetrics: data.performanceMetrics || {},
        errors: data.errors || [],
        configuration: data.configuration || {},
        sessions: data.sessions || []
      } as ExportData;
    } catch (error) {
      console.error(`[StorageManager] Error creating backup:`, error);
      throw error;
    }
  }

  async restore(data: ExportData): Promise<void> {
    try {
      await this.set('systemHealth', data.systemHealth);
      await this.set('performanceMetrics', data.performanceMetrics);
      await this.set('errors', data.errors);
      await this.set('configuration', data.configuration);
      await this.set('sessions', data.sessions);
      await this.set('lastRestore', data.metadata.timestamp);
    } catch (error) {
      console.error(`[StorageManager] Error restoring data:`, error);
      throw error;
    }
  }

  private async getAllKeys(): Promise<string[]> {
    if (this.isExtensionContext) {
      const result = await chrome.storage.local.get(null);
      return Object.keys(result);
    } else {
      return Object.keys(localStorage);
    }
  }

  async getStorageSize(): Promise<number> {
    try {
      if (this.isExtensionContext) {
        return await chrome.storage.local.getBytesInUse();
      } else {
        let totalSize = 0;
        for (let key in localStorage) {
          if (localStorage.hasOwnProperty(key)) {
            totalSize += localStorage[key].length + key.length;
          }
        }
        return totalSize;
      }
    } catch (error) {
      console.error(`[StorageManager] Error calculating storage size:`, error);
      return 0;
    }
  }

  onStorageChange(callback: (changes: Record<string, any>) => void): () => void {
    if (this.isExtensionContext && chrome.storage.onChanged) {
      const listener = (changes: Record<string, chrome.storage.StorageChange>) => {
        const formattedChanges: Record<string, any> = {};
        for (const [key, change] of Object.entries(changes)) {
          formattedChanges[key] = {
            oldValue: change.oldValue,
            newValue: change.newValue
          };
        }
        callback(formattedChanges);
      };

      chrome.storage.onChanged.addListener(listener);
      return () => chrome.storage.onChanged.removeListener(listener);
    } else {
      const listener = (event: StorageEvent) => {
        if (event.key) {
          callback({
            [event.key]: {
              oldValue: event.oldValue ? JSON.parse(event.oldValue) : null,
              newValue: event.newValue ? JSON.parse(event.newValue) : null
            }
          });
        }
      };

      window.addEventListener('storage', listener);
      return () => window.removeEventListener('storage', listener);
    }
  }
}

export const storageManager = new StorageManager();