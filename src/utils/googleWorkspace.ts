import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Google Workspace Scopes
export const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/tasks',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

// Initialize Firebase App singleton
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));

// In-Memory Token Caching (Strict security compliance per SKILL.md)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        onAuthSuccess?.(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // Token must be refreshed via user sign-in flow
        onAuthFailure?.();
      }
    } else {
      cachedAccessToken = null;
      onAuthFailure?.();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Google Workspace credentials');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Workspace Sign-in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const googleLogout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

// ==========================================
// 1. GMAIL INTEGRATION
// ==========================================

export interface GmailEmail {
  id: string;
  threadId: string;
  snippet: string;
  subject: string;
  from: string;
  date: string;
  unread: boolean;
}

export async function fetchUserGmailMessages(maxResults = 6): Promise<GmailEmail[]> {
  const token = await getAccessToken();
  if (!token) throw new Error('Authentication required for Gmail. Please sign in to Google Workspace.');

  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!listRes.ok) {
    throw new Error(`Gmail API returned status ${listRes.status}`);
  }

  const listData = await listRes.json();
  const messages: any[] = listData.messages || [];

  const emails: GmailEmail[] = [];
  for (const m of messages) {
    try {
      const detailRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (detailRes.ok) {
        const detail = await detailRes.json();
        const headers = detail.payload?.headers || [];
        const subject = headers.find((h: any) => h.name.toLowerCase() === 'subject')?.value || '(No Subject)';
        const from = headers.find((h: any) => h.name.toLowerCase() === 'from')?.value || 'Unknown Sender';
        const date = headers.find((h: any) => h.name.toLowerCase() === 'date')?.value || '';
        const unread = (detail.labelIds || []).includes('UNREAD');

        emails.push({
          id: detail.id,
          threadId: detail.threadId,
          snippet: detail.snippet || '',
          subject,
          from,
          date,
          unread,
        });
      }
    } catch (e) {
      console.warn('Error reading message detail:', e);
    }
  }

  return emails;
}

export async function sendGmailMessage(to: string, subject: string, bodyText: string): Promise<{ success: boolean; id: string }> {
  const token = await getAccessToken();
  if (!token) throw new Error('Authentication required for Gmail');

  // RFC 2822 format base64url encoded
  const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
  const messageParts = [
    `To: ${to}`,
    `Subject: ${utf8Subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: 7bit',
    '',
    bodyText,
  ];
  const message = messageParts.join('\r\n');
  const base64UrlMessage = btoa(unescape(encodeURIComponent(message)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: base64UrlMessage }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to send email (status ${res.status})`);
  }

  const data = await res.json();
  return { success: true, id: data.id };
}

// ==========================================
// 2. GOOGLE CALENDAR INTEGRATION
// ==========================================

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: string;
  end: string;
  location?: string;
  htmlLink?: string;
}

export async function fetchGoogleCalendarEvents(timeMin?: string): Promise<GoogleCalendarEvent[]> {
  const token = await getAccessToken();
  if (!token) throw new Error('Authentication required for Google Calendar');

  const nowIso = timeMin || new Date().toISOString();
  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(
    nowIso
  )}&maxResults=8&singleEvents=true&orderBy=startTime`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Google Calendar API returned status ${res.status}`);
  }

  const data = await res.json();
  const items: any[] = data.items || [];

  return items.map((item) => ({
    id: item.id,
    summary: item.summary || 'Untitled Event',
    description: item.description,
    start: item.start?.dateTime || item.start?.date || '',
    end: item.end?.dateTime || item.end?.date || '',
    location: item.location,
    htmlLink: item.htmlLink,
  }));
}

export async function createGoogleCalendarEvent(
  summary: string,
  startDateTime: string,
  endDateTime: string,
  description?: string,
  location?: string
): Promise<GoogleCalendarEvent> {
  const token = await getAccessToken();
  if (!token) throw new Error('Authentication required for Google Calendar');

  const body = {
    summary,
    description: description || 'Created via COSMIC Tactical AI',
    start: {
      dateTime: startDateTime,
    },
    end: {
      dateTime: endDateTime,
    },
    location,
  };

  const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to create calendar event (${res.status})`);
  }

  const item = await res.json();
  return {
    id: item.id,
    summary: item.summary,
    description: item.description,
    start: item.start?.dateTime || item.start?.date,
    end: item.end?.dateTime || item.end?.date,
    location: item.location,
    htmlLink: item.htmlLink,
  };
}

// ==========================================
// 3. GOOGLE TASKS INTEGRATION
// ==========================================

export interface GoogleTaskItem {
  id: string;
  title: string;
  notes?: string;
  due?: string;
  status: 'needsAction' | 'completed';
}

export async function fetchGoogleTasks(): Promise<GoogleTaskItem[]> {
  const token = await getAccessToken();
  if (!token) throw new Error('Authentication required for Google Tasks');

  const res = await fetch('https://tasks.googleapis.com/tasks/v1/lists/@default/tasks?showCompleted=false&maxResults=10', {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Google Tasks API returned status ${res.status}`);
  }

  const data = await res.json();
  const items: any[] = data.items || [];
  return items.map((t) => ({
    id: t.id,
    title: t.title || 'Untitled Task',
    notes: t.notes,
    due: t.due,
    status: t.status,
  }));
}

export async function createGoogleTask(title: string, notes?: string, due?: string): Promise<GoogleTaskItem> {
  const token = await getAccessToken();
  if (!token) throw new Error('Authentication required for Google Tasks');

  const res = await fetch('https://tasks.googleapis.com/tasks/v1/lists/@default/tasks', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title,
      notes: notes || 'Created via COSMIC Butler',
      due,
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to create Google task (${res.status})`);
  }

  const data = await res.json();
  return {
    id: data.id,
    title: data.title,
    notes: data.notes,
    due: data.due,
    status: data.status,
  };
}

// ==========================================
// 4. GOOGLE DRIVE INTEGRATION
// ==========================================

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  webViewLink?: string;
  iconLink?: string;
}

export async function fetchGoogleDriveFiles(pageSize = 8): Promise<GoogleDriveFile[]> {
  const token = await getAccessToken();
  if (!token) throw new Error('Authentication required for Google Drive');

  const url = `https://www.googleapis.com/drive/v3/files?pageSize=${pageSize}&fields=files(id,name,mimeType,modifiedTime,webViewLink,iconLink)&orderBy=modifiedTime%20desc`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Google Drive API returned status ${res.status}`);
  }

  const data = await res.json();
  return data.files || [];
}

// ==========================================
// 5. YOUTUBE INTEGRATION
// ==========================================

export interface YouTubeVideoItem {
  id: string;
  title: string;
  description: string;
  channelTitle: string;
  thumbnail: string;
  url: string;
}

export async function searchYouTubeVideos(query: string, maxResults = 6): Promise<YouTubeVideoItem[]> {
  const token = await getAccessToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(query)}&maxResults=${maxResults}`, {
    headers,
  });

  if (!res.ok) {
    throw new Error(`YouTube API returned status ${res.status}`);
  }

  const data = await res.json();
  return data.videos || [];
}
