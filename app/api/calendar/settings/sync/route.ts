import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCalendarClient } from '@/lib/google-calendar';
import { prisma } from '@/lib/prisma';

// POST /api/calendar/settings/sync - Trigger a full sync of calendar list
export async function POST(req: NextRequest) {
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
    console.error('Error syncing calendars:', error);
    return NextResponse.json(
      { error: 'Failed to sync calendars' },
      { status: 500 }
    );
  }
}
