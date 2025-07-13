#!/usr/bin/env node
/**
 * Continuous Development System
 * 
 * Watches for file changes and automatically:
 * 1. Builds the extension
 * 2. Clears previous errors
 * 3. Reloads extension
 * 4. Runs complete test cycle
 * 5. Provides immediate feedback
 * 6. Reports results automatically
 */

import chokidar from 'chokidar';
import { CompleteDevelopmentAutomation } from './complete-automation';
import { WebSocketServer } from 'ws';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface ContinuousState {
  isRunning: boolean;
  lastCycleTime: number;
  successfulCycles: number;
  failedCycles: number;
  currentStatus: 'idle' | 'running' | 'success' | 'error';
  lastResult?: any;
}

class ContinuousDevelopmentSystem {
  private state: ContinuousState = {
    isRunning: false,
    lastCycleTime: 0,
    successfulCycles: 0,
    failedCycles: 0,
    currentStatus: 'idle'
  };
  
  private automation?: CompleteDevelopmentAutomation;
  private wsServer?: WebSocketServer;
  private debounceTimeout?: NodeJS.Timeout;
  private reportsDir: string;

  constructor() {
    this.reportsDir = path.resolve(__dirname, '../test-reports');
  }

  async start(): Promise<void> {
    console.log('🚀 Starting Continuous Development System...');
    
    // Ensure reports directory exists
    await fs.mkdir(this.reportsDir, { recursive: true });
    
    // Start WebSocket server for real-time feedback
    this.startWebSocketServer();
    
    // Set up file watcher
    this.setupFileWatcher();
    
    // Initialize automation system
    this.automation = new CompleteDevelopmentAutomation();
    
    console.log('👀 Watching for file changes...');
    console.log('📊 Real-time dashboard available at: http://localhost:3001');
    console.log('🔄 Make changes to trigger automatic testing...');
  }

  private setupFileWatcher(): void {
    // Watch source files
    const watcher = chokidar.watch([
      'src/**/*.{ts,svelte,css,html}',
      'public/**/*',
      'manifest.json'
    ], {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true
    });

    watcher.on('change', (path) => {
      console.log(`\n📝 File changed: ${path}`);
      this.triggerDevelopmentCycle(`File change: ${path}`);
    });

    watcher.on('add', (path) => {
      console.log(`\n📄 File added: ${path}`);
      this.triggerDevelopmentCycle(`File added: ${path}`);
    });

    console.log('👀 File watcher started');
  }

  private triggerDevelopmentCycle(reason: string): void {
    // Debounce rapid changes
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }

