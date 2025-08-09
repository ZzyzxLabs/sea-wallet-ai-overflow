"use client";

import React, { useMemo, useState } from "react";
import { Tile } from "./tile";
import { Badge } from "@workspace/ui/components/badge";
import { Input } from "@workspace/ui/components/input";
export type Member = { id: number | string; name: string; role: string; address: string };

type MemberListTileProps = {
  members: Member[];
  className?: string;
};
export function MemberListTile({ members, className }: MemberListTileProps) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return members;
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(needle) ||
        m.role.toLowerCase().includes(needle) ||
        m.address.toLowerCase().includes(needle)
    );
  }, [q, members]);

  return (
    <Tile
      title="Member List"
      description="Manage roles and addresses"
      className={className}
      headerExtra={
        <Input
          placeholder="Search by name, role, or address"
          className="w-72 bg-white/5 border-white/10"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      }
    >
      <ul className="divide-y divide-white/10">
        {filtered.map((m) => (
          <li key={m.id} className="py-3 grid grid-cols-[1fr_auto] items-center">
            <div className="min-w-0">
              <div className="font-medium truncate">{m.name}</div>
              <div className="text-xs text-slate-400 truncate">{m.address}</div>
            </div>
            <Badge className="bg-indigo-600/20 text-indigo-300 border border-indigo-400/20">
              {m.role}
            </Badge>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="py-6 text-sm text-slate-400">No results</li>
        )}
      </ul>
    </Tile>
  );
}