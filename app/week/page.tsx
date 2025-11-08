"use client";

import React from "react";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Habit {
  id: number;
  name: string;
  scheduleType: string;
  scheduleDays?: string;
  scheduledTime?: string;
}

export default function WeekView() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  // Map of "YYYY-MM-DD" -> Set of completed habit IDs
  const [completions, setCompletions] = useState<Map<string, Set<number>>>(
    new Map()
  );

  useEffect(() => {
    const loadData = async () => {
      try {
        // Fetch habits
        const habitsRes = await fetch("/api/habits");
        const habitsData = await habitsRes.json();
        setHabits(Array.isArray(habitsData) ? habitsData : []);

        // Fetch completions for all 7 days of the week
        const weekDays = getWeekDays();
        const completionsMap = new Map<string, Set<number>>();

        await Promise.all(
          weekDays.map(async (day) => {
            const dateStr = day.toISOString().split("T")[0];
            const res = await fetch(`/api/completions?date=${dateStr}`);
            const data = await res.json();

            if (data.completedHabitIds) {
              completionsMap.set(dateStr, new Set(data.completedHabitIds));
            } else {
              completionsMap.set(dateStr, new Set());
            }
          })
        );

        setCompletions(completionsMap);
        setLoading(false);
      } catch (err) {
        console.error("Error loading data:", err);
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const toggleHabit = async (habitId: number, date: Date) => {
    const dateStr = date.toISOString().split("T")[0];

    try {
      const response = await fetch(`/api/habits/${habitId}/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: dateStr }),
      });

      const data = await response.json();

      // Update local state
      setCompletions((prev) => {
        const newCompletions = new Map(prev);
        const dateCompletions = new Set(prev.get(dateStr) || new Set());

        if (data.completed) {
          dateCompletions.add(habitId);
        } else {
          dateCompletions.delete(habitId);
        }

        newCompletions.set(dateStr, dateCompletions);
        return newCompletions;
      });
    } catch (error) {
      console.error("Error toggling habit:", error);
    }
  };

  // Get array of 7 days starting from Monday of current week
  const getWeekDays = () => {
    const today = new Date();
    const currentDay = today.getDay(); // 0 = Sunday
    const monday = new Date(today);

    // Adjust to get Monday (if Sunday, go back 6 days, otherwise go back currentDay - 1)
    const daysToMonday = currentDay === 0 ? 6 : currentDay - 1;
    monday.setDate(today.getDate() - daysToMonday);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(monday);
      day.setDate(monday.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const isScheduledForDay = (habit: Habit, dayIndex: number) => {
    // dayIndex: 0 = Monday, 6 = Sunday
    if (habit.scheduleType === "daily") {
      return true;
    }

    if (habit.scheduleType === "weekly" && habit.scheduleDays) {
      const scheduledDays = habit.scheduleDays
        .split(",")
        .map((d) => parseInt(d.trim()));
      return scheduledDays.includes(dayIndex);
    }

    return false;
  };

  const weekDays = getWeekDays();
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const today = new Date().toDateString();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Week View</h1>
            <p className="text-gray-600">Your habits for the week</p>
          </div>
          <Link
            href="/"
            className="px-4 py-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors font-semibold"
          >
            ← Back to Today
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-px bg-gray-200">
              {/* Day Headers */}
              {weekDays.map((day, index) => {
                const isToday = day.toDateString() === today;
                return (
                  <div
                    key={index}
                    className={`p-4 text-center font-semibold ${
                      isToday
                        ? "bg-purple-600 text-white"
                        : "bg-gray-50 text-gray-700"
                    }`}
                  >
                    <div className="text-sm">{dayNames[index]}</div>
                    <div className="text-2xl mt-1">{day.getDate()}</div>
                    <div className="text-xs mt-1">
                      {day.toLocaleDateString("en-US", { month: "short" })}
                    </div>
                  </div>
                );
              })}

              {/* Habit Rows */}
              {habits.map((habit) => (
                <React.Fragment key={habit.id}>
                  {weekDays.map((day, dayIndex) => {
                    const isScheduled = isScheduledForDay(habit, dayIndex);
                    const isToday = day.toDateString() === today;
                    const dateStr = day.toISOString().split("T")[0];
                    const isCompleted =
                      completions.get(dateStr)?.has(habit.id) || false;

                    return (
                      <div
                        key={`${habit.id}-${dayIndex}`}
                        className={`p-3 min-h-[80px] ${
                          isToday ? "bg-purple-50" : "bg-white"
                        }`}
                      >
                        {isScheduled && (
                          <div className="text-sm">
                            <div
                              className={`font-medium mb-1 ${
                                isCompleted
                                  ? "text-gray-500 line-through"
                                  : "text-gray-900"
                              }`}
                            >
                              {habit.name}
                            </div>
                            {habit.scheduledTime && (
                              <div className="text-xs text-gray-500">
                                {habit.scheduledTime.substring(0, 5)}
                              </div>
                            )}
                            <button
                              onClick={() => toggleHabit(habit.id, day)}
                              className={`mt-2 w-6 h-6 rounded border-2 transition-colors flex items-center justify-center ${
                                isCompleted
                                  ? "border-green-500 bg-green-500 hover:bg-green-600"
                                  : "border-gray-300 hover:border-green-500 hover:bg-green-50"
                              }`}
                            >
                              <svg
                                className={`w-3 h-3 ${
                                  isCompleted ? "text-white" : "text-gray-400"
                                }`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
