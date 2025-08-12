"use client";
import React, { useMemo, useState } from "react";
import { Tile } from "./tile";
import { Badge } from "@workspace/ui/components/badge";
import { Input } from "@workspace/ui/components/input";

type KeyType = number | string;

type CapPercentListTileProps = {
  capPercent: Map<KeyType, number>; // VecMap 轉成的 Map
  className?: string;
  /**
   * 將 key 轉成顯示用標籤（可接上通訊錄或其他映射）
   * 預設：title=`Key {key}`、subtitle 顯示原始 key。
   */
  keyResolver?: (key: KeyType) => { title: string; subtitle?: string; tag?: string };
};

export function MemberListTile({
  capPercent,
  className,
  keyResolver,
}: CapPercentListTileProps) {
  const [q, setQ] = useState("");

  // 排序：優先數字排序，其次字典序
  const sortedEntries = useMemo(() => {
    const arr = Array.from(capPercent.entries()); // [key, pct][]
    arr.sort((a, b) => {
      const [ka] = a;
      const [kb] = b;
      const na = typeof ka === "number" || /^\d+$/.test(String(ka)) ? Number(ka) : NaN;
      const nb = typeof kb === "number" || /^\d+$/.test(String(kb)) ? Number(kb) : NaN;
      if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
      return String(ka).localeCompare(String(kb));
    });
    return arr;
  }, [capPercent]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const toLabel = (k: KeyType) =>
      keyResolver?.(k) ?? {
        title: `Key ${String(k)}`,
        subtitle: String(k),
        tag: undefined,
      };

    const base = sortedEntries.map(([k, pct]) => ({
      key: k,
      pct,
      label: toLabel(k),
    }));

    if (!needle) return base;
    return base.filter((r) => {
      const s = `${r.label.title} ${r.label.subtitle ?? ""} ${r.label.tag ?? ""} ${String(
        r.key
      )}`.toLowerCase();
      return s.includes(needle) || String(r.pct).includes(needle);
    });
  }, [q, sortedEntries, keyResolver]);

  return (
    <Tile
      title="Allocations"
      description="cap_percentage (VecMap)"
      className={className}
      headerExtra={
        <Input
          placeholder="Search by key or label"
          className="w-72 bg-white/5 border-white/10"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      }
    >
      <ul className="divide-y divide-white/10">
        {rows.map((r) => (
          <li key={String(r.key)} className="py-3 grid grid-cols-[1fr_auto] items-center">
            <div className="min-w-0">
              <div className="font-medium truncate">{r.label.title}</div>
              {r.label.subtitle && (
                <div className="text-xs text-slate-400 truncate">{r.label.subtitle}</div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {r.label.tag && (
                <Badge className="bg-indigo-600/20 text-indigo-300 border border-indigo-400/20">
                  {r.label.tag}
                </Badge>
              )}
              <Badge className="bg-emerald-600/20 text-emerald-300 border border-emerald-400/20">
                {r.pct}%
              </Badge>
            </div>
          </li>
        ))}
        {rows.length === 0 && (
          <li className="py-6 text-sm text-slate-400">No results</li>
        )}
      </ul>
    </Tile>
  );
}
