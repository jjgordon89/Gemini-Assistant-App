import { CalendarEvent } from '../types';

const CALENDAR_API_BASE_URL = 'https://www.googleapis.com/calendar/v3';

export const getCalendarEvents = async (accessToken: string, maxResults: number = 10): Promise<CalendarEvent[]> => {
  if (!accessToken) {
    throw new Error("Access token is required for Google Calendar API.");
  }
  try {
    const timeMin = new Date().toISOString(); // From now
    const response = await fetch(`${CALENDAR_API_BASE_URL}/calendars/primary/events?maxResults=${maxResults}&timeMin=${timeMin}&orderBy=startTime&singleEvents=true`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Google Calendar API Error Data:", errorData);
      throw new Error(`Failed to fetch calendar events: ${response.status} ${response.statusText}. ${errorData.error?.message || ''}`);
    }
    const data = await response.json();
    return (data.items || []) as CalendarEvent[];
  } catch (error) {
    console.error("Error fetching Google Calendar events:", error);
    throw error;
  }
};

export const addCalendarEvent = async (accessToken: string, eventData: CalendarEvent): Promise<CalendarEvent> => {
  if (!accessToken) {
    throw new Error("Access token is required for Google Calendar API.");
  }
  if (!eventData.summary || !eventData.start || !eventData.end) {
    throw new Error("Event summary, start, and end times are required.");
  }

  try {
    const response = await fetch(`${CALENDAR_API_BASE_URL}/calendars/primary/events`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(eventData),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Google Calendar API Error Data (Add Event):", errorData);
      throw new Error(`Failed to add calendar event: ${response.status} ${response.statusText}. ${errorData.error?.message || ''}`);
    }
    const newEvent = await response.json();
    return newEvent as CalendarEvent;
  } catch (error) {
    console.error("Error adding Google Calendar event:", error);
    throw error;
  }
};