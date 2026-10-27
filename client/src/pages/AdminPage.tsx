import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { GameDto } from "@/lib/types";

type AdminStats = {
  totals: { users: number; games: number; searches: number; views: number; favorites: number };
  topGames: { id: number; name: string; views: number; favorites: number; popularity: number }[];
  topGenres: { genre: string; score: number }[];
};

type FormState = {
  name: string;
  description: string;
  genres: string;
  tags: string;
  platforms: string;
  price: string;
  releaseDate: string;
  difficulty: string;
  multiplayer: boolean;
  playTime: string;
  isIndie: boolean;
  image: string;
  minCpu: string;
  minGpu: string;
  minRam: string;
  recCpu: string;
  recGpu: string;
  recRam: string;
};

const DEFAULT_IMAGE = "https://picsum.photos/seed/aigametech-new/600/400";

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  genres: "",
  tags: "",
  platforms: "PC",
  price: "0",
  releaseDate: "",
  difficulty: "Easy",
  multiplayer: false,
  playTime: "10",
  isIndie: false,
  image: DEFAULT_IMAGE,
  minCpu: "",
  minGpu: "",
  minRam: "",
  recCpu: "",
  recGpu: "",
  recRam: "",
};

const fieldClass =
  "w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50";

function formFromGame(g: GameDto): FormState {
  const r = g.requirements;
  return {
    name: g.name,
    description: g.description,
    genres: g.genres.join(", "),
    tags: g.tags.join(", "),
    platforms: g.platforms.join(", "),
    price: String(g.price),
    releaseDate: g.releaseDate.slice(0, 10),
    difficulty: g.difficulty,
    multiplayer: g.multiplayer,
    playTime: String(g.playTime),
    isIndie: g.isIndie,
    image: g.image,
    minCpu: r ? String(r.min.cpuTier) : "",
    minGpu: r ? String(r.min.gpuTier) : "",
    minRam: r ? String(r.min.ramGb) : "",
    recCpu: r ? String(r.rec.cpuTier) : "",
    recGpu: r ? String(r.rec.gpuTier) : "",
    recRam: r ? String(r.rec.ramGb) : "",
  };
}

function toInt(v: string): number | null {
  const t = v.trim();
  return /^\d+$/.test(t) ? Number(t) : null;
}

