// Enhanced File Processing Service
// Supports multiple file formats including PDF, images, Word documents, and spreadsheets
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

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

// PDF Processor (integrating with existing functionality)
export class PDFProcessor implements FileProcessor {
  canProcess(fileType: string): boolean {
    return fileType === 'application/pdf';
  }

  async processFile(file: File): Promise<FileProcessingResult> {
    try {
      // Import PDF.js dynamically to avoid issues
      const pdfjsLib = await import('pdfjs-dist/build/pdf');
      
      // Configure worker
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdfjs-dist/build/pdf.worker.mjs';
      
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let extractedText = '';
      const numPages = pdf.numPages;
      
      // Extract text from all pages
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        extractedText += pageText + '\n';
      }
      
      return {
        text: extractedText.trim(),
        metadata: {
          filename: file.name,
          fileType: 'PDF',
          size: file.size,
          pages: numPages
        }
      };
    } catch (error) {
      throw new Error(`Failed to process PDF: ${error}`);
    }
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
    try {
      const arrayBuffer = await file.arrayBuffer();
      
      if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        // Process DOCX files
        const result = await mammoth.extractRawText({ arrayBuffer });
        return {
          text: result.value,
          metadata: {
            filename: file.name,
            fileType: 'Word Document',
            size: file.size
          }
        };
      } else if (file.type === 'application/msword') {
        // DOC files are not directly supported by mammoth, return error message
        return {
          text: `Legacy Word document format (.doc) is not supported. Please convert to .docx format.`,
          metadata: {
            filename: file.name,
            fileType: 'Word Document (Legacy)',
            size: file.size
          }
        };
      } else {
        throw new Error('Unsupported Word document format');
      }
    } catch (error) {
      throw new Error(`Failed to process Word document: ${error}`);
    }
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
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      let extractedText = `Spreadsheet: ${file.name}\n`;
      extractedText += `Worksheets: ${workbook.SheetNames.length}\n\n`;
      
      // Process each worksheet
      workbook.SheetNames.forEach((sheetName, index) => {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        extractedText += `Sheet ${index + 1}: ${sheetName}\n`;
        
        if (jsonData.length > 0) {
          // Add headers if they exist
          const headers = jsonData[0] as any[];
          if (headers && headers.length > 0) {
            extractedText += `Headers: ${headers.join(', ')}\n`;
          }
          
          // Add sample data (first few rows)
          const sampleRows = Math.min(5, jsonData.length);
          extractedText += `Data (${sampleRows} of ${jsonData.length} rows):\n`;
          
          for (let i = 0; i < sampleRows; i++) {
            const row = jsonData[i] as any[];
            if (row && row.length > 0) {
              extractedText += `Row ${i + 1}: ${row.join(' | ')}\n`;
            }
          }
        } else {
          extractedText += 'No data found in this sheet.\n';
        }
        
        extractedText += '\n';
      });
      
      return {
        text: extractedText,
        metadata: {
          filename: file.name,
          fileType: 'Spreadsheet',
          size: file.size
        }
      };
    } catch (error) {
      throw new Error(`Failed to process spreadsheet: ${error}`);
    }
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
