
import React from 'react';
import { Message, ChatRole } from '../types';
import { UserIcon, BotIcon, SystemIcon, LinkIcon } from './icons/ChromaIcons'; // Assuming you have these, added LinkIcon
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

  const textContent = message.streaming && message.text === '' && !message.toolCallInProgress ? (
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
            {message.sources && message.sources.length > 0 && (
              <div className="mt-3 pt-2 border-t border-purple-600/50">
                <h4 className="text-xs font-semibold text-purple-300 mb-1">Sources:</h4>
                <ul className="space-y-1">
                  {message.sources.map((source, index) => (
                    <li key={index} className="text-xs">
                      <a
                        href={source.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-purple-300 hover:text-purple-100 hover:underline break-all"
                        title={source.uri}
                      >
                        <LinkIcon className="w-3 h-3 mr-1.5 flex-shrink-0" />
                        {source.title || source.uri}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
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
