/**
 * Auth Hook: Auto-create session cookie after Firebase login
 * Place this in your Firebase provider or login component
 */

import { useEffect } from 'react';
import { User } from 'firebase/auth';

export async function createSessionCookie(user: User) {
  try {
    const idToken = await user.getIdToken();
    
    const response = await fetch('/api/auth/session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ idToken }),
    });

    if (!response.ok) {
      throw new Error('Failed to create session');
    }

    console.log('✅ Session cookie created');
    return true;
  } catch (error) {
    console.error('❌ Error creating session cookie:', error);
    return false;
  }
}

export async function clearSessionCookie() {
  try {
    await fetch('/api/auth/session', {
      method: 'DELETE',
    });
    console.log('✅ Session cookie cleared');
  } catch (error) {
    console.error('❌ Error clearing session cookie:', error);
  }
}
