/**
 * Enhanced Storage Manager for Ishka Extension
 * 
 * Extends the base storage manager with user-centered features:
 * - Tags and annotations
 * - Templates and snippets  
 * - Settings and preferences
 * - Data migration and versioning
 * 
 * CRITICAL: This is the ONLY way to store user data
 * Never use chrome.storage directly in feature code
 */

import { StorageManager } from '../storage-manager.js';
import type { Tag, Template, Note, ExtensionSettings, ConversationMetadata } from '../types.js';

export interface TaggedConversation {
  conversationId: string;
  tags: Tag[];
  notes: Note[];
  metadata: ConversationMetadata;
  lastModified: Date;
}

export interface StorageSchema {
  // Version tracking for migrations
  schemaVersion: number;
  
  // User content
  tags: { [conversationId: string]: Tag[] };
  notes: { [messageId: string]: Note };
  templates: { [templateId: string]: Template };
  
  // User preferences
  settings: ExtensionSettings;
  
  // Feature state
  clipboardHistory: string[];
  usageStats: { [key: string]: number };
  
  // System state
  safeModeActive: boolean;
  lastSelectorCheck: Date;
  
  // Privacy controls
  privacyConsent: { [feature: string]: boolean };
}

export class EnhancedStorageManager extends StorageManager {
  private static readonly CURRENT_SCHEMA_VERSION = 1;
  private static readonly STORAGE_PREFIX = 'ishka_';

  constructor() {
    super();
    this.ensureSchemaVersion();
  }

  // ==================== TAGS & ANNOTATIONS ====================

  /**
   * Save tags for a conversation
   * REQUIRED: Use this instead of direct storage calls
   */
  async saveTags(conversationId: string, tags: Tag[]): Promise<void> {
    const key = this.getStorageKey('tags', conversationId);
    await this.set(key, tags);
  }

  /**
   * Load tags for a conversation
   */
  async loadTags(conversationId: string): Promise<Tag[]> {
    const key = this.getStorageKey('tags', conversationId);
    return await this.get<Tag[]>(key) || [];
  }

  /**
   * Add a single tag to a conversation
   */
  async addTag(conversationId: string, tag: Tag): Promise<void> {
    const existingTags = await this.loadTags(conversationId);
    const tagExists = existingTags.some(t => t.name === tag.name);
    
    if (!tagExists) {
      existingTags.push(tag);
      await this.saveTags(conversationId, existingTags);
    }
  }

  /**
   * Remove a tag from a conversation
   */
  async removeTag(conversationId: string, tagName: string): Promise<void> {
    const existingTags = await this.loadTags(conversationId);
    const filteredTags = existingTags.filter(t => t.name !== tagName);
    await this.saveTags(conversationId, filteredTags);
  }

  /**
   * Get all conversations with a specific tag
   */
  async getConversationsByTag(tagName: string): Promise<string[]> {
    const allKeys = await this.getAllKeys();
    const tagKeys = allKeys.filter(key => key.startsWith(this.getStorageKey('tags', '')));
    const matchingConversations: string[] = [];

    for (const key of tagKeys) {
      const tags = await this.get<Tag[]>(key);
      if (tags?.some(t => t.name === tagName)) {
        const conversationId = key.replace(this.getStorageKey('tags', ''), '');
        matchingConversations.push(conversationId);
      }
    }

    return matchingConversations;
  }

  // ==================== NOTES ====================

  /**
   * Save a note for a specific message
   */
  async saveNote(messageId: string, note: Note): Promise<void> {
    const key = this.getStorageKey('notes', messageId);
    await this.set(key, note);
  }

  /**
   * Load a note for a specific message
   */
  async loadNote(messageId: string): Promise<Note | null> {
    const key = this.getStorageKey('notes', messageId);
    return await this.get<Note>(key);
  }

  /**
   * Delete a note for a specific message
   */
  async deleteNote(messageId: string): Promise<void> {
    const key = this.getStorageKey('notes', messageId);
    await this.remove(key);
  }

  /**
   * Get all notes for a conversation
   */
  async getNotesForConversation(conversationId: string): Promise<Note[]> {
    const allKeys = await this.getAllKeys();
    const noteKeys = allKeys.filter(key => key.startsWith(this.getStorageKey('notes', '')));
    const conversationNotes: Note[] = [];

    for (const key of noteKeys) {
      const note = await this.get<Note>(key);
      if (note?.conversationId === conversationId) {
        conversationNotes.push(note);
      }
    }

    return conversationNotes;
  }

  // ==================== TEMPLATES ====================

  /**
   * Save a template
   */
  async saveTemplate(template: Template): Promise<void> {
    const key = this.getStorageKey('templates', template.id);
    await this.set(key, template);
  }

  /**
   * Load a template by ID
   */
  async loadTemplate(templateId: string): Promise<Template | null> {
    const key = this.getStorageKey('templates', templateId);
    return await this.get<Template>(key);
  }

