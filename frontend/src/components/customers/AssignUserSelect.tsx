'use client';

import axios from 'axios';
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

  return (
    <select
      className="h-8 w-full rounded-md border border-border bg-white px-2 text-sm outline-none focus:border-accent"
      value={customer.assignedTo ?? ''}
      disabled={users.isLoading || assign.isPending}
      onChange={(event) => {
        assign.mutate(
          { customerId: customer.id, assigneeId: event.target.value || null },
          {
            onError: (error) => {
              window.alert(getAssignmentErrorMessage(error));
            },
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
  );
}
