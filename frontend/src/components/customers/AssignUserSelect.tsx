'use client';

import { useAssignCustomer } from '@/hooks/useCustomers';
import { useUsers } from '@/hooks/useUsers';
import { Customer } from '@/lib/types';

export function AssignUserSelect({ customer }: { customer: Customer }) {
  const users = useUsers();
  const assign = useAssignCustomer();

  return (
    <select
      className="h-8 w-full rounded-md border border-border bg-white px-2 text-sm outline-none focus:border-accent"
      value={customer.assignedTo ?? ''}
      disabled={users.isLoading || assign.isPending}
      onChange={(event) => {
        assign.mutate({ customerId: customer.id, assigneeId: event.target.value || null });
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
