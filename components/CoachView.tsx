

import React, { useState, useRef, useEffect } from 'react';
import { geminiService, CoachContext } from '../services/geminiService';
import type { ChatMessage, DailyPlan, FocusSession } from '../types';
import { Icons } from './Icons';

// A simple indicator to show when the AI is processing the request.
const ThinkingIndicator = () => (
    <div className="flex items-center gap-1.5 px-2">
      <span className="h-1.5 w-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
      <span className="h-1.5 w-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
      <span className="h-1.5 w-1.5 bg-gray-500 rounded-full animate-bounce"></span>
    </div>
);

// A component to render markdown with a character-by-character typing animation.
const SimpleMarkdown: React.FC<{ text: string }> = React.memo(({ text }) => {
    const [displayedText, setDisplayedText] = useState('');
    const typingSpeed = 20; // Lower is faster

    useEffect(() => {
        if (displayedText.length < text.length) {
            const timeoutId = setTimeout(() => {
                setDisplayedText(text.slice(0, displayedText.length + 1));
            }, typingSpeed);
            return () => clearTimeout(timeoutId);
        }
    }, [displayedText, text]);

    const cursor = displayedText.length < text.length ? '<span class="blinking-cursor">|</span>' : '';
    const html = displayedText
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
        .replace(/\*(.*?)\*/g, '<em>$1</em>')       // Italic
        .replace(/`([^`]+)`/g, '<code>$1</code>')     // Inline code
        .replace(/\n/g, '<br />');                   // Newlines

    return <div className="prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: html + cursor }} />;
});

const getLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

interface CoachViewProps {
    dailyPlans: DailyPlan[];
    history: ChatMessage[];
    setHistory: (value: React.SetStateAction<ChatMessage[]>) => void;
    focusSessions: FocusSession[];
}

export const CoachView: React.FC<CoachViewProps> = ({ dailyPlans, history, setHistory, focusSessions }) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [history, isThinking]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', parts: [{ text: input }] };
    setHistory(currentHistory => [...currentHistory, userMessage]);

    setInput('');
    setIsLoading(true);
    setIsThinking(true);

    try {
      const todayStr = getLocalDateString(new Date());
      const todaysPlan = dailyPlans.find(p => p.date === todayStr);

      const context: CoachContext = {
        tasks: {
            total: todaysPlan?.tasks.length || 0,
            completed: todaysPlan?.tasks.filter(t => t.completed).length || 0,
        },
        lastSession: focusSessions.length > 0 ? focusSessions[0] : null,
      };

      const stream = await geminiService.streamCoachResponse([...history, userMessage], context);
      
      let fullResponse = '';
      let firstChunk = true;
      for await (const chunk of stream) {
        if (firstChunk) {
            setIsThinking(false);
            setHistory(prev => [...prev, { role: 'model', parts: [{ text: '' }] }]);
            firstChunk = false;
        }

        const chunkText = chunk.text;
        fullResponse += chunkText;
        
        setHistory(prev => {
            const newHistory = [...prev];
            if (newHistory.length > 0 && newHistory[newHistory.length - 1].role === 'model') {
              newHistory[newHistory.length - 1].parts[0].text = fullResponse;
            }
            return newHistory;
        });
      }
    } catch (error) {
      console.error("Failed to get response from coach:", error);
      const errorMessage: ChatMessage = { role: 'model', parts: [{ text: "Sorry, I'm having trouble connecting. Please try again." }] };
      setHistory(prev => {
          const newHistory = [...prev];
          if (!isThinking && newHistory.length > 0 && newHistory[newHistory.length-1].role === 'model') {
              newHistory[newHistory.length-1] = errorMessage;
          } else {
              newHistory.push(errorMessage);
          }
          return newHistory;
      });
    } finally {
      setIsLoading(false);
      setIsThinking(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto pb-24 md:pb-0">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50">AI Coach</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Your personal guide to navigating ADHD challenges.</p>
      </header>
      
      <div className="flex-1 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:bg-gray-800/80 dark:border-gray-700/50 flex flex-col overflow-hidden">
        <div className="flex-1 p-6 space-y-4 overflow-y-auto">
          {history.length === 0 && !isThinking && (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400">
                <Icons.megamind className="h-16 w-16 mb-4 text-indigo-300 dark:text-indigo-600/50" />
                <h2 className="text-xl font-semibold">Hello! I'm FocusFlow.</h2>
                <p>How can I help you be more productive today?</p>
            </div>
          )}
          {history.map((msg, index) => (
            <div key={index} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'model' && <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center flex-shrink-0"><Icons.sparkles className="h-5 w-5 text-white" /></div>}
              <div
                className={`p-4 rounded-2xl max-w-lg ${
                  msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                }`}
              >
                {msg.role === 'user' 
                    ? msg.parts[0].text 
                    : <SimpleMarkdown text={msg.parts[0].text} />
                }
              </div>
            </div>
          ))}
          {isThinking && (
              <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <Icons.sparkles className="h-5 w-5 text-white" />
                  </div>
                  <div className="p-4 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center">
                      <ThinkingIndicator />
                  </div>
              </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="p-4 bg-white/50 dark:bg-gray-900/50 border-t border-gray-200/80 dark:border-gray-700/80">
          <div className="flex items-center gap-4">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask for advice or a tip..."
              className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="p-3 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 transition disabled:bg-indigo-300 disabled:cursor-not-allowed"
            >
              <Icons.send className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>
       <style>{`
        @keyframes blink {
          50% { opacity: 0; }
        }
        .blinking-cursor {
          font-weight: 600;
          animation: blink 1s step-end infinite;
          display: inline-block;
          margin-left: 2px;
          transform: translateY(-1px);
        }
        .dark .prose-invert {
            --tw-prose-body: theme(colors.gray.300);
            --tw-prose-headings: theme(colors.gray.100);
            --tw-prose-lead: theme(colors.gray.400);
            --tw-prose-links: theme(colors.indigo.400);
            --tw-prose-bold: theme(colors.white);
            --tw-prose-counters: theme(colors.gray.400);
            --tw-prose-bullets: theme(colors.gray.600);
            --tw-prose-hr: theme(colors.gray.700);
            --tw-prose-quotes: theme(colors.gray.100);
            --tw-prose-quote-borders: theme(colors.gray.700);
            --tw-prose-captions: theme(colors.gray.400);
            --tw-prose-code: theme(colors.white);
            --tw-prose-pre-code: theme(colors.gray.300);
            --tw-prose-pre-bg: theme(colors.gray.800);
            --tw-prose-th-borders: theme(colors.gray.600);
            --tw-prose-td-borders: theme(colors.gray.700);
        }
        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
            animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
          }
          50% {
            transform: translateY(-25%);
            animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
          }
        }
      `}</style>
    </div>
  );
};
