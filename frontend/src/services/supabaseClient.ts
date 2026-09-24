import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://pioiufwxzsgpagnmdcpp.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

export const supabase = (supabaseUrl && supabaseAnonKey && !supabaseAnonKey.includes('your-supabase'))
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  title: string;
  institution?: string;
  token?: string;
}

const STORAGE_KEY = 'neuroscan_active_user';

export function getStoredUser(): UserProfile {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.warn('Failed to parse stored user profile', e);
  }
  return {
    id: 'demo-user-123',
    email: 'researcher@neuroscan.ai',
    firstName: 'Medical',
    lastName: 'Researcher',
    title: 'Dr.',
    institution: 'Clinical AI Research Lab'
  };
}

export function saveStoredUser(user: UserProfile) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } catch (e) {
    console.error('Failed to persist user profile', e);
  }
}

export function clearStoredUser() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear user profile', e);
  }
}
