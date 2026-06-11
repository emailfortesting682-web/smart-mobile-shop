"use client";

import { useState } from "react";
import { Ban, CheckCircle2, KeyRound, RefreshCw, ShieldCheck, Trash2, Users } from "lucide-react";

type Worker = {
  id: string;
  name: string;
  email: string;
  status?: "active" | "suspended";
  created_at: string;
};

type OwnerRecord = {
  id: string;
  name: string;
  email: string;
  status?: "active" | "suspended";
  created_at: string;
  workerCount: number;
  shopCount: number;
  workers: Worker[];
  shops: { id: string; name: string; city: string }[];
};

type AdminData = {
  totalOwners: number;
  totalWorkers: number;
  owners: OwnerRecord[];
};

export function AdminPanel() {
  const [secret, setSecret] = useState("");
  const [data, setData] = useState<AdminData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function adminRequest(payload: Record<string, unknown>) {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/platform-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, secret })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Admin request failed.");
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Admin request failed.");
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function load() {
    const result = await adminRequest({ type: "list" });
    if (result) setData(result as AdminData);
  }

  async function run(action: Record<string, unknown>) {
    const result = await adminRequest(action);
    if (result) await load();
  }

  return (
    <main className="min-h-screen bg-mist px-4 py-6">
      <section className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 rounded-lg border border-line bg-white p-5 shadow-panel lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-cobalt">
              <ShieldCheck className="h-4 w-4" />
              Private platform administration
            </div>
            <h1 className="text-3xl font-semibold text-graphite">Super Admin Dashboard</h1>
            <p className="mt-1 max-w-2xl text-slate-600">
              Hidden platform-level controls for monitoring owners, workers, and account status.
            </p>
          </div>

          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              load();
            }}
          >
            <label className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="focus-ring w-full rounded-md border border-line bg-white py-2 pl-9 pr-3 text-sm font-semibold text-graphite shadow-sm sm:w-80"
                type="password"
                value={secret}
                onChange={(event) => setSecret(event.target.value)}
                placeholder="Admin secret code"
              />
            </label>
            <button className="focus-ring inline-flex items-center justify-center gap-2 rounded-md bg-graphite px-4 py-2 text-sm font-semibold text-white shadow-sm">
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
              Load
            </button>
          </form>
        </div>

        {error && <div className="mb-5 rounded-md border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-coral">{error}</div>}

        {data && (
          <>
            <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <AdminMetric label="Registered owners" value={String(data.totalOwners)} />
              <AdminMetric label="Registered workers" value={String(data.totalWorkers)} />
              <AdminMetric label="Estimated platform accounts" value={String(data.totalOwners + data.totalWorkers)} />
            </div>

            <div className="grid gap-4">
              {data.owners.map((owner) => (
                <article key={owner.id} className="rounded-lg border border-line bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-semibold text-graphite">{owner.name}</h2>
                        <StatusBadge status={owner.status ?? "active"} />
                      </div>
                      <p className="text-sm text-slate-600">{owner.email}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-400">Owner ID: {owner.id}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button className="admin-btn" onClick={() => run({ type: "setOwnerStatus", ownerId: owner.id, status: owner.status === "suspended" ? "active" : "suspended" })}>
                        {owner.status === "suspended" ? <CheckCircle2 className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                        {owner.status === "suspended" ? "Activate owner" : "Suspend owner"}
                      </button>
                      <button className="admin-danger" onClick={() => {
                        if (window.confirm("Delete this owner workspace and database records? Auth users can also be deleted if configured in the API action.")) {
                          run({ type: "deleteOwner", ownerId: owner.id, deleteAuthUsers: true });
                        }
                      }}>
                        <Trash2 className="h-4 w-4" />
                        Delete owner
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <AdminMetric label="Workers" value={String(owner.workerCount)} compact />
                    <AdminMetric label="Shops" value={String(owner.shopCount)} compact />
                    <AdminMetric label="Created" value={new Date(owner.created_at).toLocaleDateString()} compact />
                  </div>

                  <div className="mt-5 grid gap-4 lg:grid-cols-2">
                    <div>
                      <h3 className="mb-2 text-sm font-semibold uppercase text-slate-500">Workers</h3>
                      <div className="grid gap-2">
                        {owner.workers.length === 0 ? (
                          <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-500">No workers yet.</p>
                        ) : owner.workers.map((worker) => (
                          <div key={worker.id} className="flex flex-col gap-2 rounded-md border border-line p-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="font-semibold text-graphite">{worker.name}</p>
                              <p className="text-sm text-slate-500">{worker.email}</p>
                              <StatusBadge status={worker.status ?? "active"} />
                            </div>
                            <div className="flex gap-2">
                              <button className="admin-btn" onClick={() => run({ type: "setWorkerStatus", userId: worker.id, status: worker.status === "suspended" ? "active" : "suspended" })}>
                                {worker.status === "suspended" ? "Activate" : "Suspend"}
                              </button>
                              <button className="admin-danger" onClick={() => {
                                if (window.confirm("Delete this worker account?")) run({ type: "deleteWorker", userId: worker.id });
                              }}>
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="mb-2 text-sm font-semibold uppercase text-slate-500">Shops</h3>
                      <div className="grid gap-2">
                        {owner.shops.length === 0 ? (
                          <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-500">No shops yet.</p>
                        ) : owner.shops.map((shop) => (
                          <p key={shop.id} className="rounded-md border border-line px-3 py-2 text-sm font-semibold text-graphite">
                            {shop.name} ({shop.city})
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      <style jsx>{`
        .admin-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          border: 1px solid #e5e7eb;
          border-radius: 0.375rem;
          background: white;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          font-weight: 600;
          color: #1f2937;
        }

        .admin-danger {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          border: 1px solid #fed7aa;
          border-radius: 0.375rem;
          background: #fff7ed;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          font-weight: 600;
          color: #c2410c;
        }
      `}</style>
    </main>
  );
}

function AdminMetric({ label, value, compact }: { label: string; value: string; compact?: boolean }) {
  return (
    <div className={`rounded-lg border border-line bg-white ${compact ? "p-3" : "p-4 shadow-sm"}`}>
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-graphite">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: "active" | "suspended" }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${status === "active" ? "bg-emerald-50 text-mint" : "bg-orange-50 text-coral"}`}>
      {status}
    </span>
  );
}
