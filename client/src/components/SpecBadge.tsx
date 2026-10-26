import type { SpecCheck } from "@/lib/types";

const CONFIG = {
  smooth: { icon: "🟢", text: "เล่นได้ลื่น", cls: "border-green-500/40 bg-green-500/15 text-green-300" },
  minimum: { icon: "🟡", text: "เล่นได้ (ขั้นต่ำ)", cls: "border-yellow-500/40 bg-yellow-500/15 text-yellow-300" },
  fail: { icon: "🔴", text: "ไม่ผ่าน", cls: "border-red-500/40 bg-red-500/15 text-red-300" },
} as const;

export default function SpecBadge({ specCheck }: { specCheck: SpecCheck | null }) {
  if (!specCheck) return null;
  const c = CONFIG[specCheck.status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${c.cls}`}>
      {c.icon} {c.text}
    </span>
  );
}