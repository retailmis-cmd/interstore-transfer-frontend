export interface User {
  id: number;
  username: string;
  role: 'admin' | 'user';
  is_active?: boolean;
  created_at?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface TransferItem {
  id?: number;
  barcode: string;
  quantity: number;
}

export interface Transfer {
  id: number;
  transaction_number: string;
  from_store: string;
  to_store: string;
  transfer_date: string;
  status: string;
  created_by?: string;
  created_by_username?: string;
  item_count?: number;
  total_qty?: number;
  created_at: string;
  items?: TransferItem[];
}

export interface TransferListResponse {
  transfers: Transfer[];
  total: number;
  page: number;
  limit: number;
}

export interface ReportRow {
  transaction_number: string;
  from_store: string;
  to_store: string;
  transfer_date: string;
  status: string;
  created_by: string;
  barcode: string;
  quantity: number;
}

export const STORES = [
  'BANANA CLUB SQUARE - VV PURAM',
  'BANANA CLUB PLUS - VV PURAM',
] as const;

export type Store = (typeof STORES)[number];
