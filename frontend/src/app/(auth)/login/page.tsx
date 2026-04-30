'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { Building2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import api from '@/lib/api';
import { setSession } from '@/lib/auth';
import { AuthResponse } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type LoginFormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: 'alice@acme.com',
      password: 'password123',
    },
  });

  async function onSubmit(values: LoginFormValues) {
    setError(null);
    try {
      const response = await api.post<AuthResponse>('/auth/login', values);
      setSession(response.data.accessToken, response.data.user);
      router.replace('/customers');
    } catch (unknownError) {
      if (axios.isAxiosError(unknownError)) {
        const data = unknownError.response?.data as { message?: string } | undefined;
        setError(data?.message ?? 'Login failed');
      } else {
        setError('Login failed');
      }
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-surface px-4">
      <section className="w-full max-w-sm rounded-lg border border-border bg-white p-6 shadow-soft">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-accent text-white">
            <Building2 size={19} />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Tenant CRM</h1>
            <p className="text-sm text-muted">Sign in to your workspace</p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Email</span>
            <Input type="email" {...form.register('email')} />
            {form.formState.errors.email && (
              <span className="text-xs text-danger">{form.formState.errors.email.message}</span>
            )}
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Password</span>
            <Input type="password" {...form.register('password')} />
            {form.formState.errors.password && (
              <span className="text-xs text-danger">{form.formState.errors.password.message}</span>
            )}
          </label>

          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-danger">{error}</p>}

          <Button className="w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>
      </section>
    </main>
  );
}
