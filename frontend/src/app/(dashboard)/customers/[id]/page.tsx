'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { CustomerForm } from '@/components/customers/CustomerForm';
import { NotesPanel } from '@/components/customers/NotesPanel';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useCustomer } from '@/hooks/useCustomers';

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const customer = useCustomer(params.id);
  const { isAdmin } = useCurrentUser();

  if (customer.isLoading) {
    return <p className="text-sm text-muted">Loading customer...</p>;
  }

  if (customer.isError || !customer.data) {
    return <p className="text-sm text-danger">Customer not found.</p>;
  }

  return (
    <section className="space-y-6">
      <div className="border-b border-border pb-4">
        <Link href="/customers" className="text-sm font-medium text-accent hover:underline">
          Back to customers
        </Link>
        <h1 className="mt-3 text-2xl font-semibold">{customer.data.name}</h1>
        <p className="mt-1 text-sm text-muted">{customer.data.email}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
        <CustomerForm customer={customer.data} canEdit={isAdmin} />
        <NotesPanel customerId={customer.data.id} />
      </div>
    </section>
  );
}
