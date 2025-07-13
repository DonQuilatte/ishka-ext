#!/usr/bin/env node
/**
 * Complete Development Automation System
 * 
 * Provides full feedback loop automation for continuous development:
 * 1. Automatic extension management (reload, clear errors, pin)
 * 2. Complete test result capture and feedback
 * 3. Error clearing before each test cycle
 * 4. Extension installation/removal automation
 * 5. Real-time development feedback
 */

import { chromium } from '@playwright/test';
import type { Browser, BrowserContext, Page } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const execAsync = promisify(exec);

interface ExtensionManager {
  browser?: Browser;
  context?: BrowserContext;
  extensionId?: string;
  isConnected: boolean;
}

interface TestCycleResult {
  timestamp: string;
  buildSuccess: boolean;
  extensionReloaded: boolean;
  errorsCleared: boolean;
  pinEnabled: boolean;
  popupWorking: boolean;
  errors: string[];
  testResults: any[];
  recommendations: string[];
}

class CompleteDevelopmentAutomation {
  private manager: ExtensionManager = { isConnected: false };
  private extensionPath: string;
  private reportsDir: string;
  private knownExtensionId = 'gopolihabocpkgdoiogdmkfpjpfoaaao';

  constructor() {
    this.extensionPath = path.resolve(__dirname, '../dist');
    this.reportsDir = path.resolve(__dirname, '../test-reports');
  }

  async initialize(): Promise<boolean> {
    try {
      console.log('🚀 Initializing Complete Development Automation...');
      
      // Ensure reports directory exists
      await fs.mkdir(this.reportsDir, { recursive: true });
      
      // Launch browser with extension support
      this.manager.browser = await chromium.launch({
        headless: false,
        args: [
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--no-sandbox',
          '--disable-dev-shm-usage',
          '--remote-debugging-port=9222',
          `--load-extension=${this.extensionPath}`,
          `--disable-extensions-except=${this.extensionPath}`
        ]
      });

      this.manager.context = await this.manager.browser.newContext();
      this.manager.isConnected = true;
      
      console.log('✅ Browser initialized with extension support');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to initialize automation:', error);
      return false;
    }
  }

  async runCompleteCycle(): Promise<TestCycleResult> {
    const result: TestCycleResult = {
      timestamp: new Date().toISOString(),
      buildSuccess: false,
      extensionReloaded: false,
      errorsCleared: false,
      pinEnabled: false,
      popupWorking: false,
      errors: [],
      testResults: [],
      recommendations: []
    };

    try {
      console.log('\n🔄 STARTING COMPLETE DEVELOPMENT CYCLE');
      console.log('=====================================');

      // Step 1: Build Extension
      console.log('\n📦 Step 1: Building extension...');
      result.buildSuccess = await this.buildExtension();
      if (!result.buildSuccess) {
        result.recommendations.push('Fix build errors before proceeding');
        return result;
      }

      // Step 2: Clear Previous Errors
      console.log('\n🧹 Step 2: Clearing previous errors...');
      result.errorsCleared = await this.clearExtensionErrors();

      // Step 3: Reload Extension
      console.log('\n🔄 Step 3: Reloading extension...');
      result.extensionReloaded = await this.reloadExtension();

      // Step 4: Enable Pin to Toolbar
      console.log('\n📌 Step 4: Enabling pin to toolbar...');
      result.pinEnabled = await this.enablePinToToolbar();

      // Step 5: Test Popup Functionality
      console.log('\n🧪 Step 5: Testing popup functionality...');
      const popupResult = await this.testPopupFunctionality();
      result.popupWorking = popupResult.success;
      result.errors.push(...popupResult.errors);

      // Step 6: Capture Current Errors
      console.log('\n🔍 Step 6: Capturing current errors...');
      const currentErrors = await this.captureCurrentErrors();
      result.errors.push(...currentErrors);

      // Step 7: Generate Analysis and Recommendations
      console.log('\n📊 Step 7: Analyzing results...');
      result.recommendations = this.generateRecommendations(result);

      // Step 8: Save Results and Provide Feedback
      await this.saveResults(result);
      this.provideFeedback(result);

      return result;

    } catch (error) {
      console.error('❌ Complete cycle failed:', error);
      result.errors.push(`Cycle error: ${error}`);
      return result;
    }
  }

