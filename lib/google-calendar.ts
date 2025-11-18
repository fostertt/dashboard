import { google } from 'googleapis';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function getCalendarClient() {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    throw new Error('No access token available');
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    access_token: session.accessToken as string,
  });

  return google.calendar({ version: 'v3', auth: oauth2Client });
}
