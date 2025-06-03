
import { Task, TaskList } from '../types';

const TASKS_API_BASE_URL = 'https://www.googleapis.com/tasks/v1';

export const getTaskLists = async (accessToken: string): Promise<TaskList[]> => {
  if (!accessToken) throw new Error("Access token is required for Google Tasks API.");
  try {
    const response = await fetch(`${TASKS_API_BASE_URL}/users/@me/lists`, {
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' },
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Failed to fetch task lists: ${response.status} ${response.statusText}. ${errorData.error?.message || ''}`);
    }
    const data = await response.json();
    return (data.items || []) as TaskList[];
  } catch (error) {
    console.error("Error fetching Google Task lists:", error);
    throw error;
  }
};

export const searchTasks = async (
  accessToken: string,
  taskListId: string = '@default',
  options: {
    query?: string;
    dueMin?: string; 
    dueMax?: string; 
    completedMin?: string; 
    completedMax?: string; 
    status?: 'needsAction' | 'completed';
    showCompleted?: boolean;
    showHidden?: boolean;
    maxResults?: number;
  } = {}
): Promise<Task[]> => {
  if (!accessToken) throw new Error("Access token is required for Google Tasks API.");

  const params = new URLSearchParams();
  // Ensure RFC3339 for date fields if only date is provided
  if (options.dueMin && !options.dueMin.includes('T')) params.append('dueMin', new Date(options.dueMin + "T00:00:00Z").toISOString());
  else if (options.dueMin) params.append('dueMin', new Date(options.dueMin).toISOString());

  if (options.dueMax && !options.dueMax.includes('T')) params.append('dueMax', new Date(options.dueMax + "T23:59:59Z").toISOString());
  else if (options.dueMax) params.append('dueMax', new Date(options.dueMax).toISOString());
  
  if (options.completedMin) params.append('completedMin', new Date(options.completedMin).toISOString());
  if (options.completedMax) params.append('completedMax', new Date(options.completedMax).toISOString());
  
  if (options.showCompleted !== undefined) params.append('showCompleted', String(options.showCompleted));
  if (options.showHidden !== undefined) params.append('showHidden', String(options.showHidden));
  params.append('maxResults', (options.maxResults || 20).toString());

  try {
    const response = await fetch(`${TASKS_API_BASE_URL}/lists/${taskListId}/tasks?${params.toString()}`, {
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' },
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
      throw new Error(`Failed to search tasks: ${response.status} ${response.statusText}. ${errorData.error?.message || errorData.message}`);
    }
    let tasks = ((await response.json()).items || []) as Task[];

    if (options.query) {
        const lcQuery = options.query.toLowerCase();
        tasks = tasks.filter(task =>
            (task.title && task.title.toLowerCase().includes(lcQuery)) ||
            (task.notes && task.notes.toLowerCase().includes(lcQuery))
        );
    }
    if (options.status) {
        tasks = tasks.filter(task => task.status === options.status);
    }

    return tasks;
  } catch (error) {
    console.error("Error searching Google Tasks:", error);
    throw error;
  }
};


export const addTask = async (accessToken: string, taskListId: string = '@default', taskDetails: { title: string; notes?: string; due?: string }): Promise<Task> => {
  if (!accessToken) throw new Error("Access token is required for Google Tasks API.");
  if (!taskDetails.title) throw new Error("Task title is required.");

  const body: any = { title: taskDetails.title };
  if (taskDetails.notes) body.notes = taskDetails.notes;
  if (taskDetails.due) { // Due date should be YYYY-MM-DD, API expects RFC3339 for 'due' field
    if (!taskDetails.due.includes('T')) {
        body.due = new Date(taskDetails.due + "T00:00:00Z").toISOString();
    } else {
        body.due = new Date(taskDetails.due).toISOString();
    }
  }

  try {
    const response = await fetch(`${TASKS_API_BASE_URL}/lists/${taskListId}/tasks`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Failed to add task: ${response.status} ${response.statusText}. ${errorData.error?.message || ''}`);
    }
    const newTask = await response.json();
    return newTask as Task;
  } catch (error) {
    console.error("Error adding Google Task:", error);
    throw error;
  }
};

export const updateTask = async (accessToken: string, taskListId: string = '@default', taskId: string, updates: Partial<Omit<Task, 'id'>>): Promise<Task> => {
  if (!accessToken) throw new Error("Access token is required for Google Tasks API.");
  if (!taskId) throw new Error("Task ID is required for updating.");

  const bodyUpdates: any = { ...updates };

  // If 'due' date is provided, ensure it's in RFC3339 format.
  // Tool schema for UpdateTaskArgs expects dueDate as YYYY-MM-DD.
  if (bodyUpdates.due && typeof bodyUpdates.due === 'string') {
    if (!bodyUpdates.due.includes('T')) { // If it's just a date string YYYY-MM-DD
      bodyUpdates.due = new Date(bodyUpdates.due + "T00:00:00Z").toISOString();
    } else { // If it's already a full timestamp (or potentially invalid, Date constructor will handle)
      bodyUpdates.due = new Date(bodyUpdates.due).toISOString();
    }
  }

  // The Google Tasks API handles the 'completed' field (timestamp)
  // automatically based on the 'status' field.
  // Do not manually set 'completed' here if 'status' is being set.
  // If 'completed' is explicitly part of `updates` (e.g. to nullify it), the API might handle it,
  // but relying on 'status' is cleaner.
  if ('completed' in bodyUpdates && bodyUpdates.status) {
    delete bodyUpdates.completed; // Let 'status' drive the 'completed' timestamp on the API side.
  }
  
  delete bodyUpdates.id; // Ensure ID is not in the body

  try {
    const response = await fetch(`${TASKS_API_BASE_URL}/lists/${taskListId}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(bodyUpdates),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Failed to update task: ${response.status} ${response.statusText}. ${errorData.error?.message || ''}`);
    }
    const updatedTask = await response.json();
    return updatedTask as Task;
  } catch (error) {
    console.error("Error updating Google Task:", error);
    throw error;
  }
};

export const deleteTask = async (accessToken: string, taskListId: string = '@default', taskId: string): Promise<void> => {
  if (!accessToken) throw new Error("Access token is required for Google Tasks API.");
  if (!taskId) throw new Error("Task ID is required for deletion.");

  try {
    const response = await fetch(`${TASKS_API_BASE_URL}/lists/${taskListId}/tasks/${taskId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    if (response.status === 204) {
        return; // Success
    }
    if (!response.ok) { 
      const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
      throw new Error(`Failed to delete task: ${response.status} ${response.statusText}. ${errorData.error?.message || errorData.message}`);
    }
    // If .ok but not 204 (e.g. 200), log warning or treat as unexpected.
    // console.warn(`Unexpected status ${response.status} for DELETE task.`);
  } catch (error) {
    console.error("Error deleting Google Task:", error);
    throw error;
  }
};