  private async buildExtension(): Promise<boolean> {
    try {
      const { stdout, stderr } = await execAsync('pnpm build', {
        cwd: path.resolve(__dirname, '..')
      });
      
      if (stderr && stderr.includes('error')) {
        console.log('❌ Build failed:', stderr);
        return false;
      }
      
      console.log('✅ Build successful');
      return true;
      
    } catch (error) {
      console.log('❌ Build error:', error);
      return false;
    }
  }

  private async clearExtensionErrors(): Promise<boolean> {
    try {
      const page = await this.manager.context!.newPage();
      
      // Navigate to extension errors page
      await page.goto(`brave://extensions/?errors=${this.knownExtensionId}`);
      await page.waitForTimeout(2000);
      
      // Try to clear errors by clicking clear button or similar
      const cleared = await page.evaluate(() => {
        // Look for clear/dismiss buttons
        const clearButtons = document.querySelectorAll(
          'button[class*="clear"], button[class*="dismiss"], .clear-errors, .dismiss-errors'
        );
        
        let cleared = false;
        clearButtons.forEach(button => {
          if (button instanceof HTMLElement) {
            button.click();
            cleared = true;
          }
        });
        
        return cleared;
      });
      
      await page.close();
      
      if (cleared) {
        console.log('✅ Extension errors cleared');
      } else {
        console.log('⚠️ No clear button found (errors may already be cleared)');
      }
      
      return true;
      
    } catch (error) {
      console.log('⚠️ Could not clear errors:', error);
      return false;
    }
  }

  private async reloadExtension(): Promise<boolean> {
    try {
      const page = await this.manager.context!.newPage();
      
      // Navigate to extensions page
      await page.goto('brave://extensions/');
      await page.waitForTimeout(3000);
      
      // Find and reload the extension
      const reloaded = await page.evaluate((extensionId) => {
        // Find the extension by ID or name
        const extensionItems = document.querySelectorAll('extensions-item');
        
        for (const item of extensionItems) {
          const nameEl = item.shadowRoot?.querySelector('#name');
          const idAttr = item.getAttribute('id');
          
          if (nameEl?.textContent?.includes('Ishka') || idAttr === extensionId) {
            // Try to find reload button
            const reloadBtn = item.shadowRoot?.querySelector(
              '#reloadButton, [id*="reload"], button[class*="reload"]'
            );
            
            if (reloadBtn instanceof HTMLElement) {
              reloadBtn.click();
              return true;
            }
            
            // Try developer mode reload
            const devReloadBtn = item.shadowRoot?.querySelector(
              '#dev-reload-button, .dev-reload'
            );
            
            if (devReloadBtn instanceof HTMLElement) {
              devReloadBtn.click();
              return true;
            }
          }
        }
        
        return false;
      }, this.knownExtensionId);
      
      await page.close();
      
      if (reloaded) {
        console.log('✅ Extension reloaded successfully');
        // Wait for reload to complete
        await new Promise(resolve => setTimeout(resolve, 3000));
        return true;
      } else {
        console.log('⚠️ Could not find reload button');
        return false;
      }
      
    } catch (error) {
      console.log('❌ Extension reload failed:', error);
      return false;
    }
  }

