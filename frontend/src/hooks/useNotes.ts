'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Note } from '@/lib/types';

export function useNotes(customerId: string) {
  return useQuery({
    queryKey: ['customers', customerId, 'notes'],
    queryFn: async () => {
      const response = await api.get<Note[]>(`/customers/${customerId}/notes`);
      return response.data;
    },
    enabled: Boolean(customerId),
  });
}

export function useCreateNote(customerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (content: string) => {
      const response = await api.post<Note>(`/customers/${customerId}/notes`, { content });
      return response.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customers', customerId, 'notes'] }),
  });
}

