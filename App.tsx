
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { type Chat } from '@google/genai';
import { Message, MessageRole, Emotion } from './types';
import { DEFAULT_SYSTEM_INSTRUCTION } from './constants';
import { createChatSession, analyzeEmotion } from './services/geminiService';
import { ChatMessage } from './components/ChatMessage';
import { SendIcon, SettingsIcon, EmotionIcon } from './components/icons';

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [systemInstruction, setSystemInstruction] = useState<string>(DEFAULT_SYSTEM_INSTRUCTION);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentInput, setCurrentInput] = useState<string>('');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [currentEmotion, setCurrentEmotion] = useState<Emotion>('neutral');
  
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const initializeChat = useCallback(() => {
    try {
      const storedInstruction = localStorage.getItem('serikat_instruction');
      const instruction = storedInstruction || DEFAULT_SYSTEM_INSTRUCTION;
      setSystemInstruction(instruction);

      const storedMessages = localStorage.getItem('serikat_messages');
      const initialMessages: Message[] = storedMessages ? JSON.parse(storedMessages) : [];
      setMessages(initialMessages);

      const history = initialMessages
        .filter(m => m.role === MessageRole.USER || m.role === MessageRole.MODEL)
        .map(m => ({
          role: m.role as 'user' | 'model',
          parts: [{ text: m.text }],
        }));

      const session = createChatSession(instruction, history);
      setChatSession(session);

      if (initialMessages.length === 0) {
        setMessages([{
          id: 'initial-greeting',
          role: MessageRole.MODEL,
          text: 'Hello! I am Serikat. I\'m ready to listen, learn, and be your friend. What\'s on your mind?',
          emotion: 'happy'
        }]);
      } else {
         const lastModelMessage = [...initialMessages].reverse().find(m => m.role === MessageRole.MODEL);
         if(lastModelMessage && lastModelMessage.emotion) {
            setCurrentEmotion(lastModelMessage.emotion);
         }
      }
    } catch (error) {
      console.error("Failed to initialize chat session:", error);
      // Handle error gracefully, maybe show a message to the user
    }
  }, []);

  useEffect(() => {
    initializeChat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
    if (messages.length > 0) {
      localStorage.setItem('serikat_messages', JSON.stringify(messages));
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!currentInput.trim() || !chatSession || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: MessageRole.USER,
      text: currentInput.trim(),
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentInput('');
    setIsLoading(true);

    try {
      const stream = await chatSession.sendMessageStream({ message: userMessage.text });
      
      let modelResponseText = '';
      const modelMessageId = Date.now().toString() + '-model';

      setMessages(prev => [...prev, { id: modelMessageId, role: MessageRole.MODEL, text: '', emotion: 'neutral' }]);

      for await (const chunk of stream) {
        modelResponseText += chunk.text;
        setMessages(prev => prev.map(m => m.id === modelMessageId ? { ...m, text: modelResponseText } : m));
      }

      const finalEmotion = await analyzeEmotion(modelResponseText);
      setCurrentEmotion(finalEmotion);

      setMessages(prev => prev.map(m => m.id === modelMessageId ? { ...m, emotion: finalEmotion } : m));

    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: Message = {
        id: Date.now().toString() + '-error',
        role: MessageRole.SYSTEM,
        text: 'Sorry, something went wrong. Please try again.',
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = () => {
    localStorage.setItem('serikat_instruction', systemInstruction);
    setIsSettingsOpen(false);
    
    // Reset chat with new personality
    const systemMessage: Message = {
        id: Date.now().toString() + '-system',
        role: MessageRole.SYSTEM,
        text: 'My core personality has been updated. Let\'s start fresh with my new perspective.',
    };
    
    setMessages(prev => [...prev, systemMessage]);

    const newSession = createChatSession(systemInstruction, []); // Start with fresh history for new personality
    setChatSession(newSession);
  };
  
  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Settings Panel */}
      <div className={`absolute top-0 left-0 h-full bg-gray-900/80 backdrop-blur-sm z-20 p-6 transition-transform duration-300 ${isSettingsOpen ? 'translate-x-0' : '-translate-x-full'} w-full md:w-1/3 border-r border-gray-700 flex flex-col`}>
        <h2 className="text-2xl font-bold text-cyan-400 mb-4">Serikat's Personality Core</h2>
        <p className="text-gray-400 mb-4 text-sm">This is the system instruction that defines my personality and behavior. You can modify it to help me evolve.</p>
        <textarea
          value={systemInstruction}
          onChange={(e) => setSystemInstruction(e.target.value)}
          className="w-full flex-grow bg-gray-800 border border-gray-600 rounded-lg p-3 text-gray-300 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
        />
        <div className="mt-4 flex gap-4">
            <button onClick={handleSaveSettings} className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                Save & Reboot
            </button>
            <button onClick={() => setIsSettingsOpen(false)} className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                Cancel
            </button>
        </div>
      </div>

      {/* Main Chat */}
      <div className="flex flex-col flex-1 h-full">
        <header className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800/50">
          <div className="flex items-center gap-4">
            <EmotionIcon emotion={currentEmotion} className="w-10 h-10 transition-all"/>
            <div>
                <h1 className="text-xl font-bold">Serikat AI</h1>
                <p className="text-sm text-gray-400 capitalize">{currentEmotion} state</p>
            </div>
          </div>
          <button onClick={() => setIsSettingsOpen(true)} className="p-2 rounded-full hover:bg-gray-700 transition-colors">
            <SettingsIcon />
          </button>
        </header>

        <main ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
          {isLoading && (
            <div className="flex items-start gap-4 my-6">
                <EmotionIcon emotion="thoughtful" className="w-10 h-10 animate-pulse"/>
                <div className="w-full p-4 rounded-xl bg-gray-800">
                    <div className="h-4 w-1/4 bg-gray-700 rounded animate-pulse"></div>
                </div>
            </div>
          )}
        </main>

        <footer className="p-4 bg-gray-900/80 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center bg-gray-800 rounded-lg p-2 border border-gray-700 focus-within:ring-2 focus-within:ring-cyan-500">
              <input
                type="text"
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Talk to Serikat..."
                className="flex-1 bg-transparent text-white placeholder-gray-500 focus:outline-none px-4"
                disabled={isLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={isLoading || !currentInput.trim()}
                className="p-3 bg-cyan-600 rounded-md text-white disabled:bg-gray-600 disabled:cursor-not-allowed hover:bg-cyan-700 transition-colors"
              >
                <SendIcon />
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default App;
