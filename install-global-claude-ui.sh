#!/bin/bash

# Global Claude Code UI Installation Script
# This script installs Claude Code UI globally for all Claude Code projects

set -e

# Configuration
CLAUDE_DIR="$HOME/.claude"
CLAUDE_UI_DIR="$CLAUDE_DIR/claudecodeui"
CLAUDE_SETTINGS="$CLAUDE_DIR/settings.local.json"
GLOBAL_CLAUDE_MD="$HOME/.claude/CLAUDE.md"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_step() {
    echo -e "${BLUE}[Setup]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[Success]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[Warning]${NC} $1"
}

print_error() {
    echo -e "${RED}[Error]${NC} $1"
}

print_step "Starting global Claude Code UI installation..."

# Step 1: Clone Claude Code UI to global directory
if [ ! -d "$CLAUDE_UI_DIR" ]; then
    print_step "Cloning Claude Code UI to global directory..."
    git clone https://github.com/siteboon/claudecodeui.git "$CLAUDE_UI_DIR"
    print_success "Claude Code UI cloned to $CLAUDE_UI_DIR"
else
    print_warning "Claude Code UI already exists at $CLAUDE_UI_DIR"
    read -p "Do you want to update it? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cd "$CLAUDE_UI_DIR"
        git pull origin main
        print_success "Claude Code UI updated"
    fi
fi

# Step 2: Install dependencies
print_step "Installing Claude Code UI dependencies..."
cd "$CLAUDE_UI_DIR"
npm install
print_success "Dependencies installed"

# Step 3: Configure environment
print_step "Configuring global environment..."
cat > "$CLAUDE_UI_DIR/.env" << 'EOF'
# Claude Code UI Global Environment Configuration

# =============================================================================
# SERVER CONFIGURATION
# =============================================================================

# Backend server port (Express API + WebSocket server)
PORT=3008
# Frontend port
VITE_PORT=3001

# =============================================================================
# CLAUDE CODE INTEGRATION
# =============================================================================

# Claude Code CLI path (auto-detected)
CLAUDE_CLI_PATH=/Users/jederlichman/.npm-global/bin/claude

# Auto-launch configuration
CLAUDE_UI_AUTO_LAUNCH=true
CLAUDE_UI_BROWSER_OPEN=true

# Development settings
NODE_ENV=development

# Global installation marker
CLAUDE_UI_GLOBAL=true
EOF

print_success "Environment configured"

# Step 4: Create global launch script
print_step "Creating global launch script..."
cat > "$CLAUDE_DIR/launch-claude-ui.sh" << 'EOF'
#!/bin/bash

# Global Claude Code UI Launch Script
set -e

CLAUDE_UI_DIR="$HOME/.claude/claudecodeui"
CLAUDE_UI_PORT=3001
CLAUDE_UI_PID_FILE="/tmp/claude-ui-global.pid"
LOG_FILE="/tmp/claude-ui-global.log"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[Claude UI Global]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[Claude UI Global]${NC} $1"
}

print_error() {
    echo -e "${RED}[Claude UI Global]${NC} $1"
}

check_running() {
    if [ -f "$CLAUDE_UI_PID_FILE" ]; then
        local pid=$(cat "$CLAUDE_UI_PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            return 0
        else
            rm -f "$CLAUDE_UI_PID_FILE"
            return 1
        fi
    fi
    return 1
}

start_ui() {
    print_status "Starting global Claude Code UI..."
    
    cd "$CLAUDE_UI_DIR"
    npm run dev > "$LOG_FILE" 2>&1 &
    local pid=$!
    
    echo "$pid" > "$CLAUDE_UI_PID_FILE"
    sleep 3
    
    if ps -p "$pid" > /dev/null 2>&1; then
        print_success "Claude Code UI started globally (PID: $pid)"
        print_success "Access at: http://localhost:$CLAUDE_UI_PORT"
        
        if command -v open > /dev/null 2>&1; then
            print_status "Opening browser..."
            open "http://localhost:$CLAUDE_UI_PORT" > /dev/null 2>&1 &
        fi
        return 0
    else
        print_error "Failed to start Claude Code UI"
        rm -f "$CLAUDE_UI_PID_FILE"
        return 1
    fi
}

stop_ui() {
    if [ -f "$CLAUDE_UI_PID_FILE" ]; then
        local pid=$(cat "$CLAUDE_UI_PID_FILE")
        print_status "Stopping global Claude Code UI (PID: $pid)..."
        kill "$pid" > /dev/null 2>&1 || true
        rm -f "$CLAUDE_UI_PID_FILE"
        print_success "Claude Code UI stopped"
    fi
}

case "${1:-start}" in
    "start")
        if check_running; then
            print_status "Claude Code UI is already running globally"
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
            print_success "Claude Code UI is running globally (PID: $pid)"
            print_success "Access at: http://localhost:$CLAUDE_UI_PORT"
        else
            print_status "Claude Code UI is not running"
        fi
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status}"
        exit 1
        ;;
