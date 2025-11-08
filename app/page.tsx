"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Habit {
  id: number;
  name: string;
  description?: string;
  scheduleType: string;
  scheduleDays?: string;
  scheduledTime?: string;
  isParent: boolean;
  parentHabitId?: number;
}

export default function Home() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTodayOnly, setShowTodayOnly] = useState(true);
  const [completedToday, setCompletedToday] = useState<Set<number>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newHabitName, setNewHabitName] = useState("");
  const [newHabitScheduleType, setNewHabitScheduleType] = useState("daily");
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(
    null
  );
  const [savingHabit, setSavingHabit] = useState(false);
  const [deletingHabit, setDeletingHabit] = useState(false);
  useEffect(() => {
    const loadData = async () => {
      try {
        setError(null);

        // Fetch habits
        const habitsRes = await fetch("/api/habits");
        if (!habitsRes.ok) {
          throw new Error("Failed to load habits");
        }
        const habitsData = await habitsRes.json();
        setHabits(Array.isArray(habitsData) ? habitsData : []);

        // Fetch today's completions
        const today = new Date().toISOString().split("T")[0];
        const completionsRes = await fetch(`/api/completions?date=${today}`);
        if (!completionsRes.ok) {
          throw new Error("Failed to load completions");
        }
        const completionsData = await completionsRes.json();

        if (completionsData.completedHabitIds) {
          setCompletedToday(new Set(completionsData.completedHabitIds));
        }

        setLoading(false);
      } catch (err) {
        console.error("Error loading data:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load data"
        );
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const toggleHabit = async (habitId: number) => {
    try {
      const response = await fetch(`/api/habits/${habitId}/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: new Date().toISOString().split("T")[0] }),
      });

      const data = await response.json();

      if (data.completed) {
        setCompletedToday((prev) => new Set(prev).add(habitId));
      } else {
        setCompletedToday((prev) => {
          const newSet = new Set(prev);
          newSet.delete(habitId);
          return newSet;
        });
      }
    } catch (error) {
      console.error("Error toggling habit:", error);
    }
  };
  const createHabit = async () => {
    if (!newHabitName.trim()) return;

    setSavingHabit(true);
    setError(null);

    try {
      const response = await fetch("/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newHabitName,
          scheduleType: newHabitScheduleType,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create habit");
      }

      // Refresh habits list
      const data = await fetch("/api/habits").then((res) => res.json());
      setHabits(Array.isArray(data) ? data : []);

      // Reset form
      setNewHabitName("");
      setNewHabitScheduleType("daily");
      setShowCreateModal(false);
    } catch (error) {
      console.error("Error creating habit:", error);
      setError(
        error instanceof Error ? error.message : "Failed to create habit"
      );
    } finally {
      setSavingHabit(false);
    }
  };

  const updateHabit = async () => {
    if (!editingHabit || !editingHabit.name.trim()) return;

    setSavingHabit(true);
    setError(null);

    try {
      const response = await fetch(`/api/habits/${editingHabit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingHabit.name,
          scheduleType: editingHabit.scheduleType,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update habit");
      }

      // Refresh habits list
      const data = await fetch("/api/habits").then((res) => res.json());
      setHabits(Array.isArray(data) ? data : []);
      setEditingHabit(null);
    } catch (error) {
      console.error("Error updating habit:", error);
      setError(
        error instanceof Error ? error.message : "Failed to update habit"
      );
    } finally {
      setSavingHabit(false);
    }
  };

  const deleteHabit = async (habitId: number) => {
    setDeletingHabit(true);
    setError(null);

    try {
      const response = await fetch(`/api/habits/${habitId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete habit");
      }

      // Refresh habits list
      const data = await fetch("/api/habits").then((res) => res.json());
      setHabits(Array.isArray(data) ? data : []);
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error("Error deleting habit:", error);
      setError(
        error instanceof Error ? error.message : "Failed to delete habit"
      );
    } finally {
      setDeletingHabit(false);
    }
  };

  const getDayName = (dayNum: string) => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    return days[parseInt(dayNum)] || dayNum;
  };

  const isScheduledToday = (habit: Habit) => {
    const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
    const todayForSchedule = today === 0 ? 6 : today - 1; // Convert to 0 = Monday

    if (habit.scheduleType === "daily") {
      return true;
    }

    if (habit.scheduleType === "weekly" && habit.scheduleDays) {
      const scheduledDays = habit.scheduleDays
        .split(",")
        .map((d) => parseInt(d.trim()));
      return scheduledDays.includes(todayForSchedule);
    }

    return false;
  };

  const displayedHabits = showTodayOnly
    ? habits.filter(isScheduledToday)
    : habits;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <div className="max-w-5xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Personal Dashboard
            </h1>
            <p className="text-gray-600">
              Next.js Migration - Phase 1 Complete! 🎉
            </p>
          </div>
          <Link
            href="/week"
            className="px-4 py-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors font-semibold"
          >
            📅 Week View
          </Link>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <svg
              className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex-1">
              <h3 className="font-semibold text-red-900">Error</h3>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-800"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}

        {/* Habits Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            <span className="text-3xl">🎯</span>
            <h2 className="text-2xl font-bold text-gray-800">Your Habits</h2>
            <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-semibold">
              {habits.length} total
            </span>
            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-semibold">
              {completedToday.size} completed today
            </span>
            <button
              onClick={() => setShowTodayOnly(!showTodayOnly)}
              className={`ml-auto px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                showTodayOnly
                  ? "bg-purple-600 text-white hover:bg-purple-700"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              {showTodayOnly ? "📅 Today" : "📋 All Habits"}
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
          ) : displayedHabits.length === 0 ? (
            <div className="text-center py-16">
              <div className="flex justify-center mb-4">
                <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center">
                  <svg
                    className="w-12 h-12 text-purple-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {showTodayOnly
                  ? "No habits scheduled for today"
                  : "No habits yet"}
              </h3>
              <p className="text-gray-600 mb-6">
                {showTodayOnly
                  ? "You're all clear for today! Switch to 'All Habits' to see your full list."
                  : "Start building better habits by creating your first one."}
              </p>
              {!showTodayOnly && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full hover:shadow-lg transition-all hover:scale-105 font-semibold"
                >
                  Create Your First Habit
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-4">
              {displayedHabits.map((habit) => {
                const isCompleted = completedToday.has(habit.id);

                return (
                  <div
                    key={habit.id}
                    className={`border-2 rounded-xl p-5 hover:shadow-md transition-all duration-200 ${
                      isCompleted
                        ? "border-green-300 bg-gradient-to-r from-green-50 to-emerald-50"
                        : "border-gray-100 bg-gradient-to-r from-white to-gray-50 hover:border-purple-300"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3
                            className={`text-lg font-semibold ${
                              isCompleted
                                ? "text-gray-500 line-through"
                                : "text-gray-900"
                            }`}
                          >
                            {habit.name}
                          </h3>
                          {habit.isParent && (
                            <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-medium">
                              Parent
                            </span>
                          )}
                          {habit.parentHabitId && (
                            <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-medium">
                              Sub-task
                            </span>
                          )}
                        </div>

                        {habit.description && (
                          <p className="text-gray-600 text-sm mb-3">
                            {habit.description}
                          </p>
                        )}

                        <div className="flex items-center gap-4 text-sm">
                          <span className="flex items-center gap-2 text-gray-700">
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                            <span className="font-medium capitalize">
                              {habit.scheduleType}
                            </span>
                          </span>

                          {habit.scheduleDays && (
                            <span className="text-gray-600">
                              {habit.scheduleDays
                                .split(",")
                                .map((d) => getDayName(d))
                                .join(", ")}
                            </span>
                          )}

                          {habit.scheduledTime && (
                            <span className="flex items-center gap-2 text-gray-700">
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                              <span>{habit.scheduledTime.substring(0, 5)}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingHabit(habit)}
                          className="w-8 h-8 rounded-lg border border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-colors flex items-center justify-center"
                          title="Edit habit"
                        >
                          <svg
                            className="w-4 h-4 text-gray-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(habit.id)}
                          className="w-8 h-8 rounded-lg border border-gray-300 hover:border-red-500 hover:bg-red-50 transition-colors flex items-center justify-center"
                          title="Delete habit"
                        >
                          <svg
                            className="w-4 h-4 text-gray-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => toggleHabit(habit.id)}
                          className={`w-10 h-10 rounded-full border-2 transition-all flex items-center justify-center ${
                            isCompleted
                              ? "border-green-500 bg-green-500 hover:bg-green-600"
                              : "border-gray-300 hover:border-green-500 hover:bg-green-50"
                          }`}
                        >
                          <svg
                            className={`w-5 h-5 ${
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
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Progress Section */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl shadow-lg p-6 text-white">
          <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
            <span>✅</span>
            Migration Progress
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-green-200">✓</span>
              <span>Next.js project created with TypeScript & Tailwind</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-200">✓</span>
              <span>Prisma ORM configured for SQLite</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-200">✓</span>
              <span>Database migrated from Flask</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-200">✓</span>
              <span>API working - {habits.length} habits loaded!</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-200">✓</span>
              <span>Interactive checkboxes - mark habits complete!</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-200">✓</span>
              <span>Today view - filter by schedule!</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-yellow-300">⏳</span>
              <span className="text-green-100">Next: Week view calendar</span>
            </div>
          </div>
        </div>
        {/* Create Habit Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Create New Habit
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Habit Name
                  </label>
                  <input
                    type="text"
                    value={newHabitName}
                    onChange={(e) => setNewHabitName(e.target.value)}
                    placeholder="e.g., Morning Exercise"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Schedule
                  </label>
                  <select
                    value={newHabitScheduleType}
                    onChange={(e) => setNewHabitScheduleType(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewHabitName("");
                  }}
                  disabled={savingHabit}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={createHabit}
                  disabled={!newHabitName.trim() || savingHabit}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {savingHabit && (
                    <svg
                      className="animate-spin h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  )}
                  {savingHabit ? "Creating..." : "Create Habit"}
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Edit Habit Modal */}
        {editingHabit && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Edit Habit
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Habit Name
                  </label>
                  <input
                    type="text"
                    value={editingHabit.name}
                    onChange={(e) =>
                      setEditingHabit({ ...editingHabit, name: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Schedule
                  </label>
                  <select
                    value={editingHabit.scheduleType}
                    onChange={(e) =>
                      setEditingHabit({
                        ...editingHabit,
                        scheduleType: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setEditingHabit(null)}
                  disabled={savingHabit}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={updateHabit}
                  disabled={savingHabit}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {savingHabit && (
                    <svg
                      className="animate-spin h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  )}
                  {savingHabit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Delete Habit?
              </h2>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this habit? This action cannot
                be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  disabled={deletingHabit}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteHabit(showDeleteConfirm)}
                  disabled={deletingHabit}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {deletingHabit && (
                    <svg
                      className="animate-spin h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  )}
                  {deletingHabit ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Floating Add Button */}
        <button
          onClick={() => setShowCreateModal(true)}
          className="fixed bottom-8 right-8 w-14 h-14 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 flex items-center justify-center text-2xl font-bold z-50"
        >
          +
        </button>
      </div>
    </div>
  );
}
