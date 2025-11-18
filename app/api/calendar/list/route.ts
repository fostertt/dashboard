import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCalendarClient } from '@/lib/google-calendar';
import { prisma } from '@/lib/prisma';

// GET /api/calendar/list - Fetch user's Google Calendar list
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const calendar = await getCalendarClient();

    // Fetch calendar list from Google
    const response = await calendar.calendarList.list();
    const calendars = response.data.items || [];

    // Upsert each calendar in the database
    for (const cal of calendars) {
      if (!cal.id) continue;

      await prisma.calendarSync.upsert({
        where: {
          userId_calendarId: {
            userId: session.user.id,
            calendarId: cal.id,
          },
        },
        update: {
          calendarName: cal.summary || 'Unnamed Calendar',
          color: cal.backgroundColor || null,
          isPrimary: cal.primary || false,
          lastSyncedAt: new Date(),
        },
        create: {
          userId: session.user.id,
          calendarId: cal.id,
          calendarName: cal.summary || 'Unnamed Calendar',
          color: cal.backgroundColor || null,
          isPrimary: cal.primary || false,
          isEnabled: true,
          lastSyncedAt: new Date(),
        },
      });
    }

    // Fetch all CalendarSync records for this user
    const userCalendars = await prisma.calendarSync.findMany({
      where: { userId: session.user.id },
      orderBy: [
        { isPrimary: 'desc' },
        { calendarName: 'asc' },
      ],
    });

    return NextResponse.json(userCalendars);
  } catch (error) {
    console.error('Error fetching calendar list:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calendar list' },
      { status: 500 }
    );
  }
}

// PATCH /api/calendar/list - Toggle calendar enabled/disabled
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { calendarId, isEnabled } = body;

    if (!calendarId || typeof isEnabled !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    // Update the calendar sync record
    const updatedCalendar = await prisma.calendarSync.updateMany({
      where: {
        userId: session.user.id,
        calendarId: calendarId,
      },
      data: {
        isEnabled: isEnabled,
      },
    });

    if (updatedCalendar.count === 0) {
      return NextResponse.json(
        { error: 'Calendar not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating calendar:', error);
    return NextResponse.json(
      { error: 'Failed to update calendar' },
      { status: 500 }
    );
  }
}
