
import React from 'react';
import { Message, MessageRole } from '../types';
import { EmotionIcon, UserIcon } from './icons';

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isModel = message.role === MessageRole.MODEL;
  const isSystem = message.role === MessageRole.SYSTEM;

  if (isSystem) {
    return (
      <div className="text-center my-4">
        <p className="text-xs text-gray-500 italic px-4 py-1 bg-gray-800 rounded-full inline-block">{message.text}</p>
      </div>
    );
  }

  return (
    <div className={`flex items-start gap-4 my-6 ${!isModel && 'flex-row-reverse'}`}>
      <div className="flex-shrink-0">
        {isModel ? <EmotionIcon emotion={message.emotion || 'neutral'} /> : <UserIcon />}
      </div>
      <div className={`w-full p-4 rounded-xl ${isModel ? 'bg-gray-800' : 'bg-cyan-900/50'}`}>
        <p className="text-gray-200 whitespace-pre-wrap">{message.text}</p>
      </div>
    </div>
  );
};
