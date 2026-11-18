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
  /** First monthly payment date. Every month after, on billing_day, is another payment. */
  retainer_start?: string | null;
  retainer_end?: string | null;
  items: ProjectItem[];
  /** Retainer months that are due (on or after their date) and not marked paid. */
  unpaid_periods: string[];
  unpaid_retainer_total: string;
};

/** One priced part of a project, e.g. "Hosting 4000". recurring = part of the monthly retainer. */
export type ProjectItem = {
  id?: number;
  description: string;
  amount: string | number;
  recurring: boolean;
};

export type RetainerMonth = {
  period: string;
  period_end: string;
  amount: string;
  status: "paid" | "unpaid" | "upcoming";
  paid_on: string | null;
  invoice: { id: number; number: string; status: InvoiceStatus } | null;
};

export type Note = { id: number; project: number; body: string; created_at: string; updated_at: string };

export type Todo = {
  id: number;
  project: number;
  title: string;
  done: boolean;
  due_date: string | null;
  done_at: string | null;
  created_at: string;
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

export type PaymentMethod = "mpesa" | "bank" | "cash" | "card" | "paypal" | "other";
export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "mpesa", label: "M-Pesa" },
  { value: "bank", label: "Bank transfer" },
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "paypal", label: "PayPal" },
  { value: "other", label: "Other" },
];

export type Payment = {
  id: number;
  amount: string;
  paid_on: string;
  method: PaymentMethod;
  reference: string;
  created_at: string;
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
  created_at: string;
  items: InvoiceItem[];
  subtotal: string;
  discount: string;
  tax_rate: string;
  tax_label: string;
  tax_amount: string;
  total: string;
  amount_paid: string;
  balance: string;
  payments: Payment[];
  is_overdue: boolean;
  /** Secret for the client's view-only link, once it has been shared. */
  public_token: string | null;
  view_count: number;
  first_viewed_at: string | null;
  last_viewed_at: string | null;
};

/** The client's view of a shared invoice (no ids or tracking). */
export type PublicInvoice = Pick<
  Invoice,
  | "number" | "status" | "is_overdue" | "currency" | "issue_date" | "due_date" | "period_start" | "period_end"
  | "subtotal" | "discount" | "tax_rate" | "tax_label" | "tax_amount" | "total" | "amount_paid" | "balance"
  | "notes" | "client_name" | "client_company" | "project_title"
> & {
  items: InvoiceItem[];
  business: Pick<Profile, "business_name" | "email" | "phone" | "address" | "payment_details">;
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
  default_tax_rate: string | number;
  tax_label: string;
};

export type ReminderType =
  | "monthly_due" | "fixed_due" | "draft" | "overdue" | "retainer_unpaid" | "invoice_due" | "deadline" | "todo";

/** Reminders about money (the rest are deadlines and to-dos). */
export const MONEY_REMINDERS: ReminderType[] = ["monthly_due", "fixed_due", "draft", "overdue", "retainer_unpaid", "invoice_due"];

export type Reminder = {
  id: string;
  type: ReminderType;
  severity: "overdue" | "due" | "upcoming";
  date: string;
  title: string;
  detail: string;
  amount: string | null;
  currency: Currency;
  project: number | null;
  invoice: number | null;
  action: "generate_monthly" | "generate_fixed" | "send" | "follow_up" | "mark_retainer_paid" | "open_project";
  /** Retainer month this reminder is about, for marking it paid. */
  period?: string | null;
};

export type Earnings = {
  currency: Currency;
  all_time: string | number;
  this_year: string | number;
  this_month: string | number;
  payments: number;
  by_month: { month: string; amount: string | number }[];
  by_client: { client: number; name: string; amount: string | number }[];
};

export type ForecastItem = { date: string; amount: string | number; label: string; detail: string; link: string };

/** Money expected in the next 30 days, and what's already late. */
export type Forecast = {
  currency: Currency;
  late: string | number;
  next_30_days: string | number;
  items: ForecastItem[];
};

export type Dashboard = {
  earnings: Earnings[];
  totals: { currency: Currency; outstanding: string; overdue: string; paid_this_month: string; draft: string }[];
  mrr: { currency: Currency; amount: string }[];
  forecast: Forecast[];
  counts: { clients: number; active_projects: number; open_invoices: number };
};
