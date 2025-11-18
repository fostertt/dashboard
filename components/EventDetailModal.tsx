"use client";

import React from "react";

interface CalendarEvent {
  id: string;
  source: "google" | "lifeos";
  calendarId: string;
  calendarName: string;
  calendarColor: string;
  title: string;
  description?: string;
  location?: string;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  timezone: string;
}

interface EventDetailModalProps {
  event: CalendarEvent;
  onClose: () => void;
}

export default function EventDetailModal({ event, onClose }: EventDetailModalProps) {
  const formatDateTime = (dateTimeStr: string, isAllDay: boolean) => {
    const date = new Date(dateTimeStr);
    if (isAllDay) {
      return date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }
    return date.toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    });
  };

  const formatTime = (dateTimeStr: string) => {
    const date = new Date(dateTimeStr);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getGoogleCalendarUrl = () => {
    if (event.source === "google") {
      // Extract the event ID and calendar ID to create a Google Calendar link
      const eventId = event.id.split("_")[0]; // Google event IDs can have recurring instance suffixes
      return `https://calendar.google.com/calendar/u/0/r/eventedit/${eventId}`;
    }
    return null;
  };

  const getGoogleMapsUrl = () => {
    if (event.location) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`;
    }
    return null;
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with calendar color */}
        <div className="mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start gap-3 flex-1">
              <div
                className="w-1 h-full rounded-full flex-shrink-0"
                style={{ backgroundColor: event.calendarColor }}
              />
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{event.title}</h2>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">{event.calendarName}</span>
                  {event.source === "lifeos" && (
                    <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full font-medium">
                      Life OS
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg
                className="w-6 h-6"
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
        </div>

        {/* Event details */}
        <div className="space-y-4">
          {/* Time */}
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0"
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
            <div>
              {event.isAllDay ? (
                <>
                  <p className="text-gray-900 font-medium">All Day</p>
                  <p className="text-gray-600 text-sm">{formatDateTime(event.startTime, true)}</p>
                </>
              ) : (
                <>
                  <p className="text-gray-900 font-medium">
                    {formatTime(event.startTime)} - {formatTime(event.endTime)}
                  </p>
                  <p className="text-gray-600 text-sm">{formatDateTime(event.startTime, false)}</p>
                  {event.timezone !== "America/New_York" && (
                    <p className="text-gray-500 text-xs mt-1">Timezone: {event.timezone}</p>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Location */}
          {event.location && (
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <div className="flex-1">
                <p className="text-gray-900">{event.location}</p>
                {getGoogleMapsUrl() && (
                  <a
                    href={getGoogleMapsUrl()!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 text-sm inline-flex items-center gap-1 mt-1"
                  >
                    Open in Maps
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h7"
                />
              </svg>
              <div className="flex-1">
                <p className="text-gray-900 whitespace-pre-wrap">{event.description}</p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-8 pt-6 border-t border-gray-200 flex justify-between">
          <div>
            {event.source === "google" && getGoogleCalendarUrl() && (
              <a
                href={getGoogleCalendarUrl()!}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
                Open in Google Calendar
              </a>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
