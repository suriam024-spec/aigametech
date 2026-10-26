import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { useApi } from "@/lib/useApi";
import type { GameListResponse } from "@/lib/types";
import GameGrid from "@/components/GameGrid";
import SpecNote from "@/components/SpecNote";

const SORTS: [string, string][] = [
  ["name", "ชื่อ A-Z"],
  ["price_asc", "ราคา ต่ำ → สูง"],
  ["price_desc", "ราคา สูง → ต่ำ"],
  ["newest", "วางขายล่าสุด"],
  ["popular", "ความนิยม"],
];
const DIFFICULTIES = ["Easy", "Medium", "Hard"];

function toggle(list: string[], value: string) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function CheckGroup({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string;
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      {options.map((o) => (
        <label key={o} className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            className="accent-primary"
            checked={selected.includes(o)}
            onChange={() => onToggle(o)}
          />
          {o}
        </label>
      ))}
    </div>
  );
}

export default function ExplorePage() {
  const { user } = useAuth();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [genres, setGenres] = useState<string[]>([]);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState<string[]>([]);
  const [multiplayer, setMultiplayer] = useState(false);
  const [isIndie, setIsIndie] = useState(false);
  const [compatible, setCompatible] = useState(false);
  const [sort, setSort] = useState("name");

  // หน่วงการพิมพ์ค้นหา 350ms
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  // ดึงเกมทั้งหมดครั้งเดียว เพื่อสร้างตัวเลือก Genre/Platform ตามข้อมูลจริง
  const all = useApi<GameListResponse>("/games");
  const allItems = all.data?.items ?? [];
  const genreOptions = [...new Set(allItems.flatMap((g) => g.genres))].sort();
  const platformOptions = [...new Set(allItems.flatMap((g) => g.platforms))].sort();
  const specReady = all.data?.specReady ?? false;

  const compatibleActive = compatible && !!user && specReady;

  const p = new URLSearchParams();
  if (search) p.set("search", search);
  if (genres.length) p.set("genre", genres.join(","));
  if (platforms.length) p.set("platform", platforms.join(","));
  if (difficulty.length) p.set("difficulty", difficulty.join(","));
  if (multiplayer) p.set("multiplayer", "true");
  if (isIndie) p.set("isIndie", "true");
  if (compatibleActive) p.set("compatibleOnly", "true");
  p.set("sort", sort);

  const list = useApi<GameListResponse>(`/games?${p.toString()}`);

  function clearAll() {
    setSearchInput("");
    setGenres([]);
    setPlatforms([]);
    setDifficulty([]);
    setMultiplayer(false);
    setIsIndie(false);
    setCompatible(false);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      <aside className="space-y-5 rounded-xl border border-border bg-card p-4 lg:self-start">
        <div className="flex items-center justify-between">
          <h2 className="font-heading font-extrabold">ตัวกรอง</h2>
          <button type="button" onClick={clearAll} className="text-xs text-accent hover:underline">
            ล้างทั้งหมด
          </button>
        </div>

        <CheckGroup title="Genre" options={genreOptions} selected={genres} onToggle={(v) => setGenres(toggle(genres, v))} />
        <CheckGroup title="Platform" options={platformOptions} selected={platforms} onToggle={(v) => setPlatforms(toggle(platforms, v))} />
        <CheckGroup title="ความยาก" options={DIFFICULTIES} selected={difficulty} onToggle={(v) => setDifficulty(toggle(difficulty, v))} />

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" className="accent-primary" checked={multiplayer} onChange={(e) => setMultiplayer(e.target.checked)} />
            Multiplayer
          </label>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" className="accent-primary" checked={isIndie} onChange={(e) => setIsIndie(e.target.checked)} />
            Indie
          </label>
        </div>

        <div className="space-y-1 border-t border-border pt-4">
          <label className={`flex items-center gap-2 text-sm ${user && specReady ? "" : "opacity-50"}`}>
            <input
              type="checkbox"
              className="accent-primary"
              disabled={!user || !specReady}
              checked={compatibleActive}
              onChange={(e) => setCompatible(e.target.checked)}
            />
            เฉพาะเกมที่เครื่องฉันเล่นได้
          </label>
          <SpecNote specReady={specReady} />
        </div>
      </aside>

      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="ค้นหาชื่อเกม..."
            className="sm:flex-1"
          />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="h-9 rounded-md border border-input bg-card px-3 text-sm"
          >
            {SORTS.map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {list.error ? (
          <p className="text-sm text-red-400">{list.error}</p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {list.loading ? "กำลังโหลด..." : `พบ ${list.data?.total ?? 0} เกม`}
            </p>
            {!list.loading && (list.data?.items.length ?? 0) === 0 ? (
              <p className="py-10 text-center text-muted-foreground">ไม่พบเกมที่ตรงกับตัวกรอง ลองล้างตัวกรองดู</p>
            ) : (
              <GameGrid items={list.data?.items ?? []} />
            )}
          </>
        )}
      </section>
    </div>
  );
}