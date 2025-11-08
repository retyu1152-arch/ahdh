

import React, { useState } from 'react';
import { geminiService } from '../services/geminiService';
import type { DailyPlan, Goal } from '../types';
import { Icons } from './Icons';

interface DailySummaryProps {
    dailyPlans: DailyPlan[];
    goal: Goal | null;
}

export const DailySummary: React.FC<DailySummaryProps> = ({ dailyPlans, goal }) => {
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const getLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const generateSummary = async () => {
    setIsLoading(true);
    const todayStr = getLocalDateString(new Date());
    
    const todaysPlan = dailyPlans.find(plan => plan.date === todayStr);

    if (!goal) {
        setSummary("Set a goal first to get a personalized summary!");
    } else if (todaysPlan) {
        const generatedSummary = await geminiService.generateDailySummary(todaysPlan, goal);
        setSummary(generatedSummary);
    } else {
        setSummary("No tasks were planned for today, so there's no summary to generate. Let's get a plan for tomorrow!");
    }
    
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-xl font-bold mb-4 dark:text-gray-100">Daily Summary</h2>
      
      {summary && !isLoading ? (
        <div className="bg-indigo-50 p-4 rounded-lg text-indigo-800 space-y-3 dark:bg-indigo-900/30 dark:text-indigo-200">
          <p>{summary}</p>
          <button onClick={() => setSummary(null)} className="text-sm font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
            Generate again
          </button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
            <Icons.sun className="h-12 w-12 text-yellow-400 mb-4" />
            <p className="text-gray-500 dark:text-gray-400 mb-4">Generate a summary of your day's accomplishments.</p>
            <button
                onClick={generateSummary}
                disabled={isLoading}
                className="px-5 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition flex items-center gap-2 disabled:bg-indigo-300"
            >
                {isLoading ? (
                <>
                    <Icons.loader className="animate-spin h-5 w-5" />
                    Generating...
                </>
                ) : (
                <>
                    <Icons.sparkles className="h-5 w-5" />
                    Generate
                </>
                )}
            </button>
        </div>
      )}
    </div>
  );
};
