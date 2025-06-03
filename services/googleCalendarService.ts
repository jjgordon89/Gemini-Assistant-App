
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

export const searchCalendarEvents = async (
  accessToken: string,
  query?: string,
  timeMin?: string, // ISO string
  timeMax?: string, // ISO string
  maxResults: number = 10
): Promise<CalendarEvent[]> => {
  if (!accessToken) throw new Error("Access token is required.");

  const params = new URLSearchParams();
  params.append('maxResults', maxResults.toString());
  params.append('orderBy', 'startTime');
  params.append('singleEvents', 'true'); // Important for expanding recurring events

  if (query) params.append('q', query);
  if (timeMin) params.append('timeMin', timeMin);
  if (timeMax) params.append('timeMax', timeMax);
  if (!timeMin && !query) { // If no query and no timeMin, default timeMin to now to avoid fetching all past events
    params.append('timeMin', new Date().toISOString());
  }


  try {
    const response = await fetch(`${CALENDAR_API_BASE_URL}/calendars/primary/events?${params.toString()}`, {
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' },
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
      throw new Error(`Failed to search calendar events: ${response.status} ${response.statusText}. ${errorData.error?.message || errorData.message}`);
    }
    const data = await response.json();
    return (data.items || []) as CalendarEvent[];
  } catch (error) {
    console.error("Error searching Google Calendar events:", error);
    throw error;
  }
};

export const updateCalendarEvent = async (
  accessToken: string,
  eventId: string,
  updates: Partial<CalendarEvent> // Fields like summary, description, start.dateTime, end.dateTime, location
): Promise<CalendarEvent> => {
  if (!accessToken) throw new Error("Access token is required.");
  if (!eventId) throw new Error("Event ID is required for updating.");
  if (Object.keys(updates).length === 0) throw new Error("No updates provided for the event.");

  // Ensure start and end are objects if dateTime is provided
  if (updates.start && typeof updates.start.dateTime === 'string' && !updates.start.timeZone) {
      // Attempt to infer timezone or use a default if necessary, Google often defaults to user's primary
  }
  if (updates.end && typeof updates.end.dateTime === 'string' && !updates.end.timeZone) {
      // Similar for end time
  }


  try {
    const response = await fetch(`${CALENDAR_API_BASE_URL}/calendars/primary/events/${eventId}`, {
      method: 'PATCH', // PATCH for partial updates
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
      throw new Error(`Failed to update calendar event: ${response.status} ${response.statusText}. ${errorData.error?.message || errorData.message}`);
    }
    return (await response.json()) as CalendarEvent;
  } catch (error) {
    console.error("Error updating Google Calendar event:", error);
    throw error;
  }
};

export const deleteCalendarEvent = async (accessToken: string, eventId: string): Promise<void> => {
  if (!accessToken) throw new Error("Access token is required.");
  if (!eventId) throw new Error("Event ID is required for deletion.");

  try {
    const response = await fetch(`${CALENDAR_API_BASE_URL}/calendars/primary/events/${eventId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    if (!response.ok || response.status === 204) { // 204 No Content is success for DELETE
        if (response.status === 204) return; // Success
      const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
      throw new Error(`Failed to delete calendar event: ${response.status} ${response.statusText}. ${errorData.error?.message || errorData.message}`);
    }
    // No content on successful delete (status 204)
  } catch (error) {
    console.error("Error deleting Google Calendar event:", error);
    throw error;
  }
};
