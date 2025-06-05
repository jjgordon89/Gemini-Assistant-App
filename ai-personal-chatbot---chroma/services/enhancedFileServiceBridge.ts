// Enhanced File Service Bridge
// Provides compatibility between enhanced file service and main app's file service
import { EnhancedFileService, FileProcessingResult } from './enhancedFileService';
import { ProcessedFileData } from '../../services/fileService';

export class EnhancedFileServiceBridge {
  private enhancedService: EnhancedFileService;

  constructor() {
    this.enhancedService = new EnhancedFileService();
  }

  /**
   * Convert enhanced file processing result to main app's format
   */
  private convertToProcessedFileData(
    file: File, 
    result: FileProcessingResult, 
    base64Data: string
  ): ProcessedFileData {
    return {
      name: result.metadata.filename,
      type: file.type,
      base64Data,
      extractedText: result.text
    };
  }

  /**
   * Read file as base64 (copied from original file service)
   */
  private readFileAsBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          // result includes 'data:mime/type;base64,' prefix, remove it
          resolve(reader.result.split(',')[1]);
        } else {
          reject(new Error('Failed to read file as base64: result is not a string.'));
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  }

  /**
   * Enhanced version of readFileContents that supports more file types
   */
  async readFileContents(file: File): Promise<ProcessedFileData> {
    // Get base64 data
    const base64Data = await this.readFileAsBase64(file);
    
    // Check if enhanced service supports this file type
    if (this.enhancedService.isFileSupported(file)) {
      try {
        const result = await this.enhancedService.processFile(file);
        return this.convertToProcessedFileData(file, result, base64Data);
      } catch (error) {
        console.warn(`Enhanced processing failed for ${file.name}, falling back to basic processing:`, error);
      }
    }

    // Fallback to basic processing for unsupported types or if enhanced processing fails
    let extractedText: string | undefined = undefined;

    if (file.type.startsWith('text/')) {
      try {
        extractedText = await this.extractTextFromFile(file);
      } catch (e) {
        console.warn("Could not read text from file.", e);
      }
    }

    return {
      name: file.name,
      type: file.type,
      base64Data,
      extractedText,
    };
  }

  /**
   * Extract text from text files (fallback method)
   */
  private extractTextFromFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target && typeof event.target.result === 'string') {
          resolve(event.target.result);
        } else {
          reject(new Error('Failed to read text from file.'));
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsText(file);
    });
  }

  /**
   * Get supported file formats
   */
  getSupportedFormats(): string[] {
    return this.enhancedService.getSupportedFormats();
  }

  /**
   * Check if file is supported
   */
  isFileSupported(file: File): boolean {
    return this.enhancedService.isFileSupported(file) || file.type.startsWith('text/');
  }

  /**
   * Get file type description
   */
  getFileTypeDescription(fileType: string): string {
    return this.enhancedService.getFileTypeDescription(fileType);
  }
}

// Create singleton instance
export const enhancedFileServiceBridge = new EnhancedFileServiceBridge();

// Export for compatibility with existing imports
export const readFileContents = enhancedFileServiceBridge.readFileContents.bind(enhancedFileServiceBridge);

export default enhancedFileServiceBridge;
