import { endOfMonth, endOfWeek, isWithinInterval, startOfDay, startOfMonth, startOfWeek, subDays, subMonths } from "date-fns";
import type { DateFilter } from "./types";

export const euro = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2
});

export function formatMoney(value: number) {
  return euro.format(Number.isFinite(value) ? value : 0);
}

export function nowIso() {
  return new Date().toISOString();
}

export function makeId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

export function makeInviteToken() {
  return Math.random().toString(36).slice(2, 8).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
}

export function inDateFilter(isoDate: string, filter: DateFilter) {
  if (filter === "all") return true;

  const date = new Date(isoDate);
  const today = new Date();

  if (filter === "today") {
    const start = startOfDay(today);
    return date >= start;
  }

  if (filter === "yesterday") {
    const yesterday = subDays(today, 1);
    return isWithinInterval(date, { start: startOfDay(yesterday), end: startOfDay(today) });
  }

  if (filter === "week") {
    return isWithinInterval(date, {
      start: startOfWeek(today, { weekStartsOn: 1 }),
      end: endOfWeek(today, { weekStartsOn: 1 })
    });
  }

  if (filter === "month") {
    return isWithinInterval(date, { start: startOfMonth(today), end: endOfMonth(today) });
  }

  const previousMonth = subMonths(today, 1);
  return isWithinInterval(date, {
    start: startOfMonth(previousMonth),
    end: endOfMonth(previousMonth)
  });
}
