import React, { useState } from 'react';
import type { View } from '../App';
import { Icons } from './Icons';
import { useTheme, Theme } from '../hooks/useTheme';

interface SidebarProps {
  currentView: View;
  setCurrentView: (view: View) => void;
}

const ThemeSwitcher: React.FC = () => {
  const [theme, setTheme] = useTheme();

  const themeOptions: { name: Theme; icon: React.ReactElement, label: string }[] = [
    { name: 'light', icon: <Icons.sun className="h-5 w-5" />, label: 'Light Theme' },
    { name: 'dark', icon: <Icons.moon className="h-5 w-5" />, label: 'Dark Theme' },
    { name: 'auto', icon: <Icons.laptop className="h-5 w-5" />, label: 'Auto Theme' },
  ];

  return (
    <div className="flex items-center justify-center p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
      {themeOptions.map(option => (
        <button
          key={option.name}
          onClick={() => setTheme(option.name)}
          className={`p-2 rounded-md transition-colors w-full ${
            theme === option.name
              ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-indigo-400'
              : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700/50'
          }`}
          aria-label={option.label}
          title={option.label}
        >
          {option.icon}
        </button>
      ))}
    </div>
  );
};


const navItems: { view: View; icon: React.ReactElement; label: string }[] = [
  { view: 'dashboard', icon: <Icons.layoutDashboard className="h-6 w-6" />, label: 'Focus Center' },
  { view: 'goals', icon: <Icons.target className="h-6 w-6" />, label: 'Goals' },
  { view: 'todaysPlan', icon: <Icons.checkCircle className="h-6 w-6" />, label: "Today's Priorities" },
  { view: 'coach', icon: <Icons.megamind className="h-6 w-6" />, label: 'Coach' },
  { view: 'focus', icon: <Icons.brainCircuit className="h-6 w-6" />, label: 'Focus' },
  { view: 'profile', icon: <Icons.user className="h-6 w-6" />, label: 'Profile' },
];

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <>
      {/* Mobile Bottom Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex justify-around p-2 z-50">
        {navItems.map(item => (
          <button
            key={item.view}
            onClick={() => setCurrentView(item.view)}
            className={`flex flex-col items-center p-2 rounded-lg transition-colors ${
              currentView === item.view ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400'
            }`}
          >
            {item.icon}
            <span className="text-xs mt-1">{item.label}</span>
          </button>
        ))}
      </div>
      
      {/* Desktop Sidebar */}
      <nav className={`hidden md:flex flex-col ${isExpanded ? 'w-64' : 'w-20'} bg-white border-r border-gray-200 dark:bg-gray-900 dark:border-gray-700 transition-all duration-300 ease-in-out`}>
        <div className="flex items-center justify-between p-4 h-20 border-b dark:border-gray-700">
          <div className={`flex items-center gap-2 overflow-hidden transition-opacity ${isExpanded ? 'opacity-100' : 'opacity-0'}`}>
            <Icons.megamind className="h-8 w-8 text-indigo-600" />
            <span className="text-xl font-bold text-gray-800 dark:text-gray-100 whitespace-nowrap">FocusFlow</span>
          </div>
          <button onClick={() => setIsExpanded(!isExpanded)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
            {isExpanded ? <Icons.panelLeftClose className="h-6 w-6" /> : <Icons.panelRightClose className="h-6 w-6" />}
          </button>
        </div>
        <ul className="flex-1 px-3 py-4">
          {navItems.map(item => (
            <li key={item.view}>
              <button
                onClick={() => setCurrentView(item.view)}
                className={`flex items-center w-full p-3 my-1 rounded-lg transition-colors ${
                  currentView === item.view
                    ? 'bg-indigo-100 text-indigo-700 font-semibold dark:bg-indigo-500/20 dark:text-indigo-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-800 dark:hover:text-gray-200'
                } ${isExpanded ? 'justify-start' : 'justify-center'}`}
              >
                {item.icon}
                <span className={`ml-4 transition-all ${!isExpanded && 'hidden'}`}>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
         <div className={`p-3 border-t dark:border-gray-700 transition-opacity ${isExpanded ? '' : 'opacity-0 h-0 pointer-events-none'}`}>
          <ThemeSwitcher />
        </div>
      </nav>
    </>
  );
};