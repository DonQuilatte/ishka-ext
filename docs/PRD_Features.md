# Ishka Extension: Product Requirements Document - Features

**Document Version**: 2.0 (Stability-First Revision)  
**Last Updated**: July 14, 2025  
**Strategic Focus**: ChatGPT productivity enhancement through local-first, stable features

---

## 🎯 Executive Summary

The Ishka Extension transforms ChatGPT into a more powerful, organized, and personalized workspace through **local-first features** that prioritize stability and user trust. This PRD shifts from technical infrastructure to **user-centered productivity tools** that enhance the ChatGPT experience without relying on brittle backend integration.

### Core Value Proposition
- **Local Organization**: Tags, notes, templates, and snippets stored securely on user's device
- **Workflow Enhancement**: Quick actions, voice input, and productivity shortcuts
- **Data Portability**: Export and backup conversations safely
- **Graceful Resilience**: Features degrade gracefully when ChatGPT updates

---

## 📋 Phase 1: Core Local Organization & UI Enhancements

### 🏷️ Local Tags & Annotations

**User Problem**: Users lack flexible categorization for conversations beyond rigid folders.

**Solution**: Multi-tag system with private notes for any conversation.

**Acceptance Criteria**:
- ✅ Add multiple tags to any conversation
- ✅ Attach private notes to conversations  
- ✅ Filter conversations by tag combinations
- ✅ Search within notes and tags
- ✅ Export tag/note data for backup

**Technical Requirements**:
- Storage: `chrome.storage.local` or IndexedDB
- Mapping: Conversation UUID → tags/notes
- UI: Non-intrusive badges and note icons
- Fallback: Title + content similarity matching

**Priority**: High Value / Medium Effort

---

### 🎛️ Enhanced Workflow & UI

**User Problem**: Repetitive actions are slow, UI lacks key context.

**Solution**: Floating action panel + auto-title enhancement.

**Floating Action Panel**:
- Quick access to all Ishka features
- Keyboard shortcut activation
- Contextual feature availability
- Non-blocking, draggable interface

**Auto-Title Enhancer**:
- Local-only title generation from first 1-2 user messages
- Deterministic heuristics (no API calls)
- Respects user's existing titles
- Opt-in/opt-out in settings

**Priority**: High Value / Low Effort

---

### 📝 Per-Message Notes & Timestamps

**User Problem**: Cannot annotate specific messages or see timing context.

**Solution**: Private notes on any message + timestamp display toggle.

**Features**:
- Hover-activated note icon on messages
- Private annotations stored locally
- Toggle timestamps for all messages
- Note search across conversations

**Priority**: Medium Value / Medium Effort

---

### 📋 Chat Templates / Snippets

**User Problem**: Retyping common prompts and instructions.

**Solution**: Reusable prompt template system.

**Features**:
- Create/edit/organize prompt snippets
- Variable substitution in templates
- Quick insertion via dropdown or hotkey
- Category organization
- Import/export snippet collections

**Priority**: High Value / Medium Effort

---

### 🔢 Input Token Counter & Cost Estimator

**User Problem**: No visibility into prompt length and cost implications.

**Solution**: Real-time token analysis beside input.

**Features**:
- Live token count using local tokenizer
- Cost estimation for different models
- Character/word count alternatives
- Warning thresholds for large prompts

**Priority**: Medium Value / Low Effort

---

### 🔧 Prompt Builder / Variable Manager

**User Problem**: Need reusable prompts with modifiable sections.

**Solution**: Template system with variable substitution.

**Features**:
- Visual prompt builder interface
- Variable placeholders with descriptions
- Template library with categories
- Preview before sending
- Save and share templates

**Priority**: Medium Value / Medium Effort

---

### 🎤 Voice-to-Text Dictation

**User Problem**: Prefer speaking prompts to typing.

**Solution**: Browser-native speech recognition.

**Features**:
- Microphone button in input area
- Web Speech API integration
- Language selection
- Noise filtering and confidence scoring
- Offline capability

**Priority**: Medium Value / Low Effort

---

## 📋 Phase 2: Advanced Portability, Readability & Personalization

### 📤 Safe Data Portability

**User Problem**: Need to backup, share, or migrate conversations.

**Solution**: Local export with multiple formats.

