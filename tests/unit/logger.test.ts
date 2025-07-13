import { describe, it, expect, vi } from 'vitest';
import { withSyncErrorHandling, Logger } from '../../src/utils/logger';

describe('withSyncErrorHandling', () => {
  it('returns result of operation if no error', () => {
    const logger = Logger.create('Test');
    const result = withSyncErrorHandling(() => 42, logger, 'compute');
    expect(result).toBe(42);
  });

  it('returns null and logs error if operation throws', () => {
    const logger = Logger.create('Test');
    const errorSpy = vi.spyOn(logger, 'error');
    const result = withSyncErrorHandling(() => { throw new Error('fail'); }, logger, 'failOp');
    expect(result).toBeNull();
    expect(errorSpy).toHaveBeenCalledWith('Failed to failOp', expect.any(Error));
  });
}); 