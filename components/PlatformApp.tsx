"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Building2,
  CreditCard,
  Download,
  Euro,
  LogOut,
  Package,
  Plus,
  ReceiptText,
  RefreshCw,
  Smartphone,
  Store,
  Wrench
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
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
type EntryMode = SaleCategory | "expense" | "delivery";

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
    setAuthMode("login");
  };

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
      <TopBar user={currentUser} data={data} onLogout={logout} />
      {currentUser.role === "owner" ? (
        <OwnerDashboard data={data} user={currentUser} commit={commit} />
      ) : (
        <ShopkeeperWorkspace data={data} user={currentUser} commit={commit} cloudMode={isCloud} reloadCloud={reloadCloud} />
      )}
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
    <main className="mx-auto grid min-h-screen w-full max-w-6xl items-center gap-8 px-4 py-8 lg:grid-cols-[1fr_440px]">
      <section>
        <div className="mb-8 inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-ink shadow-sm">
          <Store className="h-4 w-4 text-mint" />
          Smart Mobile Shop
        </div>
        <h1 className="max-w-3xl text-4xl font-bold tracking-normal text-ink sm:text-5xl">
          Online branch management for mobile shops.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
          Owners create an account, invite shopkeepers, and monitor daily sales, expenses, supplier payments, and branch performance from one dashboard.
        </p>
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <Feature icon={<Building2 />} title="Owner hierarchy" />
          <Feature icon={<ReceiptText />} title="Daily entries" />
          <Feature icon={<BarChart3 />} title="Reports" />
        </div>
      </section>

      <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
        <div className="mb-4 grid grid-cols-3 rounded-md bg-mist p-1 text-sm font-semibold">
          <button className={tabClass(mode === "login")} onClick={() => onMode("login")}>Login</button>
          <button className={tabClass(mode === "owner")} onClick={() => onMode("owner")}>Owner</button>
          <button className={tabClass(mode === "shopkeeper")} onClick={() => onMode("shopkeeper")}>Shopkeeper</button>
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
          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-coral">{error}</p>}
          <button className="focus-ring flex w-full items-center justify-center rounded-md bg-ink px-4 py-3 font-bold text-white transition hover:bg-slate-800">
            {mode === "login" ? "Login" : "Create account"}
          </button>
        </form>

        {!cloudMode && (
          <div className="mt-5 rounded-md bg-mist p-3 text-sm text-slate-600">
            Demo owner: <strong>owner@demo.com</strong> / <strong>demo123</strong>
            <br />
            Demo shopkeeper: <strong>shop@demo.com</strong> / <strong>demo123</strong>
            <br />
            Demo invite token: <strong>{data.owners[0]?.inviteToken}</strong>
          </div>
        )}
      </section>
    </main>
  );
}

function TopBar({ user, data, onLogout }: { user: User; data: AppData; onLogout: () => void }) {
  const shop = data.shops.find((item) => item.id === user.shopId);
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-ink text-white">
            <Store className="h-5 w-5" />
          </div>
          <div>
            <p className="font-bold text-ink">Smart Mobile Shop</p>
            <p className="text-sm text-slate-500">{user.role === "owner" ? "Owner dashboard" : shop?.name ?? "Shopkeeper workspace"}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm font-semibold text-slate-600 sm:inline">{user.name}</span>
          <button className="focus-ring rounded-md border border-line bg-white p-2 text-slate-600 hover:text-ink" onClick={onLogout} title="Logout">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}

