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

export const getTasks = async (accessToken: string, taskListId: string = '@default', showCompleted: boolean = false, maxResults: number = 20): Promise<Task[]> => {
  if (!accessToken) throw new Error("Access token is required for Google Tasks API.");
  try {
    const response = await fetch(`${TASKS_API_BASE_URL}/lists/${taskListId}/tasks?showCompleted=${showCompleted}&maxResults=${maxResults}`, {
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' },
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Failed to fetch tasks: ${response.status} ${response.statusText}. ${errorData.error?.message || ''}`);
    }
    const data = await response.json();
    return (data.items || []) as Task[];
  } catch (error) {
    console.error("Error fetching Google Tasks:", error);
    throw error;
  }
};

export const addTask = async (accessToken: string, taskListId: string = '@default', taskDetails: { title: string; notes?: string; due?: string }): Promise<Task> => {
  if (!accessToken) throw new Error("Access token is required for Google Tasks API.");
  if (!taskDetails.title) throw new Error("Task title is required.");

  try {
    const response = await fetch(`${TASKS_API_BASE_URL}/lists/${taskListId}/tasks`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(taskDetails),
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

export const updateTask = async (accessToken: string, taskListId: string = '@default', taskId: string, updates: Partial<Task>): Promise<Task> => {
  if (!accessToken) throw new Error("Access token is required for Google Tasks API.");
  if (!taskId) throw new Error("Task ID is required for updating.");

  // Google Tasks API uses 'completed' (datetime string) and 'status' ('needsAction' or 'completed')
  // If status is 'completed' but 'completed' timestamp is not set, set it to now.
  // If status is 'needsAction', 'completed' should be null.
  if (updates.status === 'completed' && !updates.completed) {
    updates.completed = new Date().toISOString();
  } else if (updates.status === 'needsAction') {
    updates.completed = undefined; // Or null, API might treat empty string / null differently
  }

  try {
    const response = await fetch(`${TASKS_API_BASE_URL}/lists/${taskListId}/tasks/${taskId}`, {
      method: 'PATCH', // PATCH for partial updates, PUT for full replacement
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(updates),
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