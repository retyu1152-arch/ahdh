
import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { TodaysPlanView } from './components/TodaysPlanView';
import { CoachView } from './components/CoachView';
import { FocusView } from './components/FocusView';
import { ProfileView } from './components/ProfileView';
import { GoalsView } from './components/GoalsView';
import { OnboardingView } from './components/OnboardingView';
import { useTheme } from './hooks/useTheme';
import { geminiService } from './services/geminiService';
import { dbService } from './services/dbService';
import type { Task, Goal, DailyPlan, User, FocusSession, ChatMessage, PsychoProfile } from './types';
import { Icons } from './components/Icons';

export type View = 'dashboard' | 'todaysPlan' | 'coach' | 'focus' | 'profile' | 'goals';

const getLocalDateString = (date: Date) => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState<View>('dashboard');

  // Centralized state management
  const [user, setUserState] = useState<User | null>(null);
  const [goal, setGoalState] = useState<Goal | null>(null);
  const [dailyPlans, setDailyPlansState] = useState<DailyPlan[]>([]);
  const [streak, setStreakState] = useState<number>(0);
  const [lastLogin, setLastLoginState] = useState<string>('');
  const [focusSessions, setFocusSessionsState] = useState<FocusSession[]>([]);
  const [coachHistory, setCoachHistoryState] = useState<ChatMessage[]>([]);
  const [psychoProfile, setPsychoProfileState] = useState<PsychoProfile | null>(null);

  // Activate the theme system globally
  useTheme();

  // Wrapped state setters to persist to IndexedDB
  const createSetter = <T,>(stateSetter: React.Dispatch<React.SetStateAction<T>>, dbKey: string) => {
    return (valueOrFn: React.SetStateAction<T>) => {
      stateSetter(currentValue => {
        const newValue = typeof valueOrFn === 'function' 
          ? (valueOrFn as (prevState: T) => T)(currentValue) 
          : valueOrFn;
        dbService.set(dbKey, newValue);
        return newValue;
      });
    };
  };

  const setUser = createSetter(setUserState, 'user');
  const setGoal = createSetter(setGoalState, 'goal');
  const setDailyPlans = createSetter(setDailyPlansState, 'dailyPlans');
  const setStreak = createSetter(setStreakState, 'streak');
  const setLastLogin = createSetter(setLastLoginState, 'lastLogin');
  const setFocusSessions = createSetter(setFocusSessionsState, 'focusSessions');
  const setCoachHistory = createSetter(setCoachHistoryState, 'coachHistory');
  const setPsychoProfile = createSetter(setPsychoProfileState, 'psychoProfile');

  // Effect to load all data from IndexedDB on initial app start
  useEffect(() => {
    const loadData = async () => {
      try {
        const [
            savedUser, savedGoal, savedPlans, savedStreak, savedLastLogin, 
            savedSessions, savedHistory, savedProfile
        ] = await Promise.all([
            dbService.get<User>('user'),
            dbService.get<Goal>('goal'),
            dbService.get<DailyPlan[]>('dailyPlans'),
            dbService.get<number>('streak'),
            dbService.get<string>('lastLogin'),
            dbService.get<FocusSession[]>('focusSessions'),
            dbService.get<ChatMessage[]>('coachHistory'),
            dbService.get<PsychoProfile>('psychoProfile')
        ]);
        
        setUserState(savedUser ?? null);
        setGoalState(savedGoal ?? null);
        setDailyPlansState(savedPlans ?? []);
        setStreakState(savedStreak ?? 0);
        setLastLoginState(savedLastLogin ?? '');
        setFocusSessionsState(savedSessions ?? []);
        setCoachHistoryState(savedHistory ?? []);
        setPsychoProfileState(savedProfile ?? null);

      } catch (error) {
        console.error("Failed to load data from IndexedDB", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);


  // Effect for daily login, streak checking, and AI task generation
  useEffect(() => {
    if (isLoading) return; // Don't run until data is loaded
    if (!user) return;

    const today = new Date();
    const todayStr = getLocalDateString(today);
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const yesterdayStr = getLocalDateString(yesterday);

    // --- Streak Breaking Logic ---
    // This logic runs on every load/data change to ensure streak is correct.
    const lastCompletedDayPlan = [...dailyPlans]
      .sort((a, b) => b.date.localeCompare(a.date))
      .find(p => p.tasks.some(t => t.completed));
    
    if (lastCompletedDayPlan) {
      const lastCompletedDate = lastCompletedDayPlan.date;
      // If the last completion was before yesterday, the streak is broken.
      if (lastCompletedDate < yesterdayStr) {
        setStreak(0);
      }
    } else if (streak > 0) {
      // Handles case where user might un-complete all tasks.
      setStreak(0);
    }
    
    // --- Daily Task Generation Logic ---
    // This should only run once per day.
    if (lastLogin === todayStr) return;
    
    const generateTasksForToday = async () => {
        if (!goal) return;
        const todayPlanExists = dailyPlans.some(p => p.date === todayStr);
        if (todayPlanExists) return;

        const dayNumber = dailyPlans.length + 1;
        const recentPlans = dailyPlans.slice(-3);
        const recentCompletedTasks = recentPlans.flatMap(plan => 
            plan.tasks.filter(task => task.completed).map(task => task.text)
        );

        const progressContext = { dayNumber, recentCompletedTasks };
        try {
            const newTasksData = await geminiService.generateDailyTasks(goal, progressContext);
            if (newTasksData && newTasksData.length > 0) {
                const newTasks: Task[] = newTasksData.map(taskData => ({
                    id: crypto.randomUUID(),
                    text: taskData.text,
                    completed: false,
                    createdAt: Date.now(),
                    priority: taskData.priority,
                    category: taskData.category,
                }));
                const newPlan: DailyPlan = { date: todayStr, tasks: newTasks };
                setDailyPlans(prev => [...prev.filter(p => p.date !== todayStr), newPlan]);
            }
        } catch(e) {
            console.error("Failed to generate daily tasks", e);
        }
    };

    generateTasksForToday();
    setLastLogin(todayStr);
    
  }, [isLoading, user, goal, dailyPlans, lastLogin]);

  // Effect to guide new users to set a goal
  useEffect(() => {
    if (!isLoading && user && !goal) {
        setCurrentView('goals');
    }
  }, [isLoading, user, goal]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
          <Icons.loader className="h-12 w-12 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!user) {
    return <OnboardingView onOnboard={(name) => setUser({ name, createdAt: Date.now() })} />;
  }

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-800 dark:bg-gray-800 dark:text-gray-200">
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} />
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
        <div className={currentView === 'dashboard' ? 'block' : 'hidden'}><Dashboard user={user} streak={streak} dailyPlans={dailyPlans} goal={goal} focusSessions={focusSessions} /></div>
        <div className={currentView === 'todaysPlan' ? 'block' : 'hidden'}><TodaysPlanView dailyPlans={dailyPlans} setDailyPlans={setDailyPlans} setStreak={setStreak} /></div>
        <div className={currentView === 'goals' ? 'block' : 'hidden'}><GoalsView goal={goal} setGoal={setGoal} setDailyPlans={setDailyPlans} /></div>
        <div className={currentView === 'coach' ? 'block h-full' : 'hidden'}><CoachView dailyPlans={dailyPlans} history={coachHistory} setHistory={setCoachHistory} focusSessions={focusSessions} /></div>
        <div className={currentView === 'focus' ? 'block' : 'hidden'}><FocusView focusSessions={focusSessions} setFocusSessions={setFocusSessions} /></div>
        <div className={currentView === 'profile' ? 'block' : 'hidden'}><ProfileView user={user} setUser={setUser} dailyPlans={dailyPlans} profile={psychoProfile} setProfile={setPsychoProfile} /></div>
      </main>
    </div>
  );
};

export default App;
