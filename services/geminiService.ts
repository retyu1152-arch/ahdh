
import { GoogleGenAI, Type } from "@google/genai";
import type { ChatMessage, PsychoProfile, Goal, DailyPlan, Task, Priority } from '../types';
import type { FocusSession } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const chatModel = 'gemini-2.5-flash';
const analysisModel = 'gemini-2.5-pro';

const coachSystemInstruction = `You are FocusFlow, a highly intelligent and empathetic AI coach specializing in ADHD. Your purpose is to provide personalized, actionable support.

**Your Personality:**
- Empathetic & Supportive: Acknowledge user's struggles and celebrate their wins.
- Action-Oriented: Provide concrete strategies, not just vague advice.
- Concise: Keep responses short and scannable (under 75 words). Use markdown (bolding, lists) for clarity.
- Positive & Empowering: Focus on strengths and progress.

**Core Directives:**
1.  **NEVER Give Medical Advice:** Do not diagnose, treat, or offer medical opinions. Defer to healthcare professionals.
2.  **Stay Focused on Your Role:** Your expertise is limited to ADHD, productivity, and task management. If a user asks a question outside of this scope (like cooking, history, or general trivia), you must politely decline and redirect. For instance, say something like, "That's a bit outside of what I'm designed for. My main goal is to help you with focus and productivity. Would you like a tip on how to start your next task?"
3.  **Leverage User Context:** You will be provided with the user's current tasks and recent focus session data. Use this to make your advice specific and relevant. For example, if they have many 'High' priority tasks, suggest ways to tackle them. If they just finished a focus session, praise them.
4.  **Use ADHD-Friendly Techniques:** Proactively suggest techniques like:
    - **Task Chunking:** Breaking large tasks down.
    - **Pomodoro Technique:** Mentioning focus intervals.
    - **"Eat the Frog":** Tackling the hardest task first.
    - **Positive Reinforcement:** Encouraging rewards for completed tasks.

Your goal is to be a helpful, in-the-moment assistant that understands the user's current situation.`;

export interface CoachContext {
  tasks: {
    total: number;
    completed: number;
  };
  lastSession: FocusSession | null;
}

