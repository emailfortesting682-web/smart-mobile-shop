"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Building2,
  CheckCircle2,
  CircleHelp,
  CreditCard,
  Download,
  Euro,
  HandCoins,
  LogOut,
  Package,
  Plus,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Store,
  TrendingUp,
  Users,
  Wrench
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  cloudAddCashMovement,
  cloudAddDeliveryPayment,
  cloudAddExpense,
  cloudAddSale,
  cloudCreateOwner,
  cloudCreateShopkeeper,
  cloudCurrentUser,
  cloudEnabled,
  cloudLoadData,
  cloudLogin,
  cloudLogout
} from "@/lib/cloudStore";
import { createOwner, createShopkeeper, loadData, loadSession, saveData, saveSession, scopedData, summarize } from "@/lib/demoStore";
import { emptyData } from "@/lib/emptyData";
import { formatMoney, makeId, nowIso } from "@/lib/format";
import type { AppData, DateFilter, PaymentMethod, SaleCategory, Shop, User } from "@/lib/types";

type AuthMode = "login" | "owner" | "shopkeeper";
type EntryMode = SaleCategory | "expense" | "delivery" | "cashMovement";

const dateFilters: { value: DateFilter; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "previousMonth", label: "Previous month" },
  { value: "all", label: "All time" }
];

const favoriteAccessories = ["Cover", "Vetro", "Charger", "Cavo", "Adapter", "Earphones"];
const repairTypes = ["LCD Replacement", "Battery Replacement", "Back Glass", "Charging Port", "Camera Repair", "Water Damage", "Software Repair"];
const phoneBrands = ["Apple", "Samsung", "Xiaomi", "Oppo", "Huawei"];
const storageOptions = ["64GB", "128GB", "256GB", "512GB"];

export function PlatformApp({ inviteToken }: { inviteToken?: string }) {
  const [data, setData] = useState<AppData | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>(inviteToken ? "shopkeeper" : "login");
  const [tourOpen, setTourOpen] = useState(false);
  const isCloud = cloudEnabled();

  useEffect(() => {
    async function boot() {
      if (isCloud) {
        const user = await cloudCurrentUser();
        setCurrentUser(user);
        setData(user ? await cloudLoadData(user.ownerId) : emptyData());
        return;
      }

      const loaded = loadData();
      const sessionId = loadSession();
      setData(loaded);
      setCurrentUser(loaded.users.find((user) => user.id === sessionId) ?? null);
    }

    boot().catch(() => {
      setData(emptyData());
      setCurrentUser(null);
    });
  }, [isCloud]);

  const commit = (nextData: AppData) => {
    setData({ ...nextData });
    saveData(nextData);
  };

  const reloadCloud = async (user = currentUser) => {
    if (!isCloud || !user) return;
    setData(await cloudLoadData(user.ownerId));
  };

  const login = async (email: string, password: string) => {
    if (!data) return "App is still loading.";
    if (isCloud) {
      try {
        const user = await cloudLogin(email, password);
        setCurrentUser(user);
        setData(await cloudLoadData(user.ownerId));
        return null;
      } catch (err) {
        return err instanceof Error ? err.message : "Login failed.";
      }
    }

    const user = data.users.find((item) => item.email.toLowerCase() === email.toLowerCase() && item.password === password);
    if (!user) return "Email or password is incorrect.";
    setCurrentUser(user);
    saveSession(user.id);
    return null;
  };

  const logout = async () => {
    if (isCloud) await cloudLogout();
    setCurrentUser(null);
    saveSession(null);
    setTourOpen(false);
    setAuthMode("login");
  };

  useEffect(() => {
    if (!currentUser) return;
    const key = tourStorageKey(currentUser);
    if (window.localStorage.getItem(key) !== "done") {
      setTourOpen(true);
    }
  }, [currentUser]);

  if (!data) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-mint" />
      </main>
    );
  }

  if (!currentUser) {
    return (
      <AuthPanel
        data={data}
        mode={authMode}
        inviteToken={inviteToken}
        onMode={setAuthMode}
        cloudMode={isCloud}
        onLogin={login}
        onOwnerRegister={async (name, email, password) => {
          if (isCloud) {
            const user = await cloudCreateOwner(name, email, password);
            setCurrentUser(user);
            setData(await cloudLoadData(user.ownerId));
            return;
          }
          const user = createOwner(data, name, email, password);
          setCurrentUser(user);
          setData({ ...data });
        }}
        onShopkeeperRegister={async (token, name, email, password, shopName, city) => {
          if (isCloud) {
            const user = await cloudCreateShopkeeper(token, name, email, password, shopName, city);
            setCurrentUser(user);
            setData(await cloudLoadData(user.ownerId));
            return;
          }
          const user = createShopkeeper(data, token, name, email, password, shopName, city);
          setCurrentUser(user);
          setData({ ...data });
        }}
      />
    );
  }

  return (
    <main className="min-h-screen">
      <TopBar user={currentUser} data={data} onLogout={logout} onOpenTour={() => setTourOpen(true)} />
      {currentUser.role === "owner" ? (
        <OwnerDashboard data={data} user={currentUser} commit={commit} />
      ) : (
        <ShopkeeperWorkspace data={data} user={currentUser} commit={commit} cloudMode={isCloud} reloadCloud={reloadCloud} />
      )}
      <OnboardingTour
        user={currentUser}
        open={tourOpen}
        onClose={() => setTourOpen(false)}
        onDontShowAgain={() => {
          window.localStorage.setItem(tourStorageKey(currentUser), "done");
          setTourOpen(false);
        }}
      />
    </main>
  );
}

