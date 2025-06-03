// services/noteService.ts
import { Note } from '../types';

const NOTES_STORAGE_KEY = 'chromaAINotes';

const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
};

export const getNotes = async (): Promise<Note[]> => {
  try {
    const notesJson = localStorage.getItem(NOTES_STORAGE_KEY);
    return notesJson ? JSON.parse(notesJson) : [];
  } catch (error) {
    console.error("Error fetching notes from localStorage:", error);
    return [];
  }
};

export const addNote = async (content: string): Promise<Note> => {
  if (!content.trim()) {
    throw new Error("Note content cannot be empty.");
  }
  const currentNotes = await getNotes();
  const newNote: Note = {
    id: generateId(),
    content: content.trim(),
    createdAt: new Date().toISOString(),
  };
  const updatedNotes = [...currentNotes, newNote];
  try {
    localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(updatedNotes));
    return newNote; // Return the created note
  } catch (error) {
    console.error("Error saving note to localStorage:", error);
    throw new Error("Failed to save note.");
  }
};

export const deleteNote = async (id: string): Promise<void> => {
  let currentNotes = await getNotes();
  const updatedNotes = currentNotes.filter(note => note.id !== id);
  if (currentNotes.length === updatedNotes.length) {
    // Optional: throw error if note not found, or just proceed
    console.warn(`Note with ID ${id} not found for deletion.`);
  }
  try {
    localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(updatedNotes));
  } catch (error) {
    console.error("Error deleting note from localStorage:", error);
    throw new Error("Failed to delete note.");
  }
};