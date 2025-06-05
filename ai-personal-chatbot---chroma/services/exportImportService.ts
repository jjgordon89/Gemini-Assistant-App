// Export/Import Service for conversations and notes
import { Message } from '../types';

export interface ExportData {
  version: string;
  timestamp: string;
  conversations: ConversationExport[];
  settings?: UserSettingsExport;
  metadata: ExportMetadata;
}

export interface ConversationExport {
  id: string;
  title?: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
  provider: string;
}

export interface UserSettingsExport {
  preferences: Record<string, any>;
  apiProviders: Record<string, boolean>; // Which providers were configured (without keys)
  memoryEnabled: boolean;
  theme?: string;
  language?: string;
}

export interface ExportMetadata {
  totalMessages: number;
  totalConversations: number;
  exportedBy: string;
  appVersion: string;
}

export interface ImportResult {
  success: boolean;
  importedConversations: number;
  importedMessages: number;
  errors: string[];
  warnings: string[];
}

export class ExportImportService {
  private static readonly EXPORT_VERSION = '1.0.0';
  private static readonly APP_VERSION = '1.0.0';

  /**
   * Export all user data including conversations and settings
   */
  async exportData(
    conversations: ConversationExport[],
    userSettings?: UserSettingsExport,
    userId?: string
  ): Promise<ExportData> {
    const totalMessages = conversations.reduce((sum, conv) => sum + conv.messages.length, 0);
    
    const exportData: ExportData = {
      version: ExportImportService.EXPORT_VERSION,
      timestamp: new Date().toISOString(),
      conversations,
      settings: userSettings,
      metadata: {
        totalMessages,
        totalConversations: conversations.length,
        exportedBy: userId || 'anonymous',
        appVersion: ExportImportService.APP_VERSION
      }
    };

    return exportData;
  }

  /**
   * Export data as downloadable JSON file
   */
  async exportToFile(
    conversations: ConversationExport[],
    userSettings?: UserSettingsExport,
    userId?: string,
    filename?: string
  ): Promise<void> {
    const exportData = await this.exportData(conversations, userSettings, userId);
    const jsonString = JSON.stringify(exportData, null, 2);
    
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const defaultFilename = `chroma-ai-export-${new Date().toISOString().split('T')[0]}.json`;
    const finalFilename = filename || defaultFilename;
    
    // Create download link
    const link = document.createElement('a');
    link.href = url;
    link.download = finalFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the URL object
    URL.revokeObjectURL(url);
  }

  /**
   * Validate import data structure
   */
  private validateImportData(data: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data || typeof data !== 'object') {
      errors.push('Invalid data format: expected JSON object');
      return { valid: false, errors };
    }

    if (!data.version) {
      errors.push('Missing version information');
    }

    if (!data.conversations || !Array.isArray(data.conversations)) {
      errors.push('Invalid or missing conversations array');
    }

    if (!data.metadata) {
      errors.push('Missing metadata');
    }

    // Validate conversation structure
    if (data.conversations) {
      data.conversations.forEach((conv: any, index: number) => {
        if (!conv.id) {
          errors.push(`Conversation ${index}: missing ID`);
        }
        if (!conv.messages || !Array.isArray(conv.messages)) {
          errors.push(`Conversation ${index}: invalid messages array`);
        }
        if (conv.messages) {
          conv.messages.forEach((msg: any, msgIndex: number) => {
            if (!msg.id || !msg.text || !msg.sender || !msg.timestamp) {
              errors.push(`Conversation ${index}, Message ${msgIndex}: missing required fields`);
            }
          });
        }
      });
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Import data from JSON string
   */
  async importFromJson(jsonString: string): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      importedConversations: 0,
      importedMessages: 0,
      errors: [],
      warnings: []
    };

