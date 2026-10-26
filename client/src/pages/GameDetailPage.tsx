import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { formatDate, formatPrice } from "@/lib/format";
import type { GameDetailResponse, GameDto } from "@/lib/types";
import SpecBadge from "@/components/SpecBadge";
import SpecNote from "@/components/SpecNote";
import GameGrid from "@/components/GameGrid";
import FavoriteButton from "@/components/FavoriteButton";

type UpgradeAdviceResponse = {
  advice: string;
  usedAi: boolean;
  status: "smooth" | "minimum" | "fail";
  notice: string | null;
};

function SpecTable({ game }: { game: GameDto }) {
  const req = game.requirements;
  const sc = game.specCheck;
  if (!req) return null;

  const rows = [
    { label: "CPU", min: `tier ${req.min.cpuTier}`, rec: `tier ${req.rec.cpuTier}`, have: sc ? `tier ${sc.cpuGap.have}` : "-", ok: sc?.cpu },
    { label: "GPU", min: `tier ${req.min.gpuTier}`, rec: `tier ${req.rec.gpuTier}`, have: sc ? `tier ${sc.gpuGap.have}` : "-", ok: sc?.gpu },
    { label: "RAM", min: `${req.min.ramGb} GB`, rec: `${req.rec.ramGb} GB`, have: sc ? `${sc.ramGap.have} GB` : "-", ok: sc?.ram },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-muted-foreground">
          <tr>
            <th className="py-2 pr-4">ชิ้นส่วน</th>
            <th className="py-2 pr-4">ขั้นต่ำ</th>
            <th className="py-2 pr-4">แนะนำ</th>
            <th className="py-2 pr-4">เครื่องคุณ</th>
            <th className="py-2">ผ่านขั้นต่ำ</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-t border-border">
              <td className="py-2 pr-4 font-medium">{r.label}</td>
              <td className="py-2 pr-4">{r.min}</td>
              <td className="py-2 pr-4">{r.rec}</td>
              <td className="py-2 pr-4">{r.have}</td>
              <td className="py-2">{r.ok === undefined ? "-" : r.ok === "pass" ? "✅" : "❌"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function GameDetailPage() {
  const { id } = useParams();
  const { data, error, loading } = useApi<GameDetailResponse>(`/games/${id}`);

  // state ของ AI Upgrade Advisor (ผูกกับ gameId กันคำแนะนำของเกมเก่าค้างเมื่อเปลี่ยนหน้าเกม)
  const [advice, setAdvice] = useState<{ gameId: number; data: UpgradeAdviceResponse } | null>(null);
  const [adviceError, setAdviceError] = useState<{ gameId: number; message: string } | null>(null);
  const [adviceLoadingId, setAdviceLoadingId] = useState<number | null>(null);

  if (error) {
    return (
      <div className="space-y-3">
        <p className="text-red-400">{error}</p>
        <Link to="/explore" className="text-accent hover:underline">← กลับไปสำรวจเกม</Link>
      </div>
    );
  }
  if (loading || !data) return <p className="text-muted-foreground">กำลังโหลด...</p>;

  const game = data;
  const showUpgrade = game.specCheck?.status === "fail" || game.specCheck?.status === "minimum";

  const adviceLoading = adviceLoadingId === game.id;
  const shownAdvice = advice !== null && advice.gameId === game.id ? advice.data : null;
  const shownError = adviceError !== null && adviceError.gameId === game.id ? adviceError.message : null;

  async function askAdvisor(gameId: number) {
    setAdviceLoadingId(gameId);
    setAdviceError(null);
    setAdvice(null);
    try {
      const result = await api<UpgradeAdviceResponse>("/ai/upgrade-advice", {
        method: "POST",
        body: { gameId },
      });
      setAdvice({ gameId, data: result });
    } catch (e) {
      setAdviceError({
        gameId,
        message: e instanceof Error ? e.message : "เรียก AI Upgrade Advisor ไม่สำเร็จ",
      });
    } finally {
      setAdviceLoadingId(null);
    }
  }

  return (
    <div className="space-y-8">
      <Link to="/explore" className="inline-flex items-center gap-1 text-sm text-accent hover:underline">
        <ArrowLeft className="h-4 w-4" /> กลับ
      </Link>

      <div className="grid gap-6 md:grid-cols-[360px_1fr]">
        <img src={game.image} alt={game.name} className="aspect-video w-full rounded-xl border border-border object-cover" />

        <div className="space-y-3">
          <h1 className="font-heading text-2xl font-extrabold text-primary">{game.name}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-lg font-semibold text-accent">{formatPrice(game.price)}</span>
            <SpecBadge specCheck={game.specCheck} />
          </div>
          <div className="flex flex-wrap gap-2">
            {game.genres.map((g) => (
              <Badge key={g} variant="secondary">{g}</Badge>
            ))}
            {game.isIndie && <Badge variant="outline">Indie</Badge>}
            {game.multiplayer && <Badge variant="outline">Multiplayer</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">{game.description}</p>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted-foreground">Platform</dt>
            <dd>{game.platforms.join(", ")}</dd>
            <dt className="text-muted-foreground">ความยาก</dt>
            <dd>{game.difficulty}</dd>
            <dt className="text-muted-foreground">เวลาเล่น</dt>
            <dd>{String(game.playTime)}</dd>
            <dt className="text-muted-foreground">วางขาย</dt>
            <dd>{formatDate(game.releaseDate)}</dd>
            {game.tags.length > 0 && (
              <>
                <dt className="text-muted-foreground">แท็ก</dt>
                <dd>{game.tags.join(", ")}</dd>
              </>
            )}
          </dl>

          {/* ปุ่ม: Favorite (ขั้น 5) / AI Upgrade Advisor (ขั้น 9) */}
          <div className="flex flex-wrap gap-2 pt-2">
            <FavoriteButton key={game.id} gameId={game.id} initial={game.isFavorite} variant="full" />
            {showUpgrade && (
              <Button
                className="glow gap-2"
                disabled={adviceLoading}
                onClick={() => askAdvisor(game.id)}
              >
                <Sparkles className="h-4 w-4" />
                {adviceLoading ? "AI กำลังคิด..." : "AI Upgrade Advisor"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {(adviceLoading || shownAdvice || shownError) && (
        <section className="space-y-3 rounded-xl border border-primary/40 bg-card p-4">
          <h2 className="font-heading flex items-center gap-2 text-lg font-extrabold">
            <Sparkles className="h-5 w-5 text-primary" /> คำแนะนำการอัปเกรด
          </h2>
          {adviceLoading && <p className="text-sm text-muted-foreground">AI กำลังคิด...</p>}
          {shownError && <p className="text-sm text-red-400">{shownError}</p>}
          {shownAdvice && (
            <>
              {shownAdvice.notice && <p className="text-sm text-amber-400">{shownAdvice.notice}</p>}
              <p className="whitespace-pre-line text-sm leading-relaxed">{shownAdvice.advice}</p>
              <p className="text-xs text-muted-foreground">
                เป็นการประมาณจากระดับ tier ไม่ใช่ benchmark จริง ก่อนซื้อชิ้นส่วนควรเช็คความเข้ากันได้กับร้านหรือผู้ผลิต
              </p>
            </>
          )}
        </section>
      )}

      <section className="space-y-3 rounded-xl border border-border bg-card p-4">
        <h2 className="font-heading text-lg font-extrabold">เช็คสเปคเครื่อง</h2>
        {game.requirements ? (
          <>
            <SpecTable game={game} />
            <SpecNote specReady={game.specCheck !== null || data.specReady} />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">เกมนี้ไม่มีบน PC จึงไม่มีการเช็คสเปค</p>
        )}
      </section>

      {game.similar.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-heading text-xl font-extrabold">เกมที่คล้ายกัน</h2>
          <GameGrid items={game.similar} />
        </section>
      )}
    </div>
  );
}