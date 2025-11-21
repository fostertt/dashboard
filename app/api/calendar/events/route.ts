import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getCalendarClient } from '@/lib/google-calendar';

export interface CalendarEvent {
  id: string;
  source: 'google' | 'lifeos';
  calendarId: string;
  calendarName: string;
  calendarColor?: string;
  title: string;
  description?: string;
  location?: string;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  timezone: string;
  htmlLink?: string;
}

// GET /api/calendar/events?startDate=2025-11-19&endDate=2025-11-25
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }

    // Parse dates
    const timeMin = new Date(startDate);
    const timeMax = new Date(endDate);
    timeMax.setHours(23, 59, 59, 999);

    // Get enabled calendars
    const enabledCalendars = await prisma.calendarSync.findMany({
      where: {
        userId: session.user.id,
        isEnabled: true,
      },
    });

    const googleEvents: CalendarEvent[] = [];

    // Only attempt Google Calendar fetch when a calendar is enabled
    if (enabledCalendars.length > 0) {
      const calendar = await getCalendarClient();

      await Promise.all(
        enabledCalendars.map(async (calendarSync) => {
          try {
            const response = await calendar.events.list({
              calendarId: calendarSync.calendarId,
              timeMin: timeMin.toISOString(),
              timeMax: timeMax.toISOString(),
              singleEvents: true,
              orderBy: 'startTime',
            });

            const events = response.data.items || [];

            events.forEach((event) => {
              if (!event.id || !event.start || !event.end) return;

              const isAllDay = !!event.start.date;
              const startTime = event.start.dateTime || event.start.date || '';
              const endTime = event.end.dateTime || event.end.date || '';

              googleEvents.push({
                id: event.id,
                source: 'google',
                calendarId: calendarSync.calendarId,
                calendarName: calendarSync.calendarName,
                calendarColor: calendarSync.color || undefined,
                title: event.summary || 'Untitled Event',
                description: event.description,
                location: event.location,
                startTime,
                endTime,
                isAllDay,
                timezone: event.start.timeZone || 'America/New_York',
                htmlLink: event.htmlLink,
              });
            });
          } catch (error) {
            console.error(
              `Error fetching events from calendar ${calendarSync.calendarName}:`,
              error
            );
          }
        })
      );
    }

    // Fetch Life OS events from database
    const lifeOSEvents = await prisma.calendarEvent.findMany({
      where: {
        userId: session.user.id,
        startTime: {
          gte: timeMin,
          lte: timeMax,
        },
      },
    });

    const lifeOSFormattedEvents: CalendarEvent[] = lifeOSEvents.map((event) => ({
      id: event.id.toString(),
      source: 'lifeos',
      calendarId: event.googleCalendarId || 'lifeos',
      calendarName: 'Life OS',
      calendarColor: '#8B5CF6',
      title: event.title,
      description: event.description || undefined,
      location: event.location || undefined,
      startTime: event.startTime.toISOString(),
      endTime: event.endTime.toISOString(),
      isAllDay: event.isAllDay,
      timezone: event.timezone,
    }));

    // Combine and sort events
    const allEvents = [...googleEvents, ...lifeOSFormattedEvents].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

    return NextResponse.json(allEvents);
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calendar events' },
      { status: 500 }
    );
  }
}
