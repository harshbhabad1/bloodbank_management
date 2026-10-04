"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const COMPONENTS = ["whole_blood", "prbc", "platelets", "plasma"];
const STATUSES = ["available", "issued", "expired", "discarded"];
const COMPONENT_LABELS: Record<string, string> = {
  whole_blood: "Whole Blood", prbc: "PRBC", platelets: "Platelets", plasma: "Plasma",
};

export default function FilterBar() {
  const router = useRouter();
  const sp = useSearchParams();

  const update = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(sp.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/inventory?${params.toString()}`);
  }, [router, sp]);

  return (
    <div className="flex flex-wrap gap-3">
      <select
        id="filter-group"
        value={sp.get("group") ?? ""}
        onChange={(e) => update("group", e.target.value)}
        className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-red-400"
      >
        <option value="">All Groups</option>
        {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
      </select>

      <select
        id="filter-component"
        value={sp.get("component") ?? ""}
        onChange={(e) => update("component", e.target.value)}
        className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-red-400"
      >
        <option value="">All Components</option>
        {COMPONENTS.map((c) => <option key={c} value={c}>{COMPONENT_LABELS[c]}</option>)}
      </select>

      <select
        id="filter-status"
        value={sp.get("status") ?? ""}
        onChange={(e) => update("status", e.target.value)}
        className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-red-400"
      >
        <option value="">All Statuses</option>
        {STATUSES.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
      </select>
    </div>
  );
}
