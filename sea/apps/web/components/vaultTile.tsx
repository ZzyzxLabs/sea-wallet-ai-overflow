"use client";

import VaultList from "./VaultList";

type VaultTileProps = {
  note?: string;
  minHeight?: string;
  className?: string;
};

export function VaultTile({ note, minHeight, className }: VaultTileProps) {
  return <VaultList note={note} minHeight={minHeight} className={className} />;
}