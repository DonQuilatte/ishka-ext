# Claude Code UI Integration

This document describes the automatic Claude Code UI integration setup for the Ishka project.

## 🎯 Overview

Claude Code UI provides a browser-based interface for Claude Code CLI with integrated terminal, file explorer, and chat interface. This setup includes automatic launch automation.

## 🚀 Installation & Setup

### Prerequisites
- ✅ Node.js v24+ (current: v24.1.0)
- ✅ Claude Code CLI installed
- ✅ pnpm package manager

### Current Setup
The Claude Code UI has been cloned and configured in the `claudecodeui/` directory with:

- **Repository**: https://github.com/siteboon/claudecodeui.git
- **Local Port**: http://localhost:3001
- **Backend Port**: 3008
- **Auto-launch**: Enabled

## 🛠️ Usage Commands

### Quick Launch
```bash
# Start Claude Code UI (most common)
pnpm claude:ui

# Alternative commands
pnpm ui:start
pnpm ui:stop
pnpm ui:restart
pnpm ui:status
```

### Manual Control
```bash
# Direct script usage
./scripts/launch-claude-ui.sh start
./scripts/launch-claude-ui.sh stop
./scripts/launch-claude-ui.sh restart
./scripts/launch-claude-ui.sh status
```

## ⚙️ Configuration

### Environment Variables
Located in `claudecodeui/.env`:

```bash
# Server Configuration
PORT=3008                # Backend API server
VITE_PORT=3001          # Frontend development server

# Claude Code Integration
CLAUDE_CLI_PATH=/Users/jederlichman/.npm-global/bin/claude
CLAUDE_UI_AUTO_LAUNCH=true
CLAUDE_UI_BROWSER_OPEN=true
NODE_ENV=development
```

### Integration Config
Located in `claude-ui-config.json`:

```json
{
  "ui": {
    "enabled": true,
    "autoLaunch": true,
    "port": 3001,
    "browser": true
  },
  "hooks": {
    "postStart": ["./scripts/launch-claude-ui.sh start"],
    "preStop": ["./scripts/launch-claude-ui.sh stop"]
  }
}
```

## 🔧 Features

### Automatic Browser Opening
- ✅ Automatically opens http://localhost:3001 when started
- ✅ macOS `open` command integration
- ✅ Cross-platform compatibility

### Process Management
- ✅ PID tracking in `/tmp/claude-ui.pid`
- ✅ Background process management
- ✅ Automatic cleanup on stop
- ✅ Status checking and monitoring

### Integration with Existing Tools
- ✅ Extends current `scripts/` automation
- ✅ Compatible with existing development workflow
- ✅ Works alongside dashboard, reload, and continuous development scripts

## 📊 Status Monitoring

### Check Running Status
```bash
pnpm ui:status
# Output: Claude Code UI is running (PID: 64461)
#         Access at: http://localhost:3001
```

### Log Files
- **PID File**: `/tmp/claude-ui.pid`
- **Log File**: `/tmp/claude-ui.log`

## 🎨 UI Features Available

Once launched at http://localhost:3001:

### Core Interface
- **Responsive Dashboard**: Project overview and session management
- **Chat Interface**: Direct Claude Code CLI integration
- **Built-in Terminal**: Execute commands within projects
- **File Explorer**: Browse and edit project files
- **Syntax Highlighting**: Real-time code editing

### Tools Integration
- **Enable/Disable Tools**: Sidebar gear icon → selective tool activation
- **Shell Commands**: Shell icon for CLI command execution
- **File Updates**: Real-time file change monitoring

## 🔄 Automation Workflow

### Automatic Launch on Claude Code Start
The setup includes hooks for automatic launch:

1. **Pre-start**: Environment verification
2. **Post-start**: Launch Claude Code UI automatically
3. **Pre-stop**: Clean shutdown of UI processes

### Development Integration
Works seamlessly with existing Ishka development tools:

```bash
# Existing tools still work
pnpm dev              # Vite development
pnpm dev:watch        # Continuous development
pnpm dev:dashboard    # Development dashboard
pnpm dev:playground   # Component playground

# New UI tools
pnpm claude:ui        # Claude Code UI
```

## 🚨 Troubleshooting

### Common Issues

**Port Conflicts**:
```bash
# Check if port 3001 is in use
lsof -i :3001
# Stop conflicting processes or change VITE_PORT in .env
```

**Process Not Starting**:
```bash
# Check log file for errors
cat /tmp/claude-ui.log

# Restart with debug
./scripts/launch-claude-ui.sh restart
```

**Browser Not Opening**:
- Manual access: http://localhost:3001
- Check if `open` command is available on your system

### Reset Configuration
```bash
# Stop all processes
pnpm ui:stop

# Reset environment
cd claudecodeui
cp .env.example .env
# Edit .env as needed

# Restart
pnpm claude:ui
```

## 🎯 Next Steps

### Integration with SuperClaude
To integrate with your SuperClaude configuration:

1. **Add to Global CLAUDE.md**:
```markdown
## Claude Code UI Integration
- Auto-launch: `pnpm claude:ui`
- Interface: http://localhost:3001
- Management: `pnpm ui:{start|stop|restart|status}`
```

2. **Environment Variables**:
```bash
export CLAUDE_UI_AUTO_LAUNCH=true
export CLAUDE_UI_PORT=3001
```

### Customization Options
- **Theme Integration**: Match Claude Code UI theme with Ishka design system
- **Tool Configuration**: Enable specific tools for Ishka development
- **Workflow Automation**: Integrate with existing development scripts

---

## 📋 Quick Reference

| Command | Description |
|---------|-------------|
| `pnpm claude:ui` | Launch Claude Code UI |
| `pnpm ui:status` | Check running status |
| `pnpm ui:stop` | Stop UI processes |
| `pnpm ui:restart` | Restart UI |
| http://localhost:3001 | Access UI in browser |

**Status**: ✅ Fully configured and tested  
**Integration**: ✅ Ready for automatic launch  
**Documentation**: ✅ Complete setup guide

---

*Claude Code UI Integration | Ishka Extension | Auto-launch automation*