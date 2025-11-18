"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import Header from "@/components/Header";

interface CalendarSync {
  id: number;
  userId: string;
  calendarId: string;
  calendarName: string;
  isEnabled: boolean;
  isPrimary: boolean;
  syncToken: string | null;
  color: string | null;
  lastSyncedAt: string | null;
  createdAt: string;
}

interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

export default function CalendarSettingsPage() {
  const [calendars, setCalendars] = useState<CalendarSync[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: Toast["type"] = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3000);
  };

  useEffect(() => {
    loadCalendars();
  }, []);

  const loadCalendars = async () => {
    try {
      const response = await fetch("/api/calendar/settings");
      if (!response.ok) {
        throw new Error("Failed to load calendars");
      }
      const data = await response.json();
      setCalendars(data);
      setLoading(false);
    } catch (error) {
      console.error("Error loading calendars:", error);
      showToast("Failed to load calendars", "error");
      setLoading(false);
    }
  };

  const syncCalendars = async () => {
    setSyncing(true);
    try {
      const response = await fetch("/api/calendar/settings/sync", {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Failed to sync calendars");
      }
      const data = await response.json();
      setCalendars(data);
      showToast("Calendars synced successfully!", "success");
    } catch (error) {
      console.error("Error syncing calendars:", error);
      showToast("Failed to sync calendars", "error");
    } finally {
      setSyncing(false);
    }
  };

  const toggleCalendar = async (calendarId: string, currentState: boolean) => {
    try {
      const response = await fetch("/api/calendar/list", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          calendarId,
          isEnabled: !currentState,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to toggle calendar");
      }

      // Update local state
      setCalendars((prev) =>
        prev.map((cal) =>
          cal.calendarId === calendarId
            ? { ...cal, isEnabled: !currentState }
            : cal
        )
      );

      showToast(
        `Calendar ${!currentState ? "enabled" : "disabled"}`,
        "success"
      );
    } catch (error) {
      console.error("Error toggling calendar:", error);
      showToast("Failed to update calendar", "error");
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    const date = new Date(dateStr);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="max-w-5xl mx-auto p-8">
          <Header />

          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Connected Calendars
                </h1>
                <p className="text-gray-600">
                  Manage which Google Calendars are synced with Life OS
                </p>
              </div>
              <button
                onClick={syncCalendars}
                disabled={syncing}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {syncing && (
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
                {syncing ? "Syncing..." : "Sync Calendars"}
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
              </div>
            ) : calendars.length === 0 ? (
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
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No Calendars Connected
                </h3>
                <p className="text-gray-600 mb-6">
                  Click "Sync Calendars" to connect your Google Calendars
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {calendars.map((calendar) => (
                  <div
                    key={calendar.id}
                    className="border border-gray-200 rounded-xl p-5 hover:shadow-md transition-all"
                    style={{
                      borderLeftWidth: "4px",
                      borderLeftColor: calendar.color || "#4285f4",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{
                            backgroundColor: calendar.color || "#4285f4",
                          }}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {calendar.calendarName}
                            </h3>
                            {calendar.isPrimary && (
                              <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full font-medium">
                                Primary
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            Last synced: {formatDate(calendar.lastSyncedAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() =>
                            toggleCalendar(
                              calendar.calendarId,
                              calendar.isEnabled
                            )
                          }
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            calendar.isEnabled ? "bg-purple-600" : "bg-gray-200"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              calendar.isEnabled
                                ? "translate-x-6"
                                : "translate-x-1"
                            }`}
                          />
                        </button>
                        <span className="text-sm font-medium text-gray-700 w-16">
                          {calendar.isEnabled ? "Enabled" : "Disabled"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Toast Notifications */}
        <div className="fixed bottom-8 left-8 space-y-2 z-50">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px] animate-in slide-in-from-bottom-5 ${
                toast.type === "success"
                  ? "bg-green-600 text-white"
                  : toast.type === "error"
                  ? "bg-red-600 text-white"
                  : "bg-blue-600 text-white"
              }`}
            >
              {toast.type === "success" && (
                <svg
                  className="w-5 h-5 flex-shrink-0"
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
              )}
              {toast.type === "error" && (
                <svg
                  className="w-5 h-5 flex-shrink-0"
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
              )}
              <span className="flex-1 font-medium">{toast.message}</span>
            </div>
          ))}
        </div>
      </div>
    </ProtectedRoute>
  );
}
