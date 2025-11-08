import React, { useMemo } from 'react';
import { DailySummary } from './DailySummary';
import { Icons } from './Icons';
import type { FocusSession, DailyPlan, Goal, User } from '../types';

interface StatCardProps {
  icon: React.ReactElement;
  title: string;
  value: string | number;
  color: string;
  containerClassName?: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, title, value, color, containerClassName = '' }) => (
  <div className={`bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-gray-200/50 flex items-center gap-4 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 dark:bg-gray-800/80 dark:border-gray-700/50 dark:hover:shadow-indigo-500/10 ${containerClassName}`}>
    <div className={`p-3 rounded-full transition-colors duration-300 ${color}`}>
      {icon}
    </div>
    <div>
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
      <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{value}</p>
    </div>
  </div>
);

const getLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const DailyProgress: React.FC<{ dailyPlans: DailyPlan[] }> = ({ dailyPlans }) => {
    const dailyGoal = 30;
    const pointValues = { 'High': 10, 'Medium': 5, 'Low': 2 };

    const todayStr = getLocalDateString(new Date());
    const todaysPlan = dailyPlans.find(plan => plan.date === todayStr);

    const pointsToday = useMemo(() => {
        if (!todaysPlan) return 0;
        return todaysPlan.tasks
          .filter(task => task.completed)
          .reduce((sum, task) => sum + (pointValues[task.priority || 'Medium'] || 5), 0);
    }, [todaysPlan]);

    const progress = Math.min((pointsToday / dailyGoal) * 100, 100);

    const getMotivationalMessage = () => {
        if (progress >= 100) {
            return "Goal achieved! Amazing work!";
        }
        if (pointsToday > 0) {
            return `You're ${dailyGoal - pointsToday} points away from your goal. Keep going!`;
        }
        return "Complete your first task to earn points!";
    };
    
    return (
        <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-gray-200/50 dark:bg-gray-800/80 dark:border-gray-700/50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/50">
                        <Icons.piggyBank className="h-8 w-8 text-green-600 dark:text-green-400"/>
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Daily Progress</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{getMotivationalMessage()}</p>
                    </div>
                </div>
                <div className="text-right flex-shrink-0">
                    <span className="text-3xl font-bold text-green-600 dark:text-green-400">{pointsToday}</span>
                    <span className="text-lg font-medium text-gray-500 dark:text-gray-400"> / {dailyGoal} pts</span>
                </div>
            </div>
            <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                    <div 
                        className="bg-green-500 h-2.5 rounded-full transition-all duration-500 ease-out" 
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>
            </div>
        </div>
    );
};


interface DashboardProps {
    user: User | null;
    streak: number;
    dailyPlans: DailyPlan[];
    goal: Goal | null;
    focusSessions: FocusSession[];
}

export const Dashboard: React.FC<DashboardProps> = ({ user, streak, dailyPlans, goal, focusSessions }) => {
  const todayStr = getLocalDateString(new Date());
  
  const todaysPlan = dailyPlans.find(plan => plan.date === todayStr);
  
  const tasksCompletedToday = todaysPlan?.tasks.filter(task => task.completed).length || 0;

  const focusMinutesToday = focusSessions
    .filter(session => getLocalDateString(new Date(session.startTime)) === todayStr)
    .reduce((total, session) => total + session.duration, 0);

  const goalDayNumber = useMemo(() => dailyPlans.length, [dailyPlans]);

  const streakGlowClass = streak > 0 ? 'shadow-orange-500/30 shadow-xl' : '';

  return (
    <div className="space-y-6 pb-16 md:pb-0">
      <header>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50">Focus Center</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Welcome back, {user?.name}! Here's your progress for today.</p>
      </header>

      <DailyProgress dailyPlans={dailyPlans} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          icon={streak > 0 ? <Icons.flameFilled className="h-6 w-6 text-white" /> : <Icons.flame className="h-6 w-6 text-white" />}
          title="Day Streak"
          value={streak}
          color={streak > 0 ? "bg-orange-500" : "bg-gray-400"}
          containerClassName={streakGlowClass}
        />
        <StatCard 
          icon={<Icons.checkCircle className="h-6 w-6 text-white" />}
          title="Tasks Completed"
          value={tasksCompletedToday}
          color="bg-green-500"
        />
        <StatCard 
          icon={<Icons.timer className="h-6 w-6 text-white" />}
          title="Focus Minutes"
          value={focusMinutesToday}
          color="bg-blue-500"
        />
        <StatCard 
          icon={<Icons.calendarDays className="h-6 w-6 text-white" />}
          title="Goal Day"
          value={goalDayNumber > 0 ? goalDayNumber : 1}
          color="bg-teal-500"
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-gray-200/50 dark:bg-gray-800/80 dark:border-gray-700/50">
          <h2 className="text-xl font-bold mb-4 dark:text-gray-100">Visual Progress</h2>
           <div className="flex items-center justify-center h-64 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
             <p className="text-gray-500 dark:text-gray-400">Weekly progress chart coming soon!</p>
           </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-gray-200/50 dark:bg-gray-800/80 dark:border-gray-700/50">
          <DailySummary dailyPlans={dailyPlans} goal={goal} />
        </div>
      </div>
    </div>
  );
};