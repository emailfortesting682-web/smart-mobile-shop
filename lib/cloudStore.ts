import { makeInviteToken, nowIso } from "./format";
import { supabase } from "./supabase";
import type { AppData, DeliveryPayment, Expense, Owner, Sale, Shop, User } from "./types";
import { emptyData } from "./emptyData";

type ProfileRow = {
  id: string;
  owner_id: string;
  shop_id: string | null;
  role: "owner" | "shopkeeper";
  name: string;
  email: string;
  created_at: string;
};

type OwnerRow = {
  id: string;
  name: string;
  email: string;
  invite_token: string;
  created_at: string;
};

type ShopRow = {
  id: string;
  owner_id: string;
  name: string;
  city: string;
  phone: string | null;
  created_at: string;
};

type SaleRow = {
  id: string;
  owner_id: string;
  shop_id: string;
  shopkeeper_id: string;
  category: Sale["category"];
  item_name: string;
  quantity: number;
  unit_price: number;
  total: number;
  payment_method: Sale["paymentMethod"];
  metadata: Record<string, string> | null;
  created_at: string;
};

type ExpenseRow = {
  id: string;
  owner_id: string;
  shop_id: string;
  shopkeeper_id: string;
  description: string;
  amount: number;
  notes: string | null;
  created_at: string;
};

type DeliveryRow = {
  id: string;
  owner_id: string;
  shop_id: string;
  shopkeeper_id: string;
  supplier_name: string;
  amount: number;
  notes: string | null;
  created_at: string;
};

export function cloudEnabled() {
  return Boolean(supabase);
}

export async function cloudCurrentUser() {
  if (!supabase) return null;
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", authData.user.id)
    .single<ProfileRow>();

  if (error || !data) return null;
  return profileToUser(data);
}

export async function cloudLogin(email: string, password: string) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  const user = await cloudCurrentUser();
  if (!user) throw new Error("Profile was not found for this account.");
  return user;
}

export async function cloudLogout() {
  if (supabase) await supabase.auth.signOut();
}

export async function cloudCreateOwner(name: string, email: string, password: string) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data: authData, error: signUpError } = await supabase.auth.signUp({ email, password });
  if (signUpError) throw new Error(signUpError.message);
  const authUser = authData.user;
  if (!authUser) throw new Error("Signup did not return a user. Disable email confirmation for the MVP test.");
  if (!authData.session) throw new Error("Signup needs an active session. In Supabase Auth email settings, turn off Confirm email for MVP testing, then register with a new email.");

  const { data: profileRow, error: profileError } = await supabase
    .rpc("register_owner_account", {
      name_input: name,
      email_input: email,
      invite_token_input: makeInviteToken()
    })
    .single<ProfileRow>();

  if (profileError || !profileRow) throw new Error(profileError?.message ?? "Could not create owner profile.");
  return profileToUser(profileRow);
}

export async function cloudCreateShopkeeper(token: string, name: string, email: string, password: string, shopName: string, city: string) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data: ownerData, error: ownerError } = await supabase
    .rpc("find_owner_by_invite", { token_input: token.toUpperCase() });

  const ownerRows = ownerData as OwnerRow[] | null;
  const ownerRow = ownerRows?.[0];
  if (ownerError || !ownerRow) throw new Error("Invite link is invalid.");

  const { data: authData, error: signUpError } = await supabase.auth.signUp({ email, password });
  if (signUpError) throw new Error(signUpError.message);
  const authUser = authData.user;
  if (!authUser) throw new Error("Signup did not return a user. Disable email confirmation for the MVP test.");
  if (!authData.session) throw new Error("Signup needs an active session. In Supabase Auth email settings, turn off Confirm email for MVP testing, then register with a new email.");

  const { data: profileRow, error: profileError } = await supabase
    .rpc("register_shopkeeper_account", {
      invite_token_input: ownerRow.invite_token,
      name_input: name,
      email_input: email,
      shop_name_input: shopName,
      city_input: city
    })
    .single<ProfileRow>();

  if (profileError || !profileRow) throw new Error(profileError?.message ?? "Could not create shopkeeper profile.");
  return profileToUser(profileRow);
}

