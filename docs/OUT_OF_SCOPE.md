# Ishka Extension: Out of Scope Features

**Document Version**: 2.0 (Stability-First Revision)  
**Last Updated**: July 14, 2025  
**Purpose**: Clearly define features that are intentionally excluded due to stability and policy risks

---

## 🚫 Why We Say No

The Ishka Extension follows a **stability-first philosophy** that prioritizes user trust and long-term reliability over feature completeness. This document lists highly desirable features that are intentionally excluded from our roadmap due to unacceptable risks.

### Risk Categories

- **🔴 Very High Risk**: Features that could trigger account suspension or violate terms of service
- **🟠 High Risk**: Features that depend on undocumented APIs or private implementation details
- **🟡 Medium Risk**: Features that are brittle and likely to break with ChatGPT updates
- **🟢 Low Risk**: Features that are technically feasible but outside our core focus

---

## 🚫 Permanently Out of Scope

### 🔴 Very High Risk: Account Safety

#### Bulk Actions (Archive, Delete, Move)
**Why Excluded**: Automating multiple write/delete operations is the most likely feature to trigger rate-limiting or account suspension.

**User Request**: "Let me select 50 conversations and delete them all at once"

**Our Response**: 
- Risk of account flags for automated behavior
- Potential data loss if operations fail partially
- ChatGPT's rate limiting could block the user's account
- No safe way to implement undo for bulk deletions

**Alternative**: Export conversation list for manual review and deletion

---

#### Chat Renaming, Moving & Deleting
**Why Excluded**: Requires replaying undocumented PATCH, DELETE, and GraphQL calls that are prone to breakage and could trigger account flags.

**User Request**: "Add a rename button to conversations in the sidebar"

**Our Response**:
- ChatGPT's conversation management APIs are private and undocumented
- API calls use authentication tokens we cannot safely access
- Operations could fail silently, leaving UI out of sync
- Risk of corrupting conversation data or losing access

**Alternative**: Local tagging and organization system that doesn't modify ChatGPT's data

---

### 🟠 High Risk: API Dependency

#### Full Conversation Search (Live)
**Why Excluded**: Requires intercepting private GET API calls or aggressive DOM scraping, both of which are brittle and may violate terms of service.

**User Request**: "I want to search through all my conversation history instantly"

**Our Response**:
- ChatGPT's conversation loading is handled by private APIs
- Intercepting network requests violates browser security policies
- Full DOM scraping of all conversations would require loading them all, causing performance issues
- Search results could become stale as ChatGPT caches and paginations change

**Alternative**: Search within currently visible conversations and exported data

---

#### Folder / Project Manipulation
**Why Excluded**: Depends on a private and frequently changing GraphQL schema that is extremely brittle.

**User Request**: "Let me create new folders and move conversations between them"

**Our Response**:
- Folder operations use ChatGPT's internal GraphQL API
- Schema changes frequently without notice
- Failed operations could corrupt folder structure
- No way to safely test folder operations without risking user data

**Alternative**: Local tagging system that provides more flexible organization than folders

---

#### Integrated Web Search
**Why Excluded**: Relies on chaining external API calls and re-injecting data, which is complex and outside the core "local-first" strategy.

**User Request**: "Add a web search feature that automatically includes results in my prompts"

**Our Response**:
- Requires external API integrations (Google, Bing, etc.)
- API costs and rate limiting issues
- Privacy concerns with search query data
- Complex error handling for multiple external dependencies
- Increases extension complexity and maintenance burden

**Alternative**: Template system for common research prompt patterns

---

### 🟡 Medium Risk: DOM Fragility

#### Inline Threading / Branching
**Why Excluded**: Requires heavy, complex manipulation of the core chat DOM, making it exceptionally brittle.

**User Request**: "Let me branch conversations at any point and explore different directions"

**Our Response**:
- Would require deep manipulation of ChatGPT's conversation rendering
- Conversation state management is handled by React/frontend framework
- Risk of breaking ChatGPT's native functionality
- Extremely complex implementation with high maintenance cost
- UI changes could break the feature completely

**Alternative**: Template system for exploring different conversation directions

---

#### Live Token Management Tools
**Why Excluded**: Requires constantly reading the live conversation DOM, which is subject to frequent changes.

**User Request**: "Show me real-time token count for the entire conversation context"