  /**
   * Load all templates
   */
  async loadAllTemplates(): Promise<Template[]> {
    const allKeys = await this.getAllKeys();
    const templateKeys = allKeys.filter(key => key.startsWith(this.getStorageKey('templates', '')));
    const templates: Template[] = [];

    for (const key of templateKeys) {
      const template = await this.get<Template>(key);
      if (template) {
        templates.push(template);
      }
    }

    return templates.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Delete a template
   */
  async deleteTemplate(templateId: string): Promise<void> {
    const key = this.getStorageKey('templates', templateId);
    await this.remove(key);
  }

  // ==================== SETTINGS ====================

  /**
   * Save extension settings
   */
  async saveSettings(settings: ExtensionSettings): Promise<void> {
    const key = this.getStorageKey('settings');
    await this.set(key, settings);
  }

  /**
   * Load extension settings with defaults
   */
  async loadSettings(): Promise<ExtensionSettings> {
    const key = this.getStorageKey('settings');
    const settings = await this.get<ExtensionSettings>(key);
    
    // Return defaults if no settings exist
    if (!settings) {
      const defaults: ExtensionSettings = {\n        theme: 'auto',\n        enableVoiceInput: false,\n        enableTokenCounter: true,\n        privacySettings: {\n          enableClipboardHistory: false,\n          enableUsageStats: false,\n          dataRetentionDays: 30\n        }\n      };\n      await this.saveSettings(defaults);\n      return defaults;\n    }\n    \n    return settings;\n  }\n\n  /**\n   * Update a specific setting\n   */\n  async updateSetting<K extends keyof ExtensionSettings>(\n    key: K, \n    value: ExtensionSettings[K]\n  ): Promise<void> {\n    const settings = await this.loadSettings();\n    settings[key] = value;\n    await this.saveSettings(settings);\n  }\n\n  // ==================== PRIVACY CONTROLS ====================\n\n  /**\n   * Set privacy consent for a feature\n   */\n  async setPrivacyConsent(feature: string, consent: boolean): Promise<void> {\n    const key = this.getStorageKey('privacyConsent');\n    const currentConsent = await this.get<{ [feature: string]: boolean }>(key) || {};\n    currentConsent[feature] = consent;\n    await this.set(key, currentConsent);\n  }\n\n  /**\n   * Check if user has consented to a feature\n   */\n  async hasPrivacyConsent(feature: string): Promise<boolean> {\n    const key = this.getStorageKey('privacyConsent');\n    const consent = await this.get<{ [feature: string]: boolean }>(key);\n    return consent?.[feature] || false;\n  }\n\n  // ==================== CLIPBOARD HISTORY ====================\n\n  /**\n   * Add item to clipboard history (with consent check)\n   */\n  async addToClipboardHistory(text: string): Promise<void> {\n    const hasConsent = await this.hasPrivacyConsent('clipboardHistory');\n    if (!hasConsent) {\n      return;\n    }\n\n    const key = this.getStorageKey('clipboardHistory');\n    const history = await this.get<string[]>(key) || [];\n    \n    // Remove duplicates and add to front\n    const filteredHistory = history.filter(item => item !== text);\n    filteredHistory.unshift(text);\n    \n    // Keep only last 5 items\n    const limitedHistory = filteredHistory.slice(0, 5);\n    \n    await this.set(key, limitedHistory);\n  }\n\n  /**\n   * Get clipboard history\n   */\n  async getClipboardHistory(): Promise<string[]> {\n    const hasConsent = await this.hasPrivacyConsent('clipboardHistory');\n    if (!hasConsent) {\n      return [];\n    }\n\n    const key = this.getStorageKey('clipboardHistory');\n    return await this.get<string[]>(key) || [];\n  }\n\n  /**\n   * Clear clipboard history\n   */\n  async clearClipboardHistory(): Promise<void> {\n    const key = this.getStorageKey('clipboardHistory');\n    await this.remove(key);\n  }\n\n  // ==================== USAGE STATS ====================\n\n  /**\n   * Increment usage statistic (with consent check)\n   */\n  async incrementUsageStat(stat: string): Promise<void> {\n    const hasConsent = await this.hasPrivacyConsent('usageStats');\n    if (!hasConsent) {\n      return;\n    }\n\n    const key = this.getStorageKey('usageStats');\n    const stats = await this.get<{ [key: string]: number }>(key) || {};\n    stats[stat] = (stats[stat] || 0) + 1;\n    await this.set(key, stats);\n  }\n\n  /**\n   * Get usage statistics\n   */\n  async getUsageStats(): Promise<{ [key: string]: number }> {\n    const hasConsent = await this.hasPrivacyConsent('usageStats');\n    if (!hasConsent) {\n      return {};\n    }\n\n    const key = this.getStorageKey('usageStats');\n    return await this.get<{ [key: string]: number }>(key) || {};\n  }\n\n  // ==================== SAFE MODE ====================\n\n  /**\n   * Set Safe Mode state\n   */\n  async setSafeModeActive(active: boolean, reason?: string): Promise<void> {\n    const key = this.getStorageKey('safeModeActive');\n    await this.set(key, { active, reason, timestamp: new Date() });\n  }\n\n  /**\n   * Check if Safe Mode is active\n   */\n  async isSafeModeActive(): Promise<boolean> {\n    const key = this.getStorageKey('safeModeActive');\n    const safeModeData = await this.get<{ active: boolean }>(key);\n    return safeModeData?.active || false;\n  }\n\n  // ==================== DATA EXPORT ====================\n\n  /**\n   * Export all user data for backup\n   */\n  async exportUserData(): Promise<{\n    tags: { [conversationId: string]: Tag[] };\n    notes: { [messageId: string]: Note };\n    templates: Template[];\n    settings: ExtensionSettings;\n    metadata: {\n      exportDate: string;\n      schemaVersion: number;\n    };\n  }> {\n    const allKeys = await this.getAllKeys();\n    const ishkaKeys = allKeys.filter(key => key.startsWith(EnhancedStorageManager.STORAGE_PREFIX));\n    \n    const exportData = {\n      tags: {} as { [conversationId: string]: Tag[] },\n      notes: {} as { [messageId: string]: Note },\n      templates: [] as Template[],\n      settings: await this.loadSettings(),\n      metadata: {\n        exportDate: new Date().toISOString(),\n        schemaVersion: EnhancedStorageManager.CURRENT_SCHEMA_VERSION\n      }\n    };\n\n    for (const key of ishkaKeys) {\n      const value = await this.get(key);\n      if (key.includes('_tags_')) {\n        const conversationId = key.split('_tags_')[1];\n        exportData.tags[conversationId] = value as Tag[];\n      } else if (key.includes('_notes_')) {\n        const messageId = key.split('_notes_')[1];\n        exportData.notes[messageId] = value as Note;\n      } else if (key.includes('_templates_')) {\n        exportData.templates.push(value as Template);\n      }\n    }\n\n    return exportData;\n  }\n\n  /**\n   * Import user data from backup\n   */\n  async importUserData(data: any): Promise<void> {\n    // Import tags\n    if (data.tags) {\n      for (const [conversationId, tags] of Object.entries(data.tags)) {\n        await this.saveTags(conversationId, tags as Tag[]);\n      }\n    }\n\n    // Import notes\n    if (data.notes) {\n      for (const [messageId, note] of Object.entries(data.notes)) {\n        await this.saveNote(messageId, note as Note);\n      }\n    }\n\n    // Import templates\n    if (data.templates) {\n      for (const template of data.templates) {\n        await this.saveTemplate(template as Template);\n      }\n    }\n\n    // Import settings\n    if (data.settings) {\n      await this.saveSettings(data.settings);\n    }\n  }\n\n  /**\n   * Clear all user data (for privacy/reset)\n   */\n  async clearAllUserData(): Promise<void> {\n    const allKeys = await this.getAllKeys();\n    const ishkaKeys = allKeys.filter(key => key.startsWith(EnhancedStorageManager.STORAGE_PREFIX));\n    \n    for (const key of ishkaKeys) {\n      await this.remove(key);\n    }\n  }\n\n  // ==================== PRIVATE HELPERS ====================\n\n  /**\n   * Generate storage key with consistent prefix\n   */\n  private getStorageKey(type: string, id?: string): string {\n    const base = `${EnhancedStorageManager.STORAGE_PREFIX}${type}`;\n    return id ? `${base}_${id}` : base;\n  }\n\n  /**\n   * Ensure schema version is current and migrate if needed\n   */\n  private async ensureSchemaVersion(): Promise<void> {\n    const versionKey = this.getStorageKey('schemaVersion');\n    const currentVersion = await this.get<number>(versionKey);\n    \n    if (!currentVersion || currentVersion < EnhancedStorageManager.CURRENT_SCHEMA_VERSION) {\n      await this.migrateSchema(currentVersion || 0);\n      await this.set(versionKey, EnhancedStorageManager.CURRENT_SCHEMA_VERSION);\n    }\n  }\n\n  /**\n   * Handle schema migrations\n   */\n  private async migrateSchema(fromVersion: number): Promise<void> {\n    // Future migrations will be handled here\n    // For now, we're at version 1, so no migrations needed\n    console.log(`[EnhancedStorageManager] Migrating from schema version ${fromVersion} to ${EnhancedStorageManager.CURRENT_SCHEMA_VERSION}`);\n  }\n}\n\n// Export singleton instance\nexport const enhancedStorageManager = new EnhancedStorageManager();\n\n// Export for backward compatibility\nexport { enhancedStorageManager as storageManager };