export async function cloudLoadData(ownerId: string) {
  if (!supabase) return emptyData();
  const [
    ownersResult,
    profilesResult,
    shopsResult,
    salesResult,
    expensesResult,
    deliveriesResult
  ] = await Promise.all([
    supabase.from("owners").select("*").eq("id", ownerId).returns<OwnerRow[]>(),
    supabase.from("profiles").select("*").eq("owner_id", ownerId).returns<ProfileRow[]>(),
    supabase.from("shops").select("*").eq("owner_id", ownerId).returns<ShopRow[]>(),
    supabase.from("sales").select("*").eq("owner_id", ownerId).order("created_at", { ascending: true }).returns<SaleRow[]>(),
    supabase.from("expenses").select("*").eq("owner_id", ownerId).order("created_at", { ascending: true }).returns<ExpenseRow[]>(),
    supabase.from("delivery_payments").select("*").eq("owner_id", ownerId).order("created_at", { ascending: true }).returns<DeliveryRow[]>()
  ]);

  const firstError = ownersResult.error ?? profilesResult.error ?? shopsResult.error ?? salesResult.error ?? expensesResult.error ?? deliveriesResult.error;
  if (firstError) throw new Error(firstError.message);

  return {
    owners: (ownersResult.data ?? []).map(ownerToApp),
    users: (profilesResult.data ?? []).map(profileToUser),
    shops: (shopsResult.data ?? []).map(shopToApp),
    sales: (salesResult.data ?? []).map(saleToApp),
    expenses: (expensesResult.data ?? []).map(expenseToApp),
    deliveryPayments: (deliveriesResult.data ?? []).map(deliveryToApp)
  };
}

export async function cloudAddSale(sale: Omit<Sale, "id" | "total" | "createdAt">) {
  if (!supabase) return;
  const { error } = await supabase.from("sales").insert({
    owner_id: sale.ownerId,
    shop_id: sale.shopId,
    shopkeeper_id: sale.shopkeeperId,
    category: sale.category,
    item_name: sale.itemName,
    quantity: sale.quantity,
    unit_price: sale.unitPrice,
    payment_method: sale.paymentMethod,
    metadata: sale.metadata ?? {},
    created_at: nowIso()
  });
  if (error) throw new Error(error.message);
}

export async function cloudAddExpense(expense: Omit<Expense, "id" | "createdAt">) {
  if (!supabase) return;
  const { error } = await supabase.from("expenses").insert({
    owner_id: expense.ownerId,
    shop_id: expense.shopId,
    shopkeeper_id: expense.shopkeeperId,
    description: expense.description,
    amount: expense.amount,
    notes: expense.notes,
    created_at: nowIso()
  });
  if (error) throw new Error(error.message);
}

export async function cloudAddDeliveryPayment(delivery: Omit<DeliveryPayment, "id" | "createdAt">) {
  if (!supabase) return;
  const { error } = await supabase.from("delivery_payments").insert({
    owner_id: delivery.ownerId,
    shop_id: delivery.shopId,
    shopkeeper_id: delivery.shopkeeperId,
    supplier_name: delivery.supplierName,
    amount: delivery.amount,
    notes: delivery.notes,
    created_at: nowIso()
  });
  if (error) throw new Error(error.message);
}

function profileToUser(row: ProfileRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    password: "",
    role: row.role,
    ownerId: row.owner_id,
    shopId: row.shop_id ?? undefined,
    createdAt: row.created_at
  };
}

function ownerToApp(row: OwnerRow): Owner {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    inviteToken: row.invite_token,
    createdAt: row.created_at
  };
}

function shopToApp(row: ShopRow): Shop {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    city: row.city,
    phone: row.phone ?? undefined,
    createdAt: row.created_at
  };
}

function saleToApp(row: SaleRow): Sale {
  return {
    id: row.id,
    ownerId: row.owner_id,
    shopId: row.shop_id,
    shopkeeperId: row.shopkeeper_id,
    category: row.category,
    itemName: row.item_name,
    quantity: row.quantity,
    unitPrice: Number(row.unit_price),
    total: Number(row.total),
    paymentMethod: row.payment_method,
    metadata: row.metadata ?? {},
    createdAt: row.created_at
  };
}

function expenseToApp(row: ExpenseRow): Expense {
  return {
    id: row.id,
    ownerId: row.owner_id,
    shopId: row.shop_id,
    shopkeeperId: row.shopkeeper_id,
    description: row.description,
    amount: Number(row.amount),
    notes: row.notes ?? undefined,
    createdAt: row.created_at
  };
}

function deliveryToApp(row: DeliveryRow): DeliveryPayment {
  return {
    id: row.id,
    ownerId: row.owner_id,
    shopId: row.shop_id,
    shopkeeperId: row.shopkeeper_id,
    supplierName: row.supplier_name,
    amount: Number(row.amount),
    notes: row.notes ?? undefined,
    createdAt: row.created_at
  };
}
