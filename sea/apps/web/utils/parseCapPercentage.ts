// utils/parseCapPercentage.ts
export function parseCapPercentage(raw: any): Map<number, number> {
  const out = new Map<number, number>();
  const contents = raw?.fields?.contents;
  if (!Array.isArray(contents)) return out;

  for (const entry of contents) {
    const k = Number(entry?.fields?.key);
    const v = Number(entry?.fields?.value);
    if (Number.isFinite(k) && Number.isFinite(v)) out.set(k, v);
  }
  return out;
}
