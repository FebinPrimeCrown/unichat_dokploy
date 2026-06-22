// app/dashboard/widgets/types.ts

export interface Widget {
  id: string;
  name: string;
  token: string;
  allowed_domains: string[];
  created_at: string;
  is_active: boolean;
}
