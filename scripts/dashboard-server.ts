#!/usr/bin/env node
/**
 * Standalone Dashboard Server
 * 
 * Runs a persistent WebSocket server for the enhanced dashboard
 * to provide real-time monitoring and feedback
 */

import { WebSocketServer } from 'ws';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface DashboardData {
  timestamp: string;
  extensionStatus: 'healthy' | 'degraded' | 'critical';
  buildSuccess: boolean;
  activeErrors: number;
  lastTestResults: any[];
  recommendations: string[];
  fixVerifications: any[];
}

class DashboardServer {
  private wsServer: WebSocketServer;
  private data: DashboardData;
  private reportsDir: string;

  constructor() {
    this.reportsDir = path.resolve(__dirname, '../test-reports');
    this.data = {
      timestamp: new Date().toISOString(),
      extensionStatus: 'critical',
      buildSuccess: false,
      activeErrors: 0,
      lastTestResults: [],
      recommendations: [],
      fixVerifications: []
    };
  }

  async start(): Promise<void> {
    console.log('🚀 Starting Enhanced Dashboard Server...');

    // Start WebSocket server
    this.wsServer = new WebSocketServer({ port: 3002 });
    
    this.wsServer.on('connection', (ws) => {
      console.log('📡 Dashboard client connected');
      
      // Send current data immediately
      ws.send(JSON.stringify({
        type: 'dashboard_data',
        data: this.data
      }));
      
      // Handle client messages
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
          this.handleClientMessage(data);
        } catch (error) {
          console.error('Failed to parse client message:', error);
        }
      });
      
      ws.on('close', () => {
        console.log('📡 Dashboard client disconnected');
      });
    });

    console.log('📡 Enhanced Dashboard Server running on port 3002');
    console.log('🌐 Open http://localhost:3002 or the dashboard HTML file');

    // Load initial data
    await this.loadLatestData();
    
    // Start periodic data refresh
    this.startPeriodicRefresh();
  }

  private async loadLatestData(): Promise<void> {
    try {
      // Load verification results
      const verificationPath = path.join(this.reportsDir, 'extension-fix-verification.json');
      try {
        const verificationData = await fs.readFile(verificationPath, 'utf-8');
        const verification = JSON.parse(verificationData);
        
        this.data.buildSuccess = verification.buildValid && verification.manifestValid && verification.popupPathsValid;
        this.data.activeErrors = verification.issues.length;
        this.data.recommendations = verification.recommendations;
        this.data.extensionStatus = verification.issues.length === 0 ? 'healthy' : 'critical';
        
        console.log('✅ Loaded verification data');
      } catch (error) {
        console.log('⚠️ No verification data found');
      }

      // Load enhanced automation results
      const enhancedPath = path.join(this.reportsDir, 'enhanced-automation-result.json');
      try {
        const enhancedData = await fs.readFile(enhancedPath, 'utf-8');
        const enhanced = JSON.parse(enhancedData);
        
        this.data.lastTestResults = enhanced.testResults || [];
        this.data.fixVerifications = enhanced.fixVerification || [];
        
        console.log('✅ Loaded enhanced automation data');
      } catch (error) {
        console.log('⚠️ No enhanced automation data found');
      }

      this.data.timestamp = new Date().toISOString();
      this.broadcastUpdate();
      
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }

  private handleClientMessage(data: any): void {
    switch (data.type) {
      case 'trigger_verification':
        console.log('🔍 Client requested verification');
        this.runVerification();
        break;
        
      case 'trigger_enhanced_test':
        console.log('🚀 Client requested enhanced test');
        this.runEnhancedTest();
        break;
        
      case 'refresh_data':
        console.log('🔄 Client requested data refresh');
        this.loadLatestData();
        break;
    }
  }

  private async runVerification(): Promise<void> {
    try {
      const { spawn } = await import('child_process');
      const verification = spawn('npx', ['tsx', 'scripts/verify-extension-fix.ts'], {
        cwd: path.resolve(__dirname, '..')
      });

      verification.on('close', async (code) => {
        console.log(`Verification completed with code ${code}`);
        await this.loadLatestData();
        
        this.broadcastUpdate({
          type: 'verification_complete',
          success: code === 0
        });
      });
      
    } catch (error) {
      console.error('Failed to run verification:', error);
    }
  }

  private async runEnhancedTest(): Promise<void> {
    try {
      const { spawn } = await import('child_process');
      const test = spawn('npx', ['tsx', 'scripts/enhanced-automation.ts'], {
        cwd: path.resolve(__dirname, '..')
      });

      test.on('close', async (code) => {
        console.log(`Enhanced test completed with code ${code}`);
        await this.loadLatestData();
        
        this.broadcastUpdate({
          type: 'enhanced_test_complete',
          success: code === 0
        });
      });
      
    } catch (error) {
      console.error('Failed to run enhanced test:', error);
    }
  }

  private broadcastUpdate(additionalData?: any): void {
    const message = JSON.stringify({
      type: 'dashboard_update',
      data: this.data,
      ...additionalData
    });

    this.wsServer.clients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(message);
      }
    });
  }

  private startPeriodicRefresh(): void {
    // Refresh data every 30 seconds
    setInterval(async () => {
      await this.loadLatestData();
    }, 30000);
    
    console.log('⏱️ Periodic data refresh started (30s interval)');
  }

  stop(): void {
    if (this.wsServer) {
      this.wsServer.close();
      console.log('🛑 Dashboard server stopped');
    }
  }
}

// CLI execution
async function runServer() {
  const server = new DashboardServer();
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\\n🛑 Received SIGINT, stopping server...');
    server.stop();
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log('\\n🛑 Received SIGTERM, stopping server...');
    server.stop();
    process.exit(0);
  });
  
  try {
    await server.start();
  } catch (error) {
    console.error('❌ Failed to start dashboard server:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runServer();
}

export { DashboardServer };