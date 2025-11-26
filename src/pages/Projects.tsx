import React, { useEffect, useState } from "react";
import api from "../api";

// shadcn/ui components (adjust paths if your project differs)
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandItem,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Asterisk } from "lucide-react";


/* ---------- Types ---------- */
type PaymentStatus = "paid" | "unpaid" | "partial";

type Client = { id: number; name: string };
type Project = {
  id: number;
  title: string;
  status: "active" | "completed";
  due_date?: string | null;
  start_date?: string | null;
  client: number;
  client_name?: string;
  payment_status?: PaymentStatus;
  payment_amount?: number;
  payment_currency?: string;
};

type FormState = {
  title: string;
  client: number | 0;
  due_date?: string;
  start_date?: string;
  payment_status: PaymentStatus;
  payment_amount: number;
  payment_currency: string;
};

/* ---------- Component ---------- */
export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState<FormState>({
    title: "",
    client: 0,
    due_date: "",
    start_date: "",
    payment_status: "unpaid",
    payment_amount: 0,
    payment_currency: "USD",
  });

  // Tabs: added "outstanding"
  const [tab, setTab] = useState<"all" | "active" | "completed" | "outstanding">("all");
  const [search, setSearch] = useState("");

  const currencyOptions = ["USD", "KES", "EUR", "GBP"];

  /* ---------- Inline edit states ---------- */
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<number | null>(null);
  const [editingPaymentId, setEditingPaymentId] = useState<number | null>(null);
  const [editingPaymentValues, setEditingPaymentValues] = useState<{ [projectId: number]: { amount: string; currency: string } }>({});
  const [editingPaymentStatusId, setEditingPaymentStatusId] = useState<number | null>(null);
  const [editingPaymentStatusValue, setEditingPaymentStatusValue] = useState<PaymentStatus | null>(null);
  const [confirmToggleStatusId, setConfirmToggleStatusId] = useState<number | null>(null);

  /* ---------- Fetch data ---------- */
  useEffect(() => {
    (async () => {
      try {
        const [pRes, cRes] = await Promise.all([api.get<Project[]>('/projects/'), api.get<Client[]>('/clients/')]);
        setProjects(pRes.data || []);
        setClients(cRes.data || []);
      } catch (err) {
        console.error(err);
        setError('Failed to load projects or clients.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ---------- Helpers ---------- */
  const formatMoney = (amount?: number, currency?: string) => {
    if (amount == null || Number.isNaN(Number(amount))) return "—";
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: currency || "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      return `${Number(amount).toFixed(2)} ${currency ?? ""}`;
    }
  };

  const isOverdue = (p: Project) => {
    if (!p.due_date) return false;
    const today = new Date().toISOString().slice(0, 10);
    return p.status !== "completed" && p.due_date < today;
  };

  /* ---------- API actions with optimistic updates ---------- */
  const patchProjectField = async (projectId: number, patch: Partial<Project>): Promise<boolean> => {
    const prev = projects.find((p) => p.id === projectId);
    setProjects((prevList) => prevList.map((p) => (p.id === projectId ? { ...p, ...patch } : p)));
    try {
      await api.patch(`/projects/${projectId}/`, patch);
      return true;
    } catch (err) {
      console.error(err);
      if (prev) {
        setProjects((prevList) => prevList.map((p) => (p.id === projectId ? prev : p)));
      }
      setError('Failed to update project.');
      return false;
    }
  };

  const performDelete = async (project: Project) => {
    const prevProjects = [...projects];
    setProjects((prev) => prev.filter((p) => p.id !== project.id));
    setConfirmingDeleteId(null);
    try {
      await api.delete(`/projects/${project.id}/`);
    } catch (err) {
      console.error(err);
      setProjects(prevProjects);
      setError('Failed to delete project.');
    }
  };

  /* ---------- Add project ---------- */
  const addProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const todayIso = new Date().toISOString().slice(0, 10);
      const payload = {
        title: form.title,
        client: form.client,
        status: 'active',
        start_date: form.start_date || todayIso,
        due_date: form.due_date || null,
        payment_status: form.payment_status,
        payment_amount: form.payment_amount,
        payment_currency: form.payment_currency,
      };
      const { data } = await api.post<Project>('/projects/', payload);
      setProjects((prev) => [data, ...prev]);
      setAdding(false);
      setForm({
        title: "",
        client: 0,
        due_date: "",
        start_date: "",
        payment_status: "unpaid",
        payment_amount: 0,
        payment_currency: "USD",
      });
    } catch (err) {
      console.error(err);
      setError('Could not create project.');
    }
  };

  /* ---------- Filtered Projects ---------- */
  const filteredProjects = projects.filter((p) => {
    const matchesTab =
      tab === 'all' ? true :
      tab === 'active' ? p.status === 'active' :
      tab === 'completed' ? p.status === 'completed' :
      tab === 'outstanding' ? (p.payment_status === 'unpaid' || p.payment_status === 'partial') : true;

    const clientName = clients.find((c) => c.id === p.client)?.name || '';
    const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase()) || clientName.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  /* ---------- Inline edit flows ---------- */
  const startEditPayment = (p: Project) => {
    setEditingPaymentId(p.id);
    setEditingPaymentValues((prev) => ({ ...prev, [p.id]: { amount: p.payment_amount == null ? '' : String(p.payment_amount), currency: p.payment_currency ?? 'USD' } }));
  };
  const cancelEditPayment = (projectId: number) => {
    setEditingPaymentId((id) => (id === projectId ? null : id));
    setEditingPaymentValues((prev) => {
      const copy = { ...prev };
      delete copy[projectId];
      return copy;
    });
  };
  const saveEditPayment = async (projectId: number) => {
    const values = editingPaymentValues[projectId];
    if (!values) return;
    const amount = values.amount === '' ? null : Number(values.amount);
    const currency = values.currency || 'USD';
    const prev = projects.find((p) => p.id === projectId) ?? null;
    setProjects((prevList) => prevList.map((p) => p.id === projectId ? { ...p, payment_amount: amount ?? undefined, payment_currency: currency } : p));
    cancelEditPayment(projectId);
    try {
      await api.patch(`/projects/${projectId}/`, { payment_amount: amount, payment_currency: currency });
    } catch (err) {
      console.error(err);
      if (prev) setProjects((prevList) => prevList.map((p) => (p.id === projectId ? prev : p)));
      setError('Failed to update payment.');
    }
  };

  const startEditPaymentStatus = (p: Project) => {
    setEditingPaymentStatusId(p.id);
    setEditingPaymentStatusValue(p.payment_status ?? 'unpaid');
  };
  const cancelEditPaymentStatus = () => {
    setEditingPaymentStatusId(null);
    setEditingPaymentStatusValue(null);
  };
  const saveEditPaymentStatus = async (projectId: number) => {
    if (!editingPaymentStatusValue) return;
    const prev = projects.find((p) => p.id === projectId) ?? null;
    setProjects((prevList) => prevList.map((p) => (p.id === projectId ? { ...p, payment_status: editingPaymentStatusValue } : p)));
    setEditingPaymentStatusId(null);
    setEditingPaymentStatusValue(null);
    try {
      await api.patch(`/projects/${projectId}/`, { payment_status: editingPaymentStatusValue });
    } catch (err) {
      console.error(err);
      if (prev) setProjects((prevList) => prevList.map((p) => (p.id === projectId ? prev : p)));
      setError('Failed to update payment status.');
    }
  };

  const startToggleStatusConfirm = (p: Project) => setConfirmToggleStatusId(p.id);
  const cancelToggleStatusConfirm = () => setConfirmToggleStatusId(null);
  const confirmToggleStatus = async (projectId: number) => {
    const p = projects.find((x) => x.id === projectId);
    if (!p) return;
    const newStatus = p.status === 'completed' ? 'active' : 'completed';
    setConfirmToggleStatusId(null);
    await patchProjectField(projectId, { status: newStatus });
  };

  /* ---------- Render ---------- */
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">Projects</h1>
          <Button onClick={() => setAdding(true)} className="rounded-lg">New Project</Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 space-y-6">
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 border border-red-200">{error}</div>
        )}

        {adding && (
          <div className="bg-white rounded-2xl shadow p-6">
            <h2 className="text-lg font-medium text-gray-900">Add Project</h2>
            <form onSubmit={addProject} className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label> 
                   <Asterisk className="w-3 h-3 text-red-500" />
                   Title
                  </Label>
                <Input className="mt-1 w-full" value={form.title} onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))} required />
              </div>

              <div>
                <Label>
                   <Asterisk className="w-3 h-3 text-red-500" />
                  Client</Label>
                {/* Combobox implemented with Command (searchable) */}
                <div className="mt-1">
                  <Command>
                    <CommandInput
                      value={clients.find((c) => c.id === form.client)?.name ?? ''}
                      onValueChange={(val) => {
                        // try to find client by exact name, otherwise clear
                        const found = clients.find((c) => c.name === val);
                        setForm((s) => ({ ...s, client: found ? found.id : 0 }));
                        setSearch(val);           
                      }
                    }
                    required
                      placeholder="Search or type to select…"
                    />
                    <CommandList>
                      <CommandEmpty>No clients found.</CommandEmpty>
                      {clients.map((c) => (
                        <CommandItem
                          key={c.id}
                          onSelect={() => setForm((s) => ({ ...s, client: c.id }))}
                        >
                          {c.name}
                        </CommandItem>
                      ))}
                    </CommandList>
                  </Command>
                </div>
              </div>

              <div>
                <Label>Start Date</Label>
                <Input type="date" className="mt-1 w-full" value={form.start_date || ''} onChange={(e) => setForm((s) => ({ ...s, start_date: e.target.value }))} />
              </div>

              <div>
                <Label>Due Date</Label>
                <Input type="date" className="mt-1 w-full" value={form.due_date || ''} onChange={(e) => setForm((s) => ({ ...s, due_date: e.target.value }))} />
              </div>

              <div>
                <Label>Payment Amount</Label>
                <Input type="number" min={0} step="0.01" className="mt-1 w-full" value={form.payment_amount} onChange={(e) => setForm((s) => ({ ...s, payment_amount: Number(e.target.value) }))} required />
              </div>

              <div>
                <Label>Currency</Label>
                <Select value={form.payment_currency} onValueChange={(v) => setForm((s) => ({ ...s, payment_currency: v }))}>
                  <SelectTrigger className="mt-1 w-full">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {currencyOptions.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Payment Status</Label>
                <Select value={form.payment_status} onValueChange={(v) => setForm((s) => ({ ...s, payment_status: v as PaymentStatus }))}>
                  <SelectTrigger className="mt-1 w-full">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                    <SelectItem value="partial">Partially Paid</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2 flex gap-3 pt-2">
                <Button type="submit">Save</Button>
                <Button variant="outline" onClick={() => setAdding(false)}>Cancel</Button>
              </div>
            </form>
          </div>
        )}

        {/* Tabs & Search */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex gap-2">
            <ToggleGroup type="single" value={tab} onValueChange={(v: any) => setTab(v)} className="rounded-full bg-gray-100 p-1">
              <ToggleGroupItem value="all">All</ToggleGroupItem>
              <ToggleGroupItem value="active">Active</ToggleGroupItem>
              <ToggleGroupItem value="completed">Completed</ToggleGroupItem>
              <ToggleGroupItem value="outstanding">Outstanding Payments</ToggleGroupItem>
            </ToggleGroup>
          </div>

          <Input placeholder="Search by title or client" className="w-full md:w-64" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loading ? (
            <div className="col-span-2 text-center text-gray-500 py-10">Loading projects…</div>
          ) : filteredProjects.length === 0 ? (
            <div className="col-span-2 text-center text-gray-500 py-10">No projects found.</div>
          ) : (
            filteredProjects.map((p) => {
              const client = clients.find((c) => c.id === p.client);
              const overdue = isOverdue(p);
              const paymentColorClass = p.payment_status === 'paid' ? 'bg-green-100 text-green-800' : p.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800';
              const editingPayment = editingPaymentId === p.id && editingPaymentValues[p.id];
              const editingPaymentStatus = editingPaymentStatusId === p.id;
              const confirmingDelete = confirmingDeleteId === p.id;
              const confirmingToggle = confirmToggleStatusId === p.id;

              return (
                <div key={p.id} className={`bg-white rounded-2xl shadow p-4 border flex flex-col justify-between ${overdue ? 'border-red-500' : 'border-transparent'}`}>
                  <div>
                    <div className="flex justify-between items-start">
                      <h3 className={`font-semibold text-lg ${overdue ? 'text-red-600' : 'text-gray-900'}`}>{p.title}</h3>

                      <div className="flex gap-2 items-center">
                        <div className="relative group">
                          <Button onClick={() => startToggleStatusConfirm(p)} className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">{p.status === 'completed' ? 'Completed' : 'Active'}</Button>

                          {confirmingToggle && (
                            <div className="mt-2 flex gap-2">
                              <Button onClick={() => confirmToggleStatus(p.id)}>Confirm</Button>
                              <Button variant="outline" onClick={cancelToggleStatusConfirm}>Cancel</Button>
                            </div>
                          )}
                        </div>

                        <div className="relative group">
                          <Badge onClick={() => startEditPaymentStatus(p)} className={`px-2 py-1 rounded-full text-sm font-medium cursor-pointer ${paymentColorClass}`}>{p.payment_status ?? '—'}</Badge>

                          {editingPaymentStatus && (
                            <div className="mt-2 flex gap-2 items-center">
                              <Select value={editingPaymentStatusValue ?? p.payment_status ?? 'unpaid'} onValueChange={(v) => setEditingPaymentStatusValue(v as PaymentStatus)}>
                                <SelectTrigger className="w-40">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="unpaid">unpaid</SelectItem>
                                  <SelectItem value="partial">partial</SelectItem>
                                  <SelectItem value="paid">paid</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button onClick={() => saveEditPaymentStatus(p.id)}>Save</Button>
                              <Button variant="outline" onClick={() => cancelEditPaymentStatus()}>Cancel</Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-2">
                      <Badge className="inline-block">{client?.name || '—'}</Badge>
                    </div>

                    <div className="mt-3 text-sm text-gray-500">Start: {p.start_date ?? '—'} | Due: {p.due_date ?? '—'}</div>

                    <div className="mt-3">
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-sm">Payment:</span>

                        {!editingPayment ? (
                          <div className="flex items-center gap-2" title="Hover: Click to change">
                            <div className="text-sm font-medium cursor-pointer" onClick={() => startEditPayment(p)}>{formatMoney(p.payment_amount, p.payment_currency)}</div>
                            <div className="text-xs text-gray-500" title="Click to change">{p.payment_currency ?? ''}</div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Input type="number" step="0.01" min={0} className="px-2 py-1 w-28" value={editingPaymentValues[p.id]?.amount ?? ''} onChange={(e) => setEditingPaymentValues((prev) => ({ ...prev, [p.id]: { ...(prev[p.id] || { amount: '', currency: 'USD' }), amount: e.target.value } }))} />

                            <Select value={editingPaymentValues[p.id]?.currency ?? 'USD'} onValueChange={(v) => setEditingPaymentValues((prev) => ({ ...prev, [p.id]: { ...(prev[p.id] || { amount: '', currency: 'USD' }), currency: v } }))}>
                              <SelectTrigger className="w-24">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {currencyOptions.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                              </SelectContent>
                            </Select>

                            <Button onClick={() => saveEditPayment(p.id)}>Save</Button>
                            <Button variant="outline" onClick={() => cancelEditPayment(p.id)}>Cancel</Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col items-start gap-2">
                    <div className="text-sm">Status: <span className="font-medium">{p.status === 'completed' ? 'Completed' : 'Active'}</span></div>

                    {!confirmingDelete ? (
                      <Button onClick={() => setConfirmingDeleteId(p.id)} className="mt-2 px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700">Delete</Button>
                    ) : (
                      <div className="mt-2 flex gap-2 items-center">
                        <div className="text-sm text-gray-700">Confirm delete?</div>
                        <Button onClick={() => performDelete(p)} className="px-3 py-1 rounded bg-red-600 text-white text-sm">Delete</Button>
                        <Button variant="outline" onClick={() => setConfirmingDeleteId(null)}>Cancel</Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
