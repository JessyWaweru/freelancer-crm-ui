// src/pages/Clients.tsx

// src/pages/Clients.tsx
// src/pages/Clients.tsx

import { useEffect, useState } from "react";
import api from "../api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import PhoneInput from "@/helpers/PhoneInput";
import { motion, AnimatePresence } from "framer-motion";

type Client = {
  id: number;
  name: string;
  email?: string;
  phone: string;
  company: string;
};

// Confirmation modal component
const ConfirmModal = ({
  message,
  onConfirm,
  onCancel,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) => {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black bg-opacity-50"
      >
        <motion.div
          initial={{ y: 300 }}
          animate={{ y: 0 }}
          exit={{ y: 300 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="bg-white rounded-t-2xl sm:rounded-2xl shadow-lg p-6 max-w-md w-full mx-4 sm:mx-0"
        >
          <p className="text-gray-800 mb-4">{message}</p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={onConfirm}>
              Delete
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneValid, setPhoneValid] = useState(false);
  const [company, setCompany] = useState("");

  const [editingClientId, setEditingClientId] = useState<number | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<number | null>(
    null
  );

  useEffect(() => {
    api.get("/clients/").then((r) => setClients(r.data));
  }, []);

  function resetForm() {
    setName("");
    setPhone("");
    setPhoneValid(false);
    setCompany("");
    setEditingClientId(null);
  }

  async function addClient(e: React.FormEvent) {
    e.preventDefault();
    if (!phoneValid) return;

    const { data } = await api.post("/clients/", { name, phone, company });
    setClients([data, ...clients]);
    resetForm();
  }

  async function updateClient(e: React.FormEvent) {
    e.preventDefault();
    if (!phoneValid || editingClientId === null) return;

    const { data } = await api.put(`/clients/${editingClientId}/`, {
      name,
      phone,
      company,
    });

    setClients(clients.map((c) => (c.id === editingClientId ? data : c)));
    resetForm();
  }

  async function confirmDeleteClient(id: number) {
    await api.delete(`/clients/${id}/`);
    setClients(clients.filter((c) => c.id !== id));
    setConfirmingDeleteId(null);
    if (editingClientId === id) resetForm();
  }

  function startEditClient(client: Client) {
    setEditingClientId(client.id);
    setName(client.name);
    setPhone(client.phone);
    setPhoneValid(true);
    setCompany(client.company);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b shadow-sm">
        <div className="mx-auto max-w-5xl px-4 py-6">
          <h2 className="text-2xl font-semibold text-gray-900">Clients</h2>
          <p className="text-sm text-gray-500 mt-1">
            {editingClientId
              ? "Edit client details below."
              : "Create and view your clients."}
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 space-y-6">
        <form
          onSubmit={editingClientId ? updateClient : addClient}
          className="bg-white rounded-2xl shadow p-6 flex flex-col gap-4 sm:gap-6 sm:p-8"
        >
          <div>
            <Label htmlFor="name">Client Name</Label>
            <Input
              id="name"
              placeholder="e.g., Jane Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <Label>Contact</Label>
            <PhoneInput
              value={phone}
              onChange={(val) => setPhone(val)}
              onValidChange={(valid) => setPhoneValid(valid)}
            />
          </div>

          <div>
            <Label htmlFor="company">Company</Label>
            <Input
              id="company"
              placeholder="e.g., Acme Inc."
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
            <Button
              type="submit"
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white"
              disabled={!phoneValid}
            >
              {editingClientId ? "Update" : "Add"}
            </Button>

            {editingClientId && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => setConfirmingDeleteId(editingClientId)}
                className="w-full sm:w-auto mt-2 sm:mt-0"
              >
                Delete Client
              </Button>
            )}

            {editingClientId && (
              <Button
                type="button"
                variant="secondary"
                onClick={resetForm}
                className="w-full sm:w-auto mt-2 sm:mt-0"
              >
                Cancel
              </Button>
            )}
          </div>

          <p className="mt-2 text-xs text-gray-500">
            {editingClientId
              ? "Edit the client details above."
              : "New clients appear at the top of the list."}
          </p>
        </form>

        <div className="bg-white rounded-2xl shadow overflow-hidden">
          <ul className="divide-y divide-gray-100">
            {clients.length === 0 ? (
              <li className="px-6 py-10 text-center text-gray-500 text-sm sm:text-base">
                No clients yet. Add your first client above.
              </li>
            ) : (
              clients.map((c) => (
                <li
                  key={c.id}
                  className="px-6 py-4 hover:bg-gray-50 transition text-sm sm:text-base relative group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{c.name}</div>
                      <div className="text-gray-600">{c.phone}</div>
                    </div>
                    <div className="text-gray-500 mt-1 sm:mt-0">{c.company}</div>

                    <div className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 transition flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => startEditClient(c)}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => setConfirmingDeleteId(c.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>

        {confirmingDeleteId !== null && (
          <ConfirmModal
            message="Are you sure you want to delete this client?"
            onConfirm={() => confirmDeleteClient(confirmingDeleteId)}
            onCancel={() => setConfirmingDeleteId(null)}
          />
        )}
      </main>
    </div>
  );
}
