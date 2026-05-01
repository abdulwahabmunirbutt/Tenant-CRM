'use client';

import axios from 'axios';
import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAssignCustomer } from '@/hooks/useCustomers';
import { useUsers } from '@/hooks/useUsers';
import { Customer } from '@/lib/types';

interface ApiErrorResponse {
  message?: string | string[];
}

function getAssignmentErrorMessage(error: Error) {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) return message.join('\n');
    if (message) return message;
  }

  return 'Unable to assign customer. Please try again.';
}

export function AssignUserSelect({ customer }: { customer: Customer }) {
  const users = useUsers();
  const assign = useAssignCustomer();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!errorMessage) return;
    const timer = window.setTimeout(() => setErrorMessage(null), 4000);
    return () => window.clearTimeout(timer);
  }, [errorMessage]);

  return (
    <>
      <select
        className="h-8 w-full rounded-md border border-border bg-white px-2 text-sm outline-none focus:border-accent disabled:bg-surface"
        value={customer.assignedTo ?? ''}
        disabled={users.isLoading || assign.isPending}
        onChange={(event) => {
          setErrorMessage(null);
          assign.mutate(
            { customerId: customer.id, assigneeId: event.target.value || null },
            {
              onError: (error) => {
                setErrorMessage(getAssignmentErrorMessage(error));
              },
              onSuccess: () => setErrorMessage(null),
            },
          );
        }}
      >
        <option value="">Unassigned</option>
        {users.data?.map((user) => (
          <option key={user.id} value={user.id}>
            {user.name}
          </option>
        ))}
      </select>
      {errorMessage && (
        <div
          role="alert"
          className="fixed right-4 top-4 z-50 flex w-[min(92vw,420px)] items-start gap-3 rounded-md border border-red-200 bg-white p-3 text-sm text-ink shadow-lg"
        >
          <div className="mt-0.5 h-2 w-2 flex-none rounded-full bg-danger" />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-danger">Assignment blocked</p>
            <p className="mt-1 text-muted">{errorMessage}</p>
          </div>
          <button
            type="button"
            className="rounded p-1 text-muted transition hover:bg-surface hover:text-ink"
            aria-label="Dismiss assignment error"
            onClick={() => setErrorMessage(null)}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </>
  );
}
