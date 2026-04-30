'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ShieldCheck, UserPlus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useCreateUser, useUsers } from '@/hooks/useUsers';
import { getStoredUser } from '@/lib/auth';
import { User } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['admin', 'member']),
});

type UserFormValues = z.infer<typeof schema>;

export default function UsersPage() {
  const users = useUsers();
  const createUser = useCreateUser();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const form = useForm<UserFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', password: 'password123', role: 'member' },
  });
  const canCreateUsers = currentUser?.role === 'admin';

  useEffect(() => {
    setCurrentUser(getStoredUser());
    setSessionReady(true);
  }, []);

  async function onSubmit(values: UserFormValues) {
    if (!canCreateUsers) return;
    await createUser.mutateAsync(values);
    form.reset({ name: '', email: '', password: 'password123', role: 'member' });
  }

  return (
    <section className="space-y-6">
      <div className="border-b border-border pb-4">
        <h1 className="text-2xl font-semibold">Users</h1>
        <p className="mt-1 text-sm text-muted">Admins can add teammates inside the current organization.</p>
      </div>

      <div className={canCreateUsers ? 'grid gap-6 lg:grid-cols-[420px_1fr]' : 'grid gap-6'}>
        {sessionReady && canCreateUsers && (
          <form className="space-y-4 rounded-lg border border-border bg-white p-5 shadow-soft" onSubmit={form.handleSubmit(onSubmit)}>
            <h2 className="text-lg font-semibold">Create user</h2>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Name</span>
              <Input {...form.register('name')} />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Email</span>
              <Input type="email" {...form.register('email')} />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Password</span>
              <Input type="password" {...form.register('password')} />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Role</span>
              <select
                className="h-9 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-accent"
                {...form.register('role')}
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            {createUser.isError && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-danger">
                Could not create user. Make sure you are signed in as an admin.
              </p>
            )}
            <Button disabled={createUser.isPending}>
              <UserPlus size={16} />
              Add user
            </Button>
          </form>
        )}

        {sessionReady && !canCreateUsers && (
          <section className="flex items-center gap-3 rounded-lg border border-border bg-white p-5 text-sm text-muted shadow-soft">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-surface text-accent">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h2 className="font-semibold text-ink">Organization users</h2>
              <p className="mt-1">Members can view teammates in their organization. User creation is available to admins.</p>
            </div>
          </section>
        )}

        <div className="overflow-hidden rounded-lg border border-border bg-white shadow-soft">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
              </tr>
            </thead>
            <tbody>
              {users.data?.map((user) => (
                <tr key={user.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium">{user.name}</td>
                  <td className="px-4 py-3 text-muted">{user.email}</td>
                  <td className="px-4 py-3">
                    <Badge>{user.role}</Badge>
                  </td>
                </tr>
              ))}
              {users.isLoading && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-muted">
                    Loading users...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
