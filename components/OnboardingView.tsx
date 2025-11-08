
import React, { useState } from 'react';
import { Icons } from './Icons';
import { useTheme } from '../hooks/useTheme';

interface OnboardingViewProps {
  onOnboard: (name: string) => void;
}

export const OnboardingView: React.FC<OnboardingViewProps> = ({ onOnboard }) => {
  const [name, setName] = useState('');
  useTheme(); // Apply theme even on this screen

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onOnboard(name.trim());
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900 font-sans p-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 h-20 w-20 flex items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/50">
            <Icons.megamind className="h-12 w-12 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h1 className="text-4xl font-bold text-gray-800 dark:text-gray-100">Welcome to FocusFlow</h1>
        <p className="mt-3 text-lg text-gray-600 dark:text-gray-400">Your personal AI coach for navigating ADHD.</p>
        
        <form onSubmit={handleSubmit} className="mt-10">
          <label htmlFor="name-input" className="text-xl font-semibold text-gray-800 dark:text-gray-200">
            What should we call you?
          </label>
          <input
            id="name-input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            className="mt-4 block w-full p-4 text-center text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            required
          />
          <button
            type="submit"
            className="mt-6 w-full px-6 py-4 bg-indigo-600 text-white font-bold text-lg rounded-lg shadow-lg hover:bg-indigo-700 transition transform hover:scale-105 disabled:bg-indigo-400 disabled:scale-100"
            disabled={!name.trim()}
          >
            Get Started
          </button>
        </form>
      </div>
    </div>
  );
};
