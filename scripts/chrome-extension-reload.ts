#!/usr/bin/env node
/**
 * Chrome Extension Auto-Reload Script
 * 
 * Uses Chrome DevTools Protocol to automatically reload the extension
 * when files change, eliminating manual reload steps.
 */

import { chromium } from '@playwright/test';
import WebSocket from 'ws';

interface ExtensionReloader {
  chromePort?: number;
  extensionId?: string;
  wsConnection?: WebSocket;
}

class ChromeExtensionReloader {
  private config: ExtensionReloader = {};

  async connect(): Promise<boolean> {
    try {
      // Try to connect to Chrome DevTools on default port
      this.config.chromePort = 9222;
      
      const response = await fetch(`http://localhost:${this.config.chromePort}/json`);
      const tabs = await response.json();
      
      // Find extensions page or create one
      let extensionsTab = tabs.find((tab: any) => 
        tab.url.includes('chrome://extensions/')
      );
      
      if (!extensionsTab) {
        // Open extensions page
        const newTabResponse = await fetch(
          `http://localhost:${this.config.chromePort}/json/new?chrome://extensions/`
        );
        extensionsTab = await newTabResponse.json();
      }
      
      // Connect to the tab via WebSocket
      this.config.wsConnection = new WebSocket(extensionsTab.webSocketDebuggerUrl);
      
      return new Promise((resolve) => {
        this.config.wsConnection!.on('open', () => {
          console.log('✅ Connected to Chrome DevTools');
          resolve(true);
        });
        
        this.config.wsConnection!.on('error', (error) => {
          console.error('❌ Failed to connect to Chrome DevTools:', error);
          resolve(false);
        });
      });
      
    } catch (error) {
      console.error('❌ Chrome DevTools connection failed:', error);
      return false;
    }
  }

  async findExtensionId(extensionName: string = 'Ishka'): Promise<string | null> {
    if (!this.config.wsConnection) {
      console.error('Not connected to Chrome DevTools');
      return null;
    }

    try {
      // Enable Runtime domain
      await this.sendCommand('Runtime.enable');
      
      // Execute script to find extension
      const result = await this.sendCommand('Runtime.evaluate', {
        expression: `
          (function() {
            const extensions = chrome.management ? 
              chrome.management.getAll() : 
              Array.from(document.querySelectorAll('extensions-item')).map(item => ({
                id: item.getAttribute('id'),
                name: item.shadowRoot?.querySelector('#name')?.textContent
              }));
            
            return extensions.find(ext => ext.name?.includes('${extensionName}'))?.id || null;
          })()
        `,
        awaitPromise: true
      });
      
      const extensionId = result.result?.value;
      if (extensionId) {
        this.config.extensionId = extensionId;
        console.log(`🎯 Found extension ID: ${extensionId}`);
      }
      
      return extensionId;
      
    } catch (error) {
      console.error('❌ Failed to find extension ID:', error);
      return null;
    }
  }

  async reloadExtension(): Promise<boolean> {
    if (!this.config.extensionId || !this.config.wsConnection) {
      console.error('Extension ID or WebSocket connection not available');
      return false;
    }

    try {
      console.log('🔄 Reloading extension...');
      
      // Method 1: Try chrome.management.setEnabled
      await this.sendCommand('Runtime.evaluate', {
        expression: `
          (async function() {
            try {
              if (chrome.management) {
                await chrome.management.setEnabled('${this.config.extensionId}', false);
                await new Promise(resolve => setTimeout(resolve, 500));
                await chrome.management.setEnabled('${this.config.extensionId}', true);
                return 'management_api_success';
              }
              return 'management_api_unavailable';
            } catch (e) {
              return 'management_api_error: ' + e.message;
            }
          })()
        `,
        awaitPromise: true
      });
      
      // Method 2: Try clicking reload button
      await this.sendCommand('Runtime.evaluate', {
        expression: `
          (function() {
            const extensionItem = document.querySelector('extensions-item[id="${this.config.extensionId}"]');
            if (extensionItem) {
              const reloadButton = extensionItem.shadowRoot?.querySelector('#dev-reload-button, [id*="reload"]');
              if (reloadButton) {
                reloadButton.click();
                return 'click_reload_success';
              }
            }
            return 'click_reload_failed';
          })()
        `
      });
      
      console.log('✅ Extension reload triggered');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to reload extension:', error);
      return false;
    }
  }

  private async sendCommand(method: string, params?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.config.wsConnection) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      const id = Date.now();
      const command = { id, method, params };
      
      const timeout = setTimeout(() => {
        reject(new Error('Command timeout'));
      }, 10000);
      
      const messageHandler = (data: any) => {
        const response = JSON.parse(data.toString());
        if (response.id === id) {
          clearTimeout(timeout);
          this.config.wsConnection!.off('message', messageHandler);
          
          if (response.error) {
            reject(new Error(response.error.message));
          } else {
            resolve(response);
          }
        }
      };
      
      this.config.wsConnection.on('message', messageHandler);
      this.config.wsConnection.send(JSON.stringify(command));
    });
  }

  async disconnect(): Promise<void> {
    if (this.config.wsConnection) {
      this.config.wsConnection.close();
      console.log('🔌 Disconnected from Chrome DevTools');
    }
  }
}

// Standalone usage
export async function reloadIshkaExtension(): Promise<boolean> {
  const reloader = new ChromeExtensionReloader();
  
  try {
    const connected = await reloader.connect();
    if (!connected) {
      console.log('💡 To enable auto-reload, start Chrome with: --remote-debugging-port=9222');
      return false;
    }
    
    const extensionId = await reloader.findExtensionId('Ishka');
    if (!extensionId) {
      console.log('❌ Ishka extension not found. Make sure it\'s loaded in Chrome.');
      return false;
    }
    
    const reloaded = await reloader.reloadExtension();
    await reloader.disconnect();
    
    return reloaded;
    
  } catch (error) {
    console.error('❌ Auto-reload failed:', error);
    await reloader.disconnect();
    return false;
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  reloadIshkaExtension()
    .then(success => {
      if (success) {
        console.log('✅ Extension reloaded successfully');
        process.exit(0);
      } else {
        console.log('❌ Extension reload failed');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Script error:', error);
      process.exit(1);
    });
}