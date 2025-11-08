
import React, { useState } from 'react';
import { geminiService } from '../services/geminiService';
import type { Goal, DailyPlan, Task } from '../types';
import { Icons } from './Icons';

const getLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

interface GoalsViewProps {
    goal: Goal | null;
    setGoal: (goal: Goal | null) => void;
    setDailyPlans: React.Dispatch<React.SetStateAction<DailyPlan[]>>;
}

export const GoalsView: React.FC<GoalsViewProps> = ({ goal, setGoal, setDailyPlans }) => {
    const [goalInput, setGoalInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSetGoal = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!goalInput.trim()) return;

        setIsLoading(true);

        const strategy = await geminiService.generateGoalStrategy(goalInput.trim());

        const newGoal: Goal = {
            text: goalInput.trim(),
            strategy: strategy || "Let's do this one step at a time.",
            createdAt: Date.now(),
        };

        // FIX: Corrected the arguments passed to generateDailyTasks to match the expected type, as a new goal is on day 1 with no completed tasks.
        const tasksData = await geminiService.generateDailyTasks(newGoal, { dayNumber: 1, recentCompletedTasks: [] });

        if (tasksData && tasksData.length > 0) {
            setGoal(newGoal);

            const todayStr = getLocalDateString(new Date());
            const initialTasks: Task[] = tasksData.map(t => ({
                id: crypto.randomUUID(),
                text: t.text,
                priority: t.priority,
                category: t.category,
                completed: false,
                createdAt: Date.now()
            }));

            const firstPlan: DailyPlan = { date: todayStr, tasks: initialTasks };
            // Reset daily plans and start with this new one for the new goal
            setDailyPlans([firstPlan]);
        } else {
            // Handle case where task generation fails but we still want to set the goal
            setGoal(newGoal);
            setDailyPlans([]); // Clear plans as they are tied to the old goal
        }
        
        setIsLoading(false);
        setGoalInput('');
    };
    
    const handleResetGoal = () => {
        if (window.confirm("Are you sure you want to set a new goal? This will clear your current goal and all daily plans.")) {
            setGoal(null);
            setDailyPlans([]);
        }
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-16 md:pb-0">
            <header>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50">Your Goal</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">Define your main objective to get tailored daily tasks from your AI coach.</p>
            </header>

            <div className="bg-white/80 backdrop-blur-sm p-6 sm:p-8 rounded-2xl shadow-lg border border-gray-200/50 dark:bg-gray-800/80 dark:border-gray-700/50">
                {!goal ? (
                    <form onSubmit={handleSetGoal} className="space-y-4">
                        <div>
                            <label htmlFor="goal-input" className="block text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">What is your primary goal?</label>
                            <textarea
                                id="goal-input"
                                value={goalInput}
                                onChange={(e) => setGoalInput(e.target.value)}
                                placeholder="e.g., Learn Python in 30 days"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                                rows={3}
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition flex items-center justify-center gap-2 disabled:bg-indigo-300"
                        >
                            {isLoading ? (
                                <>
                                    <Icons.loader className="animate-spin h-5 w-5" />
                                    Generating Your First Tasks...
                                </>
                            ) : (
                                <>
                                    <Icons.sparkles className="h-5 w-5" />
                                    Set Goal & Get Today's Tasks
                                </>
                            )}
                        </button>
                    </form>
                ) : (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">Your Current Goal</h2>
                            <p className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-1">{goal.text}</p>
                        </div>
                        <div className="bg-indigo-50 dark:bg-indigo-900/30 p-4 rounded-lg">
                            <h3 className="font-bold text-lg text-indigo-800 dark:text-indigo-200 flex items-center gap-2">
                                <Icons.brainCircuit className="text-indigo-500" />
                                AI-Generated Strategy
                            </h3>
                            <p className="mt-2 text-indigo-700 dark:text-indigo-300">{goal.strategy}</p>
                        </div>
                        <button
                            onClick={handleResetGoal}
                            className="w-full mt-4 px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                        >
                            Set a New Goal
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
