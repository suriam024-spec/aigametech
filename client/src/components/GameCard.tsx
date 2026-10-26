import { Link } from "react-router-dom";
import type { GameDto } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { useAuth } from "@/context/AuthContext";
import SpecBadge from "@/components/SpecBadge";
import FavoriteButton from "@/components/FavoriteButton";

type Props = {
  game: GameDto;
  onFavoriteChange?: (gameId: number, isFavorite: boolean) => void;
};

export default function GameCard({ game, onFavoriteChange }: Props) {
  const { user } = useAuth();
  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-card transition hover:border-primary/60 hover:shadow-[0_0_18px_oklch(0.65_0.25_295/0.3)]">
      <Link to={`/games/${game.id}`} className="block">
        <img
          src={game.image}
          alt={game.name}
          loading="lazy"
          className="aspect-video w-full object-cover"
        />
        <div className="space-y-2 p-3">
          <h3 className="truncate font-semibold">{game.name}</h3>
          <p className="truncate text-xs text-muted-foreground">
            {game.genres.join(", ")} • {game.platforms.join(", ")}
          </p>
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-accent">{formatPrice(game.price)}</span>
            <SpecBadge specCheck={game.specCheck} />
          </div>
        </div>
      </Link>
      <FavoriteButton
        key={`${game.id}-${user?.id ?? "guest"}`}
        gameId={game.id}
        initial={game.isFavorite}
        onChange={(v) => onFavoriteChange?.(game.id, v)}
      />
    </div>
  );
}