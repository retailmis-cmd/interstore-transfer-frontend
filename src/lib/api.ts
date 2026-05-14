import { AuthResponse, Transfer, TransferItem, TransferListResponse, ReportRow, User } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

async function request<T>(
  endpoint: string,
  method: string = 'GET',
  body?: unknown,
  token?: string | null
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }

  return data as T;
}

// Auth
export const login = (username: string, password: string) =>
  request<AuthResponse>('/api/auth/login', 'POST', { username, password });

// Users
export const getUsers = (token: string) =>
  request<User[]>('/api/users', 'GET', undefined, token);

export const createUser = (
  token: string,
  payload: { username: string; password: string; role: 'admin' | 'user' }
) => request<User>('/api/users', 'POST', payload, token);

export const updateUser = (
  token: string,
  id: number,
  payload: { password?: string; role?: string; is_active?: boolean }
) => request<User>(`/api/users/${id}`, 'PUT', payload, token);

export const deleteUser = (token: string, id: number) =>
  request<{ message: string }>(`/api/users/${id}`, 'DELETE', undefined, token);

// Transfers
export const getNextTransactionNumber = (token: string) =>
  request<{ transaction_number: string }>('/api/transfers/next-number', 'GET', undefined, token);

export const getTransfers = (token: string, page = 1, limit = 20) =>
  request<TransferListResponse>(
    `/api/transfers?page=${page}&limit=${limit}`,
    'GET',
    undefined,
    token
  );

export const getTransfer = (token: string, id: number) =>
  request<Transfer & { items: TransferItem[] }>(`/api/transfers/${id}`, 'GET', undefined, token);

export const createTransfer = (
  token: string,
  payload: {
    transaction_number: string;
    from_store: string;
    to_store: string;
    transfer_date: string;
    items: TransferItem[];
  }
) => request<Transfer>('/api/transfers', 'POST', payload, token);

export const getReport = (token: string, from: string, to: string) =>
  request<ReportRow[]>(
    `/api/transfers/report?from=${from}&to=${to}`,
    'GET',
    undefined,
    token
  );

// CSV download utility
export function downloadCSV(rows: ReportRow[], from: string, to: string) {
  const headers = [
    'Transaction Number',
    'From Store',
    'To Store',
    'Transfer Date',
    'Barcode',
    'Quantity',
    'Created By',
    'Status',
  ];

  const escape = (val: unknown) => {
    const str = String(val ?? '');
    return str.includes(',') || str.includes('"') || str.includes('\n')
      ? `"${str.replace(/"/g, '""')}"`
      : str;
  };

  const csvContent =
    headers.join(',') +
    '\n' +
    rows
      .map((r) =>
        [
          r.transaction_number,
          r.from_store,
          r.to_store,
          new Date(r.transfer_date).toLocaleString('en-IN'),
          r.barcode,
          r.quantity,
          r.created_by,
          r.status,
        ]
          .map(escape)
          .join(',')
      )
      .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `transfer-report-${from}-to-${to}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