    this.debounceTimeout = setTimeout(async () => {
      await this.runDevelopmentCycle(reason);
    }, 1000); // Wait 1 second after last change
  }

  private async runDevelopmentCycle(reason: string): Promise<void> {
    if (this.state.isRunning) {
      console.log('⏳ Development cycle already running, skipping...');
      return;
    }

    this.state.isRunning = true;
    this.state.currentStatus = 'running';
    this.broadcastUpdate({
      type: 'cycle_started',
      reason,
      state: this.state
    });

    try {
      console.log(`\n🔄 STARTING DEVELOPMENT CYCLE: ${reason}`);
      console.log('=' .repeat(50));

      // Initialize automation if needed
      if (!this.automation) {
        this.automation = new CompleteDevelopmentAutomation();
      }

      // Initialize browser connection
      const initialized = await this.automation.initialize();
      if (!initialized) {
        throw new Error('Failed to initialize automation');
      }

      // Run complete cycle
      const result = await this.automation.runCompleteCycle();
      
      // Update state
      this.state.lastCycleTime = Date.now();
      this.state.lastResult = result;
      
      if (result.popupWorking && result.errors.length === 0) {
        this.state.successfulCycles++;
        this.state.currentStatus = 'success';
        
        console.log('\n🎉 DEVELOPMENT CYCLE SUCCESSFUL!');
        console.log('✅ Extension is working correctly');
        
        this.broadcastUpdate({
          type: 'cycle_success',
          result,
          state: this.state
        });
        
      } else {
        this.state.failedCycles++;
        this.state.currentStatus = 'error';
        
        console.log('\n⚠️ DEVELOPMENT CYCLE COMPLETED WITH ISSUES');
        console.log(`❌ Found ${result.errors.length} errors`);
        
        this.broadcastUpdate({
          type: 'cycle_error',
          result,
          state: this.state
        });
      }

      // Save continuous tracking data
      await this.saveContinuousData(result);

    } catch (error) {
      this.state.failedCycles++;
      this.state.currentStatus = 'error';
      
      console.error('\n❌ DEVELOPMENT CYCLE FAILED:', error);
      
      this.broadcastUpdate({
        type: 'cycle_failed',
        error: error instanceof Error ? error.message : String(error),
        state: this.state
      });
      
    } finally {
      this.state.isRunning = false;
      
      // Cleanup automation
      if (this.automation) {
        await this.automation.cleanup();
        this.automation = undefined;
      }
    }
  }

  private startWebSocketServer(): void {
    this.wsServer = new WebSocketServer({ port: 3001 });
    
    this.wsServer.on('connection', (ws) => {
      console.log('📡 Dashboard connected');
      
      // Send current state
      ws.send(JSON.stringify({
        type: 'state_update',
        state: this.state
      }));
      
      // Handle manual trigger requests
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          if (message.type === 'trigger_manual_cycle') {
            console.log('🚀 Manual cycle triggered from dashboard');
            this.triggerDevelopmentCycle('Manual trigger from dashboard');
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      });
    });

    console.log('📡 WebSocket server started on port 3001');
  }

  private broadcastUpdate(data: any): void {
    if (this.wsServer) {
      const message = JSON.stringify(data);
      this.wsServer.clients.forEach(client => {
        if (client.readyState === 1) { // WebSocket.OPEN
          client.send(message);
        }
      });
    }
  }

  private async saveContinuousData(result: any): Promise<void> {
    try {
      // Save continuous tracking
      const continuousData = {
        timestamp: new Date().toISOString(),
        state: this.state,
        lastResult: result,
        summary: {
          totalCycles: this.state.successfulCycles + this.state.failedCycles,
          successRate: this.state.successfulCycles + this.state.failedCycles > 0 
            ? ((this.state.successfulCycles / (this.state.successfulCycles + this.state.failedCycles)) * 100).toFixed(1)
            : '0',
          status: this.state.currentStatus
        }
      };

      await fs.writeFile(
        path.join(this.reportsDir, 'continuous-development.json'),
        JSON.stringify(continuousData, null, 2)
      );

      // Create dashboard summary
      const dashboardSummary = {
        timestamp: new Date().toISOString(),
        status: this.state.currentStatus,
        successfulCycles: this.state.successfulCycles,
        failedCycles: this.state.failedCycles,
        successRate: continuousData.summary.successRate,
        lastErrors: result.errors || [],
        lastRecommendations: result.recommendations || [],
        popupWorking: result.popupWorking || false,
        buildSuccess: result.buildSuccess || false
      };

      await fs.writeFile(
        path.join(this.reportsDir, 'dashboard-data.json'),
        JSON.stringify(dashboardSummary, null, 2)
      );

    } catch (error) {
      console.error('Failed to save continuous data:', error);
    }
  }

  async stop(): Promise<void> {
    console.log('🛑 Stopping Continuous Development System...');
    
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }
    
    if (this.automation) {
      await this.automation.cleanup();
    }
    
    if (this.wsServer) {
      this.wsServer.close();
    }
    
    console.log('✅ Continuous development system stopped');
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const system = new ContinuousDevelopmentSystem();
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Received SIGINT, stopping...');
    await system.stop();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    console.log('\n🛑 Received SIGTERM, stopping...');
    await system.stop();
    process.exit(0);
  });
  
  system.start().catch(error => {
    console.error('❌ Failed to start continuous development system:', error);
    process.exit(1);
  });
}

export { ContinuousDevelopmentSystem };