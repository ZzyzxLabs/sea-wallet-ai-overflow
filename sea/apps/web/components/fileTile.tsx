"use client";

import React from "react";
import { Tile } from "./tile";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";

export type FileItem = { id: number | string; name: string; size: string; tag: string };

type FileSystemTileProps = {
  files: FileItem[];
  onUpload?: () => void;
  className?: string;
};
export function FileSystemTile({ files, onUpload, className }: FileSystemTileProps) {
  return (
    <Tile
      title="File System"
      description="Encrypted documents & assets"
      className={className}
      headerExtra={
        <div className="flex items-center gap-3">
          <div className="text-xs text-slate-400">{files.length} items</div>
          <Button size="sm" className="bg-white/10 border border-white/15 hover:bg-white/20" onClick={onUpload}>
            Upload
          </Button>
        </div>
      }
    >
      <div className="rounded-lg overflow-hidden border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-slate-300">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Name</th>
              <th className="text-left px-4 py-2 font-medium">Tag</th>
              <th className="text-right px-4 py-2 font-medium">Size</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {files.map((f) => (
              <tr key={f.id} className="hover:bg-white/5">
                <td className="px-4 py-2 font-medium">{f.name}</td>
                <td className="px-4 py-2">
                  <Badge className="bg-fuchsia-600/20 text-fuchsia-300 border border-fuchsia-400/20">
                    {f.tag}
                  </Badge>
                </td>
                <td className="px-4 py-2 text-right text-slate-300">{f.size}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Tile>
  );
}
