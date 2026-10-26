import type { GameDto } from "@/lib/types";
import GameCard from "@/components/GameCard";

export default function GameGrid({ items }: { items: GameDto[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((g) => (
        <GameCard key={g.id} game={g} />
      ))}
    </div>
  );
}