    try {
      const data = JSON.parse(jsonString);
      const validation = this.validateImportData(data);

      if (!validation.valid) {
        result.errors = validation.errors;
        return result;
      }

      // Check version compatibility
      if (data.version !== ExportImportService.EXPORT_VERSION) {
        result.warnings.push(`Version mismatch: expected ${ExportImportService.EXPORT_VERSION}, got ${data.version}`);
      }

      // Process conversations
      const conversations: ConversationExport[] = data.conversations;
      let importedMessages = 0;

      for (const conversation of conversations) {
        try {
          // Validate and process each conversation
          if (this.isValidConversation(conversation)) {
            importedMessages += conversation.messages.length;
            result.importedConversations++;
          } else {
            result.warnings.push(`Skipped invalid conversation: ${conversation.id}`);
          }
        } catch (error) {
          result.warnings.push(`Error processing conversation ${conversation.id}: ${error}`);
        }
      }

      result.importedMessages = importedMessages;
      result.success = result.errors.length === 0;

      return result;
    } catch (error) {
      result.errors.push(`Failed to parse JSON: ${error}`);
      return result;
    }
  }

  /**
   * Import data from file
   */
  async importFromFile(file: File): Promise<ImportResult> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const jsonString = e.target?.result as string;
          const result = await this.importFromJson(jsonString);
          resolve(result);
        } catch (error) {
          resolve({
            success: false,
            importedConversations: 0,
            importedMessages: 0,
            errors: [`Failed to read file: ${error}`],
            warnings: []
          });
        }
      };

      reader.onerror = () => {
        resolve({
          success: false,
          importedConversations: 0,
          importedMessages: 0,
          errors: ['Failed to read file'],
          warnings: []
        });
      };

      reader.readAsText(file);
    });
  }

  /**
   * Validate individual conversation
   */
  private isValidConversation(conversation: any): boolean {
    return (
      conversation &&
      typeof conversation.id === 'string' &&
      Array.isArray(conversation.messages) &&
      conversation.messages.every((msg: any) =>
        msg.id && msg.text && msg.sender && msg.timestamp
      )
    );
  }

  /**
   * Get export statistics
   */
  getExportStats(conversations: ConversationExport[]): ExportMetadata {
    const totalMessages = conversations.reduce((sum, conv) => sum + conv.messages.length, 0);
    
    return {
      totalMessages,
      totalConversations: conversations.length,
      exportedBy: 'user',
      appVersion: ExportImportService.APP_VERSION
    };
  }

  /**
   * Create a backup filename based on current date
   */
  generateBackupFilename(prefix: string = 'chroma-ai-backup'): string {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
    return `${prefix}-${dateStr}-${timeStr}.json`;
  }

  /**
   * Export specific conversations by IDs
   */
  async exportSelectedConversations(
    allConversations: ConversationExport[],
    selectedIds: string[],
    userSettings?: UserSettingsExport,
    userId?: string
  ): Promise<ExportData> {
    const selectedConversations = allConversations.filter(conv => 
      selectedIds.includes(conv.id)
    );
    
    return this.exportData(selectedConversations, userSettings, userId);
  }

  /**
   * Merge imported conversations with existing ones
   */
  mergeConversations(
    existing: ConversationExport[],
    imported: ConversationExport[],
    strategy: 'replace' | 'merge' | 'skip' = 'merge'
  ): { merged: ConversationExport[]; conflicts: string[] } {
    const merged = [...existing];
    const conflicts: string[] = [];
    const existingIds = new Set(existing.map(conv => conv.id));

    for (const importedConv of imported) {
      if (existingIds.has(importedConv.id)) {
        conflicts.push(importedConv.id);
        
        switch (strategy) {
          case 'replace':
            const index = merged.findIndex(conv => conv.id === importedConv.id);
            if (index !== -1) {
              merged[index] = importedConv;
            }
            break;
          case 'merge':
            // For merge strategy, we could implement message-level merging
            // For now, we'll skip to avoid duplicates
            break;
          case 'skip':
            // Do nothing, keep existing
            break;
        }
      } else {
        merged.push(importedConv);
        existingIds.add(importedConv.id);
      }
    }

    return { merged, conflicts };
  }
}

export default ExportImportService;
