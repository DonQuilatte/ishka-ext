#!/bin/bash

# Simple Claude UI Hooks Addition Script
# Adds Claude Code UI auto-launch to your existing Claude settings

set -e

CLAUDE_SETTINGS="$HOME/.claude/settings.local.json"
CLAUDE_UI_SCRIPT="$HOME/.claude/launch-claude-ui.sh"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

print_step() {
    echo -e "${BLUE}[Setup]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[Success]${NC} $1"
}

print_error() {
    echo -e "${RED}[Error]${NC} $1"
}

# Check if settings file exists
if [ ! -f "$CLAUDE_SETTINGS" ]; then
    print_error "Claude settings file not found at $CLAUDE_SETTINGS"
    exit 1
fi

# Create backup
print_step "Creating backup of current settings..."
cp "$CLAUDE_SETTINGS" "$CLAUDE_SETTINGS.backup.$(date +%Y%m%d_%H%M%S)"

# Create the launch script location marker
mkdir -p "$HOME/.claude"

print_step "Adding Claude Code UI hooks to your existing Claude settings..."

# Use Python to safely modify JSON
python3 << EOF
import json
import os

settings_file = "$CLAUDE_SETTINGS"

with open(settings_file, 'r') as f:
    settings = json.load(f)

# Add Claude UI hooks to existing hooks
new_hooks = [
    {
        "events": ["SessionStart"],
        "command": "~/.claude/launch-claude-ui.sh start >/dev/null 2>&1 &",
        "description": "Auto-launch Claude Code UI"
    }
]

# Add to existing hooks
for hook in new_hooks:
    # Check if similar hook already exists
    exists = any(h.get('description') == hook['description'] for h in settings.get('hooks', []))
    if not exists:
        settings['hooks'].append(hook)

with open(settings_file, 'w') as f:
    json.dump(settings, f, indent=2)

print("Claude UI hooks added successfully")
EOF

print_success "Hooks added to your Claude settings!"

# Show what was added
print_step "Added hooks:"
echo "  - SessionStart: Auto-launch Claude Code UI"
echo
print_success "Setup complete! Restart Claude Code to activate."
echo "📍 The UI will auto-launch at http://localhost:3001 when you start Claude in any project"