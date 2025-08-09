"use client";

import { Tile } from "./tile";

type VaultTileProps = {
  note?: string;
  minHeight?: string;
  className?: string;
};
export function VaultTile({ note = "Reserved space (empty)", minHeight = "min-h-[22rem]", className }: VaultTileProps) {
  return (
    <Tile title="Vault" description={note} minHeight={minHeight} className={className}>
      {/* intentionally empty */}
    </Tile>
  );
}