**Features**:
- Export visible conversations to JSON/Markdown
- Auto-saved local conversation history
- Batch export capabilities
- Metadata preservation (tags, notes, timestamps)

**Priority**: High Value / Low Effort

---

### ⚙️ Configuration & Onboarding

**User Problem**: Need guided discovery and feature control.

**Solution**: Comprehensive settings + onboarding flow.

**Onboarding**:
- Welcome overlay introducing key features
- Interactive feature discovery tour
- Progressive disclosure of advanced options
- Quick setup wizard

**Settings Panel**:
- Feature toggles and preferences
- Keyboard shortcut customization
- Data management (export/import/clear)
- Privacy controls

**Priority**: High Value / Medium Effort

---

### 📑 Auto-TOC for Long Responses

**User Problem**: Difficult navigation in lengthy AI responses.

**Solution**: Generated table of contents for structured responses.

**Features**:
- Parse markdown headers automatically
- Floating TOC panel
- Jump-to-section navigation
- Collapsible sections

**Priority**: Medium Value / Low Effort

---

### 📋 Copy Response Enhancer

**User Problem**: Need flexible copying options (markdown, plain text, code only).

**Solution**: Enhanced copy functionality with format options.

**Features**:
- Copy dropdown with multiple formats
- Preserve formatting or strip to plain text
- Copy code blocks separately
- Copy with/without metadata

**Priority**: Medium Value / Medium Effort

---

### 🔊 Text-to-Speech (Read Aloud)

**User Problem**: Want to listen to responses while multitasking.

**Solution**: Browser-native text-to-speech.

**Features**:
- Play button on responses
- Voice selection and speed control
- Pause/resume/skip functionality
- Reading progress indicator

**Priority**: Medium Value / Medium Effort

---

### 🧘 Focus / Zen Mode

**User Problem**: Distracted by surrounding UI elements.

**Solution**: Minimal interface toggle.

**Features**:
- Hide sidebar and non-essential UI
- Full-width conversation view
- Keyboard-only navigation
- Quick toggle hotkey

**Priority**: Low Value / Very Low Effort

---

### 📋 Clipboard History Panel

**User Problem**: Lose copied text quickly, need reuse capability.

**Solution**: Local clipboard tracking within ChatGPT.

**Features**:
- Track last 5-10 copied items
- One-click re-paste
- Clear clipboard history
- Opt-in privacy control

**Priority**: Medium Value / Medium Effort

---

### 📌 Pin-to-Top Message

**User Problem**: Want important answers always visible.

**Solution**: Sticky message positioning.

**Features**:
- Pin any message to top of viewport
- Multiple pinned messages
- Unpin functionality
- Persist across sessions

**Priority**: Medium Value / Medium Effort

---

### 📊 Personal Usage Stats Dashboard

**User Problem**: Want insights into ChatGPT usage patterns.

**Solution**: Local analytics dashboard.

**Features**:
- Prompts per day/week/month
- Conversation count and length
- Most used tags and snippets
- Usage time tracking
- Privacy-first, local-only data

**Priority**: Low Value / Medium Effort

---

## 🚫 Out of Scope (Stability Risk)

These features are intentionally excluded due to brittleness and policy risk:

| Feature | Risk Level | Reason |
|---------|------------|--------|
| Full Conversation Search (Live) | High | Requires API interception |
| Chat Renaming/Moving/Deleting | High | Undocumented GraphQL calls |
| Folder/Project Manipulation | High | Private schema dependency |
| Bulk Actions | Very High | Account suspension risk |
| Live Token Management | Medium | Frequent DOM changes |
| Integrated Web Search | High | Complex external API chains |
| Inline Threading/Branching | High | Core DOM manipulation |

---

## 📏 Success Metrics

### User Experience Metrics
- Feature discovery rate within first session
- Daily active usage of core features
- User retention at 7/30 days
- Support ticket volume (minimize)

### Technical Metrics
- Feature availability during ChatGPT updates
- DOM selector success rate
- Local storage performance
- Extension load time impact

### Business Metrics
- User productivity improvement
- Conversation organization adoption
- Export feature usage
- Word-of-mouth referrals

---

*This PRD emphasizes stability, user trust, and local-first functionality to create a sustainable ChatGPT enhancement that delivers consistent value regardless of OpenAI backend changes.*