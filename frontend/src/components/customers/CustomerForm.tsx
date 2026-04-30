'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useCreateCustomer, useUpdateCustomer } from '@/hooks/useCustomers';
import { Customer } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Enter a valid email'),
  phone: z.string().optional(),
});

type CustomerFormValues = z.infer<typeof schema>;

export function CustomerForm({ customer, canEdit = true }: { customer?: Customer; canEdit?: boolean }) {
  const router = useRouter();
  const create = useCreateCustomer();
  const update = useUpdateCustomer(customer?.id ?? '');
  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: customer?.name ?? '',
      email: customer?.email ?? '',
      phone: customer?.phone ?? '',
    },
  });

  useEffect(() => {
    if (customer) {
      form.reset({
        name: customer.name,
        email: customer.email,
        phone: customer.phone ?? '',
      });
    }
  }, [customer, form]);

  async function onSubmit(values: CustomerFormValues) {
    if (!canEdit) return;
    const payload = { ...values, phone: values.phone || undefined };
    if (customer) {
      await update.mutateAsync(payload);
    } else {
      const created = await create.mutateAsync(payload);
      router.replace(`/customers/${created.id}`);
    }
  }

  return (
    <form className="space-y-4 rounded-lg border border-border bg-white p-5 shadow-soft" onSubmit={form.handleSubmit(onSubmit)}>
      <h2 className="text-lg font-semibold">{customer ? 'Customer details' : 'Create customer'}</h2>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Name</span>
        <Input disabled={!canEdit} {...form.register('name')} />
        {form.formState.errors.name && <span className="text-xs text-danger">{form.formState.errors.name.message}</span>}
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Email</span>
        <Input disabled={!canEdit} type="email" {...form.register('email')} />
        {form.formState.errors.email && <span className="text-xs text-danger">{form.formState.errors.email.message}</span>}
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Phone</span>
        <Input disabled={!canEdit} {...form.register('phone')} />
      </label>

      {canEdit && (
        <Button disabled={create.isPending || update.isPending}>
          <Save size={16} />
          {customer ? 'Save changes' : 'Create customer'}
        </Button>
      )}
    </form>
  );
}