esac
EOF

chmod +x "$CLAUDE_DIR/launch-claude-ui.sh"
print_success "Global launch script created"

# Step 5: Update Claude settings with hooks
print_step "Adding Claude Code UI hooks to global settings..."

# Create backup of current settings
cp "$CLAUDE_SETTINGS" "$CLAUDE_SETTINGS.backup.$(date +%Y%m%d_%H%M%S)"

# Read current settings and add new hooks
python3 << 'EOF'
import json
import os

settings_file = os.path.expanduser("~/.claude/settings.local.json")

with open(settings_file, 'r') as f:
    settings = json.load(f)

# Ensure hooks array exists
if 'hooks' not in settings:
    settings['hooks'] = []

# Add Claude UI hooks if they don't exist
claude_ui_hooks = [
    {
        "events": ["SessionStart"],
        "command": "~/.claude/launch-claude-ui.sh start",
        "description": "Auto-launch Claude Code UI on session start",
        "background": True
    },
    {
        "events": ["SessionEnd"],
        "command": "~/.claude/launch-claude-ui.sh stop",
        "description": "Stop Claude Code UI on session end",
        "background": True
    }
]

# Check if hooks already exist
existing_commands = [hook.get('command', '') for hook in settings['hooks']]
for new_hook in claude_ui_hooks:
    if new_hook['command'] not in existing_commands:
        settings['hooks'].append(new_hook)

with open(settings_file, 'w') as f:
    json.dump(settings, f, indent=2)

print("Hooks added successfully")
EOF

print_success "Hooks added to global Claude settings"

# Step 6: Update global CLAUDE.md
print_step "Updating global CLAUDE.md with Claude UI instructions..."

# Create or update global CLAUDE.md
cat >> "$GLOBAL_CLAUDE_MD" << 'EOF'

## Claude Code UI Integration

### Global Claude Code UI Setup
Claude Code UI is automatically available in all projects:

- **Auto-launch**: Starts automatically when Claude Code sessions begin
- **Access**: http://localhost:3001
- **Management**: `~/.claude/launch-claude-ui.sh {start|stop|restart|status}`

### Manual Control
```bash
# Launch UI manually
~/.claude/launch-claude-ui.sh start

# Check status
~/.claude/launch-claude-ui.sh status

# Stop UI
~/.claude/launch-claude-ui.sh stop
```

### Features Available
- Responsive project dashboard
- Integrated Claude Code chat interface
- Built-in terminal and file explorer
- Real-time syntax highlighting
- Cross-project session management

### Configuration
- **Installation**: `~/.claude/claudecodeui/`
- **Port**: 3001 (frontend), 3008 (backend)
- **Logs**: `/tmp/claude-ui-global.log`
- **PID**: `/tmp/claude-ui-global.pid`

---
EOF

print_success "Global CLAUDE.md updated"

# Step 7: Create global aliases
print_step "Creating convenient global aliases..."

# Create a source-able aliases file
cat > "$CLAUDE_DIR/claude-ui-aliases.sh" << 'EOF'
# Claude Code UI Global Aliases
# Source this file in your shell profile (.bashrc, .zshrc, etc.)

alias claude-ui="~/.claude/launch-claude-ui.sh start"
alias claude-ui-stop="~/.claude/launch-claude-ui.sh stop"
alias claude-ui-status="~/.claude/launch-claude-ui.sh status"
alias claude-ui-restart="~/.claude/launch-claude-ui.sh restart"
EOF

print_success "Global aliases created"

# Final summary
echo
echo "=================================================================="
print_success "Global Claude Code UI installation complete!"
echo "=================================================================="
echo
echo "✅ Installation location: $CLAUDE_UI_DIR"
echo "✅ Global launch script: $CLAUDE_DIR/launch-claude-ui.sh"
echo "✅ Auto-launch hooks: Added to Claude settings"
echo "✅ Access URL: http://localhost:3001"
echo
echo "🚀 Next steps:"
echo "   1. Restart Claude Code to activate hooks"
echo "   2. UI will auto-launch when you start Claude in any project"
echo "   3. Manual control: ~/.claude/launch-claude-ui.sh {start|stop|status}"
echo
echo "🔧 Optional: Add aliases to your shell profile:"
echo "   echo 'source ~/.claude/claude-ui-aliases.sh' >> ~/.zshrc"
echo "   source ~/.zshrc"
echo
print_success "Installation successful! 🎉"
EOF

chmod +x install-global-claude-ui.sh
print_success "Global installation script created"