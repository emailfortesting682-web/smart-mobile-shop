import type { AppData } from "./types";

export function emptyData(): AppData {
  return {
    owners: [],
    users: [],
    shops: [],
    sales: [],
    expenses: [],
    deliveryPayments: []
  };
}
