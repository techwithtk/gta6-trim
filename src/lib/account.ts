"use client";

import { useSyncExternalStore } from "react";
import { PLANS, planById, type Plan, type PlanId } from "@/lib/plans";

export type Account = {
  status: "loading" | "ready";
  user: { email: string; name: string; picture: string | null } | null;
  plan: PlanId | null;
  cycle: "monthly" | "yearly" | null;
};

let state: Account = { status: "loading", user: null, plan: null, cycle: null };
const listeners = new Set<() => void>();
let started = false;

function load() {
  if (started) return;
  started = true;
  fetch("/api/auth/me", { cache: "no-store" })
    .then((r) => r.json())
    .then((d) => {
      state = { status: "ready", user: d.user, plan: d.plan, cycle: d.cycle };
    })
    .catch(() => {
      state = { ...state, status: "ready" };
    })
    .finally(() => listeners.forEach((l) => l()));
}

const SERVER: Account = state;

/** Signed-in user + plan, fetched once per page load. */
export function useAccount(): Account {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      load();
      return () => listeners.delete(cb);
    },
    () => state,
    () => SERVER,
  );
}

/** The plan whose limits the dashboard should enforce. The dashboard is only reachable with a plan, so Starter is just a loading fallback. */
export function usePlan(): Plan {
  const { plan } = useAccount();
  return plan ? planById(plan) : PLANS[0];
}

export const initials = (name?: string | null) =>
  (name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("") || "•";