  private async enablePinToToolbar(): Promise<boolean> {
    try {
      const page = await this.manager.context!.newPage();
      
      // Navigate to specific extension page
      await page.goto(`brave://extensions/?id=${this.knownExtensionId}`);
      await page.waitForTimeout(2000);
      
      // Enable pin to toolbar
      const pinEnabled = await page.evaluate(() => {
        // Look for pin to toolbar toggle
        const pinToggles = document.querySelectorAll(
          'input[type="checkbox"][class*="pin"], cr-toggle[class*="pin"], .pin-to-toolbar'
        );
        
        for (const toggle of pinToggles) {
          if (toggle instanceof HTMLInputElement && !toggle.checked) {
            toggle.click();
            return true;
          } else if (toggle instanceof HTMLElement && !toggle.hasAttribute('checked')) {
            toggle.click();
            return true;
          }
        }
        
        return false;
      });
      
      await page.close();
      
      if (pinEnabled) {
        console.log('✅ Pin to toolbar enabled');
      } else {
        console.log('⚠️ Pin to toolbar already enabled or button not found');
      }
      
      return true;
      
    } catch (error) {
      console.log('⚠️ Could not enable pin to toolbar:', error);
      return false;
    }
  }

  private async testPopupFunctionality(): Promise<{ success: boolean; errors: string[] }> {
    try {
      const page = await this.manager.context!.newPage();
      const errors: string[] = [];
      
      // Capture console errors
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(`Console: ${msg.text()}`);
        }
      });
      
      page.on('pageerror', error => {
        errors.push(`Page Error: ${error.message}`);
      });
      
      // Try to open popup
      const popupUrl = `chrome-extension://${this.knownExtensionId}/popup/index.html`;
      await page.goto(popupUrl);
      
      // Wait for popup to load
      await page.waitForTimeout(5000);
      
      // Check if popup loaded successfully
      const popupLoaded = await page.evaluate(() => {
        return document.querySelector('.ishka-root') !== null;
      });
      
      await page.close();
      
      if (popupLoaded && errors.length === 0) {
        console.log('✅ Popup working correctly');
        return { success: true, errors: [] };
      } else {
        console.log('❌ Popup issues detected');
        return { success: false, errors };
      }
      
    } catch (error) {
      console.log('❌ Popup test failed:', error);
      return { success: false, errors: [`Test error: ${error}`] };
    }
  }

  private async captureCurrentErrors(): Promise<string[]> {
    try {
      const page = await this.manager.context!.newPage();
      const errors: string[] = [];
      
      // Navigate to extension errors page
      await page.goto(`brave://extensions/?errors=${this.knownExtensionId}`);
      await page.waitForTimeout(3000);
      
      // Extract all error information
      const extractedErrors = await page.evaluate(() => {
        const errorSelectors = [
          '.error-message',
          '.stack-trace',
          '.runtime-error',
          'pre',
          '[class*="error"]'
        ];
        
        const foundErrors: string[] = [];
        
        errorSelectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => {
            const text = el.textContent?.trim();
            if (text && text.length > 10) {
              foundErrors.push(text);
            }
          });
        });
        
        // Also capture page text for error patterns
        const pageText = document.body.innerText;
        const patterns = [
          /effect_orphan/gi,
          /Failed to load popup/gi,
          /Cannot read prop/gi,
          /Uncaught.*Error/gi,
          /TypeError/gi
        ];
        
        patterns.forEach(pattern => {
          const matches = pageText.match(pattern);
          if (matches) {
            matches.forEach(match => {
              const context = pageText.substr(pageText.indexOf(match), 200);
              foundErrors.push(`Pattern: ${context}`);
            });
          }
        });
        
        return foundErrors;
      });
      
      await page.close();
      errors.push(...extractedErrors);
      
      if (errors.length > 0) {
        console.log(`🚨 Found ${errors.length} current errors`);
      } else {
        console.log('✅ No current errors detected');
      }
      
      return errors;
      
    } catch (error) {
      console.log('⚠️ Error capture failed:', error);
      return [`Error capture failed: ${error}`];
    }
  }

  private generateRecommendations(result: TestCycleResult): string[] {
    const recommendations: string[] = [];
    
    if (!result.buildSuccess) {
      recommendations.push('🔧 Fix build configuration and TypeScript errors');
    }
    
    if (!result.extensionReloaded) {
      recommendations.push('🔄 Manually reload extension in browser');
    }
    
    if (!result.popupWorking) {
      recommendations.push('🧪 Fix popup component initialization');
    }
    
    if (result.errors.some(e => e.includes('effect_orphan'))) {
      recommendations.push('🔴 CRITICAL: Fix Svelte 5 lifecycle management');
      recommendations.push('- Move async operations out of onMount');
      recommendations.push('- Use reactive statements for interval setup');
      recommendations.push('- Ensure proper cleanup in onDestroy');
    }
    
    if (result.errors.some(e => e.includes('Cannot read prop'))) {
      recommendations.push('🟡 Add null checks and defensive programming');
    }
    
    if (result.errors.length === 0 && result.popupWorking) {
      recommendations.push('✅ All systems working - ready for feature development');
    }
    
    return recommendations;
  }

  private async saveResults(result: TestCycleResult): Promise<void> {
    try {
      // Save detailed JSON report
      await fs.writeFile(
        path.join(this.reportsDir, 'complete-automation-result.json'),
        JSON.stringify(result, null, 2)
      );
      
      // Save human-readable summary
      const summary = [
        `🔄 COMPLETE DEVELOPMENT CYCLE REPORT`,
        `Timestamp: ${result.timestamp}`,
        ``,
        `📊 RESULTS:`,
        `  Build Success: ${result.buildSuccess ? '✅' : '❌'}`,
        `  Extension Reloaded: ${result.extensionReloaded ? '✅' : '❌'}`,
        `  Errors Cleared: ${result.errorsCleared ? '✅' : '❌'}`,
        `  Pin Enabled: ${result.pinEnabled ? '✅' : '❌'}`,
        `  Popup Working: ${result.popupWorking ? '✅' : '❌'}`,
        ``,
        `🚨 ERRORS (${result.errors.length}):`,
        ...result.errors.map(error => `  - ${error}`),
        ``,
        `💡 RECOMMENDATIONS (${result.recommendations.length}):`,
        ...result.recommendations.map(rec => `  - ${rec}`),
        ``
      ].join('\n');
      
      await fs.writeFile(
        path.join(this.reportsDir, 'complete-automation-summary.txt'),
        summary
      );
      
      console.log('\n💾 Results saved to test-reports/');
      
    } catch (error) {
      console.error('Failed to save results:', error);
    }
  }

  private provideFeedback(result: TestCycleResult): void {
    console.log('\n📊 COMPLETE CYCLE FEEDBACK:');
    console.log('==========================');
    
    if (result.popupWorking && result.errors.length === 0) {
      console.log('🎉 SUCCESS: Extension is working correctly!');
      console.log('✅ Ready for feature development');
    } else {
      console.log('⚠️ ISSUES DETECTED:');
      
      if (!result.buildSuccess) {
        console.log('  🔧 Build failed - check TypeScript errors');
      }
      
      if (!result.popupWorking) {
        console.log('  🧪 Popup not working - check component errors');
      }
      
      if (result.errors.length > 0) {
        console.log(`  🚨 ${result.errors.length} errors found - see recommendations`);
      }
      
      console.log('\n💡 NEXT ACTIONS:');
      result.recommendations.slice(0, 3).forEach(rec => {
        console.log(`  ${rec}`);
      });
    }
    
    console.log('\n📄 Full report: test-reports/complete-automation-summary.txt');
  }

  async cleanup(): Promise<void> {
    if (this.manager.browser) {
      await this.manager.browser.close();
      this.manager.isConnected = false;
      console.log('🧹 Automation cleanup completed');
    }
  }
}

// CLI execution
async function runAutomation() {
  const automation = new CompleteDevelopmentAutomation();
  
  try {
    const initialized = await automation.initialize();
    if (!initialized) {
      process.exit(1);
    }
    
    const result = await automation.runCompleteCycle();
    
    // Exit with error code if there are issues
    const hasErrors = !result.popupWorking || result.errors.length > 0;
    process.exit(hasErrors ? 1 : 0);
    
  } catch (error) {
    console.error('❌ Automation failed:', error);
    process.exit(1);
  } finally {
    await automation.cleanup();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runAutomation();
}

export { CompleteDevelopmentAutomation };