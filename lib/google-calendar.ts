import { google } from 'googleapis';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function getCalendarClient() {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    throw new Error('No access token available. Please sign in again.');
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  // Set credentials with access_token, refresh_token, and expiry
  // The Google SDK will automatically refresh the token when it expires
  // if a refresh_token is provided
  oauth2Client.setCredentials({
    access_token: session.accessToken as string,
    refresh_token: session.refreshToken as string,
    expiry_date: session.expiresAt as number,
  });

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  htmlLink: string;
}

export interface CalendarListItem {
  id: string;
  summary: string;
  description?: string;
  primary?: boolean;
  backgroundColor?: string;
  foregroundColor?: string;
  selected?: boolean;
}
