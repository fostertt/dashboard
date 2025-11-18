import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/calendar/settings - Get user's CalendarSync records
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const calendarSyncs = await prisma.calendarSync.findMany({
      where: { userId: session.user.id },
      orderBy: [
        { isPrimary: 'desc' },
        { calendarName: 'asc' },
      ],
    });

    return NextResponse.json(calendarSyncs);
  } catch (error) {
    console.error('Error fetching calendar settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calendar settings' },
      { status: 500 }
    );
  }
}
