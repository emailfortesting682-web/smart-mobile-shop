import type { AppData, DateFilter, DeliveryPayment, Expense, Owner, Sale, Shop, Summary, User } from "./types";
import { inDateFilter, makeId, makeInviteToken, nowIso } from "./format";

const STORAGE_KEY = "smart-mobile-shop-data-v1";
const SESSION_KEY = "smart-mobile-shop-session-v1";

function seedData(): AppData {
  const ownerId = "owner_demo";
  const owner: Owner = {
    id: ownerId,
    name: "Demo Owner",
    email: "owner@demo.com",
    inviteToken: "DEMO2026",
    createdAt: nowIso()
  };
  const shopA: Shop = { id: "shop_milano_1", ownerId, name: "Milano Shop 1", city: "Milano", createdAt: nowIso() };
  const shopB: Shop = { id: "shop_milano_2", ownerId, name: "Milano Shop 2", city: "Milano", createdAt: nowIso() };
  const ownerUser: User = {
    id: "user_owner_demo",
    name: owner.name,
    email: owner.email,
    password: "demo123",
    role: "owner",
    ownerId,
    createdAt: nowIso()
  };
  const keeperUser: User = {
    id: "user_keeper_demo",
    name: "Demo Shopkeeper",
    email: "shop@demo.com",
    password: "demo123",
    role: "shopkeeper",
    ownerId,
    shopId: shopA.id,
    createdAt: nowIso()
  };
  const today = new Date();
  const at = (hour: number) => new Date(today.getFullYear(), today.getMonth(), today.getDate(), hour, 15).toISOString();

  return {
    owners: [owner],
    users: [ownerUser, keeperUser],
    shops: [shopA, shopB],
    sales: [
      sale(ownerId, shopA.id, keeperUser.id, "accessories", "Cover", 3, 10, "cash", at(10)),
      sale(ownerId, shopA.id, keeperUser.id, "repair", "iPhone 11 LCD Replacement", 1, 90, "card", at(12)),
      sale(ownerId, shopB.id, keeperUser.id, "telephone", "Samsung S23 128GB", 1, 420, "cash", at(16))
    ],
    expenses: [
      { id: makeId("exp"), ownerId, shopId: shopA.id, shopkeeperId: keeperUser.id, description: "Fuel", amount: 20, createdAt: at(13) }
    ],
    deliveryPayments: [
      { id: makeId("del"), ownerId, shopId: shopB.id, shopkeeperId: keeperUser.id, supplierName: "Accessories Supplier", amount: 100, createdAt: at(17) }
    ]
  };
}

function sale(
  ownerId: string,
  shopId: string,
  shopkeeperId: string,
  category: Sale["category"],
  itemName: string,
  quantity: number,
  unitPrice: number,
  paymentMethod: Sale["paymentMethod"],
  createdAt: string
): Sale {
  return {
    id: makeId("sale"),
    ownerId,
    shopId,
    shopkeeperId,
    category,
    itemName,
    quantity,
    unitPrice,
    total: quantity * unitPrice,
    paymentMethod,
    createdAt
  };
}

export function loadData(): AppData {
  if (typeof window === "undefined") return seedData();
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seeded = seedData();
    saveData(seeded);
    return seeded;
  }
  return JSON.parse(raw) as AppData;
}

export function saveData(data: AppData) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
}

export function loadSession() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(SESSION_KEY);
}

export function saveSession(userId: string | null) {
  if (typeof window === "undefined") return;
  if (userId) window.localStorage.setItem(SESSION_KEY, userId);
  else window.localStorage.removeItem(SESSION_KEY);
}

export function createOwner(data: AppData, name: string, email: string, password: string) {
  const ownerId = makeId("owner");
  const owner: Owner = { id: ownerId, name, email, inviteToken: makeInviteToken(), createdAt: nowIso() };
  const user: User = { id: makeId("user"), name, email, password, role: "owner", ownerId, createdAt: nowIso() };
  data.owners.push(owner);
  data.users.push(user);
  saveData(data);
  saveSession(user.id);
  return user;
}

export function createShopkeeper(
  data: AppData,
  inviteToken: string,
  name: string,
  email: string,
  password: string,
  shopName: string,
  city: string
) {
  const owner = data.owners.find((item) => item.inviteToken.toLowerCase() === inviteToken.toLowerCase());
  if (!owner) throw new Error("Invite link is invalid.");
  const shop: Shop = { id: makeId("shop"), ownerId: owner.id, name: shopName, city, createdAt: nowIso() };
  const user: User = {
    id: makeId("user"),
    name,
    email,
    password,
    role: "shopkeeper",
    ownerId: owner.id,
    shopId: shop.id,
    createdAt: nowIso()
  };
  data.shops.push(shop);
  data.users.push(user);
  saveData(data);
  saveSession(user.id);
  return user;
}

export function emptySummary(): Summary {
  return {
    totalSales: 0,
    cashSales: 0,
    cardSales: 0,
    expenses: 0,
    deliveryPayments: 0,
    cashInHand: 0,
    accessoriesRevenue: 0,
    repairRevenue: 0,
    telephoneRevenue: 0,
    accessoriesCount: 0,
    repairsCount: 0,
    telephonesCount: 0
  };
}

export function summarize(sales: Sale[], expenses: Expense[], deliveries: DeliveryPayment[]): Summary {
  const summary = emptySummary();
  for (const item of sales) {
    summary.totalSales += item.total;
    if (item.paymentMethod === "cash") summary.cashSales += item.total;
    else summary.cardSales += item.total;
    if (item.category === "accessories") {
      summary.accessoriesRevenue += item.total;
      summary.accessoriesCount += item.quantity;
    }
    if (item.category === "repair") {
      summary.repairRevenue += item.total;
      summary.repairsCount += item.quantity;
    }
    if (item.category === "telephone") {
      summary.telephoneRevenue += item.total;
      summary.telephonesCount += item.quantity;
    }
  }
  summary.expenses = expenses.reduce((total, item) => total + item.amount, 0);
  summary.deliveryPayments = deliveries.reduce((total, item) => total + item.amount, 0);
  summary.cashInHand = summary.cashSales - summary.expenses - summary.deliveryPayments;
  return summary;
}

export function scopedData(data: AppData, ownerId: string, filter: DateFilter, shopId?: string) {
  const byScope = (record: { ownerId: string; shopId: string; createdAt: string }) =>
    record.ownerId === ownerId && (!shopId || record.shopId === shopId) && inDateFilter(record.createdAt, filter);

  return {
    sales: data.sales.filter(byScope),
    expenses: data.expenses.filter(byScope),
    deliveryPayments: data.deliveryPayments.filter(byScope)
  };
}
