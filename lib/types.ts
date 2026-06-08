export type Role = "owner" | "shopkeeper";
export type PaymentMethod = "cash" | "card";
export type SaleCategory = "accessories" | "repair" | "telephone";

export type User = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  ownerId: string;
  shopId?: string;
  createdAt: string;
};

export type Owner = {
  id: string;
  name: string;
  email: string;
  inviteToken: string;
  createdAt: string;
};

export type Shop = {
  id: string;
  ownerId: string;
  name: string;
  city: string;
  phone?: string;
  createdAt: string;
};

export type Sale = {
  id: string;
  ownerId: string;
  shopId: string;
  shopkeeperId: string;
  category: SaleCategory;
  itemName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  paymentMethod: PaymentMethod;
  metadata?: Record<string, string>;
  createdAt: string;
};

export type Expense = {
  id: string;
  ownerId: string;
  shopId: string;
  shopkeeperId: string;
  description: string;
  amount: number;
  notes?: string;
  createdAt: string;
};

export type DeliveryPayment = {
  id: string;
  ownerId: string;
  shopId: string;
  shopkeeperId: string;
  supplierName: string;
  amount: number;
  notes?: string;
  createdAt: string;
};

export type AppData = {
  owners: Owner[];
  users: User[];
  shops: Shop[];
  sales: Sale[];
  expenses: Expense[];
  deliveryPayments: DeliveryPayment[];
};

export type DateFilter = "today" | "yesterday" | "week" | "month" | "previousMonth" | "all";

export type Summary = {
  totalSales: number;
  cashSales: number;
  cardSales: number;
  expenses: number;
  deliveryPayments: number;
  cashInHand: number;
  accessoriesRevenue: number;
  repairRevenue: number;
  telephoneRevenue: number;
  accessoriesCount: number;
  repairsCount: number;
  telephonesCount: number;
};
