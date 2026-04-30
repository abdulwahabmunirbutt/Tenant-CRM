'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Customer, PaginatedResponse } from '@/lib/types';

interface CustomersParams {
  page?: number;
  limit?: number;
  search?: string;
  deletedOnly?: boolean;
}

interface CustomerInput {
  name: string;
  email: string;
  phone?: string;
}

export function useCustomers(params: CustomersParams = {}) {
  return useQuery({
    queryKey: ['customers', params],
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<Customer>>('/customers', { params });
      return response.data;
    },
    placeholderData: (previous) => previous,
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: ['customers', id],
    queryFn: async () => {
      const response = await api.get<Customer>(`/customers/${id}`);
      return response.data;
    },
    enabled: Boolean(id),
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CustomerInput) => {
      const response = await api.post<Customer>('/customers', data);
      return response.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customers'] }),
  });
}

export function useUpdateCustomer(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CustomerInput) => {
      const response = await api.put<Customer>(`/customers/${id}`, data);
      return response.data;
    },
    onSuccess: (customer) => {
      queryClient.setQueryData(['customers', id], customer);
      return queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useAssignCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ customerId, assigneeId }: { customerId: string; assigneeId: string | null }) => {
      const response = await api.patch<Customer>(`/customers/${customerId}/assign`, { assigneeId });
      return response.data;
    },
    onMutate: async ({ customerId, assigneeId }) => {
      await queryClient.cancelQueries({ queryKey: ['customers'] });

      // Only snapshot paginated list queries (keys like ['customers', { page, ... }]),
      // not individual customer queries (keys like ['customers', 'uuid']).
      const listQueryFilter = {
        queryKey: ['customers'],
        predicate: (query: { queryKey: readonly unknown[] }) =>
          query.queryKey.length === 1 ||
          (query.queryKey.length === 2 && typeof query.queryKey[1] === 'object'),
      };

      const snapshot = queryClient.getQueriesData<PaginatedResponse<Customer>>(listQueryFilter);

      queryClient.setQueriesData<PaginatedResponse<Customer>>(listQueryFilter, (old) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.map((customer) =>
            customer.id === customerId
              ? { ...customer, assignedTo: assigneeId, assignedUser: assigneeId ? customer.assignedUser : null }
              : customer,
          ),
        };
      });

      return { snapshot };
    },
    onError: (_error, _variables, context) => {
      context?.snapshot?.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSuccess: (updatedCustomer) => {
      // Update individual customer cache
      queryClient.setQueryData(['customers', updatedCustomer.id], updatedCustomer);

      // Also update the customer inside paginated list caches immediately
      queryClient.setQueriesData<PaginatedResponse<Customer>>(
        {
          queryKey: ['customers'],
          predicate: (query: { queryKey: readonly unknown[] }) =>
            query.queryKey.length === 1 ||
            (query.queryKey.length === 2 && typeof query.queryKey[1] === 'object'),
        },
        (old) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((customer) =>
              customer.id === updatedCustomer.id ? { ...customer, ...updatedCustomer } : customer,
            ),
          };
        },
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['customers'] }),
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/customers/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customers'] }),
  });
}

export function useRestoreCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.patch<Customer>(`/customers/${id}/restore`);
      return response.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customers'] }),
  });
}
