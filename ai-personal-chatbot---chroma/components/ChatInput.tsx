
import React, { useState } from 'react';
import { SendIcon, LoadingSpinnerIcon } from './icons/ChromaIcons';

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  isLoading: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading }) => {
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isLoading) {
      onSendMessage(inputValue);
      setInputValue('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t border-purple-900/50 bg-black/30 backdrop-blur-sm">
      <div className="flex items-center space-x-3">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Type your message..."
          className="flex-grow p-3 bg-gray-800/50 border border-purple-700/60 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-white placeholder-gray-400 transition-all duration-200 ease-in-out"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !inputValue.trim()}
          className="p-3 bg-gradient-to-br from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900"
        >
          {isLoading ? <LoadingSpinnerIcon className="w-6 h-6 animate-spin" /> : <SendIcon className="w-6 h-6" />}
        </button>
      </div>
    </form>
  );
};
    