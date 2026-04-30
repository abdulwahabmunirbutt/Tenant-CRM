export interface Organization {
  id: string;
  name: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'member';
  organizationId: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  organizationId: string;
  assignedTo: string | null;
  assignedUser?: User | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface Note {
  id: string;
  content: string;
  customerId: string;
  organizationId: string;
  createdBy: string;
  createdByUser?: User;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

