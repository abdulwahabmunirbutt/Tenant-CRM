'use client';

import { useEffect, useState } from 'react';
import { getStoredUser } from '@/lib/auth';
import { User } from '@/lib/types';

export function useCurrentUser() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setUser(getStoredUser());
    setReady(true);
  }, []);

  return { user, ready, isAdmin: user?.role === 'admin' };
}
