import { User } from './types';

const TOKEN_KEY = 'crm_token';
const USER_KEY = 'crm_user';

function canUseStorage() {
  return typeof window !== 'undefined';
}

export function getToken() {
  if (!canUseStorage()) return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): User | null {
  if (!canUseStorage()) return null;
  const value = window.localStorage.getItem(USER_KEY);
  if (!value) return null;

  try {
    return JSON.parse(value) as User;
  } catch {
    clearSession();
    return null;
  }
}

export function setSession(token: string, user: User) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