**Our Response**:
- ChatGPT's token counting is handled server-side
- Conversation context includes system prompts we cannot access
- DOM structure for conversations changes frequently
- Real-time monitoring would impact performance
- Token count calculations would be approximations, not accurate

**Alternative**: Input token counter for prompts only, using local tokenizer

---

## 🟢 Lower Risk but Out of Scope

### Features Outside Core Focus

#### Custom ChatGPT Models
**Why Excluded**: Not related to organization and productivity enhancement.

#### Advanced AI Features (Summarization, Translation)
**Why Excluded**: Requires external AI APIs, increasing complexity and cost.

#### Social Features (Sharing, Collaboration)
**Why Excluded**: Requires server infrastructure and user accounts.

#### Browser Automation
**Why Excluded**: Outside the scope of ChatGPT enhancement.

---

## 🔄 Potential Future Consideration

These features will be reconsidered **only if** OpenAI releases supported public APIs that enable them safely:

### If OpenAI Provides Official APIs

#### Conversation Management API
- Safe conversation renaming, moving, deletion
- Folder/project management
- Bulk operations with proper rate limiting

#### Search API
- Full conversation history search
- Advanced filtering and organization
- Real-time search with proper pagination

#### Context API
- Accurate token counting for full conversations
- Context window management
- Model parameter access

### Monitoring for API Releases

We actively monitor:
- OpenAI developer documentation
- ChatGPT plugin/extension APIs
- Official developer communications
- Beta testing programs

When official APIs become available, we will evaluate them against our stability and user safety standards.

---

## 🙅‍♂️ How We Handle Feature Requests

### When Users Request Out-of-Scope Features

1. **Acknowledge the need**: "We understand this would be valuable"
2. **Explain the risk**: "Here's why we can't implement it safely"
3. **Offer alternatives**: "Here's what we can do instead"
4. **Show our principles**: "This aligns with our commitment to your account safety"

### Example Response Template

> Thank you for the feature request! We understand that [feature] would be incredibly useful for your workflow.
>
> Unfortunately, implementing [feature] would require [specific risk], which could potentially [consequence]. As part of our commitment to keeping your ChatGPT account safe and your data secure, we've decided not to pursue features that carry these risks.
>
> Instead, we'd like to suggest [alternative approach] which provides [benefits] while maintaining the stability and safety you can count on.
>
> We're constantly monitoring for official APIs from OpenAI that might enable us to implement [feature] safely in the future.

---

## 📈 Decision Framework

When evaluating new feature requests, we use this framework:

### ✅ GREEN LIGHT Criteria
- Uses only public, documented APIs
- Can be implemented with local-first architecture
- Degrades gracefully when ChatGPT updates
- Minimal maintenance burden
- Clear user value proposition

### 🟡 YELLOW LIGHT Criteria
- Requires careful DOM interaction but has stable fallbacks
- Medium implementation complexity
- Clear user safety measures
- Can be made resilient to updates

### 🔴 RED LIGHT Criteria
- Requires undocumented API calls
- Risk of account suspension or terms violation
- Highly brittle with frequent breakage potential
- Could corrupt user data
- High maintenance burden with unclear benefits

---

## 📝 Communicating Limitations

### In User-Facing Documentation

**What We Say**:
> "Ishka focuses on features that enhance your ChatGPT experience while keeping your account safe and your data secure. We deliberately avoid features that could put your account at risk or break frequently."

**What We Don't Say**:
- "OpenAI doesn't allow this" (implies we've asked)
- "This is impossible" (may become possible with APIs)
- "We're too lazy to implement this" (dismissive)

### In Developer Documentation

**Technical Honesty**:
- Document specific technical barriers
- Explain risk assessment methodology
- Share decision-making process
- Provide alternatives and workarounds

---

## 🔍 Regular Review Process

We review this out-of-scope list quarterly to ensure:

1. **Risk assessments remain current** with ChatGPT changes
2. **New APIs or opportunities** are properly evaluated
3. **User feedback** is incorporated into decision-making
4. **Alternative solutions** are updated and improved

### Review Triggers

- Major ChatGPT UI updates
- OpenAI API announcements
- Significant user feature requests
- Competitive landscape changes
- Security or privacy policy updates

---

*This document ensures that Ishka remains focused on delivering reliable, safe features that truly enhance the ChatGPT experience without compromising user trust or account safety.*