// services/fileService.ts
import * as pdfjsLib from 'pdfjs-dist';

// Configure the worker source for pdfjs-dist
// The import map in index.html will resolve this path to the correct esm.sh URL.
// Ensure the version in the import map for 'pdfjs-dist/build/pdf.worker.mjs' is consistent
// with the main 'pdfjs-dist' library version.
pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdfjs-dist/build/pdf.worker.mjs';


export interface ProcessedFileData {
  name: string;
  type: string; // MIME type
  base64Data: string;
  extractedText?: string;
}

const readFileAsBase64 = (file: File): Promise<string> => {
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
};

const extractTextFromFile = (file: File): Promise<string> => {
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
};


const extractTextFromPdf = async (fileData: ArrayBuffer): Promise<string> => {
  try {
    const loadingTask = pdfjsLib.getDocument({ data: fileData });
    const pdf = await loadingTask.promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      fullText += textContent.items.map((item: any) => item.str).join(' ') + '\n';
    }
    return fullText;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error('Failed to extract text from PDF.');
  }
};

export const readFileContents = async (file: File): Promise<ProcessedFileData> => {
  const base64Data = await readFileAsBase64(file);
  let extractedText: string | undefined = undefined;

  if (file.type === 'application/pdf') {
    // For PDF, we need ArrayBuffer to pass to pdfjs
    const arrayBuffer = await file.arrayBuffer();
    try {
      extractedText = await extractTextFromPdf(arrayBuffer);
    } catch(e) {
        console.warn("Could not extract text from PDF, will send raw file if model supports it.", e)
        // extractedText will remain undefined
    }
  } else if (file.type.startsWith('text/')) {
    try {
        extractedText = await extractTextFromFile(file);
    } catch(e) {
        console.warn("Could not read text from file.", e);
    }
  }

  return {
    name: file.name,
    type: file.type,
    base64Data,
    extractedText,
  };
};