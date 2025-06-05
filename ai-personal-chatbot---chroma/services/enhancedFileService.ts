// Enhanced File Processing Service
// Supports multiple file formats including PDF, images, Word documents, and spreadsheets

export interface FileProcessingResult {
  text: string;
  metadata: {
    filename: string;
    fileType: string;
    size: number;
    pages?: number;
    images?: number;
  };
}

export interface FileProcessor {
  canProcess(fileType: string): boolean;
  processFile(file: File): Promise<FileProcessingResult>;
}

// PDF Processor (existing functionality enhanced)
export class PDFProcessor implements FileProcessor {
  canProcess(fileType: string): boolean {
    return fileType === 'application/pdf';
  }

  async processFile(file: File): Promise<FileProcessingResult> {
    // This would integrate with existing PDF processing
    // For now, return a placeholder
    return {
      text: `PDF content from ${file.name} would be extracted here`,
      metadata: {
        filename: file.name,
        fileType: 'PDF',
        size: file.size,
        pages: 1
      }
    };
  }
}

// Image Processor
export class ImageProcessor implements FileProcessor {
  canProcess(fileType: string): boolean {
    return fileType.startsWith('image/');
  }

  async processFile(file: File): Promise<FileProcessingResult> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const imageData = e.target?.result as string;
          
          // Create an image element to get dimensions
          const img = new Image();
          img.onload = () => {
            // Extract any text using OCR (placeholder for now)
            const extractedText = `Image: ${file.name} (${img.width}x${img.height})`;
            
            resolve({
              text: extractedText,
              metadata: {
                filename: file.name,
                fileType: 'Image',
                size: file.size,
                images: 1
              }
            });
          };
          
          img.onerror = () => {
            reject(new Error('Failed to load image'));
          };
          
          img.src = imageData;
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read image file'));
      };
      
      reader.readAsDataURL(file);
    });
  }
}

// Word Document Processor
export class WordProcessor implements FileProcessor {
  canProcess(fileType: string): boolean {
    return fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
           fileType === 'application/msword';
  }

  async processFile(file: File): Promise<FileProcessingResult> {
    // For DOCX files, we would need to parse the XML structure
    // For now, return a placeholder
    return {
      text: `Word document content from ${file.name} would be extracted here`,
      metadata: {
        filename: file.name,
        fileType: 'Word Document',
        size: file.size
      }
    };
  }
}

// Excel/Spreadsheet Processor
export class SpreadsheetProcessor implements FileProcessor {
  canProcess(fileType: string): boolean {
    return fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
           fileType === 'application/vnd.ms-excel' ||
           fileType === 'text/csv';
  }

  async processFile(file: File): Promise<FileProcessingResult> {
    if (file.type === 'text/csv') {
      return this.processCSV(file);
    }
    
    // For Excel files, we would need to parse the XML structure
    // For now, return a placeholder
    return {
      text: `Spreadsheet content from ${file.name} would be extracted here`,
      metadata: {
        filename: file.name,
        fileType: 'Spreadsheet',
        size: file.size
      }
    };
  }

  private async processCSV(file: File): Promise<FileProcessingResult> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const csvContent = e.target?.result as string;
          const lines = csvContent.split('\n');
          const headers = lines[0]?.split(',') || [];
          
          // Convert CSV to a readable format
          let text = `CSV File: ${file.name}\n`;
          text += `Headers: ${headers.join(', ')}\n`;
          text += `Rows: ${lines.length - 1}\n`;
          text += '\nSample data:\n';
          
          // Include first few rows as sample
          lines.slice(0, Math.min(5, lines.length)).forEach((line, index) => {
            text += `Row ${index}: ${line}\n`;
          });
          
          resolve({
            text,
            metadata: {
              filename: file.name,
              fileType: 'CSV',
              size: file.size
            }
          });
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read CSV file'));
      };
      
      reader.readAsText(file);
    });
  }
}

// Text File Processor
export class TextProcessor implements FileProcessor {
  canProcess(fileType: string): boolean {
    return fileType.startsWith('text/') || fileType === 'application/json';
  }

  async processFile(file: File): Promise<FileProcessingResult> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const textContent = e.target?.result as string;
          
          resolve({
            text: textContent,
            metadata: {
              filename: file.name,
              fileType: 'Text',
              size: file.size
            }
          });
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read text file'));
      };
      
      reader.readAsText(file);
    });
  }
}

// Main File Processing Service
export class EnhancedFileService {
  private processors: FileProcessor[] = [
    new PDFProcessor(),
    new ImageProcessor(),
    new WordProcessor(),
    new SpreadsheetProcessor(),
    new TextProcessor()
  ];

  getSupportedFormats(): string[] {
    return [
      'application/pdf',
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'text/plain',
      'text/markdown',
      'application/json'
    ];
  }

  isFileSupported(file: File): boolean {
    return this.processors.some(processor => processor.canProcess(file.type));
  }

  async processFile(file: File): Promise<FileProcessingResult> {
    const processor = this.processors.find(p => p.canProcess(file.type));
    
    if (!processor) {
      throw new Error(`Unsupported file type: ${file.type}`);
    }

    try {
      const result = await processor.processFile(file);
      return result;
    } catch (error) {
      throw new Error(`Failed to process file ${file.name}: ${error}`);
    }
  }

  async processFiles(files: File[]): Promise<FileProcessingResult[]> {
    const results: FileProcessingResult[] = [];
    
    for (const file of files) {
      try {
        const result = await this.processFile(file);
        results.push(result);
      } catch (error) {
        console.error(`Failed to process file ${file.name}:`, error);
        // Continue processing other files even if one fails
      }
    }
    
    return results;
  }

  getFileTypeDescription(fileType: string): string {
    switch (fileType) {
      case 'application/pdf':
        return 'PDF Document';
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      case 'application/msword':
        return 'Word Document';
      case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      case 'application/vnd.ms-excel':
        return 'Excel Spreadsheet';
      case 'text/csv':
        return 'CSV File';
      case 'text/plain':
        return 'Text File';
      case 'text/markdown':
        return 'Markdown File';
      case 'application/json':
        return 'JSON File';
      default:
        if (fileType.startsWith('image/')) {
          return 'Image';
        }
        return 'Unknown';
    }
  }
}

export default EnhancedFileService;
