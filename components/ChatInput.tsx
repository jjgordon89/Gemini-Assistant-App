
import React, { useState, useRef } from 'react';
import { SendIcon, LoadingSpinnerIcon, PaperclipIcon, XCircleIcon } from './icons/ChromaIcons';
import { UploadedFileData } from '../types'; // To display file name

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  onFileChange: (file: File | null) => void; // Callback for when a file is selected or cleared
  uploadedFileData: UploadedFileData | null; // To display selected file info
}

export const ChatInput: React.FC<ChatInputProps> = ({ 
  onSendMessage, 
  isLoading,
  onFileChange,
  uploadedFileData 
}) => {
  const [inputValue, setInputValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Allow sending message even if only a file is attached and text is empty,
    // or if text is present.
    if ((inputValue.trim() || uploadedFileData) && !isLoading) {
      onSendMessage(inputValue);
      setInputValue('');
      // File clearing is handled by App.tsx after message is sent
    }
  };

  const handleFileIconClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileChange(file);
    }
     // Reset file input value so that selecting the same file again triggers onChange
    if(event.target) {
        event.target.value = '';
    }
  };

  const handleClearFile = () => {
    onFileChange(null);
     if (fileInputRef.current) {
      fileInputRef.current.value = ''; // Clear the actual file input
    }
  };

  return (
    <div className="p-4 border-t border-purple-900/50 bg-black/30 backdrop-blur-sm">
      {uploadedFileData && (
        <div className="mb-2 flex items-center justify-between text-sm text-purple-300 bg-purple-900/30 p-2 rounded-md">
          <span className="truncate">
            <PaperclipIcon className="w-4 h-4 inline mr-2 flex-shrink-0" />
            {uploadedFileData.name}
          </span>
          <button
            onClick={handleClearFile}
            className="p-1 text-purple-300 hover:text-red-400 disabled:opacity-50"
            disabled={isLoading}
            aria-label="Clear selected file"
          >
            <XCircleIcon className="w-5 h-5" />
          </button>
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex items-center space-x-3">
        <button
          type="button"
          onClick={handleFileIconClick}
          disabled={isLoading}
          className="p-3 text-purple-400 hover:text-purple-200 rounded-full hover:bg-purple-700/50 disabled:opacity-50 transition-colors"
          aria-label="Attach file"
        >
          <PaperclipIcon className="w-6 h-6" />
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelected}
          className="hidden"
          // Consider adding an 'accept' attribute for specific file types
          // e.g., accept=".txt,.pdf,.md,image/*"
        />
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Type your message or describe the file..."
          className="flex-grow p-3 bg-gray-800/50 border border-purple-700/60 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-white placeholder-gray-400 transition-all duration-200 ease-in-out"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || (!inputValue.trim() && !uploadedFileData)}
          className="p-3 bg-gradient-to-br from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900"
        >
          {isLoading ? <LoadingSpinnerIcon className="w-6 h-6 animate-spin" /> : <SendIcon className="w-6 h-6" />}
        </button>
      </form>
    </div>
  );
};