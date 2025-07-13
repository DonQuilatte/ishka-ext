/**
 * @fileoverview Event bus implementation for inter-component communication.
 * Provides type-safe publish-subscribe pattern with error handling and cleanup.
 * 
 * @author Ishka Extension Team
 * @version 1.0.0
 */

import type { IEventBus } from './interfaces.js';

type EventHandler<T = any> = (data: T) => void;

/**
 * Event bus implementation for decoupled communication between components.
 * Supports both persistent and one-time event subscriptions with automatic cleanup.
 * 
 * @example
 * ```typescript
 * const eventBus = new EventBus();
 * 
 * // Subscribe to events
 * const unsubscribe = eventBus.on('user:login', (user) => {
 *   console.log('User logged in:', user.name);
 * });
 * 
 * // Emit events
 * eventBus.emit('user:login', { name: 'John', id: 123 });
 * 
 * // Cleanup
 * unsubscribe();
 * ```
 */
export class EventBus implements IEventBus {
  /** Map of persistent event listeners */
  private events = new Map<string, Set<EventHandler>>();
  
  /** Map of one-time event listeners */
  private onceEvents = new Map<string, Set<EventHandler>>();

  /**
   * Emit an event to all registered listeners.
   * Executes all persistent handlers first, then one-time handlers.
   * Errors in individual handlers are caught and logged but don't affect other handlers.
   * 
   * @param event - Event name to emit
   * @param data - Optional data payload to pass to handlers
   */
  emit<T>(event: string, data?: T): void {
    const handlers = this.events.get(event);
    const onceHandlers = this.onceEvents.get(event);

    // Execute persistent handlers
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data as T);
        } catch (error) {
          console.error(`[EventBus] Error in handler for event '${event}':`, error);
        }
      });
    }

    // Execute one-time handlers and clean them up
    if (onceHandlers) {
      onceHandlers.forEach(handler => {
        try {
          handler(data as T);
        } catch (error) {
          console.error(`[EventBus] Error in once handler for event '${event}':`, error);
        }
      });
      this.onceEvents.delete(event);
    }
  }

  on<T>(event: string, handler: EventHandler<T>): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    
    this.events.get(event)!.add(handler);

    return () => {
      const handlers = this.events.get(event);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.events.delete(event);
        }
      }
    };
  }

  once<T>(event: string, handler: EventHandler<T>): () => void {
    if (!this.onceEvents.has(event)) {
      this.onceEvents.set(event, new Set());
    }
    
    this.onceEvents.get(event)!.add(handler);

    return () => {
      const handlers = this.onceEvents.get(event);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.onceEvents.delete(event);
        }
      }
    };
  }

  off(event: string, handler?: EventHandler): void {
    if (handler) {
      const handlers = this.events.get(event);
      const onceHandlers = this.onceEvents.get(event);
      
      handlers?.delete(handler);
      onceHandlers?.delete(handler);
      
      if (handlers?.size === 0) {
        this.events.delete(event);
      }
      if (onceHandlers?.size === 0) {
        this.onceEvents.delete(event);
      }
    } else {
      this.events.delete(event);
      this.onceEvents.delete(event);
    }
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.events.delete(event);
      this.onceEvents.delete(event);
    } else {
      this.events.clear();
      this.onceEvents.clear();
    }
  }

  getEventCount(event: string): number {
    const handlers = this.events.get(event)?.size || 0;
    const onceHandlers = this.onceEvents.get(event)?.size || 0;
    return handlers + onceHandlers;
  }

  getAllEvents(): string[] {
    const events = new Set([
      ...this.events.keys(),
      ...this.onceEvents.keys()
    ]);
    return Array.from(events);
  }
}

export const eventBus = new EventBus();