function OwnerDashboard({ data, user, commit }: { data: AppData; user: User; commit: (data: AppData) => void }) {
  const [filter, setFilter] = useState<DateFilter>("today");
  const [selectedShopId, setSelectedShopId] = useState<string>("all");
  const owner = data.owners.find((item) => item.id === user.ownerId);
  const shops = data.shops.filter((shop) => shop.ownerId === user.ownerId);
  const selectedShop = selectedShopId === "all" ? undefined : selectedShopId;
  const scoped = scopedData(data, user.ownerId, filter, selectedShop);
  const summary = summarize(scoped.sales, scoped.expenses, scoped.deliveryPayments);
  const chartData = shops.map((shop) => {
    const shopScoped = scopedData(data, user.ownerId, filter, shop.id);
    return { name: shop.name, sales: summarize(shopScoped.sales, shopScoped.expenses, shopScoped.deliveryPayments).totalSales };
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
    <section className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Owner dashboard</h1>
          <p className="mt-1 text-slate-600">Monitor all shops, daily cash, card sales, expenses, and branch performance.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select className="focus-ring rounded-md border border-line bg-white px-3 py-2 font-semibold" value={filter} onChange={(event) => setFilter(event.target.value as DateFilter)}>
            {dateFilters.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <select className="focus-ring rounded-md border border-line bg-white px-3 py-2 font-semibold" value={selectedShopId} onChange={(event) => setSelectedShopId(event.target.value)}>
            <option value="all">All shops</option>
            {shops.map((shop) => <option key={shop.id} value={shop.id}>{shop.name}</option>)}
          </select>
          <button className="focus-ring inline-flex items-center justify-center gap-2 rounded-md bg-ink px-4 py-2 font-bold text-white" onClick={exportCsv}>
            <Download className="h-4 w-4" />
            CSV
          </button>
        </div>
      </div>

      <div className="mb-6 rounded-lg border border-line bg-white p-4">
        <p className="text-sm font-bold uppercase tracking-normal text-slate-500">Shopkeeper invitation link</p>
        <div className="mt-2 flex flex-col gap-2 md:flex-row">
          <input className="focus-ring w-full rounded-md border border-line bg-mist px-3 py-2 font-semibold text-ink" value={inviteUrl} readOnly />
          <button className="focus-ring rounded-md border border-line px-4 py-2 font-bold text-ink" onClick={() => navigator.clipboard?.writeText(inviteUrl)}>Copy</button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <Metric icon={<Euro />} label="Total sales" value={formatMoney(summary.totalSales)} />
        <Metric icon={<Euro />} label="Cash" value={formatMoney(summary.cashSales)} />
        <Metric icon={<CreditCard />} label="Bancomat" value={formatMoney(summary.cardSales)} />
        <Metric icon={<ReceiptText />} label="Expenses" value={formatMoney(summary.expenses)} />
        <Metric icon={<Package />} label="Deliveries" value={formatMoney(summary.deliveryPayments)} />
        <Metric icon={<Store />} label="Cash in hand" value={formatMoney(summary.cashInHand)} strong />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
        <section className="rounded-lg border border-line bg-white p-4">
          <h2 className="mb-4 text-lg font-bold text-ink">Branch comparison</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d9e1e5" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(value) => `€${value}`} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => formatMoney(Number(value))} />
                <Bar dataKey="sales" fill="#2f9d78" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-lg border border-line bg-white p-4">
          <h2 className="mb-4 text-lg font-bold text-ink">Shop statistics</h2>
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
        <RecordsTable title="Latest expenses and deliveries" rows={[
          ...scoped.expenses.map((item) => [new Date(item.createdAt).toLocaleString(), shops.find((shop) => shop.id === item.shopId)?.name ?? "", "Expense", item.description, formatMoney(item.amount)]),
          ...scoped.deliveryPayments.map((item) => [new Date(item.createdAt).toLocaleString(), shops.find((shop) => shop.id === item.shopId)?.name ?? "", "Delivery", item.supplierName, formatMoney(item.amount)])
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
  const summary = summarize(today.sales, today.expenses, today.deliveryPayments);

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

  return (
    <section className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-5 flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-ink">{shop?.name ?? "Shop workspace"}</h1>
        <p className="text-slate-600">Enter sales and payments as they happen. Today cash in hand: <strong>{formatMoney(summary.cashInHand)}</strong></p>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Metric icon={<Euro />} label="Today sales" value={formatMoney(summary.totalSales)} />
        <Metric icon={<CreditCard />} label="Bancomat" value={formatMoney(summary.cardSales)} />
        <Metric icon={<ReceiptText />} label="Expenses" value={formatMoney(summary.expenses + summary.deliveryPayments)} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        <nav className="grid gap-3 self-start rounded-lg border border-line bg-white p-3">
          <EntryButton active={mode === "accessories"} icon={<Package />} label="Accessories" onClick={() => setMode("accessories")} />
          <EntryButton active={mode === "repair"} icon={<Wrench />} label="Repairing" onClick={() => setMode("repair")} />
          <EntryButton active={mode === "telephone"} icon={<Smartphone />} label="Telephones" onClick={() => setMode("telephone")} />
          <EntryButton active={mode === "expense"} icon={<ReceiptText />} label="Expense / Spesa" onClick={() => setMode("expense")} />
          <EntryButton active={mode === "delivery"} icon={<Building2 />} label="Delivery payment" onClick={() => setMode("delivery")} />
        </nav>

        <section className="rounded-lg border border-line bg-white p-4 shadow-sm">
          {mode === "accessories" && <AccessoriesForm onSubmit={(values) => addSale("accessories", values)} />}
          {mode === "repair" && <RepairForm onSubmit={(values) => addSale("repair", values)} />}
          {mode === "telephone" && <TelephoneForm onSubmit={(values) => addSale("telephone", values)} />}
          {mode === "expense" && <ExpenseForm onSubmit={addExpense} />}
          {mode === "delivery" && <DeliveryForm onSubmit={addDelivery} />}
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
        <h2 className="text-xl font-bold text-ink">{title}</h2>
        <div className="rounded-md bg-mist px-4 py-2 text-lg font-black text-ink">{formatMoney(total)}</div>
      </div>
      {children}
      <button className="focus-ring flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-mint px-4 py-3 text-lg font-black text-white transition hover:bg-emerald-700">
        <Plus className="h-5 w-5" />
        Save
      </button>
      {saved && <p className="rounded-md bg-emerald-50 px-3 py-2 text-center font-bold text-mint">Saved successfully.</p>}
    </form>
  );
}

function QuantityPrice({ quantity, setQuantity, unitPrice, setUnitPrice }: { quantity: number; setQuantity: (value: number) => void; unitPrice: number; setUnitPrice: (value: number) => void }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div>
        <p className="mb-1 text-sm font-bold text-slate-600">Quantity</p>
        <div className="grid grid-cols-[56px_1fr_56px] overflow-hidden rounded-md border border-line">
          <button type="button" className="bg-mist text-2xl font-black" onClick={() => setQuantity(Math.max(1, quantity - 1))}>-</button>
          <div className="flex items-center justify-center bg-white text-xl font-black">{quantity}</div>
          <button type="button" className="bg-mist text-2xl font-black" onClick={() => setQuantity(quantity + 1)}>+</button>
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
        className="focus-ring rounded-md border border-line bg-white px-3 py-3 text-base text-ink"
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        placeholder={placeholder}
      />
    </label>
  );
}

function Metric({ icon, label, value, strong }: { icon: React.ReactNode; label: string; value: string; strong?: boolean }) {
  return (
    <div className={`rounded-lg border border-line bg-white p-4 ${strong ? "shadow-soft" : ""}`}>
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-mist text-mint">{icon}</div>
      <p className="text-sm font-bold text-slate-500">{label}</p>
      <p className="mt-1 break-words text-2xl font-black text-ink">{value}</p>
    </div>
  );
}

function MiniStat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-md border border-line p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="font-bold text-ink">{label}</p>
        <p className="font-black text-mint">{value}</p>
      </div>
      <p className="mt-1 text-sm text-slate-500">{detail}</p>
    </div>
  );
}

function RecordsTable({ title, rows }: { title: string; rows: string[][] }) {
  return (
    <section className="overflow-hidden rounded-lg border border-line bg-white">
      <h2 className="border-b border-line px-4 py-3 text-lg font-bold text-ink">{title}</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-left text-sm">
          <tbody>
            {rows.length === 0 ? (
              <tr><td className="px-4 py-6 text-slate-500">No records for this filter.</td></tr>
            ) : rows.map((row, index) => (
              <tr key={index} className="border-b border-line last:border-0">
                {row.map((cell, cellIndex) => <td key={cellIndex} className="px-4 py-3 text-slate-700">{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function EntryButton({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button className={`focus-ring flex min-h-14 items-center gap-3 rounded-md px-3 py-3 text-left font-bold transition ${active ? "bg-ink text-white" : "bg-mist text-ink hover:bg-slate-200"}`} onClick={onClick}>
      {icon}
      {label}
    </button>
  );
}

function Feature({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-line bg-white p-4 shadow-sm">
      <div className="text-mint">{icon}</div>
      <p className="font-bold text-ink">{title}</p>
    </div>
  );
}

function tabClass(active: boolean) {
  return `focus-ring rounded px-3 py-2 transition ${active ? "bg-white text-ink shadow-sm" : "text-slate-500 hover:text-ink"}`;
}

function choiceClass(active: boolean) {
  return `focus-ring min-h-14 rounded-md border px-3 py-3 text-center font-black transition ${
    active ? "border-mint bg-emerald-50 text-mint" : "border-line bg-white text-ink hover:border-slate-400"
  }`;
}
