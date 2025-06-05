// Enhanced Features Demo Component
// Demonstrates the integration of enhanced file processing, AI providers, and advanced RAG
import React, { useState } from 'react';
import { useEnhancedFileService } from '../hooks/useEnhancedFileService';
import { useAIProvider } from '../hooks/useAIProvider';
import { AdvancedRAGService } from '../services/advancedRAGService';
import { FileProcessingResult } from '../services/enhancedFileService';

interface DemoResults {
  fileProcessing?: FileProcessingResult[];
  ragResults?: any[];
  aiResponse?: string;
}

export const EnhancedFeaturesDemo: React.FC = () => {
  const [results, setResults] = useState<DemoResults>({});
  const [loading, setLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  
  const {
    processFiles,
    isFileSupported,
    getSupportedFormats,
    getFileTypeDescription,
    isProcessing,
    error: fileError
  } = useEnhancedFileService();
  const {
    selectedProvider,
    setSelectedProvider,
    handleApiKeyChange,
    aiProviderService,
    error: aiError
  } = useAIProvider(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(files);
  };

  const runDemo = async () => {
    if (selectedFiles.length === 0) {
      alert('Please select files first');
      return;
    }

    setLoading(true);
    setResults({});

    try {
      // 1. Process files with enhanced service
      console.log('Processing files with enhanced service...');
      const fileResults = await processFiles(selectedFiles);
      setResults(prev => ({ ...prev, fileProcessing: fileResults }));

      // 2. Use Advanced RAG for chunking and search
      console.log('Testing Advanced RAG...');
      const ragService = AdvancedRAGService.getInstance();
      
      for (const result of fileResults) {
        const chunks = ragService.chunkText(result.text, result.metadata.filename, {
          maxChunkSize: 500,
          overlap: 50,
          strategy: 'sentence',
          preserveStructure: true
        });
        console.log(`Created ${chunks.length} chunks for ${result.metadata.filename}`);
      }

      // Example search
      const searchResults = ragService.searchChunks('important information', undefined, 3);
      setResults(prev => ({ ...prev, ragResults: searchResults }));

      // 3. Test AI provider integration
      if (aiProviderService) {
        console.log('Testing AI provider...');
        const query = `Based on the uploaded files, provide a summary of the content.`;
        const context = fileResults.map(r => r.text).join('\n\n');
        const aiResponse = await aiProviderService.sendMessage(query, context);
        setResults(prev => ({ ...prev, aiResponse }));
      }

    } catch (error) {
      console.error('Demo error:', error);
      alert(`Demo failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const supportedFormats = getSupportedFormats();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Enhanced Features Demo</h1>
      
      {/* File Upload Section */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-3">1. Enhanced File Processing</h2>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
          <input
            type="file"
            multiple
            onChange={handleFileChange}
            className="mb-2"
            accept={supportedFormats.join(',')}
          />
          <p className="text-sm text-gray-600">
            Supported formats: {supportedFormats.map(format => getFileTypeDescription(format)).join(', ')}
          </p>
          {selectedFiles.length > 0 && (
            <div className="mt-2">
              <p className="font-medium">Selected files:</p>
              <ul className="list-disc list-inside">
                {selectedFiles.map((file, index) => (
                  <li key={index} className="text-sm">
                    {file.name} ({getFileTypeDescription(file.type)}) - 
                    {isFileSupported(file) ? ' ✅ Supported' : ' ❌ Not supported'}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* AI Provider Section */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-3">2. AI Provider Selection</h2>
        <div className="flex gap-4 mb-3">
          {['OPENAI', 'GROQ', 'HUGGINGFACE', 'OPENROUTER'].map(provider => (
            <button
              key={provider}
              onClick={() => setSelectedProvider(provider as any)}
              className={`px-3 py-1 rounded ${
                selectedProvider === provider 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              {provider}
            </button>
          ))}
        </div>
        {selectedProvider && (
          <input
            type="password"
            placeholder={`Enter ${selectedProvider} API Key`}
            onChange={(e) => handleApiKeyChange(selectedProvider, e.target.value)}
            className="w-full px-3 py-2 border rounded"
          />
        )}
      </div>

      {/* Demo Button */}
      <button
        onClick={runDemo}
        disabled={loading || isProcessing || selectedFiles.length === 0}
        className="bg-green-500 text-white px-6 py-2 rounded disabled:bg-gray-400"
      >
        {loading || isProcessing ? 'Running Demo...' : 'Run Enhanced Features Demo'}
      </button>

      {/* Errors */}
      {(fileError || aiError) && (
        <div className="mt-4 p-3 bg-red-100 border border-red-400 rounded">
          <p className="text-red-700">Error: {fileError || aiError}</p>
        </div>
      )}

      {/* Results */}
      {Object.keys(results).length > 0 && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-3">Demo Results</h2>
          
          {/* File Processing Results */}
          {results.fileProcessing && (
            <div className="mb-4">
              <h3 className="text-lg font-medium mb-2">File Processing Results:</h3>
              <div className="space-y-2">
                {results.fileProcessing.map((result, index) => (
                  <div key={index} className="border rounded p-3">
                    <p className="font-medium">{result.metadata.filename}</p>
                    <p className="text-sm text-gray-600">
                      Type: {result.metadata.fileType} | Size: {result.metadata.size} bytes
                      {result.metadata.pages && ` | Pages: ${result.metadata.pages}`}
                    </p>
                    <p className="text-sm mt-1">
                      Extracted text: {result.text.substring(0, 200)}
                      {result.text.length > 200 ? '...' : ''}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* RAG Results */}
          {results.ragResults && (
            <div className="mb-4">
              <h3 className="text-lg font-medium mb-2">Advanced RAG Search Results:</h3>
              <div className="space-y-2">
                {results.ragResults.map((result, index) => (
                  <div key={index} className="border rounded p-3">
                    <p className="font-medium">Score: {result.score.toFixed(3)}</p>
                    <p className="text-sm text-gray-600">{result.relevanceReason}</p>
                    <p className="text-sm mt-1">
                      {result.chunk.text.substring(0, 150)}...
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Response */}
          {results.aiResponse && (
            <div className="mb-4">
              <h3 className="text-lg font-medium mb-2">AI Provider Response:</h3>
              <div className="border rounded p-3 bg-gray-50">
                <p>{results.aiResponse}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EnhancedFeaturesDemo;
