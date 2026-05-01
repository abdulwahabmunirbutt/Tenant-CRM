'use client';

import axios from 'axios';
import { useState } from 'react';
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

  return (
    <div className="space-y-1">
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
          className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs leading-4 text-danger"
        >
          {errorMessage}
        </div>
      )}
    </div>
  );
}
