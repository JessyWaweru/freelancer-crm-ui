export type Currency = "USD" | "KES" | "EUR" | "GBP";
export const CURRENCIES: Currency[] = ["KES", "USD", "EUR", "GBP"];

export type Client = {
  id: number;
  name: string;
  email?: string;
  phone: string;
  company: string;
  created_at?: string;
};

export type BillingType = "fixed" | "monthly" | "both";
export type PaymentStatus = "paid" | "unpaid" | "partial";

export type Project = {
  id: number;
  title: string;
  status: "active" | "completed" | "on-hold";
  due_date?: string | null;
  start_date?: string | null;
  client: number;
  client_name?: string;
  payment_status: PaymentStatus;
  payment_amount: string | number;
  payment_currency: Currency;
  billing_type: BillingType;
  monthly_amount: string | number;
  billing_day: number;
  next_invoice_date?: string | null;
};

export type InvoiceStatus = "draft" | "sent" | "paid" | "void";
export type InvoiceKind = "fixed" | "monthly" | "custom";

export type InvoiceItem = {
  id?: number;
  description: string;
  quantity: string | number;
  unit_price: string | number;
  amount?: string;
};

export type Invoice = {
  id: number;
  number: string;
  client: number;
  client_name: string;
  client_company: string;
  client_email: string;
  client_phone: string;
  project: number | null;
  project_title: string | null;
  kind: InvoiceKind;
  status: InvoiceStatus;
  currency: Currency;
  issue_date: string;
  due_date: string;
  period_start: string | null;
  period_end: string | null;
  notes: string;
  sent_at: string | null;
  paid_at: string | null;
  items: InvoiceItem[];
  total: string;
  is_overdue: boolean;
};

export type Profile = {
  business_name: string;
  email: string;
  phone: string;
  address: string;
  payment_details: string;
  invoice_prefix: string;
  next_invoice_number: number;
  default_currency: Currency;
  payment_terms_days: number;
  reminder_days_before: number;
};

export type Reminder = {
  id: string;
  type: "monthly_due" | "fixed_due" | "draft" | "overdue";
  severity: "overdue" | "due" | "upcoming";
  date: string;
  title: string;
  detail: string;
  amount: string;
  currency: Currency;
  project: number | null;
  invoice: number | null;
  action: "generate_monthly" | "generate_fixed" | "send" | "follow_up";
};

export type Dashboard = {
  totals: { currency: Currency; outstanding: string; overdue: string; paid_this_month: string; draft: string }[];
  mrr: { currency: Currency; amount: string }[];
  counts: { clients: number; active_projects: number; open_invoices: number };
};
