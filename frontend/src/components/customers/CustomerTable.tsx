'use client';

import { Eye, Plus, RotateCcw, Search, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useCustomers, useDeleteCustomer, useRestoreCustomer } from '@/hooks/useCustomers';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useDebounce } from '@/hooks/useDebounce';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import { AssignUserSelect } from './AssignUserSelect';

export function CustomerTable() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);
  const debouncedSearch = useDebounce(search);
  const { isAdmin, ready } = useCurrentUser();
  const customers = useCustomers({
    page,
    search: debouncedSearch || undefined,
    deletedOnly: isAdmin && showDeleted ? true : undefined,
  });
  const remove = useDeleteCustomer();
  const restore = useRestoreCustomer();

  useEffect(() => {
    if (ready && !isAdmin) {
      setShowDeleted(false);
    }
  }, [isAdmin, ready]);

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 border-b border-border pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Customers</h1>
          <p className="mt-1 text-sm text-muted">
            {isAdmin ? 'Search, assign, and maintain customer records.' : 'View customer records and add notes.'}
          </p>
        </div>
        {isAdmin && !showDeleted && (
          <Link
            href="/customers/new"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-accent px-3 text-sm font-medium text-white transition hover:bg-teal-800"
          >
            <Plus size={16} />
            New customer
          </Link>
        )}
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 text-muted" size={16} />
          <Input
            className="pl-9"
            placeholder="Search by name or email"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>

        {isAdmin && (
          <div className="inline-flex rounded-md border border-border bg-white p-1">
            <button
              className={cn(
                'h-8 rounded px-3 text-sm font-medium text-muted transition hover:text-ink',
                !showDeleted && 'bg-surface text-ink',
              )}
              onClick={() => {
                setShowDeleted(false);
                setPage(1);
              }}
            >
              Active
            </button>
            <button
              className={cn(
                'h-8 rounded px-3 text-sm font-medium text-muted transition hover:text-ink',
                showDeleted && 'bg-surface text-ink',
              )}
              onClick={() => {
                setShowDeleted(true);
                setPage(1);
              }}
            >
              Deleted
            </button>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-white shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-border bg-surface text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Assigned to</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.isLoading && (
                <tr>
                  <td className="px-4 py-8 text-center text-muted" colSpan={5}>
                    Loading customers...
                  </td>
                </tr>
              )}
              {customers.isError && (
                <tr>
                  <td className="px-4 py-8 text-center text-danger" colSpan={5}>
                    Failed to load customers.
                  </td>
                </tr>
              )}
              {customers.data?.data.map((customer) => (
                <tr key={customer.id} className="border-b border-border last:border-0 hover:bg-surface">
                  <td className="px-4 py-3 font-medium">{customer.name}</td>
                  <td className="px-4 py-3 text-muted">{customer.email}</td>
                  <td className="px-4 py-3 text-muted">{customer.phone ?? '-'}</td>
                  <td className="px-4 py-3">
                    {isAdmin && !showDeleted ? (
                      <AssignUserSelect customer={customer} />
                    ) : (
                      <span className="text-muted">{customer.assignedUser?.name ?? 'Unassigned'}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {!showDeleted && (
                        <Link
                          href={`/customers/${customer.id}`}
                          className="inline-flex h-8 items-center gap-2 rounded-md border border-border px-2 text-xs font-medium hover:bg-surface"
                        >
                          <Eye size={14} />
                          View
                        </Link>
                      )}
                      {isAdmin && !showDeleted && (
                        <button
                          className="inline-flex h-8 items-center gap-2 rounded-md bg-red-50 px-2 text-xs font-medium text-danger hover:bg-red-100 disabled:opacity-50"
                          disabled={remove.isPending}
                          onClick={() => remove.mutate(customer.id)}
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      )}
                      {isAdmin && showDeleted && (
                        <button
                          className="inline-flex h-8 items-center gap-2 rounded-md border border-border px-2 text-xs font-medium hover:bg-surface disabled:opacity-50"
                          disabled={restore.isPending}
                          onClick={() => restore.mutate(customer.id)}
                        >
                          <RotateCcw size={14} />
                          Restore
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {customers.data?.data.length === 0 && (
                <tr>
                  <td className="px-4 py-8 text-center text-muted" colSpan={5}>
                    No customers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 text-sm">
        <Button variant="secondary" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
          Previous
        </Button>
        <span className="text-muted">
          Page {page} of {customers.data?.meta.totalPages ?? 1}
        </span>
        <Button
          variant="secondary"
          disabled={page >= (customers.data?.meta.totalPages ?? 1)}
          onClick={() => setPage((current) => current + 1)}
        >
          Next
        </Button>
      </div>
    </section>
  );
}