export const geminiService = {
  async streamCoachResponse(history: ChatMessage[], context: CoachContext) {
    try {
        const chatHistory = history.slice(0, -1);
        const lastMessage = history[history.length - 1];

        const contextInstruction = `This is the user's current status for today:
- Tasks in Plan: ${context.tasks.total} total, with ${context.tasks.completed} completed so far.
${context.lastSession ? `- Last Focus Session: ${context.lastSession.duration} minutes, started at ${new Date(context.lastSession.startTime).toLocaleTimeString()}.` : '- No recent focus sessions.'}
Use this information to tailor your response.`;

        const finalSystemInstruction = `${coachSystemInstruction}\n\n## Current User Context\n${contextInstruction}`;

        const chat = ai.chats.create({
            model: chatModel,
            config: {
                systemInstruction: finalSystemInstruction
            },
            history: chatHistory
        });

        const result = await chat.sendMessageStream({ message: lastMessage.parts[0].text });
        
        return result;
    } catch (error) {
        console.error("Error getting coach response:", error);
        throw new Error("Failed to get streaming response from Gemini.");
    }
  },

  async generateDailySummary(plan: DailyPlan, goal: Goal): Promise<string> {
     try {
      const tasksCompleted = plan.tasks.filter(t => t.completed).length;
      const totalTasks = plan.tasks.length;
      const prompt = `
      Act as a super encouraging ADHD coach, like a friend cheering the user on.
      The user's main goal is: "${goal.text}".
      Today, they completed ${tasksCompleted} out of ${totalTasks} tasks.

      Write a short, punchy, and highly motivational summary (like a quick chat message, under 50 words).
      - Acknowledge their effort for today, adapting the tone based on completion rate.
      - Connect their progress directly to their main goal.
      - End with a super encouraging boost for tomorrow.

      Example for high completion: "YES! You crushed ${tasksCompleted} tasks! That's a huge step towards your goal. Keep that fire going for tomorrow! 🔥"
      Example for low completion: "Hey, you got ${tasksCompleted} task done and that's what matters! Every step forward is a win. Let's get after it again tomorrow! You got this."
      Example for zero completion: "Today was tough, and that's okay. Your goal is still right there. A fresh start tomorrow is all you need. Let's go! 💪"
      `;
      const response = await ai.models.generateContent({
        model: chatModel,
        contents: prompt
      });
      return response.text;
    } catch (error) {
      console.error("Error generating daily summary:", error);
      return "Could not generate summary at this time.";
    }
  },

  async generatePsychoProfile(monthlyData: { dailyPlans: DailyPlan[] }): Promise<PsychoProfile | null> {
    try {
        const prompt = `Analyze the following monthly user data (a series of daily plans with tasks) to create a 'psychoprofile' for an individual with ADHD. The output must be a JSON object. Based on task completion rates across daily plans, identify patterns in productivity, common challenges, and areas of strength. Provide a supportive, non-clinical summary and actionable insights for the upcoming month. Data: ${JSON.stringify(monthlyData)}`;
        
        const response = await ai.models.generateContent({
            model: analysisModel,
            contents: prompt,
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                  growthAreas: { type: Type.ARRAY, items: { type: Type.STRING } },
                  productivityPatterns: { type: Type.STRING },
                  overallSummary: { type: Type.STRING }
                },
              },
            }
        });
        
        let jsonStr = response.text.trim();
        if (jsonStr.startsWith('```json')) {
            jsonStr = jsonStr.slice(7, -3).trim();
        } else if (jsonStr.startsWith('```')) {
            jsonStr = jsonStr.slice(3, -3).trim();
        }

        const parsedProfile = JSON.parse(jsonStr);
        return {
            ...parsedProfile,
            month: new Date().toLocaleString('default', { month: 'long' }),
            year: new Date().getFullYear(),
        };
    } catch (error) {
        console.error("Error generating psycho-profile:", error);
        return null;
    }
  },

  async generateGoalStrategy(goalText: string): Promise<string> {
    try {
        const prompt = `Generate a brief, motivating, high-level strategy (2-3 sentences) for a user with ADHD to achieve this goal: "${goalText}"`;
        const response = await ai.models.generateContent({
            model: chatModel,
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        console.error("Error generating goal strategy:", error);
        return "Let's break this down into small, manageable steps, celebrate every win, and stay consistent!";
    }
  },
  
  async generateDailyTasks(goal: Goal, progressContext: { dayNumber: number; recentCompletedTasks: string[] }): Promise<Omit<Task, 'id' | 'completed' | 'createdAt' | 'isDeleting'>[]> {
    try {
        const { dayNumber, recentCompletedTasks } = progressContext;

        const recentlyCompletedSummary = recentCompletedTasks.length > 0 
            ? `They have recently completed the following tasks:\n${recentCompletedTasks.map(t => `- ${t}`).join('\n')}`
            : "They are just getting started on this goal.";

        const prompt = `Act as an expert ADHD coach and curriculum designer. The user's primary goal is: "${goal.text}".
        
        This is Day ${dayNumber} of their learning journey.
        
        ${recentlyCompletedSummary}

        Your task is to generate a focused, actionable list of 3 to 5 tasks for them to complete **today**. These tasks must follow a **progressive difficulty** curve, building logically on what they have already learned. Each day's tasks should be slightly more advanced than the last, increasing in complexity by about 5-10%.

        For example, if the goal is 'Learn Python', and they just learned 'variables', today's tasks should introduce 'functions'. If the goal is 'Learn Math', and they finished 'basic algebra', you might introduce 'geometry concepts'.

        The tasks must be ADHD-friendly: small, specific, clear, and directly contributing to the main goal. Avoid vague meta-tasks like 'plan your day'. The output must be a valid JSON array of task objects.`;

        const response = await ai.models.generateContent({
            model: analysisModel,
            contents: prompt,
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    text: { type: Type.STRING, description: "The specific, actionable task description." },
                    priority: { type: Type.STRING, enum: ['High', 'Medium', 'Low'], description: "The priority of the task." },
                    category: { type: Type.STRING, description: "A relevant category like 'Learning', 'Practice', 'Project'."}
                  },
                  required: ['text', 'priority']
                },
              },
            }
        });
        
        const jsonStr = response.text.trim();
        return JSON.parse(jsonStr) as Omit<Task, 'id' | 'completed' | 'createdAt' | 'isDeleting'>[];
    } catch (error) {
        console.error("Error generating daily tasks:", error);
        return [{ text: "I'm having trouble generating tasks right now. Try focusing on one small step towards your goal.", priority: 'Medium' }];
    }
  },

  async getRestSuggestion(): Promise<string> {
    try {
      const prompt = `I've just completed a focused work session. Suggest a very short, simple, and refreshing activity for a 5-minute break. The goal is a quick mental reset, not another task. Examples: "Stretch your arms and back," or "Get a glass of water." Keep the response under 20 words.`;
      const response = await ai.models.generateContent({
        model: chatModel,
        contents: prompt,
      });
      return response.text;
    } catch (error) {
      console.error("Error generating rest suggestion:", error);
      return "Take a moment to stretch and breathe deeply.";
    }
  },
};
