// Hook for Enhanced File Service
import { useState, useCallback, useMemo } from 'react';
import { EnhancedFileService, FileProcessingResult } from '../services/enhancedFileService';

export interface UseEnhancedFileServiceReturn {
  enhancedFileService: EnhancedFileService;
  processFile: (file: File) => Promise<FileProcessingResult>;
  processFiles: (files: File[]) => Promise<FileProcessingResult[]>;
  isFileSupported: (file: File) => boolean;
  getSupportedFormats: () => string[];
  getFileTypeDescription: (fileType: string) => string;
  isProcessing: boolean;
  error: string | null;
}

export const useEnhancedFileService = (): UseEnhancedFileServiceReturn => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create singleton instance
  const enhancedFileService = useMemo(() => new EnhancedFileService(), []);

  const processFile = useCallback(async (file: File): Promise<FileProcessingResult> => {
    setIsProcessing(true);
    setError(null);
    
    try {
      const result = await enhancedFileService.processFile(file);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [enhancedFileService]);

  const processFiles = useCallback(async (files: File[]): Promise<FileProcessingResult[]> => {
    setIsProcessing(true);
    setError(null);
    
    try {
      const results = await enhancedFileService.processFiles(files);
      return results;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [enhancedFileService]);

  const isFileSupported = useCallback((file: File): boolean => {
    return enhancedFileService.isFileSupported(file);
  }, [enhancedFileService]);

  const getSupportedFormats = useCallback((): string[] => {
    return enhancedFileService.getSupportedFormats();
  }, [enhancedFileService]);

  const getFileTypeDescription = useCallback((fileType: string): string => {
    return enhancedFileService.getFileTypeDescription(fileType);
  }, [enhancedFileService]);

  return {
    enhancedFileService,
    processFile,
    processFiles,
    isFileSupported,
    getSupportedFormats,
    getFileTypeDescription,
    isProcessing,
    error
  };
};

export default useEnhancedFileService;
