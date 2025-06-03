
import React from 'react';
import { Message, ChatRole } from '../types';
import { UserIcon, BotIcon, SystemIcon } from './icons/ChromaIcons'; // Assuming you have these
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';


interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.sender === ChatRole.USER;
  const Icon = isUser ? UserIcon : (message.sender === ChatRole.MODEL ? BotIcon : SystemIcon);

  const bubbleClasses = isUser
    ? 'bg-indigo-600/70 self-end rounded-l-xl rounded-tr-xl'
    : 'bg-purple-800/60 self-start rounded-r-xl rounded-tl-xl glassmorphism';

  const textContent = message.streaming && message.text === '' ? (
    <span className="italic text-gray-400">Generating response...</span>
  ) : (
    <div className="prose prose-sm prose-invert max-w-none break-words">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {message.text}
      </ReactMarkdown>
    </div>
  );

  return (
    <div className={`flex items-end w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
        <div className={`flex items-start max-w-xl lg:max-w-2xl p-1 ${isUser ? 'flex-row-reverse' : ''}`}>
        {!isUser && (
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center mr-2 mt-1 ring-2 ring-purple-500/50">
                <Icon className="w-5 h-5 text-white" />
            </div>
        )}
         <div className={`px-4 py-3 ${bubbleClasses} shadow-md`}>
            {textContent}
            <p className={`text-xs mt-2 ${isUser ? 'text-indigo-300' : 'text-purple-300'} opacity-70`}>
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
        </div>
        {isUser && (
             <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center ml-2 mt-1 ring-2 ring-indigo-400/50">
                <UserIcon className="w-5 h-5 text-white" />
            </div>
        )}
        </div>
    </div>
  );
};
