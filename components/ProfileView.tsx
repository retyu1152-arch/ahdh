import React, { useState, useRef } from 'react';
import { geminiService } from '../services/geminiService';
import { dbService } from '../services/dbService';
import type { PsychoProfile, DailyPlan, User } from '../types';
import { Icons } from './Icons';

interface ProfileViewProps {
    user: User | null;
    setUser: (user: User | null) => void;
    dailyPlans: DailyPlan[];
    profile: PsychoProfile | null;
    setProfile: (profile: PsychoProfile | null) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ user, setUser, dailyPlans, profile, setProfile }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [nameInput, setNameInput] = useState(user?.name || '');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const generateProfile = async () => {
    setIsLoading(true);
    // In a real app, you'd filter this data for the last month
    const monthlyData = {
      dailyPlans,
    };
    
    const newProfile = await geminiService.generatePsychoProfile(monthlyData);
    if (newProfile) {
      setProfile(newProfile);
    }
    setIsLoading(false);
  };

  const handleNameUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (user && nameInput.trim()) {
        setUser({ ...user, name: nameInput.trim() });
        alert("Profile updated!");
    }
  }

  const handleExport = async () => {
    try {
        const data = await dbService.exportAllData();
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const date = new Date().toISOString().slice(0, 10);
        a.download = `focusflow-backup-${date}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error("Failed to export data:", error);
        alert("Could not export data. See console for details.");
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (window.confirm("Are you sure you want to import data? This will overwrite all your current data in the app.")) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = e.target?.result;
                if (typeof text !== 'string') throw new Error("File content is not readable text.");
                const data = JSON.parse(text);
                await dbService.importAllData(data);
                alert("Data imported successfully! The app will now reload.");
                window.location.reload();
            } catch (error) {
                console.error("Failed to import data:", error);
                alert("Failed to import data. The file might be corrupted or in the wrong format.");
            }
        };
        reader.readAsText(file);
    }
    // Reset file input value to allow importing the same file again
    if (event.target) {
        event.target.value = '';
    }
  };
  
  const currentMonth = new Date().toLocaleString('default', { month: 'long' });
  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16 md:pb-0">
      <header>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50">Profile & Insights</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your profile and review your monthly progress.</p>
      </header>

      <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-gray-200/50 dark:bg-gray-800/80 dark:border-gray-700/50">
        <h2 className="text-xl font-bold mb-4">Your Profile</h2>
        <form onSubmit={handleNameUpdate} className="space-y-4">
            <div>
                <label htmlFor="name-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                <input
                    id="name-input"
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="mt-1 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    required
                />
            </div>
            <div className="flex justify-end">
                <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition"
                >
                    Save Changes
                </button>
            </div>
        </form>
      </div>

       <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-gray-200/50 dark:bg-gray-800/80 dark:border-gray-700/50">
        <h2 className="text-xl font-bold mb-4">Data Management</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-4 text-sm">To prevent data loss, you can export your data to a file. This is a temporary solution until cloud sync is available.</p>
        <div className="flex flex-col sm:flex-row gap-4">
          <button onClick={handleExport} className="flex-1 px-5 py-2 bg-gray-600 text-white font-semibold rounded-lg shadow-md hover:bg-gray-700 transition">
              Export Data
          </button>
          <button onClick={handleImportClick} className="flex-1 px-5 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">
              Import Data
          </button>
          <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept="application/json"
          />
        </div>
      </div>


      <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-gray-200/50 dark:bg-gray-800/80 dark:border-gray-700/50">
        <h2 className="text-xl font-bold mb-4">Monthly Insights for {currentMonth} {currentYear}</h2>
        {!profile || profile.month !== currentMonth ? (
          <div className="text-center py-10">
            <Icons.megamind className="h-16 w-16 mx-auto mb-4 text-indigo-300 dark:text-indigo-700" />
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Your {currentMonth} profile is not yet generated.</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-2 mb-6">Generate your personalized insights based on your activity this month.</p>
            <button
              onClick={generateProfile}
              disabled={isLoading}
              className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition flex items-center gap-2 mx-auto disabled:bg-indigo-300"
            >
              {isLoading ? (
                <>
                  <Icons.loader className="animate-spin h-5 w-5" />
                  Generating...
                </>
              ) : (
                <>
                  <Icons.sparkles className="h-5 w-5" />
                  Generate My Profile
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100 flex items-center gap-2"><Icons.swords className="text-green-500" /> Strengths</h3>
              <ul className="list-disc list-inside mt-2 space-y-1 text-gray-600 dark:text-gray-300">
                {profile.strengths.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
             <div>
              <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100 flex items-center gap-2"><Icons.areaChart className="text-blue-500" /> Growth Areas</h3>
              <ul className="list-disc list-inside mt-2 space-y-1 text-gray-600 dark:text-gray-300">
                {profile.growthAreas.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            </div>
             <div>
              <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100 flex items-center gap-2"><Icons.activity className="text-purple-500" /> Productivity Patterns</h3>
              <p className="mt-2 text-gray-600 dark:text-gray-300">{profile.productivityPatterns}</p>
            </div>
             <div className="bg-indigo-50 dark:bg-indigo-900/30 p-4 rounded-lg">
              <h3 className="font-bold text-lg text-indigo-800 dark:text-indigo-200 flex items-center gap-2"><Icons.fileText className="text-indigo-500" /> Overall Summary</h3>
              <p className="mt-2 text-indigo-700 dark:text-indigo-300">{profile.overallSummary}</p>
            </div>
            <button
              onClick={generateProfile}
              disabled={isLoading}
              className="w-full mt-4 px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition flex items-center justify-center gap-2 disabled:bg-gray-100 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            >
               {isLoading ? 'Regenerating...' : 'Regenerate Profile'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};