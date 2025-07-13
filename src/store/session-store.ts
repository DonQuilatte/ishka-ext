import { writable, derived, type Readable } from 'svelte/store';
import type { ChatGPTSession } from '../utils/types.js';
import { eventBus } from '../utils/event-bus.js';
import { storageManager } from '../utils/storage-manager.js';
// import { chatGPTAdapter } from '../utils/chatgpt-adapter.ts';

interface SessionStoreState {
  currentSession: ChatGPTSession | null;
  allSessions: ChatGPTSession[];
  isObserving: boolean;
  lastSync: Date | null;
  connectionStatus: 'connected' | 'disconnected' | 'checking';
}

const initialState: SessionStoreState = {
  currentSession: null,
  allSessions: [],
  isObserving: false,
  lastSync: null,
  connectionStatus: 'disconnected'
};

function createSessionStore() {
  const { subscribe, set, update } = writable<SessionStoreState>(initialState);
  let observerCleanup: (() => void) | null = null;

  return {
    subscribe,
    
    // Session Management
    setCurrentSession(session: ChatGPTSession | null) {
      update(state => ({ 
        ...state, 
        currentSession: session,
        connectionStatus: session ? 'connected' : 'disconnected',
        lastSync: session ? new Date() : state.lastSync
      }));
      
      if (session) {
        storageManager.set('currentSession', session);
        eventBus.emit('session:changed', session);
      }
    },

    setSessions(sessions: ChatGPTSession[]) {
      update(state => ({ ...state, allSessions: sessions }));
      storageManager.set('sessions', sessions);
    },

    addSession(session: ChatGPTSession) {
      update(state => {
        const exists = state.allSessions.find(s => s.conversationId === session.conversationId);
        if (exists) {
          // Update existing session
          const updated = state.allSessions.map(s => 
            s.conversationId === session.conversationId ? session : s
          );
          return { ...state, allSessions: updated };
        } else {
          // Add new session
          return { ...state, allSessions: [...state.allSessions, session] };
        }
      });
    },

    removeSession(conversationId: string) {
      update(state => ({
        ...state,
        allSessions: state.allSessions.filter(s => s.conversationId !== conversationId),
        currentSession: state.currentSession?.conversationId === conversationId ? null : state.currentSession
      }));
    },

    // Observation Management
    async startObserving() {
      if (observerCleanup) {
        observerCleanup();
      }

      update(state => ({ ...state, isObserving: true, connectionStatus: 'checking' }));

      try {
        // Initial session detection
        const session = await chatGPTAdapter.detectCurrentSession();
        this.setCurrentSession(session);

        // Start observing changes
        observerCleanup = chatGPTAdapter.observeSessionChanges((newSession) => {
          this.setCurrentSession(newSession);
        });

        update(state => ({ ...state, isObserving: true }));
      } catch (error) {
        console.error('[SessionStore] Failed to start observing:', error);
        update(state => ({ ...state, isObserving: false, connectionStatus: 'disconnected' }));
      }
    },

    stopObserving() {
      if (observerCleanup) {
        observerCleanup();
        observerCleanup = null;
      }
      
      update(state => ({ 
        ...state, 
        isObserving: false,
        connectionStatus: 'disconnected'
      }));
    },

    // Data Sync
    async syncSessions() {
      if (!chatGPTAdapter.isOnChatGPTPage()) {
        return;
      }

      try {
        update(state => ({ ...state, connectionStatus: 'checking' }));
        
        const sessions = await chatGPTAdapter.getAllSessions();
        this.setSessions(sessions);
        
        update(state => ({ 
          ...state, 
          lastSync: new Date(),
          connectionStatus: 'connected'
        }));
      } catch (error) {
        console.error('[SessionStore] Failed to sync sessions:', error);
        update(state => ({ ...state, connectionStatus: 'disconnected' }));
      }
    },

    async extractConversationData() {
      try {
        const data = await chatGPTAdapter.extractConversationData();
        if (data && data.session) {
          this.addSession(data.session);
        }
        return data;
      } catch (error) {
        console.error('[SessionStore] Failed to extract conversation data:', error);
        return null;
      }
    },

    // Initialization
    async initialize() {
      try {
        const [savedSession, savedSessions] = await Promise.all([
          storageManager.get<ChatGPTSession>('currentSession'),
          storageManager.get<ChatGPTSession[]>('sessions')
        ]);

        update(state => ({
          ...state,
          currentSession: savedSession,
          allSessions: savedSessions || []
        }));

        // Auto-start observing if on ChatGPT page
        if (chatGPTAdapter.isOnChatGPTPage()) {
          await this.startObserving();
        }
      } catch (error) {
        console.error('[SessionStore] Failed to initialize:', error);
      }
    },

    reset() {
      this.stopObserving();
      set(initialState);
    }
  };
}

export const sessionStore = createSessionStore();

// Derived stores
export const isOnChatGPT: Readable<boolean> = derived(
  sessionStore,
  () => chatGPTAdapter.isOnChatGPTPage()
);

export const hasActiveSession: Readable<boolean> = derived(
  sessionStore,
  ($session) => $session.currentSession !== null
);

export const sessionCount: Readable<number> = derived(
  sessionStore,
  ($session) => $session.allSessions.length
);

export const isConnected: Readable<boolean> = derived(
  sessionStore,
  ($session) => $session.connectionStatus === 'connected'
);

export const activeSessions: Readable<ChatGPTSession[]> = derived(
  sessionStore,
  ($session) => $session.allSessions.filter(s => s.isActive)
);

export const recentSessions: Readable<ChatGPTSession[]> = derived(
  sessionStore,
  ($session) => {
    return [...$session.allSessions]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 10);
  }
);

// Event listeners
eventBus.on('session:detected', (session: ChatGPTSession) => {
  sessionStore.setCurrentSession(session);
});

// Auto-sync on page changes
if (typeof window !== 'undefined') {
  let currentUrl = window.location.href;
  
  const observer = new MutationObserver(() => {
    if (window.location.href !== currentUrl) {
      currentUrl = window.location.href;
      if (chatGPTAdapter.isOnChatGPTPage()) {
        sessionStore.syncSessions();
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}