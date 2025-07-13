import { describe, it, expect, beforeEach } from 'vitest';

// Simulate the relevant logic from src/content/index.ts
function injectDiagnosticElement() {
  if (!document.getElementById('ishka-diagnostic-element-present')) {
    const diagnosticElement = document.createElement('div');
    diagnosticElement.id = 'ishka-diagnostic-element-present';
    diagnosticElement.style.display = 'none';
    document.body.appendChild(diagnosticElement);
    return diagnosticElement;
  }
  return null;
}

describe('Content Script Diagnostic Element', () => {
  beforeEach(() => {
    // Reset DOM before each test
    document.body.innerHTML = '';
  });

  it('should inject the diagnostic element if not present', () => {
    expect(document.getElementById('ishka-diagnostic-element-present')).toBeNull();
    injectDiagnosticElement();
    const el = document.getElementById('ishka-diagnostic-element-present');
    expect(el).toBeTruthy();
    expect(el?.style.display).toBe('none');
  });

  it('should not inject a duplicate diagnostic element', () => {
    injectDiagnosticElement();
    injectDiagnosticElement();
    const elements = document.querySelectorAll('#ishka-diagnostic-element-present');
    expect(elements.length).toBe(1);
  });
}); 