function splitList(v: string): string[] {
  return v
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function buildPayload(f: FormState): { body: Record<string, unknown> } | { error: string } {
  const price = toInt(f.price);
  if (price === null) return { error: "ราคาต้องเป็นจำนวนเต็ม 0 ขึ้นไป (0 = ฟรี)" };
  const playTime = toInt(f.playTime);
  if (playTime === null) return { error: "เวลาเล่นต้องเป็นจำนวนเต็ม (ชั่วโมง)" };

  const reqValues = [f.minCpu, f.minGpu, f.minRam, f.recCpu, f.recGpu, f.recRam];
  const filled = reqValues.filter((v) => v.trim() !== "").length;
  let requirements: Record<string, unknown> | null = null;
  if (filled > 0) {
    if (filled < 6) {
      return { error: "Requirements: กรอกให้ครบทั้ง 6 ช่อง หรือเว้นว่างทั้งหมด (เว้นว่าง = ไม่ใช่เกม PC)" };
    }
    const n = reqValues.map(toInt);
    if (n.some((x) => x === null)) return { error: "Requirements ต้องเป็นจำนวนเต็มทุกช่อง" };
    const [a, b, c, d, e, g] = n as number[];
    requirements = {
      min: { cpuTier: a, gpuTier: b, ramGb: c },
      rec: { cpuTier: d, gpuTier: e, ramGb: g },
    };
  }

  return {
    body: {
      name: f.name.trim(),
      description: f.description.trim(),
      genres: splitList(f.genres),
      tags: splitList(f.tags),
      platforms: splitList(f.platforms),
      price,
      releaseDate: f.releaseDate,
      difficulty: f.difficulty,
      multiplayer: f.multiplayer,
      playTime,
      isIndie: f.isIndie,
      image: f.image.trim(),
      requirements,
    },
  };
}

function reqText(g: GameDto): string {
  if (!g.requirements) return "ไม่ใช่เกม PC";
  const { min, rec } = g.requirements;
  return `Min ${min.cpuTier}/${min.gpuTier}/${min.ramGb}GB · Rec ${rec.cpuTier}/${rec.gpuTier}/${rec.ramGb}GB`;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export default function AdminPage() {
  const { user } = useAuth();
  if (user?.role !== "admin") {
    return <p className="text-muted-foreground">หน้านี้สำหรับผู้ดูแลระบบเท่านั้น</p>;
  }
  return <AdminContent />;
}

function AdminContent() {
  const [stats, setStats] = useState<AdminStats | undefined>();
  const [games, setGames] = useState<GameDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | undefined>();
  const [reload, setReload] = useState(0);

  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | undefined>();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // โหลดสถิติ + รายการเกม (โหลดใหม่เมื่อ reload เปลี่ยน)
  useEffect(() => {
    let cancelled = false;
    Promise.all([api<AdminStats>("/admin/stats"), api<{ items: GameDto[] }>("/games")])
      .then(([s, g]) => {
        if (cancelled) return;
        setStats(s);
        setGames(g.items);
        setPageError(undefined);
      })
      .catch((e) => {
        if (!cancelled) setPageError(e instanceof ApiError ? e.message : "โหลดข้อมูลไม่สำเร็จ");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  const knownGenres = useMemo(
    () => Array.from(new Set(games.flatMap((g) => g.genres))).sort(),
    [games],
  );
  const knownPlatforms = useMemo(
    () => Array.from(new Set(games.flatMap((g) => g.platforms))).sort(),
    [games],
  );

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function openNew() {
    setForm(EMPTY_FORM);
    setEditingId("new");
    setFormError(undefined);
    setMessage(undefined);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openEdit(g: GameDto) {
    setForm(formFromGame(g));
    setEditingId(g.id);
    setFormError(undefined);
    setMessage(undefined);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeForm() {
    setEditingId(null);
    setFormError(undefined);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(undefined);
    const built = buildPayload(form);
    if ("error" in built) {
      setFormError(built.error);
      return;
    }
    setSaving(true);
    try {
      if (editingId === "new") {
        await api<{ id: number; name: string }>("/admin/games", { method: "POST", body: built.body });
        setMessage(`เพิ่มเกม "${form.name.trim()}" แล้ว`);
      } else {
        await api<{ id: number; name: string }>(`/admin/games/${editingId}`, {
          method: "PUT",
          body: built.body,
        });
        setMessage(`แก้ไขเกม "${form.name.trim()}" แล้ว`);
      }
      setEditingId(null);
      setReload((n) => n + 1);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(g: GameDto) {
    const ok = window.confirm(
      `ลบเกม "${g.name}" ?\nรายการโปรดและประวัติการเข้าชมของเกมนี้จะถูกลบไปด้วย และกู้คืนไม่ได้`,
    );
    if (!ok) return;
    setDeletingId(g.id);
    setMessage(undefined);
    setPageError(undefined);
    try {
      await api<{ deleted: boolean }>(`/admin/games/${g.id}`, { method: "DELETE" });
      if (editingId === g.id) setEditingId(null);
      setMessage(`ลบเกม "${g.name}" แล้ว`);
      setReload((n) => n + 1);
    } catch (err) {
      setPageError(err instanceof ApiError ? err.message : "ลบไม่สำเร็จ");
    } finally {
      setDeletingId(null);
    }
  }

  const tiles: [string, number][] = stats
    ? [
        ["Users", stats.totals.users],
        ["Games", stats.totals.games],
        ["Searches", stats.totals.searches],
        ["Views", stats.totals.views],
        ["Favorites", stats.totals.favorites],
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-extrabold text-primary">Admin</h1>
        <Button onClick={openNew} className="glow">
          + เพิ่มเกม
        </Button>
      </div>

      {message && <p className="text-sm text-accent">{message}</p>}
      {pageError && <p className="text-sm text-red-400">{pageError}</p>}

      {editingId !== null && (
        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-primary/40 bg-card p-4">
          <h2 className="font-heading text-lg font-bold">
            {editingId === "new" ? "เพิ่มเกมใหม่" : `แก้ไขเกม #${editingId}`}
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="ชื่อเกม">
              <Input value={form.name} onChange={(e) => setField("name", e.target.value)} />
            </Field>
            <Field label="วันที่วางขาย">
              <Input
                type="date"
                value={form.releaseDate}
                onChange={(e) => setField("releaseDate", e.target.value)}
              />
            </Field>
          </div>

          <Field label="คำอธิบาย">
            <textarea
              className={fieldClass}
              rows={3}
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Genre (คั่นด้วยจุลภาค)"
              hint={knownGenres.length ? `ที่มีอยู่: ${knownGenres.join(", ")}` : undefined}
            >
              <Input
                value={form.genres}
                onChange={(e) => setField("genres", e.target.value)}
                placeholder="RPG, Action"
              />
            </Field>
            <Field label="แท็ก (คั่นด้วยจุลภาค ไม่ใส่ก็ได้)">
              <Input
                value={form.tags}
                onChange={(e) => setField("tags", e.target.value)}
                placeholder="ผ่อนคลาย, เนื้อเรื่องดี"
              />
            </Field>
            <Field
              label="แพลตฟอร์ม (คั่นด้วยจุลภาค)"
              hint={
                knownPlatforms.length
                  ? `ที่มีอยู่: ${knownPlatforms.join(", ")} (สะกดให้ตรงกับเกมอื่น ตัวกรองจะได้ทำงานถูก)`
                  : undefined
              }
            >
              <Input
                value={form.platforms}
                onChange={(e) => setField("platforms", e.target.value)}
                placeholder="PC, PS5"
              />
            </Field>
            <Field label="ความยาก">
              <select
                className={fieldClass}
                value={form.difficulty}
                onChange={(e) => setField("difficulty", e.target.value)}
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </Field>
            <Field label="ราคา (บาท, 0 = ฟรี)">
              <Input value={form.price} onChange={(e) => setField("price", e.target.value)} />
            </Field>
            <Field label="เวลาเล่นโดยประมาณ (ชั่วโมง)">
              <Input value={form.playTime} onChange={(e) => setField("playTime", e.target.value)} />
            </Field>
          </div>

          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.multiplayer}
                onChange={(e) => setField("multiplayer", e.target.checked)}
              />
              มีโหมดเล่นกับคนอื่น
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isIndie}
                onChange={(e) => setField("isIndie", e.target.checked)}
              />
              เกม Indie
            </label>
          </div>

          <Field label="ลิงก์รูป (URL)" hint="เว้นว่างไว้ = ระบบใช้รูป placeholder จาก picsum.photos ให้">
            <Input value={form.image} onChange={(e) => setField("image", e.target.value)} />
          </Field>

          <div className="space-y-2 rounded-lg border border-border p-3">
            <p className="text-sm font-medium">
              Requirements (tier CPU/GPU = 1-5, RAM = GB)
            </p>
            <p className="text-xs text-muted-foreground">
              เว้นว่างทั้ง 6 ช่อง = ไม่ใช่เกม PC (ข้ามการเช็คสเปค) ถ้ากรอกต้องกรอกครบ และ Rec ต้องไม่ต่ำกว่า Min
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Min CPU tier">
                <Input value={form.minCpu} onChange={(e) => setField("minCpu", e.target.value)} />
              </Field>
              <Field label="Min GPU tier">
                <Input value={form.minGpu} onChange={(e) => setField("minGpu", e.target.value)} />
              </Field>
              <Field label="Min RAM (GB)">
                <Input value={form.minRam} onChange={(e) => setField("minRam", e.target.value)} />
              </Field>
              <Field label="Rec CPU tier">
                <Input value={form.recCpu} onChange={(e) => setField("recCpu", e.target.value)} />
              </Field>
              <Field label="Rec GPU tier">
                <Input value={form.recGpu} onChange={(e) => setField("recGpu", e.target.value)} />
              </Field>
              <Field label="Rec RAM (GB)">
                <Input value={form.recRam} onChange={(e) => setField("recRam", e.target.value)} />
              </Field>
            </div>
          </div>

          {formError && <p className="text-sm text-red-400">{formError}</p>}

          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? "กำลังบันทึก..." : "บันทึก"}
            </Button>
            <Button type="button" variant="outline" onClick={closeForm} disabled={saving}>
              ยกเลิก
            </Button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-muted-foreground">กำลังโหลด...</p>
      ) : (
        <>
          {stats && (
            <section className="space-y-4">
              <h2 className="font-heading text-lg font-bold">สถิติ</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                {tiles.map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-border bg-card p-4">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="font-heading text-2xl font-extrabold text-primary">{value}</p>
                  </div>
                ))}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-border bg-card p-4">
                  <h3 className="mb-2 text-sm font-medium">Top Games (View + Favorite)</h3>
                  {stats.topGames.length === 0 ? (
                    <p className="text-sm text-muted-foreground">ยังไม่มีข้อมูล</p>
                  ) : (
                    <ol className="space-y-1 text-sm">
                      {stats.topGames.map((g, i) => (
                        <li key={g.id} className="flex justify-between gap-2">
                          <span>
                            {i + 1}. {g.name}
                          </span>
                          <span className="text-muted-foreground">
                            {g.popularity} ({g.views} view, {g.favorites} โปรด)
                          </span>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                  <h3 className="mb-2 text-sm font-medium">Top Genres (View + Favorite)</h3>
                  {stats.topGenres.length === 0 ? (
                    <p className="text-sm text-muted-foreground">ยังไม่มีข้อมูล</p>
                  ) : (
                    <ol className="space-y-1 text-sm">
                      {stats.topGenres.map((g, i) => (
                        <li key={g.genre} className="flex justify-between gap-2">
                          <span>
                            {i + 1}. {g.genre}
                          </span>
                          <span className="text-muted-foreground">{g.score}</span>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              </div>
            </section>
          )}

          <section className="space-y-3">
            <h2 className="font-heading text-lg font-bold">เกมทั้งหมด ({games.length})</h2>
            <div className="overflow-x-auto rounded-xl border border-border bg-card">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">ID</th>
                    <th className="px-3 py-2">ชื่อเกม</th>
                    <th className="px-3 py-2">Genre</th>
                    <th className="px-3 py-2">ราคา</th>
                    <th className="px-3 py-2">Requirements (CPU/GPU/RAM)</th>
                    <th className="px-3 py-2">ความนิยม</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {games.map((g) => (
                    <tr key={g.id} className="border-b border-border/60 last:border-0">
                      <td className="px-3 py-2 text-muted-foreground">{g.id}</td>
                      <td className="px-3 py-2 font-medium">{g.name}</td>
                      <td className="px-3 py-2">{g.genres.join(", ")}</td>
                      <td className="px-3 py-2">{formatPrice(g.price)}</td>
                      <td className="px-3 py-2 text-xs">{reqText(g)}</td>
                      <td className="px-3 py-2">{g.popularity}</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => openEdit(g)}>
                            แก้ไข
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-500/50 text-red-400"
                            disabled={deletingId === g.id}
                            onClick={() => handleDelete(g)}
                          >
                            {deletingId === g.id ? "กำลังลบ..." : "ลบ"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}