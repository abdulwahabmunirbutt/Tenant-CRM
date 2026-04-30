'use client';

import Link from 'next/link';
import { CustomerForm } from '@/components/customers/CustomerForm';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export default function NewCustomerPage() {
  const { isAdmin, ready } = useCurrentUser();

  if (!ready) {
    return <p className="text-sm text-muted">Loading...</p>;
  }

  if (!isAdmin) {
    return (
      <section className="max-w-2xl space-y-4">
        <Link href="/customers" className="text-sm font-medium text-accent hover:underline">
          Back to customers
        </Link>
        <div className="rounded-lg border border-border bg-white p-5 text-sm text-muted shadow-soft">
          Members can view customers and add notes. Customer creation is available to admins.
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-2xl space-y-4">
      <div className="border-b border-border pb-4">
        <Link href="/customers" className="text-sm font-medium text-accent hover:underline">
          Back to customers
        </Link>
        <h1 className="mt-3 text-2xl font-semibold">New customer</h1>
      </div>
      <CustomerForm />
    </section>
  );
}
