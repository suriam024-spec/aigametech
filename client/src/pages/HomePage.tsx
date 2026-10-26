import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import type {
  AiFilters,
  AiSearchResponse,
  GameListResponse,
  RecommendationsResponse,
  TrendingResponse,
} from "@/lib/types";
import GameGrid from "@/components/GameGrid";
import SpecNote from "@/components/SpecNote";

const EXAMPLES = [
  "อยากได้เกม RPG เล่นคนเดียว เนื้อเรื่องดี ไม่ยากมาก และเครื่องผมเล่นได้",
  "เกม indie เล่นกับเพื่อนได้ ราคาไม่เกิน 500 บาท",
  "เกมแอ็กชันที่เครื่องผมเล่นลื่น",
];

function filterChips(f: AiFilters): string[] {
  const chips: string[] = [];
  f.genres?.forEach((g) => chips.push(g));
  f.platforms?.forEach((p) => chips.push(p));
  if (f.multiplayer === true) chips.push("เล่นกับคนอื่นได้");
  if (f.multiplayer === false) chips.push("เล่นคนเดียว");
  f.difficulty?.forEach((d) => chips.push(`ความยาก ${d}`));
  if (f.isIndie === true) chips.push("Indie");
  if (f.isIndie === false) chips.push("ไม่ใช่ Indie");
  if (f.maxPrice !== null) {
    chips.push(f.maxPrice === 0 ? "ฟรี" : `ไม่เกิน ${f.maxPrice.toLocaleString("th-TH")} บาท`);
  }
  f.tags?.forEach((t) => chips.push(`#${t}`));
  if (f.compatibleWithMySpec === true) chips.push("เล่นได้บนเครื่องฉัน");
  return chips;
}

export default function HomePage() {
  const { user } = useAuth();
  const trending = useApi<TrendingResponse>("/games/trending");
  const recs = useApi<RecommendationsResponse>("/recommendations");
  const indie = useApi<GameListResponse>("/games?isIndie=true&sort=popular");
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiResult, setAiResult] = useState<AiSearchResponse | null>(null);

  const specReady = trending.data?.specReady ?? false;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (q.length < 2) {
      setAiError("กรุณาพิมพ์ประโยคค้นหาอย่างน้อย 2 ตัวอักษร");
      return;
    }
    setSearching(true);
    setAiError("");
    setAiResult(null);
    try {
      const data = await api<AiSearchResponse>("/ai/search", {
        method: "POST",
        body: { query: q },
      });
      setAiResult(data);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "ค้นหาไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setSearching(false);
    }
  }

  function clearResult() {
    setAiResult(null);
    setAiError("");
  }

  const chips = aiResult?.understood ? filterChips(aiResult.understood) : [];

  return (
    <div className="space-y-10">
      <section className="space-y-4 rounded-2xl border border-border bg-card/60 p-6 text-center">
        <h1 className="font-heading text-3xl font-extrabold text-primary sm:text-4xl">AI GameTech</h1>
        <p className="text-muted-foreground">บอกว่าอยากเล่นแบบไหน แล้วให้ AI หาเกมที่เครื่องคุณเล่นได้</p>

        <form onSubmit={onSubmit} className="mx-auto flex max-w-2xl flex-col gap-2 sm:flex-row">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value.slice(0, 300))}
            placeholder="เช่น อยากได้เกม RPG เล่นคนเดียว เนื้อเรื่องดี..."
            className="h-11 border-primary/50"
          />
          <Button type="submit" disabled={searching} className="glow h-11 gap-2">
            <Sparkles className="h-4 w-4" /> {searching ? "AI กำลังคิด..." : "ค้นหาด้วย AI"}
          </Button>
        </form>

        <div className="flex flex-wrap justify-center gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => setQuery(ex)}
              className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition hover:border-accent hover:text-accent"
            >
              {ex}
            </button>
          ))}
        </div>
      </section>

      {(searching || aiError || aiResult) && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-xl font-extrabold">🔎 ผลการค้นหา</h2>
            {!searching && (
              <button
                type="button"
                onClick={clearResult}
                className="text-sm text-accent hover:underline"
              >
                ล้างผล
              </button>
            )}
          </div>

          {searching && <p className="text-sm text-muted-foreground">AI กำลังอ่านประโยคของคุณ...</p>}
          {aiError && <p className="text-sm text-red-400">{aiError}</p>}

          {aiResult && (
            <>
              {chips.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">เงื่อนไขที่ AI เข้าใจ</p>
                  <div className="flex flex-wrap gap-2">
                    {chips.map((c) => (
                      <span
                        key={c}
                        className="rounded-full border border-primary/50 bg-primary/10 px-3 py-1 text-xs text-primary"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {aiResult.notice && (
                <p className="text-sm text-accent">
                  {aiResult.notice}{" "}
                  {aiResult.needSpec &&
                    (user ? (
                      <Link to="/specs" className="underline">ตั้งสเปคเครื่อง</Link>
                    ) : (
                      <Link to="/login" className="underline">เข้าสู่ระบบ</Link>
                    ))}
                </p>
              )}

              {aiResult.items.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  ไม่พบเกมที่ตรงเงื่อนไข ลองลดเงื่อนไขลงหรือเปลี่ยนคำค้น
                </p>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">
                    พบ {aiResult.total} เกม
                    {aiResult.total > aiResult.items.length
                      ? ` (แสดง ${aiResult.items.length} เกมแรก)`
                      : ""}
                  </p>
                  <GameGrid items={aiResult.items} />
                </>
              )}
            </>
          )}
        </section>
      )}

      <section className="flex items-center justify-between rounded-lg border border-border px-4 py-3 text-sm">
        <span>
          🖥️ สเปคเครื่อง:{" "}
          {!user ? "ยังไม่ได้เข้าสู่ระบบ" : specReady ? "ตั้งสเปคแล้ว" : "ยังไม่ได้ตั้งสเปค"}
        </span>
        {user && (
          <Link to="/specs" className="text-accent hover:underline">
            {specReady ? "แก้ไข" : "ตั้งสเปค"}
          </Link>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between">
          <h2 className="font-heading text-xl font-extrabold">🔥 Trending</h2>
          <Link to="/explore" className="text-sm text-accent hover:underline">ดูทั้งหมด</Link>
        </div>
        {trending.error ? (
          <p className="text-sm text-red-400">{trending.error}</p>
        ) : trending.loading ? (
          <p className="text-sm text-muted-foreground">กำลังโหลด...</p>
        ) : (
          <GameGrid items={trending.data?.items ?? []} />
        )}
        <SpecNote specReady={specReady} />
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl font-extrabold">🎨 เกม Indie</h2>
        {indie.error ? (
          <p className="text-sm text-red-400">{indie.error}</p>
        ) : indie.loading ? (
          <p className="text-sm text-muted-foreground">กำลังโหลด...</p>
        ) : (
          <GameGrid items={(indie.data?.items ?? []).slice(0, 4)} />
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="font-heading text-xl font-extrabold">✨ Recommended for You</h2>
          {recs.data && (
            <p className="text-sm text-muted-foreground">
              {recs.data.basedOn === "interest" && recs.data.topGenres.length > 0
                ? `เพราะคุณสนใจ ${recs.data.topGenres.join(", ")}`
                : "ยอดนิยมตอนนี้"}
            </p>
          )}
        </div>
        {recs.error ? (
          <p className="text-sm text-red-400">{recs.error}</p>
        ) : recs.loading ? (
          <p className="text-sm text-muted-foreground">กำลังโหลด...</p>
        ) : (
          <GameGrid items={recs.data?.items ?? []} />
        )}
      </section>
    </div>
  );
}