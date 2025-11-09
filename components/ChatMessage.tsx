import React from 'react';
import type { Message } from '../types';

interface ChatMessageProps {
  message: Message;
}

const BotIcon: React.FC = () => (
    <div className="w-8 h-8 rounded-full bg-gray-800 flex-shrink-0 flex items-center justify-center">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-teal-400">
        <path fillRule="evenodd" d="M9 4.5a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0V5.25A.75.75 0 019 4.5zm5.854 1.854a.75.75 0 00-1.06-1.06l-1.061 1.06a.75.75 0 001.06 1.06l1.06-1.06zM12 7.5a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0V8.25A.75.75 0 0112 7.5zM7.146 6.354a.75.75 0 00-1.06-1.06L4.25 7.146a.75.75 0 101.06 1.06l1.836-1.852zM4.5 9a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0V9.75A.75.75 0 014.5 9zm1.854 5.854a.75.75 0 00-1.06-1.06l-1.06 1.06a.75.75 0 001.06 1.06l1.06-1.06zM15 12a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0115 12zm-2.854 1.146a.75.75 0 00-1.06-1.06l-1.836 1.852a.75.75 0 101.06 1.06l1.836-1.852zM18 9a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0V9.75A.75.75 0 0118 9zm1.146-2.646a.75.75 0 00-1.06-1.06l-1.836 1.852a.75.75 0 101.06 1.06l1.836-1.852z" clipRule="evenodd" />
      </svg>
    </div>
);

const UserIcon: React.FC = () => (
     <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-teal-500 to-green-500 flex-shrink-0 flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
          <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
        </svg>
    </div>
);


const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isBot = message.sender === 'bot';

  const containerClasses = isBot ? 'flex justify-start items-end gap-3' : 'flex justify-end items-end gap-3';
  const bubbleClasses = isBot 
    ? 'bg-gray-800 text-gray-200 p-4 rounded-tr-2xl rounded-bl-2xl rounded-br-2xl'
    : 'bg-teal-600 text-white p-4 rounded-tl-2xl rounded-bl-2xl rounded-br-2xl';

  return (
    <div className={containerClasses}>
      {isBot && <BotIcon />}
      <div className={`${bubbleClasses} max-w-sm md:max-w-md lg:max-w-lg break-words`}>
        <p className="whitespace-pre-wrap">{message.text}</p>
      </div>
       {!isBot && <UserIcon />}
    </div>
  );
};

export default ChatMessage;