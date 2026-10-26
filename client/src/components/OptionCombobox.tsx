import { useId, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface SpecOption {
  id: number;
  name: string;
  tier: number;
  note: string;
}

interface Props {
  label: string;
  options: SpecOption[];
  value: number | null;
  onChange: (id: number | null) => void;
  placeholder?: string;
}

export default function OptionCombobox({
  label,
  options,
  value,
  onChange,
  placeholder = "พิมพ์ค้นหา เช่น 3060 หรือกดลูกศรดูทั้งหมด",
}: Props) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = options.find((o) => o.id === value) ?? null;
  const q = query.trim().toLowerCase();
  const filtered = q
    ? options.filter(
        (o) =>
          o.name.toLowerCase().includes(q) || o.note.toLowerCase().includes(q),
      )
    : options;

  function pick(opt: SpecOption) {
    onChange(opt.id);
    setQuery("");
    setOpen(false);
  }

  function toggleList() {
    const input = inputRef.current;
    if (!input) return;
    if (open) input.blur(); // onBlur จะปิดรายการให้
    else input.focus(); // onFocus จะเปิดรายการให้
  }

  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative mt-1">
        <Input
          id={id}
          ref={inputRef}
          value={open ? query : (selected?.name ?? "")}
          placeholder={selected ? selected.name : placeholder}
          autoComplete="off"
          className="pr-10"
          onFocus={() => {
            setQuery("");
            setOpen(true);
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onBlur={() => setOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") inputRef.current?.blur();
          }}
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label="เปิดรายการทั้งหมด"
          className="absolute inset-y-0 right-0 px-3 text-muted-foreground hover:text-foreground"
          onMouseDown={(e) => {
            e.preventDefault();
            toggleList();
          }}
        >
          {open ? "▲" : "▼"}
        </button>

        {open && (
          <ul
            role="listbox"
            className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-md border bg-popover shadow-lg"
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-muted-foreground">
                ไม่พบรุ่นที่ตรง ลองพิมพ์เฉพาะตัวเลข เช่น 3060 หรือ 5600
              </li>
            ) : (
              filtered.map((o) => (
                <li
                  key={o.id}
                  role="option"
                  aria-selected={o.id === value}
                  className={`cursor-pointer px-3 py-2 hover:bg-accent ${
                    o.id === value ? "bg-accent/60" : ""
                  }`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(o);
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{o.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      Tier {o.tier}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">{o.note}</div>
                </li>
              ))
            )}
          </ul>
        )}
      </div>
      {selected && !open && (
        <p className="mt-1 text-xs text-muted-foreground">
          Tier {selected.tier} · {selected.note}
        </p>
      )}
    </div>
  );
}