function AuthPanel({
  data,
  mode,
  inviteToken,
  onMode,
  onLogin,
  onOwnerRegister,
  onShopkeeperRegister,
  cloudMode
}: {
  data: AppData;
  mode: AuthMode;
  inviteToken?: string;
  onMode: (mode: AuthMode) => void;
  onLogin: (email: string, password: string) => Promise<string | null>;
  onOwnerRegister: (name: string, email: string, password: string) => Promise<void>;
  onShopkeeperRegister: (token: string, name: string, email: string, password: string, shopName: string, city: string) => Promise<void>;
  cloudMode: boolean;
}) {
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: inviteToken ? "" : "owner@demo.com",
    password: inviteToken ? "" : "demo123",
    token: inviteToken ?? "DEMO2026",
    shopName: "",
    city: ""
  });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    try {
      if (mode === "login") {
        const message = await onLogin(form.email, form.password);
        if (message) setError(message);
        return;
      }
      if (mode === "owner") {
        await onOwnerRegister(form.name, form.email, form.password);
        return;
      }
      await onShopkeeperRegister(form.token, form.name, form.email, form.password, form.shopName, form.city);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <BrandLockup />
        <div className="hidden items-center gap-2 text-sm font-semibold text-slate-500 sm:flex">
          <ShieldCheck className="h-4 w-4 text-mint" />
          Secure branch operations
        </div>
      </div>

      <div className="mx-auto grid min-h-[calc(100vh-76px)] w-full max-w-7xl items-center gap-10 py-8 lg:grid-cols-[1.1fr_440px] xl:gap-16">
        <section className="max-w-3xl">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-mint" />
            Built for multi-shop mobile retailers
          </div>
          <h1 className="text-4xl font-semibold leading-tight tracking-normal text-graphite sm:text-5xl lg:text-[56px]">
            See sales, cash, and expenses for every shop in one calm workspace.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            Owners invite shopkeepers, teams enter daily transactions from any device, and branch performance stays organized without paper registers.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <Feature icon={<Users />} title="Invite teams" />
            <Feature icon={<ReceiptText />} title="Capture sales" />
            <Feature icon={<TrendingUp />} title="Track performance" />
          </div>
          <DashboardPreview />
        </section>

        <section className="rounded-lg border border-line bg-white p-5 shadow-panel">
          <div className="mb-5">
            <p className="flex items-center gap-2 text-sm font-semibold uppercase text-cobalt">
              Account access
              <HelpTip text="Choose Login for existing users, Owner to create a business workspace, or Worker to join through an invite link." />
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-graphite">
              {mode === "login" ? "Welcome back" : mode === "owner" ? "Create owner account" : "Join an owner workspace"}
            </h2>
          </div>

          <div className="mb-5 grid grid-cols-3 rounded-md bg-slate-100 p-1 text-sm font-semibold">
            <button className={tabClass(mode === "login")} onClick={() => onMode("login")}>Login</button>
            <button className={tabClass(mode === "owner")} onClick={() => onMode("owner")}>Owner</button>
            <button className={tabClass(mode === "shopkeeper")} onClick={() => onMode("shopkeeper")}>Worker</button>
          </div>

          <form className="space-y-4" onSubmit={submit}>
            {mode !== "login" && (
              <Field label="Full name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} required />
            )}
            {mode === "shopkeeper" && (
              <>
                <Field label="Invitation token" value={form.token} onChange={(value) => setForm({ ...form, token: value })} required />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Shop name" value={form.shopName} onChange={(value) => setForm({ ...form, shopName: value })} required />
                  <Field label="City" value={form.city} onChange={(value) => setForm({ ...form, city: value })} required />
                </div>
              </>
            )}
            <Field label="Email" type="email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} required />
            <Field label="Password" type="password" value={form.password} onChange={(value) => setForm({ ...form, password: value })} required />
            {error && <p className="rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-semibold text-coral">{error}</p>}
            <button className="focus-ring flex w-full items-center justify-center gap-2 rounded-md bg-graphite px-4 py-3 font-semibold text-white transition hover:bg-slate-700">
              {mode === "login" ? "Login" : "Create account"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {!cloudMode && (
            <div className="mt-5 rounded-md border border-line bg-slate-50 p-3 text-sm leading-6 text-slate-600">
              Demo owner: <strong>owner@demo.com</strong> / <strong>demo123</strong>
              <br />
              Demo shopkeeper: <strong>shop@demo.com</strong> / <strong>demo123</strong>
              <br />
              Demo invite token: <strong>{data.owners[0]?.inviteToken}</strong>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function TopBar({ user, data, onLogout, onOpenTour }: { user: User; data: AppData; onLogout: () => void; onOpenTour: () => void }) {
  const shop = data.shops.find((item) => item.id === user.shopId);
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <BrandMark />
          <div>
            <p className="font-semibold text-graphite">Smart Mobile Shop</p>
            <p className="text-sm text-slate-500">{user.role === "owner" ? "Owner dashboard" : shop?.name ?? "Shopkeeper workspace"}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm font-semibold text-slate-600 sm:inline">{user.name}</span>
          <button className="focus-ring inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-graphite" onClick={onOpenTour}>
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Guided Tour</span>
          </button>
          <button className="focus-ring rounded-md border border-line bg-white p-2 text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-graphite" onClick={onLogout} title="Logout">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}

function BrandLockup() {
  return (
    <div className="flex items-center gap-3">
      <BrandMark />
      <div>
        <p className="text-base font-semibold text-graphite">Smart Mobile Shop</p>
        <p className="text-xs font-semibold uppercase text-slate-500">Branch management</p>
      </div>
    </div>
  );
}

function BrandMark() {
  return (
    <div className="grid h-10 w-10 grid-cols-2 grid-rows-2 gap-0.5 rounded-md bg-white p-1 shadow-sm ring-1 ring-line">
      <span className="rounded-sm bg-cobalt" />
      <span className="rounded-sm bg-mint" />
      <span className="rounded-sm bg-amber" />
      <span className="rounded-sm bg-graphite" />
    </div>
  );
}

function DashboardPreview() {
  return (
    <div className="mt-10 max-w-2xl overflow-hidden rounded-lg border border-line bg-white shadow-panel">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-coral" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber" />
          <span className="h-2.5 w-2.5 rounded-full bg-mint" />
        </div>
        <p className="text-xs font-semibold text-slate-500">Live owner dashboard</p>
      </div>
      <div className="grid gap-4 p-4 sm:grid-cols-[1fr_190px]">
        <div>
          <div className="mb-4 grid grid-cols-3 gap-3">
            <PreviewMetric label="Today" value="EUR 4,250" tone="bg-blue-50 text-cobalt" />
            <PreviewMetric label="Cash" value="EUR 2,300" tone="bg-emerald-50 text-mint" />
            <PreviewMetric label="Card" value="EUR 1,950" tone="bg-orange-50 text-amber" />
          </div>
          <div className="flex h-36 items-end gap-2 rounded-md bg-slate-50 px-4 py-3">
            {[56, 42, 75, 62, 88, 48, 69].map((height, index) => (
              <span
                key={index}
                className="w-full rounded-t-sm bg-cobalt/80"
                style={{ height: `${height}%`, opacity: 0.55 + index * 0.05 }}
              />
            ))}
          </div>
        </div>
        <div className="rounded-md border border-line p-3">
          <p className="text-sm font-semibold text-graphite">Branch health</p>
          <div className="mt-3 space-y-3">
            {["Milano 1", "Milano 2", "Roma 1"].map((name, index) => (
              <div key={name}>
                <div className="mb-1 flex justify-between text-xs font-semibold text-slate-500">
                  <span>{name}</span>
                  <span>{[92, 78, 64][index]}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div className="h-2 rounded-full bg-mint" style={{ width: `${[92, 78, 64][index]}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-md bg-slate-50 p-2 text-xs font-semibold text-slate-600">
            <CheckCircle2 className="h-4 w-4 text-mint" />
            Monthly summary ready
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewMetric({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-md border border-line bg-white p-3">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className={`mt-1 rounded-sm px-2 py-1 text-sm font-semibold ${tone}`}>{value}</p>
    </div>
  );
}

function OnboardingTour({
  user,
  open,
  onClose,
  onDontShowAgain
}: {
  user: User;
  open: boolean;
  onClose: () => void;
  onDontShowAgain: () => void;
}) {
  const [step, setStep] = useState(0);
  const steps = user.role === "owner" ? ownerTourSteps : shopkeeperTourSteps;
  const current = steps[step];

  useEffect(() => {
    if (open) setStep(0);
  }, [open, user.role]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm">
      <section className="w-full max-w-2xl overflow-hidden rounded-lg border border-line bg-white shadow-panel">
        <div className="border-b border-line bg-slate-50 px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase text-cobalt">{user.role === "owner" ? "Owner guided tour" : "Shopkeeper guided tour"}</p>
              <h2 className="mt-1 text-2xl font-semibold text-graphite">{current.title}</h2>
            </div>
            <div className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-slate-500 shadow-sm ring-1 ring-line">
              {step + 1} / {steps.length}
            </div>
          </div>
        </div>

        <div className="px-5 py-5">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-lg bg-blue-50 text-cobalt">
            {current.icon}
          </div>
          <p className="text-base leading-7 text-slate-600">{current.body}</p>
          <div className="mt-6 flex gap-2">
            {steps.map((_, index) => (
              <span key={index} className={`h-1.5 flex-1 rounded-full ${index <= step ? "bg-cobalt" : "bg-slate-200"}`} />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row">
            <button className="focus-ring rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-graphite" onClick={onClose}>
              Skip Tutorial
            </button>
            <button className="focus-ring rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-graphite" onClick={onDontShowAgain}>
              Do Not Show Again
            </button>
          </div>
          <div className="flex gap-2">
            <button
              className="focus-ring rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold text-graphite transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-45"
              disabled={step === 0}
              onClick={() => setStep((value) => Math.max(0, value - 1))}
            >
              Back
            </button>
            <button
              className="focus-ring rounded-md bg-graphite px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
              onClick={() => {
                if (step === steps.length - 1) {
                  onClose();
                  return;
                }
                setStep((value) => value + 1);
              }}
            >
              {step === steps.length - 1 ? "Finish" : "Next"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

const ownerTourSteps = [
  {
    title: "Start with the owner dashboard",
    body: "This dashboard gives the owner a consolidated view of every connected shop. Totals, charts, and records update from the sales and payments submitted by shopkeepers.",
    icon: <BarChart3 className="h-7 w-7" />
  },
  {
    title: "Share the shopkeeper invite link",
    body: "Copy the invitation link and send it to a worker. When the worker registers, their shop is attached under this owner account automatically.",
    icon: <Users className="h-7 w-7" />
  },
  {
    title: "Use filters to review performance",
    body: "The date and shop filters control the totals, comparison chart, statistics, and recent records. Use them to review today, this month, or a single branch.",
    icon: <TrendingUp className="h-7 w-7" />
  },
  {
    title: "Understand cash in hand",
    body: "Cash in hand is calculated from cash sales minus expenses, delivery payments, and cash taken from the shop. This helps the owner compare expected cash with physical cash in the shop.",
    icon: <Euro className="h-7 w-7" />
  },
  {
    title: "Export reports when needed",
    body: "The CSV button downloads the filtered sales list in a format that opens in Excel. Use it for monthly review, sharing, or bookkeeping.",
    icon: <Download className="h-7 w-7" />
  }
];

const shopkeeperTourSteps = [
  {
    title: "Use the daily operations workspace",
    body: "This page is designed for fast daily entry. Shopkeepers can record sales, expenses, supplier payments, and cash taken from a phone, tablet, or computer.",
    icon: <Store className="h-7 w-7" />
  },
  {
    title: "Choose the correct module",
    body: "Use Accessories for items like covers and chargers, Repairing for completed repairs, Telephones for phone sales, Expense for shop costs, Delivery payment for suppliers, and Cash Taken when cash leaves the drawer.",
    icon: <Package className="h-7 w-7" />
  },
  {
    title: "Enter price, quantity, and payment method",
    body: "For sales, select or type the item details, set quantity and price, then choose Cash or Bancomat/Card. The total is calculated before saving.",
    icon: <CreditCard className="h-7 w-7" />
  },
  {
    title: "Save entries immediately",
    body: "Press Save after each transaction. Once saved, the entry is added to the owner dashboard and included in today totals.",
    icon: <CheckCircle2 className="h-7 w-7" />
  },
  {
    title: "Use help icons anytime",
    body: "Small question icons explain important fields and dashboard sections. The Guided Tour button in the header can reopen this tutorial whenever needed.",
    icon: <CircleHelp className="h-7 w-7" />
  }
];

function tourStorageKey(user: User) {
  return `smart-mobile-shop-tour-${user.role}-${user.id}`;
}

function OwnerDashboard({ data, user, commit }: { data: AppData; user: User; commit: (data: AppData) => void }) {
  const [filter, setFilter] = useState<DateFilter>("today");
  const [selectedShopId, setSelectedShopId] = useState<string>("all");
  const owner = data.owners.find((item) => item.id === user.ownerId);
  const shops = data.shops.filter((shop) => shop.ownerId === user.ownerId);
  const selectedShop = selectedShopId === "all" ? undefined : selectedShopId;
  const scoped = scopedData(data, user.ownerId, filter, selectedShop);
  const summary = summarize(scoped.sales, scoped.expenses, scoped.deliveryPayments, scoped.cashMovements);
  const chartData = shops.map((shop) => {
    const shopScoped = scopedData(data, user.ownerId, filter, shop.id);
    return {
      name: `${shop.name} (${shop.city})`,
      sales: summarize(shopScoped.sales, shopScoped.expenses, shopScoped.deliveryPayments, shopScoped.cashMovements).totalSales
    };
  });
  const origin = typeof window === "undefined" ? "https://yourapp.com" : window.location.origin;
  const inviteUrl = `${origin}/join/${owner?.inviteToken}`;

  const exportCsv = () => {
    const rows = scoped.sales.map((sale) => ({
      Date: new Date(sale.createdAt).toLocaleString(),
      Shop: shops.find((shop) => shop.id === sale.shopId)?.name,
      Category: sale.category,
      Item: sale.itemName,
      Quantity: sale.quantity,
      Total: sale.total,
      Payment: sale.paymentMethod
    }));
    const headers = ["Date", "Shop", "Category", "Item", "Quantity", "Total", "Payment"];
    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        headers
          .map((header) => {
            const value = row[header as keyof typeof row] ?? "";
            return `"${String(value).replaceAll('"', '""')}"`;
          })
          .join(",")
      )
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "smart-mobile-shop-report.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="mx-auto max-w-7xl px-4 py-7">
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold uppercase text-cobalt">
            Workspace overview
            <HelpTip text="This dashboard combines sales, expenses, supplier payments, cash taken, and cash position for the selected shops and date range." />
          </p>
          <h1 className="mt-1 text-3xl font-semibold text-graphite">Owner dashboard</h1>
          <p className="mt-1 text-slate-600">Monitor shops, daily cash, card sales, expenses, and branch performance.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <ControlWithHelp text="Change the reporting period used by the totals, chart, and records.">
            <select className="focus-ring w-full rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-graphite shadow-sm" value={filter} onChange={(event) => setFilter(event.target.value as DateFilter)}>
              {dateFilters.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </ControlWithHelp>
          <ControlWithHelp text="View all branches together or focus the dashboard on one specific shop.">
            <select className="focus-ring w-full rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-graphite shadow-sm" value={selectedShopId} onChange={(event) => setSelectedShopId(event.target.value)}>
              <option value="all">All shops</option>
              {shops.map((shop) => <option key={shop.id} value={shop.id}>{shop.name}</option>)}
            </select>
          </ControlWithHelp>
          <div className="flex items-center gap-2">
            <button className="focus-ring inline-flex items-center justify-center gap-2 rounded-md bg-graphite px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700" onClick={exportCsv}>
              <Download className="h-4 w-4" />
              CSV
            </button>
            <HelpTip text="Downloads the currently filtered sales list as a CSV file that can be opened in Excel." />
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-lg border border-line bg-white p-4 shadow-sm">
        <p className="flex items-center gap-2 text-sm font-semibold uppercase text-slate-500">
          Shopkeeper invitation link
          <HelpTip text="Send this link to a worker. When they register, their shop is automatically connected to this owner account." />
        </p>
        <div className="mt-2 flex flex-col gap-2 md:flex-row">
          <input className="focus-ring w-full rounded-md border border-line bg-slate-50 px-3 py-2 text-sm font-semibold text-graphite" value={inviteUrl} readOnly />
          <button className="focus-ring rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold text-graphite shadow-sm transition hover:border-slate-300" onClick={() => navigator.clipboard?.writeText(inviteUrl)}>Copy</button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
        <Metric icon={<Euro />} label="Total sales" value={formatMoney(summary.totalSales)} help="Total revenue from accessories, repairs, and phone sales for the selected period." />
        <Metric icon={<Euro />} label="Cash" value={formatMoney(summary.cashSales)} help="Sales paid in cash. This is used to calculate cash in hand." />
        <Metric icon={<CreditCard />} label="Bancomat" value={formatMoney(summary.cardSales)} help="Sales paid by card or Bancomat." />
        <Metric icon={<ReceiptText />} label="Expenses" value={formatMoney(summary.expenses)} help="Shop expenses such as fuel, cleaning, food, or utilities." />
        <Metric icon={<Package />} label="Deliveries" value={formatMoney(summary.deliveryPayments)} help="Money paid to suppliers or for stock deliveries." />
        <Metric icon={<HandCoins />} label="Cash taken" value={formatMoney(summary.cashMovements)} help="Cash removed from the shop by the owner or a worker, such as salary cash or owner collection." />
        <Metric icon={<Store />} label="Cash in hand" value={formatMoney(summary.cashInHand)} help="Cash sales minus expenses, supplier delivery payments, and cash taken." strong />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
        <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-graphite">
            Branch comparison
            <HelpTip text="Compares sales revenue between branches for the selected date filter." />
          </h2>
          <div style={{ height: Math.max(288, chartData.length * 56) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 24, bottom: 16, left: 32 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d9e1e5" />
                <XAxis type="number" tickFormatter={(value) => `EUR ${value}`} tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => formatMoney(Number(value))} />
                <Bar dataKey="sales" fill="#2563eb" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-graphite">
            Shop statistics
            <HelpTip text="Breaks down revenue and counts by accessories, repairs, and telephone sales." />
          </h2>
          <div className="grid gap-3">
            <MiniStat label="Accessories" value={formatMoney(summary.accessoriesRevenue)} detail={`${summary.accessoriesCount} items`} />
            <MiniStat label="Repairing" value={formatMoney(summary.repairRevenue)} detail={`${summary.repairsCount} repairs`} />
            <MiniStat label="Telephones" value={formatMoney(summary.telephoneRevenue)} detail={`${summary.telephonesCount} phones`} />
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <RecordsTable title="Latest sales" rows={scoped.sales.slice(-8).reverse().map((sale) => [
          new Date(sale.createdAt).toLocaleString(),
          shops.find((shop) => shop.id === sale.shopId)?.name ?? "",
          sale.category,
          sale.itemName,
          formatMoney(sale.total)
        ])} />
        <RecordsTable title="Latest cash records" rows={[
          ...scoped.expenses.map((item) => [new Date(item.createdAt).toLocaleString(), shops.find((shop) => shop.id === item.shopId)?.name ?? "", "Expense", item.description, formatMoney(item.amount)]),
          ...scoped.deliveryPayments.map((item) => [new Date(item.createdAt).toLocaleString(), shops.find((shop) => shop.id === item.shopId)?.name ?? "", "Delivery", item.supplierName, formatMoney(item.amount)]),
          ...scoped.cashMovements.map((item) => [new Date(item.createdAt).toLocaleString(), shops.find((shop) => shop.id === item.shopId)?.name ?? "", "Cash Taken", `${item.takenByType}: ${item.takenByName} - ${item.reason}`, formatMoney(item.amount)])
        ].slice(-8).reverse()} />
      </div>
    </section>
  );
}

function ShopkeeperWorkspace({
  data,
  user,
  commit,
  cloudMode,
  reloadCloud
}: {
  data: AppData;
  user: User;
  commit: (data: AppData) => void;
  cloudMode: boolean;
  reloadCloud: () => Promise<void>;
}) {
  const [mode, setMode] = useState<EntryMode>("accessories");
  const shop = data.shops.find((item) => item.id === user.shopId);
  const today = scopedData(data, user.ownerId, "today", user.shopId);
  const summary = summarize(today.sales, today.expenses, today.deliveryPayments, today.cashMovements);

  const addSale = async (category: SaleCategory, values: { itemName: string; quantity: number; unitPrice: number; paymentMethod: PaymentMethod; metadata?: Record<string, string> }) => {
    if (!user.shopId) return;
    if (cloudMode) {
      await cloudAddSale({
        ownerId: user.ownerId,
        shopId: user.shopId,
        shopkeeperId: user.id,
        category,
        itemName: values.itemName,
        quantity: values.quantity,
        unitPrice: values.unitPrice,
        paymentMethod: values.paymentMethod,
        metadata: values.metadata
      });
      await reloadCloud();
      return;
    }
    const next = { ...data, sales: [...data.sales] };
    next.sales.push({
      id: makeId("sale"),
      ownerId: user.ownerId,
      shopId: user.shopId,
      shopkeeperId: user.id,
      category,
      itemName: values.itemName,
      quantity: values.quantity,
      unitPrice: values.unitPrice,
      total: values.quantity * values.unitPrice,
      paymentMethod: values.paymentMethod,
      metadata: values.metadata,
      createdAt: nowIso()
    });
    commit(next);
  };

  const addExpense = async (description: string, amount: number, notes: string) => {
    if (!user.shopId) return;
    if (cloudMode) {
      await cloudAddExpense({ ownerId: user.ownerId, shopId: user.shopId, shopkeeperId: user.id, description, amount, notes });
      await reloadCloud();
      return;
    }
    const next = { ...data, expenses: [...data.expenses] };
    next.expenses.push({ id: makeId("exp"), ownerId: user.ownerId, shopId: user.shopId, shopkeeperId: user.id, description, amount, notes, createdAt: nowIso() });
    commit(next);
  };

  const addDelivery = async (supplierName: string, amount: number, notes: string) => {
    if (!user.shopId) return;
    if (cloudMode) {
      await cloudAddDeliveryPayment({ ownerId: user.ownerId, shopId: user.shopId, shopkeeperId: user.id, supplierName, amount, notes });
      await reloadCloud();
      return;
    }
    const next = { ...data, deliveryPayments: [...data.deliveryPayments] };
    next.deliveryPayments.push({ id: makeId("del"), ownerId: user.ownerId, shopId: user.shopId, shopkeeperId: user.id, supplierName, amount, notes, createdAt: nowIso() });
    commit(next);
  };

  const addCashMovement = async (takenByType: "owner" | "worker", takenByName: string, reason: string, amount: number, notes: string) => {
    if (!user.shopId) return;
    if (cloudMode) {
      await cloudAddCashMovement({ ownerId: user.ownerId, shopId: user.shopId, shopkeeperId: user.id, takenByType, takenByName, reason, amount, notes });
      await reloadCloud();
      return;
    }
    const next = { ...data, cashMovements: [...(data.cashMovements ?? [])] };
    next.cashMovements.push({ id: makeId("cash"), ownerId: user.ownerId, shopId: user.shopId, shopkeeperId: user.id, takenByType, takenByName, reason, amount, notes, createdAt: nowIso() });
    commit(next);
  };

  return (
    <section className="mx-auto max-w-7xl px-4 py-7">
      <div className="mb-6 flex flex-col gap-1">
        <p className="flex items-center gap-2 text-sm font-semibold uppercase text-cobalt">
          Daily operations
          <HelpTip text="Use this workspace to record sales, expenses, supplier payments, and cash taken as they happen during the day." />
        </p>
        <h1 className="text-3xl font-semibold text-graphite">{shop?.name ?? "Shop workspace"}</h1>
        <p className="text-slate-600">Enter sales and payments as they happen. Today cash in hand: <strong className="text-graphite">{formatMoney(summary.cashInHand)}</strong></p>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric icon={<Euro />} label="Today sales" value={formatMoney(summary.totalSales)} help="All sales entered today for this shop." />
        <Metric icon={<CreditCard />} label="Bancomat" value={formatMoney(summary.cardSales)} help="Today card/Bancomat payments for this shop." />
        <Metric icon={<ReceiptText />} label="Expenses" value={formatMoney(summary.expenses + summary.deliveryPayments)} help="Today expenses plus supplier delivery payments." />
        <Metric icon={<HandCoins />} label="Cash taken" value={formatMoney(summary.cashMovements)} help="Cash removed from this shop today by the owner or a worker." />
      </div>

      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        <nav className="grid gap-2 self-start rounded-lg border border-line bg-white p-3 shadow-sm">
          <EntryButton active={mode === "accessories"} icon={<Package />} label="Accessories" help="Record covers, chargers, cables, glass protectors, and other accessory sales." onClick={() => setMode("accessories")} />
          <EntryButton active={mode === "repair"} icon={<Wrench />} label="Repairing" help="Record completed phone repairs with model, repair type, price, and payment method." onClick={() => setMode("repair")} />
          <EntryButton active={mode === "telephone"} icon={<Smartphone />} label="Telephones" help="Record phone sales with brand, model, IMEI, storage, price, and payment method." onClick={() => setMode("telephone")} />
          <EntryButton active={mode === "expense"} icon={<ReceiptText />} label="Expense / Spesa" help="Record shop expenses such as fuel, cleaning, food, or bills." onClick={() => setMode("expense")} />
          <EntryButton active={mode === "delivery"} icon={<Building2 />} label="Delivery payment" help="Record money paid to suppliers or for stock deliveries." onClick={() => setMode("delivery")} />
          <EntryButton active={mode === "cashMovement"} icon={<HandCoins />} label="Cash Taken" help="Record cash taken from the shop by the owner or a worker, such as salary cash or owner collection." onClick={() => setMode("cashMovement")} />
        </nav>

        <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
          {mode === "accessories" && <AccessoriesForm onSubmit={(values) => addSale("accessories", values)} />}
          {mode === "repair" && <RepairForm onSubmit={(values) => addSale("repair", values)} />}
          {mode === "telephone" && <TelephoneForm onSubmit={(values) => addSale("telephone", values)} />}
          {mode === "expense" && <ExpenseForm onSubmit={addExpense} />}
          {mode === "delivery" && <DeliveryForm onSubmit={addDelivery} />}
          {mode === "cashMovement" && <CashMovementForm currentWorkerName={user.name} onSubmit={addCashMovement} />}
        </section>
      </div>
    </section>
  );
}

function AccessoriesForm({ onSubmit }: { onSubmit: (values: { itemName: string; quantity: number; unitPrice: number; paymentMethod: PaymentMethod }) => void }) {
  const [itemName, setItemName] = useState("Cover");
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(10);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");

  return (
    <EntryForm title="Accessories sale" total={quantity * unitPrice} onSubmit={() => onSubmit({ itemName, quantity, unitPrice, paymentMethod })}>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {favoriteAccessories.map((item) => (
          <button type="button" key={item} className={choiceClass(itemName === item)} onClick={() => setItemName(item)}>{item}</button>
        ))}
      </div>
      <Field label="Other item" value={favoriteAccessories.includes(itemName) ? "" : itemName} onChange={(value) => setItemName(value || "Cover")} />
      <QuantityPrice quantity={quantity} setQuantity={setQuantity} unitPrice={unitPrice} setUnitPrice={setUnitPrice} />
      <PaymentPicker value={paymentMethod} onChange={setPaymentMethod} />
    </EntryForm>
  );
}

function RepairForm({ onSubmit }: { onSubmit: (values: { itemName: string; quantity: number; unitPrice: number; paymentMethod: PaymentMethod; metadata: Record<string, string> }) => void }) {
  const [model, setModel] = useState("");
  const [repairType, setRepairType] = useState(repairTypes[0]);
  const [price, setPrice] = useState(70);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");

  return (
    <EntryForm title="Repairing sale" total={price} onSubmit={() => onSubmit({ itemName: `${model || "Phone"} ${repairType}`, quantity: 1, unitPrice: price, paymentMethod, metadata: { model, repairType } })}>
      <Field label="Phone model" value={model} onChange={setModel} placeholder="iPhone 11, Samsung A50..." required />
      <label className="grid gap-1 text-sm font-bold text-slate-600">
        Repair type
        <select className="focus-ring rounded-md border border-line bg-white px-3 py-3 text-base text-ink" value={repairType} onChange={(event) => setRepairType(event.target.value)}>
          {repairTypes.map((item) => <option key={item}>{item}</option>)}
        </select>
      </label>
      <Field label="Price" type="number" value={String(price)} onChange={(value) => setPrice(Number(value))} required />
      <PaymentPicker value={paymentMethod} onChange={setPaymentMethod} />
    </EntryForm>
  );
}

function TelephoneForm({ onSubmit }: { onSubmit: (values: { itemName: string; quantity: number; unitPrice: number; paymentMethod: PaymentMethod; metadata: Record<string, string> }) => void }) {
  const [brand, setBrand] = useState(phoneBrands[0]);
  const [model, setModel] = useState("");
  const [imei, setImei] = useState("");
  const [storage, setStorage] = useState(storageOptions[1]);
  const [price, setPrice] = useState(300);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");

  return (
    <EntryForm title="Telephone sale" total={price} onSubmit={() => onSubmit({ itemName: `${brand} ${model || "Phone"} ${storage}`, quantity: 1, unitPrice: price, paymentMethod, metadata: { brand, model, imei, storage } })}>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1 text-sm font-bold text-slate-600">
          Brand
          <select className="focus-ring rounded-md border border-line bg-white px-3 py-3 text-base text-ink" value={brand} onChange={(event) => setBrand(event.target.value)}>
            {phoneBrands.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <Field label="Model" value={model} onChange={setModel} required />
        <Field label="IMEI number" value={imei} onChange={setImei} required />
        <label className="grid gap-1 text-sm font-bold text-slate-600">
          Storage
          <select className="focus-ring rounded-md border border-line bg-white px-3 py-3 text-base text-ink" value={storage} onChange={(event) => setStorage(event.target.value)}>
            {storageOptions.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
      </div>
      <Field label="Price" type="number" value={String(price)} onChange={(value) => setPrice(Number(value))} required />
      <PaymentPicker value={paymentMethod} onChange={setPaymentMethod} />
    </EntryForm>
  );
}

function ExpenseForm({ onSubmit }: { onSubmit: (description: string, amount: number, notes: string) => void }) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState(20);
  const [notes, setNotes] = useState("");
  return (
    <EntryForm title="Expense / Spesa" total={amount} onSubmit={() => onSubmit(description, amount, notes)}>
      <Field label="Description" value={description} onChange={setDescription} placeholder="Coffee, fuel, cleaning..." required />
      <Field label="Amount" type="number" value={String(amount)} onChange={(value) => setAmount(Number(value))} required />
      <Field label="Notes" value={notes} onChange={setNotes} />
    </EntryForm>
  );
}

function DeliveryForm({ onSubmit }: { onSubmit: (supplierName: string, amount: number, notes: string) => void }) {
  const [supplierName, setSupplierName] = useState("");
  const [amount, setAmount] = useState(100);
  const [notes, setNotes] = useState("");
  return (
    <EntryForm title="Delivery payment" total={amount} onSubmit={() => onSubmit(supplierName, amount, notes)}>
      <Field label="Supplier name" value={supplierName} onChange={setSupplierName} required />
      <Field label="Amount" type="number" value={String(amount)} onChange={(value) => setAmount(Number(value))} required />
      <Field label="Notes" value={notes} onChange={setNotes} />
    </EntryForm>
  );
}

function CashMovementForm({ currentWorkerName, onSubmit }: { currentWorkerName: string; onSubmit: (takenByType: "owner" | "worker", takenByName: string, reason: string, amount: number, notes: string) => void }) {
  const [takenByType, setTakenByType] = useState<"owner" | "worker">("owner");
  const [takenByName, setTakenByName] = useState("");
  const [reason, setReason] = useState("Owner cash collection");
  const [amount, setAmount] = useState(100);
  const [notes, setNotes] = useState("");

  const finalName = takenByName || (takenByType === "worker" ? currentWorkerName : "Owner");
  const finalReason = takenByType === "owner" ? "Owner cash collection" : reason;

  return (
    <EntryForm title="Cash Taken" total={amount} onSubmit={() => onSubmit(takenByType, finalName, finalReason, amount, notes)}>
      <div className="grid gap-3 sm:grid-cols-2">
        <button type="button" className={choiceClass(takenByType === "owner")} onClick={() => {
          setTakenByType("owner");
          setReason("Owner cash collection");
          setTakenByName("");
        }}>
          Owner took cash
        </button>
        <button type="button" className={choiceClass(takenByType === "worker")} onClick={() => {
          setTakenByType("worker");
          setReason("Worker salary");
          setTakenByName(currentWorkerName);
        }}>
          Worker took cash
        </button>
      </div>
      {takenByType === "owner" ? (
        <div className="rounded-md border border-line bg-slate-50 px-3 py-3 text-sm leading-6 text-slate-600">
          This will be recorded as <strong className="text-graphite">Owner cash collection</strong>. Use notes if a worker collected it on the owner&apos;s behalf or if extra detail is needed.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Worker name" value={takenByName} onChange={setTakenByName} placeholder={currentWorkerName} />
          <label className="grid gap-1 text-sm font-bold text-slate-600">
            Reason
            <select className="focus-ring rounded-md border border-line bg-white px-3 py-3 text-base text-graphite shadow-sm transition hover:border-slate-300" value={reason} onChange={(event) => setReason(event.target.value)}>
              <option>Worker salary</option>
              <option>Worker advance</option>
              <option>Worker reimbursement</option>
              <option>Other</option>
            </select>
          </label>
        </div>
      )}
      <Field label="Amount" type="number" value={String(amount)} onChange={(value) => setAmount(Number(value))} required />
      <Field label="Notes" value={notes} onChange={setNotes} placeholder="Optional details" />
    </EntryForm>
  );
}

function EntryForm({ title, total, children, onSubmit }: { title: string; total: number; children: React.ReactNode; onSubmit: () => void }) {
  const [saved, setSaved] = useState(false);
  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
        setSaved(true);
        window.setTimeout(() => setSaved(false), 1400);
      }}
    >
      <div className="flex flex-col gap-2 border-b border-line pb-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="flex items-center gap-2 text-xl font-semibold text-graphite">
          {title}
          <HelpTip text="Fill the fields below and press Save to add this entry to the owner dashboard." />
        </h2>
        <div className="flex items-center gap-2 rounded-md bg-slate-100 px-4 py-2 text-lg font-semibold text-graphite">
          {formatMoney(total)}
          <HelpTip text="This is the calculated total amount that will be recorded." />
        </div>
      </div>
      {children}
      <button className="focus-ring flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-mint px-4 py-3 text-lg font-semibold text-white shadow-sm transition hover:bg-teal-800">
        <Plus className="h-5 w-5" />
        Save
      </button>
      {saved && <p className="rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2 text-center font-semibold text-mint">Saved successfully.</p>}
    </form>
  );
}

function QuantityPrice({ quantity, setQuantity, unitPrice, setUnitPrice }: { quantity: number; setQuantity: (value: number) => void; unitPrice: number; setUnitPrice: (value: number) => void }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div>
        <p className="mb-1 flex items-center gap-2 text-sm font-bold text-slate-600">
          Quantity
          <HelpTip text="Use plus and minus to record multiple units of the same item in one sale." />
        </p>
        <div className="grid grid-cols-[56px_1fr_56px] overflow-hidden rounded-md border border-line bg-white">
          <button type="button" className="bg-slate-100 text-2xl font-semibold text-graphite transition hover:bg-slate-200" onClick={() => setQuantity(Math.max(1, quantity - 1))}>-</button>
          <div className="flex items-center justify-center bg-white text-xl font-semibold text-graphite">{quantity}</div>
          <button type="button" className="bg-slate-100 text-2xl font-semibold text-graphite transition hover:bg-slate-200" onClick={() => setQuantity(quantity + 1)}>+</button>
        </div>
      </div>
      <Field label="Selling price" type="number" value={String(unitPrice)} onChange={(value) => setUnitPrice(Number(value))} required />
    </div>
  );
}

function PaymentPicker({ value, onChange }: { value: PaymentMethod; onChange: (value: PaymentMethod) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <button type="button" className={choiceClass(value === "cash")} onClick={() => onChange("cash")}>Cash / Contanti</button>
      <button type="button" className={choiceClass(value === "card")} onClick={() => onChange("card")}>Bancomat / Card</button>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required, placeholder }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; placeholder?: string }) {
  return (
    <label className="grid gap-1 text-sm font-bold text-slate-600">
      {label}
      <input
        className="focus-ring rounded-md border border-line bg-white px-3 py-3 text-base text-graphite shadow-sm transition placeholder:text-slate-400 hover:border-slate-300"
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        placeholder={placeholder}
      />
    </label>
  );
}

function Metric({ icon, label, value, help, strong }: { icon: React.ReactNode; label: string; value: string; help?: string; strong?: boolean }) {
  return (
    <div className={`rounded-lg border border-line bg-white p-4 shadow-sm ${strong ? "ring-1 ring-cobalt/20" : ""}`}>
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-blue-50 text-cobalt">{icon}</div>
      <p className="flex items-center gap-2 text-sm font-semibold text-slate-500">
        {label}
        {help && <HelpTip text={help} />}
      </p>
      <p className="mt-1 break-words text-2xl font-semibold text-graphite">{value}</p>
    </div>
  );
}

function MiniStat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-md border border-line bg-slate-50/60 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold text-graphite">{label}</p>
        <p className="font-semibold text-cobalt">{value}</p>
      </div>
      <p className="mt-1 text-sm text-slate-500">{detail}</p>
    </div>
  );
}

function RecordsTable({ title, rows }: { title: string; rows: string[][] }) {
  return (
    <section className="overflow-hidden rounded-lg border border-line bg-white shadow-sm">
      <h2 className="border-b border-line px-4 py-3 text-lg font-semibold text-graphite">{title}</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-left text-sm">
          <tbody>
            {rows.length === 0 ? (
              <tr><td className="px-4 py-6 text-slate-500">No records for this filter.</td></tr>
            ) : rows.map((row, index) => (
              <tr key={index} className="border-b border-line transition hover:bg-slate-50 last:border-0">
                {row.map((cell, cellIndex) => <td key={cellIndex} className="px-4 py-3 text-slate-700">{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function EntryButton({ active, icon, label, help, onClick }: { active: boolean; icon: React.ReactNode; label: string; help: string; onClick: () => void }) {
  return (
    <div className={`flex min-h-14 items-center gap-2 rounded-md px-3 py-3 transition ${
      active ? "bg-graphite text-white shadow-sm" : "bg-white text-graphite hover:bg-slate-50"
    }`}>
      <button className="focus-ring flex flex-1 items-center gap-3 text-left font-semibold" onClick={onClick}>
        {icon}
        {label}
      </button>
      <HelpTip text={help} invert={active} />
    </div>
  );
}

function ControlWithHelp({ children, text }: { children: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1">{children}</div>
      <HelpTip text={text} />
    </div>
  );
}

function HelpTip({ text, invert }: { text: string; invert?: boolean }) {
  return (
    <span className="group/help relative inline-flex align-middle">
      <button
        type="button"
        className={`focus-ring inline-flex h-5 w-5 items-center justify-center rounded-full border text-[11px] transition ${
          invert
            ? "border-white/30 text-white/80 hover:bg-white/10 hover:text-white"
            : "border-slate-300 bg-white text-slate-500 hover:border-cobalt hover:text-cobalt"
        }`}
        aria-label="Help"
      >
        <CircleHelp className="h-3.5 w-3.5" />
      </button>
      <span className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 w-64 -translate-x-1/2 rounded-md border border-line bg-graphite px-3 py-2 text-left text-xs font-medium leading-5 text-white opacity-0 shadow-panel transition group-hover/help:opacity-100 group-focus-within/help:opacity-100">
        {text}
      </span>
    </span>
  );
}

function Feature({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-line bg-white p-4 shadow-sm">
      <div className="text-cobalt">{icon}</div>
      <p className="font-semibold text-graphite">{title}</p>
    </div>
  );
}

function tabClass(active: boolean) {
  return `focus-ring rounded px-3 py-2 transition ${active ? "bg-white text-graphite shadow-sm" : "text-slate-500 hover:text-graphite"}`;
}

function choiceClass(active: boolean) {
  return `focus-ring min-h-14 rounded-md border px-3 py-3 text-center font-semibold transition ${
    active ? "border-cobalt bg-blue-50 text-cobalt" : "border-line bg-white text-graphite hover:border-slate-400"
  }`;
}

