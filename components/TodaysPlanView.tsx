import React, { useState, useMemo } from 'react';
import type { DailyPlan, Task, Priority } from '../types';
import { Icons } from './Icons';

const getLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getPriorityClass = (priority?: Priority) => {
  switch (priority) {
    case 'High': return 'border-red-500';
    case 'Medium': return 'border-yellow-500';
    case 'Low': return 'border-blue-500';
    default: return 'border-gray-300 dark:border-gray-600';
  }
};

const TaskItem: React.FC<{ task: Task; onToggle: (id: string) => void; onDelete: (id: string) => void; }> = ({ task, onToggle, onDelete }) => (
    <li
      className={`relative list-none group ${task.isDeleting ? 'animate-fade-out-shrink' : 'animate-slide-in'} ${
        task.completed
          ? 'bg-green-50/70 dark:bg-green-900/20 opacity-70 dark:opacity-60'
          : 'bg-white dark:bg-gray-900/80 shadow-sm border border-gray-200/80 dark:border-gray-700/80 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600'
      } p-3 pl-5 rounded-lg transition-all duration-300`}
    >
      <div className={`absolute left-0 top-0 h-full w-1.5 transition-colors duration-300 rounded-l-lg ${task.completed ? 'bg-green-500' : getPriorityClass(task.priority)}`}></div>
      <div className="flex items-start justify-between">
        <button
          onClick={() => onToggle(task.id)}
          className="flex items-start text-left gap-3 flex-1 pr-2"
          aria-label={`Mark task as ${task.completed ? 'incomplete' : 'complete'}: ${task.text}`}
        >
          <div
            className={`mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
              task.completed
                ? 'bg-green-500 border-green-500'
                : 'border-gray-300 dark:border-gray-500 group-hover:border-indigo-400'
            }`}
          >
            <Icons.check className={`h-3.5 w-3.5 text-white transition-transform duration-300 ease-in-out ${task.completed ? 'scale-100' : 'scale-0'}`} />
          </div>
          <span className={`flex-1 text-sm transition-all duration-300 ${task.completed ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}>
            {task.text}
          </span>
        </button>
        <div className="flex items-center flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            onClick={() => onDelete(task.id)}
            aria-label={`Delete task: ${task.text}`}
            className="p-2 rounded-full text-gray-400 dark:text-gray-500 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/50 dark:hover:text-red-400 transition"
          >
            <Icons.trash className="h-4 w-4" />
          </button>
        </div>
      </div>
    </li>
);

interface TodaysPlanProps {
    dailyPlans: DailyPlan[];
    setDailyPlans: React.Dispatch<React.SetStateAction<DailyPlan[]>>;
    setStreak: (value: React.SetStateAction<number>) => void;
}

export const TodaysPlanView: React.FC<TodaysPlanProps> = ({ dailyPlans, setDailyPlans, setStreak }) => {
    const [newTaskText, setNewTaskText] = useState('');
    const todayStr = getLocalDateString(new Date());
    const todaysPlan = dailyPlans.find(p => p.date === todayStr);

    const dayNumber = useMemo(() => {
        const index = dailyPlans.findIndex(p => p.date === todayStr);
        return index !== -1 ? index + 1 : dailyPlans.length;
    }, [dailyPlans, todayStr]);

    const updateTasks = (newTasks: Task[]) => {
        setDailyPlans(plans => plans.map(p => p.date === todayStr ? { ...p, tasks: newTasks } : p));
    };

    const handleAddTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskText.trim() || !todaysPlan) return;
        
        const newTask: Task = {
            id: crypto.randomUUID(),
            text: newTaskText.trim(),
            completed: false,
            createdAt: Date.now(),
            priority: 'Medium', // Default for user-added tasks
        };

        updateTasks([...todaysPlan.tasks, newTask]);
        setNewTaskText('');
    };
    
    const handleToggleTask = (id: string) => {
        if (!todaysPlan) return;
        const taskToToggle = todaysPlan.tasks.find(task => task.id === id);
        if (!taskToToggle) return;
    
        // Only run streak logic when completing a task
        if (!taskToToggle.completed) {
            // Check if this is the first task being completed today
            const isFirstCompletionToday = !todaysPlan.tasks.some(t => t.completed);
            
            if (isFirstCompletionToday) {
                const yesterday = new Date();
                yesterday.setDate(new Date().getDate() - 1);
                const yesterdayStr = getLocalDateString(yesterday);
    
                const yesterdayPlan = dailyPlans.find(p => p.date === yesterdayStr);
                const wasTaskCompletedYesterday = yesterdayPlan?.tasks.some(t => t.completed);
    
                if (wasTaskCompletedYesterday) {
                    setStreak(prev => prev + 1);
                } else {
                    setStreak(1); // Start a new streak
                }
            }
        }
        
        const newTasks = todaysPlan.tasks.map(task => 
            task.id === id ? { ...task, completed: !task.completed, completedAt: task.completed ? undefined : Date.now() } : task
        );
        updateTasks(newTasks);
    };

    const handleDeleteTask = (id: string) => {
        if (!todaysPlan) return;
         updateTasks(todaysPlan.tasks.map(task => 
            task.id === id ? { ...task, isDeleting: true } : task
        ));
        setTimeout(() => {
             updateTasks(todaysPlan.tasks.filter(task => task.id !== id));
        }, 300);
    };

    const priorityTasks = useMemo(() => {
        if (!todaysPlan) return { high: [], medium: [], low: [] };
        const high: Task[] = [];
        const medium: Task[] = [];
        const low: Task[] = [];

        todaysPlan.tasks.filter(t => !t.isDeleting).forEach(task => {
            switch (task.priority) {
                case 'High': high.push(task); break;
                case 'Low': low.push(task); break;
                default: medium.push(task); break;
            }
        });
        return { high, medium, low };
    }, [todaysPlan]);


    if (!todaysPlan || todaysPlan.tasks.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400">
                <Icons.target className="h-16 w-16 mb-4 text-indigo-300 dark:text-indigo-600/50" />
                <h2 className="text-xl font-semibold">No tasks for today.</h2>
                <p>Go to the 'Goals' section to set a goal and get your first AI-generated tasks!</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-16 md:pb-0">
            <header>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50">Today's Priorities</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">Day {dayNumber}: Your AI-generated tasks to build on yesterday's progress.</p>
            </header>

            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 sm:p-6 rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="space-y-4">
                        <h2 className="text-base font-bold text-red-600 dark:text-red-400 flex items-center gap-2 px-1"><Icons.flame className="h-5 w-5" /> High Priority</h2>
                        {priorityTasks.high.length > 0 ? (
                            <ul className="space-y-3">
                                {priorityTasks.high.map(task => <TaskItem key={task.id} task={task} onToggle={handleToggleTask} onDelete={handleDeleteTask} />)}
                            </ul>
                        ) : <p className="text-gray-500 dark:text-gray-400 text-sm p-4 text-center bg-gray-50/50 dark:bg-gray-700/20 rounded-lg">None.</p>}
                    </div>
                    <div className="space-y-4">
                        <h2 className="text-base font-bold text-yellow-600 dark:text-yellow-400 flex items-center gap-2 px-1"><Icons.activity className="h-5 w-5" /> Medium Priority</h2>
                        {priorityTasks.medium.length > 0 ? (
                            <ul className="space-y-3">
                                {priorityTasks.medium.map(task => <TaskItem key={task.id} task={task} onToggle={handleToggleTask} onDelete={handleDeleteTask} />)}
                            </ul>
                        ) : <p className="text-gray-500 dark:text-gray-400 text-sm p-4 text-center bg-gray-50/50 dark:bg-gray-700/20 rounded-lg">None.</p>}
                    </div>
                    <div className="space-y-4">
                        <h2 className="text-base font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2 px-1"><Icons.checkCircle className="h-5 w-5" /> Low Priority</h2>
                        {priorityTasks.low.length > 0 ? (
                            <ul className="space-y-3">
                                {priorityTasks.low.map(task => <TaskItem key={task.id} task={task} onToggle={handleToggleTask} onDelete={handleDeleteTask} />)}
                            </ul>
                        ) : <p className="text-gray-500 dark:text-gray-400 text-sm p-4 text-center bg-gray-50/50 dark:bg-gray-700/20 rounded-lg">None.</p>}
                    </div>
                </div>

                <form onSubmit={handleAddTask} className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 flex items-center gap-4">
                    <input
                        type="text"
                        value={newTaskText}
                        onChange={(e) => setNewTaskText(e.target.value)}
                        placeholder="Add another task for today..."
                        className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                        required
                    />
                    <button type="submit" className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition flex items-center gap-2">
                        <Icons.plus className="h-5 w-5" />
                        <span>Add</span>
                    </button>
                </form>
            </div>
             {/* FIX: Replaced inline style block with dangerouslySetInnerHTML to prevent TSX parsing errors. */}
             <style dangerouslySetInnerHTML={{__html: `
                @keyframes slide-in {
                  from { opacity: 0; transform: translateX(-10px); }
                  to { opacity: 1; transform: translateX(0); }
                }
                .animate-slide-in { animation: slide-in 0.3s ease-out forwards; }

                @keyframes fade-out-shrink {
                  from { opacity: 1; transform: scale(1); max-height: 100px; }
                  to { opacity: 0; transform: scale(0.95); max-height: 0; padding-top: 0; padding-bottom: 0; margin-top: 0; margin-bottom: 0; border-width: 0; }
                }
                .animate-fade-out-shrink { animation: fade-out-shrink 0.3s ease-in-out forwards; overflow: hidden; }
            `}}/>
        </div>
    );
};