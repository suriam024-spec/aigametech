import { useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "@/lib/useApi";
import type { FavoritesResponse } from "@/lib/types";
import GameCard from "@/components/GameCard";

export default function FavoritesPage() {
  const { data, error, loading } = useApi<FavoritesResponse>("/favorites");
  const [removed, setRemoved] = useState<number[]>([]);

  if (error) return <p className="text-red-400">{error}</p>;
  if (loading || !data) return <p className="text-muted-foreground">กำลังโหลด...</p>;

  const items = data.items.filter((g) => !removed.includes(g.id));

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-2xl font-extrabold text-primary">รายการโปรดของฉัน</h1>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          ยังไม่มีเกมในรายการโปรด ลองไป{" "}
          <Link to="/explore" className="text-accent hover:underline">สำรวจเกม</Link>{" "}
          แล้วกดรูปหัวใจที่เกมที่ชอบ
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((g) => (
            <GameCard
              key={g.id}
              game={g}
              onFavoriteChange={(id, isFav) => {
                if (!isFav) setRemoved((r) => [...r, id]);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}