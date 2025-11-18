import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCalendarClient } from '@/lib/google-calendar';
import { prisma } from '@/lib/prisma';

interface CalendarEvent {
  id: string;
  source: 'google' | 'lifeos';
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

// GET /api/calendar/events?startDate=2025-11-18&endDate=2025-11-25
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }

    // Get user's enabled calendars
    const enabledCalendars = await prisma.calendarSync.findMany({
      where: {
        userId: session.user.id,
        isEnabled: true,
      },
    });

    const allEvents: CalendarEvent[] = [];
    const calendar = await getCalendarClient();

    // Fetch events from each enabled Google Calendar
    for (const cal of enabledCalendars) {
      try {
        const response = await calendar.events.list({
          calendarId: cal.calendarId,
          timeMin: new Date(startDate).toISOString(),
          timeMax: new Date(endDate).toISOString(),
          singleEvents: true,
          orderBy: 'startTime',
        });

        const events = response.data.items || [];

        for (const event of events) {
          if (!event.id) continue;

          // Determine if it's an all-day event
          const isAllDay = !!(event.start?.date && !event.start?.dateTime);

          // Get start and end times
          const startTime = event.start?.dateTime || event.start?.date || '';
          const endTime = event.end?.dateTime || event.end?.date || '';

          allEvents.push({
            id: event.id,
            source: 'google',
            calendarId: cal.calendarId,
            calendarName: cal.calendarName,
            calendarColor: cal.color || '#4285f4',
            title: event.summary || 'Untitled Event',
            description: event.description,
            location: event.location,
            startTime,
            endTime,
            isAllDay,
            timezone: event.start?.timeZone || 'America/New_York',
          });
        }
      } catch (error) {
        console.error(`Error fetching events for calendar ${cal.calendarId}:`, error);
        // Continue with other calendars even if one fails
      }
    }

    // Fetch Life OS events from database
    const lifeOsEvents = await prisma.calendarEvent.findMany({
      where: {
        userId: session.user.id,
        startTime: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      orderBy: {
        startTime: 'asc',
      },
    });

    // Add Life OS events to the list
    for (const event of lifeOsEvents) {
      allEvents.push({
        id: `lifeos-${event.id}`,
        source: 'lifeos',
        calendarId: event.googleCalendarId || 'lifeos',
        calendarName: event.googleCalendarId
          ? enabledCalendars.find((c) => c.calendarId === event.googleCalendarId)?.calendarName || 'Life OS'
          : 'Life OS',
        calendarColor: '#8b5cf6',
        title: event.title,
        description: event.description || undefined,
        location: event.location || undefined,
        startTime: event.startTime.toISOString(),
        endTime: event.endTime.toISOString(),
        isAllDay: event.isAllDay,
        timezone: event.timezone,
      });
    }

    // Sort all events by start time
    allEvents.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    return NextResponse.json(allEvents);
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calendar events' },
      { status: 500 }
    );
  }
}
