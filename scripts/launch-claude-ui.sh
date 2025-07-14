#!/bin/bash

# Claude Code UI Auto-Launch Script
# This script automatically launches Claude Code UI when starting Claude Code CLI

set -e

# Configuration
CLAUDE_UI_DIR="$(dirname "$0")/../claudecodeui"
CLAUDE_UI_PORT=3001
CLAUDE_UI_PID_FILE="/tmp/claude-ui.pid"
LOG_FILE="/tmp/claude-ui.log"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[Claude UI]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[Claude UI]${NC} $1"
}

print_error() {
    echo -e "${RED}[Claude UI]${NC} $1"
}

# Check if Claude Code UI is already running
check_running() {
    if [ -f "$CLAUDE_UI_PID_FILE" ]; then
        local pid=$(cat "$CLAUDE_UI_PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            return 0 # Running
        else
            rm -f "$CLAUDE_UI_PID_FILE"
            return 1 # Not running
        fi
    fi
    return 1 # Not running
}

# Start Claude Code UI
start_ui() {
    print_status "Starting Claude Code UI..."
    
    # Navigate to Claude UI directory
    cd "$CLAUDE_UI_DIR"
    
    # Start the development server in background
    npm run dev > "$LOG_FILE" 2>&1 &
    local pid=$!
    
    # Save PID for later management
    echo "$pid" > "$CLAUDE_UI_PID_FILE"
    
    # Wait a moment for startup
    sleep 3
    
    # Check if process is still running
    if ps -p "$pid" > /dev/null 2>&1; then
        print_success "Claude Code UI started successfully (PID: $pid)"
        print_success "Access at: http://localhost:$CLAUDE_UI_PORT"
        
        # Try to open in browser (macOS)
        if command -v open > /dev/null 2>&1; then
            print_status "Opening browser..."
            open "http://localhost:$CLAUDE_UI_PORT" > /dev/null 2>&1 &
        fi
        
        return 0
    else
        print_error "Failed to start Claude Code UI"
        print_error "Check log file: $LOG_FILE"
        rm -f "$CLAUDE_UI_PID_FILE"
        return 1
    fi
}

# Stop Claude Code UI
stop_ui() {
    if [ -f "$CLAUDE_UI_PID_FILE" ]; then
        local pid=$(cat "$CLAUDE_UI_PID_FILE")
        print_status "Stopping Claude Code UI (PID: $pid)..."
        
        kill "$pid" > /dev/null 2>&1 || true
        rm -f "$CLAUDE_UI_PID_FILE"
        
        print_success "Claude Code UI stopped"
    else
        print_status "Claude Code UI is not running"
    fi
}

# Main execution
case "${1:-start}" in
    "start")
        if check_running; then
            print_status "Claude Code UI is already running"
            print_success "Access at: http://localhost:$CLAUDE_UI_PORT"
        else
            start_ui
        fi
        ;;
    "stop")
        stop_ui
        ;;
    "restart")
        stop_ui
        sleep 2
        start_ui
        ;;
    "status")
        if check_running; then
            pid=$(cat "$CLAUDE_UI_PID_FILE")
            print_success "Claude Code UI is running (PID: $pid)"
            print_success "Access at: http://localhost:$CLAUDE_UI_PORT"
        else
            print_status "Claude Code UI is not running"
        fi
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status}"
        echo "  start   - Start Claude Code UI (default)"
        echo "  stop    - Stop Claude Code UI"
        echo "  restart - Restart Claude Code UI"
        echo "  status  - Check Claude Code UI status"
        exit 1
        ;;
esac