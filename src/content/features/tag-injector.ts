/**
 * Tag Injector - Safely inject TagManager into ChatGPT conversations
 * 
 * CRITICAL: Uses only selectors.ts for DOM interaction
 * CRITICAL: Integrates with Safe Mode for graceful degradation
 * CRITICAL: Follows stability-first injection patterns
 */

import { safeQuerySelector, getSelector } from '../dom/selectors.js';
import { safeModeManager, withSafeModeProtection } from '../dom/safe-mode.js';
import { logger } from '../../utils/logger.js';
import TagManager from '../../ui/components/TagManager.svelte';

export interface TagInjectionResult {
  success: boolean;
  injectedElements: Element[];
  conversationId: string | null;
  error?: string;
}

export class TagInjector {
  private static instance: TagInjector;
  private mountedComponents: Map<string, { component: TagManager; element: Element }> = new Map();
  private observer: MutationObserver | null = null;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): TagInjector {
    if (!TagInjector.instance) {
      TagInjector.instance = new TagInjector();
    }
    return TagInjector.instance;
  }

  /**
   * Initialize the tag injection system
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Start observing DOM changes for new conversations
      this.startObserving();
      
      // Inject tags into existing conversations
      await this.injectIntoExistingConversations();
      
      this.isInitialized = true;
      logger.info('[TagInjector] Initialized successfully');
    } catch (error) {
      logger.error('[TagInjector] Failed to initialize', error);
      throw error;
    }
  }

  /**
   * Inject tags into all existing conversations
   */
  private async injectIntoExistingConversations(): Promise<void> {
    const conversations = this.findConversations();
    
    for (const conversation of conversations) {
      await this.injectTagsIntoConversation(conversation);
    }
  }

  /**
   * Find all conversation elements on the page
   */
  private findConversations(): Element[] {
    // Use fallback selector approach for robustness
    const primarySelector = getSelector('injection.conversationContainer');
    const fallbackSelector = getSelector('fallback.messageArea');
    
    let conversations: Element[] = [];
    
    if (primarySelector) {
      conversations = Array.from(document.querySelectorAll(primarySelector));
    }
    
    if (conversations.length === 0 && fallbackSelector) {
      conversations = Array.from(document.querySelectorAll(fallbackSelector));
    }
    
    return conversations;
  }

  /**
   * Inject TagManager into a specific conversation
   */
  private async injectTagsIntoConversation(conversationElement: Element): Promise<TagInjectionResult> {
    const conversationId = this.extractConversationId(conversationElement);
    
    if (!conversationId) {
      return {
        success: false,
        injectedElements: [],
        conversationId: null,
        error: 'Could not extract conversation ID'
      };
    }

    // Check if already injected
    if (this.mountedComponents.has(conversationId)) {
      return {
        success: true,
        injectedElements: [this.mountedComponents.get(conversationId)!.element],
        conversationId
      };
    }

    try {
      // Find the best injection point within this conversation
      const injectionPoint = this.findInjectionPoint(conversationElement);
      
      if (!injectionPoint) {
        return {
          success: false,
          injectedElements: [],
          conversationId,
          error: 'No suitable injection point found'
        };
      }

      // Create container for TagManager
      const tagContainer = this.createTagContainer(conversationId);
      
      // Mount Svelte component
      const tagManager = new TagManager({
        target: tagContainer,
        props: {
          conversationId,
          initialTags: [], // Will be loaded by component
          disabled: false,
          compact: false
        }
      });

      // Store mounted component for cleanup
      this.mountedComponents.set(conversationId, {
        component: tagManager,
        element: tagContainer
      });

      // Inject into DOM
      injectionPoint.appendChild(tagContainer);
      
      logger.info('[TagInjector] Successfully injected tags', { conversationId });
      
      return {
        success: true,
        injectedElements: [tagContainer],
        conversationId
      };
    } catch (error) {
      logger.error('[TagInjector] Failed to inject tags', { conversationId, error });
      return {
        success: false,
        injectedElements: [],
        conversationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Find the best injection point within a conversation
   */
  private findInjectionPoint(conversationElement: Element): Element | null {
    // Strategy 1: Look for conversation header or title area
    const headerSelectors = [
      'header',
      '[role="banner"]',
      '.conversation-header',
      'h1, h2, h3',
      '.title'
    ];
    
    for (const selector of headerSelectors) {
      const header = conversationElement.querySelector(selector);
      if (header) {
        return header.parentElement || header;
      }
    }
    
    // Strategy 2: Look for message container parent
    const messageContainer = conversationElement.querySelector('[data-message-id]');
    if (messageContainer) {
      return messageContainer.parentElement || conversationElement;
    }
    
    // Strategy 3: Use the conversation element itself
    return conversationElement;
  }

  /**
   * Create a container element for TagManager
   */
  private createTagContainer(conversationId: string): HTMLElement {
    const container = document.createElement('div');
    container.id = `ishka-tags-${conversationId}`;
    container.className = 'ishka-tag-container';
    container.setAttribute('data-ishka-component', 'tag-manager');
    container.setAttribute('data-conversation-id', conversationId);
    
    // Add container styles that work with ChatGPT's layout
    container.style.cssText = `
      margin: var(--ix-spacing-sm, 0.5rem) 0;
      padding: var(--ix-spacing-sm, 0.5rem);
      border-radius: var(--ix-border-radius, 0.375rem);
      background: var(--ix-color-bg-secondary, #f9fafb);
      border: 1px solid var(--ix-color-border-secondary, #e5e7eb);
      position: relative;
      z-index: 1;
      contain: layout style;
    `;
    
    return container;
  }

  /**
   * Extract conversation ID from conversation element
   */
  private extractConversationId(conversationElement: Element): string | null {
    // Strategy 1: Look for data attributes
    const dataId = conversationElement.getAttribute('data-conversation-id') ||
                   conversationElement.getAttribute('data-id') ||
                   conversationElement.getAttribute('id');
    
    if (dataId) {
      return dataId;
    }
    
    // Strategy 2: Extract from URL or other context
    const url = window.location.href;
    const urlMatch = url.match(/\/c\/([a-zA-Z0-9-]+)/);
    if (urlMatch) {
      return urlMatch[1];
    }
    
    // Strategy 3: Generate from page context
    const pageTitle = document.title;
    if (pageTitle && pageTitle !== 'ChatGPT') {
      return `conv-${btoa(pageTitle).substring(0, 8)}`;\n    }\n    \n    // Strategy 4: Use URL as fallback\n    return `conv-${btoa(window.location.pathname).substring(0, 8)}`;\n  }\n\n  /**\n   * Start observing DOM changes for new conversations\n   */\n  private startObserving(): void {\n    if (this.observer) {\n      return;\n    }\n\n    this.observer = new MutationObserver(withSafeModeProtection(\n      this.handleMutations.bind(this),\n      'conversation-tags'\n    ));\n\n    const observeTarget = document.body;\n    if (observeTarget) {\n      this.observer.observe(observeTarget, {\n        childList: true,\n        subtree: true,\n        attributes: false\n      });\n    }\n  }\n\n  /**\n   * Handle DOM mutations to detect new conversations\n   */\n  private async handleMutations(mutations: MutationRecord[]): Promise<void> {\n    for (const mutation of mutations) {\n      if (mutation.type === 'childList') {\n        for (const node of mutation.addedNodes) {\n          if (node.nodeType === Node.ELEMENT_NODE) {\n            const element = node as Element;\n            \n            // Check if this is a conversation element\n            if (this.isConversationElement(element)) {\n              await this.injectTagsIntoConversation(element);\n            }\n            \n            // Check if any child elements are conversations\n            const conversations = this.findConversations();\n            for (const conversation of conversations) {\n              if (!this.isAlreadyInjected(conversation)) {\n                await this.injectTagsIntoConversation(conversation);\n              }\n            }\n          }\n        }\n      }\n    }\n  }\n\n  /**\n   * Check if element is a conversation element\n   */\n  private isConversationElement(element: Element): boolean {\n    const conversationSelectors = [\n      '[data-conversation-id]',\n      '[data-message-id]',\n      'main[role=\"main\"]',\n      '.conversation'\n    ];\n    \n    return conversationSelectors.some(selector => {\n      return element.matches(selector) || element.querySelector(selector);\n    });\n  }\n\n  /**\n   * Check if conversation already has tags injected\n   */\n  private isAlreadyInjected(conversationElement: Element): boolean {\n    return conversationElement.querySelector('[data-ishka-component=\"tag-manager\"]') !== null;\n  }\n\n  /**\n   * Remove TagManager from a conversation\n   */\n  async removeFromConversation(conversationId: string): Promise<void> {\n    const mounted = this.mountedComponents.get(conversationId);\n    if (!mounted) {\n      return;\n    }\n\n    try {\n      // Destroy Svelte component\n      mounted.component.$destroy();\n      \n      // Remove DOM element\n      mounted.element.remove();\n      \n      // Remove from tracking\n      this.mountedComponents.delete(conversationId);\n      \n      logger.info('[TagInjector] Removed tags from conversation', { conversationId });\n    } catch (error) {\n      logger.error('[TagInjector] Failed to remove tags', { conversationId, error });\n    }\n  }\n\n  /**\n   * Refresh tags for a specific conversation\n   */\n  async refreshConversation(conversationId: string): Promise<void> {\n    await this.removeFromConversation(conversationId);\n    \n    // Find conversation element and re-inject\n    const conversations = this.findConversations();\n    for (const conversation of conversations) {\n      const id = this.extractConversationId(conversation);\n      if (id === conversationId) {\n        await this.injectTagsIntoConversation(conversation);\n        break;\n      }\n    }\n  }\n\n  /**\n   * Get all currently mounted tag managers\n   */\n  getMountedComponents(): Map<string, { component: TagManager; element: Element }> {\n    return new Map(this.mountedComponents);\n  }\n\n  /**\n   * Clean up all injected components\n   */\n  destroy(): void {\n    // Stop observing\n    if (this.observer) {\n      this.observer.disconnect();\n      this.observer = null;\n    }\n\n    // Destroy all mounted components\n    for (const [conversationId] of this.mountedComponents) {\n      this.removeFromConversation(conversationId);\n    }\n\n    this.isInitialized = false;\n    logger.info('[TagInjector] Destroyed successfully');\n  }\n}\n\n// Export singleton instance\nexport const tagInjector = TagInjector.getInstance();\n\n// Export convenience functions\nexport const initializeTagInjection = () => tagInjector.initialize();\nexport const injectTagsIntoConversation = (element: Element) => tagInjector.injectTagsIntoConversation(element);\nexport const removeTagsFromConversation = (conversationId: string) => tagInjector.removeFromConversation(conversationId);