import { writable, derived, type Readable } from 'svelte/store';
import type { DiagnosticCategory } from '../utils/types.js';

interface UIStoreState {
  isVisible: boolean;
  activeTab: DiagnosticCategory;
  isLoading: boolean;
  notifications: Notification[];
  theme: 'light' | 'dark' | 'auto';
  sidebarCollapsed: boolean;
}

interface Notification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  timestamp: Date;
  autoClose?: boolean;
  duration?: number;
}

const initialState: UIStoreState = {
  isVisible: true,
  activeTab: 'dom',
  isLoading: false,
  notifications: [],
  theme: 'auto',
  sidebarCollapsed: false
};

function createUIStore() {
  const { subscribe, set, update } = writable<UIStoreState>(initialState);

  return {
    subscribe,
    
    // Visibility Actions
    show() {
      update(state => ({ ...state, isVisible: true }));
    },

    hide() {
      update(state => ({ ...state, isVisible: false }));
    },

    toggle() {
      update(state => ({ ...state, isVisible: !state.isVisible }));
    },

    // Tab Management
    setActiveTab(tab: DiagnosticCategory) {
      update(state => ({ ...state, activeTab: tab }));
    },

    // Loading States
    setLoading(isLoading: boolean) {
      update(state => ({ ...state, isLoading }));
    },

    // Notifications
    addNotification(notification: Omit<Notification, 'id' | 'timestamp'>) {
      const id = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newNotification: Notification = {
        ...notification,
        id,
        timestamp: new Date(),
        autoClose: notification.autoClose ?? true,
        duration: notification.duration ?? 5000
      };

      update(state => ({
        ...state,
        notifications: [...state.notifications, newNotification]
      }));

      // Auto-remove if configured
      if (newNotification.autoClose) {
        setTimeout(() => {
          this.removeNotification(id);
        }, newNotification.duration);
      }

      return id;
    },

    removeNotification(id: string) {
      update(state => ({
        ...state,
        notifications: state.notifications.filter(n => n.id !== id)
      }));
    },

    clearNotifications() {
      update(state => ({ ...state, notifications: [] }));
    },

    // Theme Management
    setTheme(theme: 'light' | 'dark' | 'auto') {
      update(state => ({ ...state, theme }));
      
      // Apply theme to document
      if (theme === 'auto') {
        document.documentElement.removeAttribute('data-theme');
      } else {
        document.documentElement.setAttribute('data-theme', theme);
      }
    },

    // Sidebar
    toggleSidebar() {
      update(state => ({ ...state, sidebarCollapsed: !state.sidebarCollapsed }));
    },

    setSidebarCollapsed(collapsed: boolean) {
      update(state => ({ ...state, sidebarCollapsed: collapsed }));
    },

    // Utility methods
    showSuccessMessage(message: string) {
      this.addNotification({
        type: 'success',
        message,
        autoClose: true,
        duration: 3000
      });
    },

    showErrorMessage(message: string, details?: string) {
      this.addNotification({
        type: 'error',
        message: details ? `${message}: ${details}` : message,
        autoClose: false
      });
    },

    showWarningMessage(message: string) {
      this.addNotification({
        type: 'warning',
        message,
        autoClose: true,
        duration: 4000
      });
    },

    showInfoMessage(message: string) {
      this.addNotification({
        type: 'info',
        message,
        autoClose: true,
        duration: 4000
      });
    },

    reset() {
      set(initialState);
    }
  };
}

export const uiStore = createUIStore();

// Derived stores
export const currentTheme: Readable<'light' | 'dark'> = derived(
  uiStore,
  ($ui) => {
    if ($ui.theme === 'auto') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return $ui.theme;
  }
);

export const hasNotifications: Readable<boolean> = derived(
  uiStore,
  ($ui) => $ui.notifications.length > 0
);

export const errorNotifications: Readable<Notification[]> = derived(
  uiStore,
  ($ui) => $ui.notifications.filter(n => n.type === 'error')
);

export const hasErrors: Readable<boolean> = derived(
  errorNotifications,
  ($errors) => $errors.length > 0
);

// Listen for system theme changes
if (typeof window !== 'undefined') {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', () => {
    // Trigger reactive updates for auto theme
    uiStore.setTheme('auto');
  });
}