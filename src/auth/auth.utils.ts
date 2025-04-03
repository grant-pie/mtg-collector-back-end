// src/auth/auth.utils.ts
import * as crypto from 'crypto';

// Simple in-memory store for OAuth state
// In a production environment with multiple servers, you would use Redis or another shared store
const stateStore = new Map<string, { rememberMe: boolean; expires: number }>();

// Clean up expired states every hour
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of stateStore.entries()) {
    if (value.expires < now) {
      stateStore.delete(key);
    }
  }
}, 60 * 60 * 1000);

export const generateStateParameter = (rememberMe: boolean): string => {
  // Generate a random state value
  const state = crypto.randomBytes(16).toString('hex');
  
  // Store the state with the remember me preference
  stateStore.set(state, { 
    rememberMe, 
    expires: Date.now() + 10 * 60 * 1000 // Expires in 10 minutes
  });
  
  return state;
};

export const validateStateParameter = (state: string): boolean | null => {
  const stateData = stateStore.get(state);
  
  if (!stateData) {
    return null; // State not found
  }
  
  // Delete the state to prevent replay attacks
  stateStore.delete(state);
  
  // Check if state has expired
  if (stateData.expires < Date.now()) {
    return null; // State has expired
  }
  
  return stateData.rememberMe;
};