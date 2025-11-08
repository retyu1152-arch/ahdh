
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { geminiService } from '../services/geminiService';
import type { FocusSession } from '../types';
import { Icons } from './Icons';

interface FocusViewProps {
    focusSessions: FocusSession[];
    setFocusSessions: (value: React.SetStateAction<FocusSession[]>) => void;
}

export const FocusView: React.FC<FocusViewProps> = ({ focusSessions, setFocusSessions }) => {
  const [duration, setDuration] = useState(25); // in minutes
  const [sessionState, setSessionState] = useState<'idle' | 'working' | 'break'>('idle');
  const [remainingTime, setRemainingTime] = useState(duration * 60); // in seconds
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const timerRef = useRef<number | null>(null);
  const sessionStartRef = useRef<number | null>(null);

  const saveSession = useCallback((startTime: number, completed: boolean) => {
    const elapsedMs = Date.now() - startTime;
    // Save only if more than a minute has passed
    if (elapsedMs < 60000) return;

    const newSession: FocusSession = {
      id: crypto.randomUUID(),
      startTime: startTime,
      duration: Math.round(elapsedMs / 60000),
      completed: completed,
    };
    setFocusSessions(prev => [newSession, ...prev]);
  }, [setFocusSessions]);

  const handleSessionEnd = useCallback(async () => {
    if (sessionStartRef.current) {
      saveSession(sessionStartRef.current, true);
    }
    setSessionState('break');
    setIsLoading(true);
    const suggestion = await geminiService.getRestSuggestion();
    setAiSuggestion(suggestion);
    setIsLoading(false);
  }, [saveSession]);

  useEffect(() => {
    if (sessionState === 'working') {
      timerRef.current = window.setInterval(() => {
        setRemainingTime(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            handleSessionEnd();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [sessionState, handleSessionEnd]);
  
  useEffect(() => {
    // Update timer if duration changes while idle
    if (sessionState === 'idle') {
      setRemainingTime(duration * 60);
    }
  }, [duration, sessionState]);

  const handleStart = () => {
    sessionStartRef.current = Date.now();
    setRemainingTime(duration * 60);
    setSessionState('working');
  };

  const handleStop = () => {
    if (sessionStartRef.current) {
      saveSession(sessionStartRef.current, false);
    }
    setSessionState('idle');
    setRemainingTime(duration * 60);
  };
  
  const handleReset = () => {
    setAiSuggestion(null);
    setSessionState('idle');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };
  
  const presetDurations = [15, 25, 45, 60];
  const progress = (duration * 60 - remainingTime) / (duration * 60);

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-16 md:pb-0">
      <header>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50">Focus Session</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          {sessionState === 'idle' && 'Set a timer and find your flow.'}
          {sessionState === 'working' && 'Stay focused. You can do this!'}
          {sessionState === 'break' && 'Great work! Time for a short break.'}
        </p>
      </header>

      <div className="bg-white/80 backdrop-blur-sm p-6 sm:p-8 rounded-2xl shadow-lg border border-gray-200/50 dark:bg-gray-800/80 dark:border-gray-700/50">
        {sessionState === 'break' ? (
          <div className="text-center space-y-6 my-8 animate-fade-in">
             <Icons.sparkles className="h-16 w-16 mx-auto text-yellow-500" />
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Session Complete!</h2>
            <div className="bg-indigo-50 dark:bg-indigo-900/30 p-4 rounded-lg">
              <h3 className="font-semibold text-indigo-800 dark:text-indigo-200 mb-2">Your break suggestion:</h3>
               {isLoading ? (
                  <div className="h-6 bg-indigo-200 dark:bg-indigo-800/50 rounded-md animate-pulse w-3/4 mx-auto"></div>
               ) : (
                  <p className="text-indigo-700 dark:text-indigo-300">{aiSuggestion}</p>
               )}
            </div>
            <button
                onClick={handleReset}
                className="w-full px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition"
              >
                Start New Session
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="relative w-48 h-48 mx-auto flex items-center justify-center">
              <svg className="absolute inset-0" viewBox="0 0 100 100">
                <circle className="text-gray-200 dark:text-gray-700" strokeWidth="5" stroke="currentColor" fill="transparent" r="45" cx="50" cy="50" />
                <circle
                  className="text-indigo-600"
                  strokeWidth="5"
                  strokeDasharray={2 * Math.PI * 45}
                  strokeDashoffset={(2 * Math.PI * 45) * (1 - progress)}
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="transparent"
                  r="45" cx="50" cy="50"
                  transform="rotate(-90 50 50)"
                  style={{ transition: 'stroke-dashoffset 1s linear' }}
                />
              </svg>
              <span className="text-5xl font-bold font-mono text-gray-800 dark:text-gray-100">{formatTime(remainingTime)}</span>
            </div>

            <div className="space-y-4">
              <label htmlFor="duration-input" className="block text-lg font-semibold text-gray-800 dark:text-gray-100 text-center">
                Set Focus Duration (minutes)
              </label>
              <div className="flex items-center justify-center gap-2">
                {presetDurations.map(d => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    disabled={sessionState === 'working'}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 ${
                      duration === d && sessionState !== 'working'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    {d}m
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex flex-col gap-3 pt-4">
              {sessionState === 'idle' ? (
                <button
                  onClick={handleStart}
                  className="w-full px-6 py-4 bg-indigo-600 text-white font-bold text-lg rounded-lg shadow-lg hover:bg-indigo-700 transition transform hover:scale-105"
                >
                  Start Focus Session
                </button>
              ) : (
                 <button
                  onClick={handleStop}
                  className="w-full px-6 py-3 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 transition"
                >
                  End Session Early
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Session History</h2>
        <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-gray-200/50 dark:bg-gray-800/80 dark:border-gray-700/50">
          {focusSessions && focusSessions.length > 0 ? (
            <ul className="space-y-4">
              {focusSessions.slice(0, 10).map((session) => (
                <li key={session.id} className="flex items-center justify-between p-4 bg-gray-50/70 rounded-lg border border-gray-200/80 transition-shadow hover:shadow-md dark:bg-gray-800/70 dark:border-gray-700/80 dark:hover:shadow-indigo-500/10">
                  <div className="flex items-center gap-4">
                    {session.completed ? (
                      <Icons.checkCircle className="h-6 w-6 text-green-500 flex-shrink-0" />
                    ) : (
                      <Icons.xCircle className="h-6 w-6 text-red-500 flex-shrink-0" />
                    )}
                    <div>
                      <p className="font-semibold text-gray-800 dark:text-gray-200">
                        {session.duration} minute session
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(session.startTime).toLocaleString(undefined, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                    session.completed
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
                  }`}>
                    {session.completed ? 'Completed' : 'Ended Early'}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-8">
              <Icons.timer className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-gray-500 dark:text-gray-400 font-medium">No sessions recorded yet</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Your completed sessions will appear here.</p>
            </div>
          )}
        </div>
      </div>
      
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
      `}</style>
    </div>
  );
};
