import { describe, it, expect, vi } from 'vitest';
import { EventBus } from '../../src/utils/event-bus';

describe('Integration Test: EventBus', () => {

  it('should allow a consumer to subscribe to and receive an event', () => {
    // Arrange
    const eventBus = new EventBus();
    const mockCallback = vi.fn();
    const eventName = 'test:event';
    const payload = { message: 'Hello, World!' };

    // Act
    eventBus.on(eventName, mockCallback);
    eventBus.emit(eventName, payload);

    // Assert
    expect(mockCallback).toHaveBeenCalledOnce();
    expect(mockCallback).toHaveBeenCalledWith(payload);
  });

  it('should allow multiple consumers to subscribe to the same event', () => {
    // Arrange
    const eventBus = new EventBus();
    const mockCallback1 = vi.fn();
    const mockCallback2 = vi.fn();
    const eventName = 'test:multiple';
    const payload = { data: 123 };

    // Act
    eventBus.on(eventName, mockCallback1);
    eventBus.on(eventName, mockCallback2);
    eventBus.emit(eventName, payload);

    // Assert
    expect(mockCallback1).toHaveBeenCalledOnce();
    expect(mockCallback1).toHaveBeenCalledWith(payload);
    expect(mockCallback2).toHaveBeenCalledOnce();
    expect(mockCallback2).toHaveBeenCalledWith(payload);
  });

  it('should allow a consumer to unsubscribe from an event', () => {
    // Arrange
    const eventBus = new EventBus();
    const mockCallback = vi.fn();
    const eventName = 'test:unsubscribe';
    const payload = { should: 'not be received' };

    // Act
    const unsubscribe = eventBus.on(eventName, mockCallback);
    unsubscribe(); // Unsubscribe immediately
    eventBus.emit(eventName, payload);

    // Assert
    expect(mockCallback).not.toHaveBeenCalled();
  });

});