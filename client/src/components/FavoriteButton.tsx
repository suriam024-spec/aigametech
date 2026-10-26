import { useState, type MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

type Props = {
  gameId: number;
  initial: boolean;
  variant?: "icon" | "full";
  onChange?: (isFavorite: boolean) => void;
};

export default function FavoriteButton({ gameId, initial, variant = "icon", onChange }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [fav, setFav] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function toggle(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      navigate("/login");
      return;
    }
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const r = await api<{ isFavorite: boolean }>(`/favorites/${gameId}`, {
        method: fav ? "DELETE" : "POST",
      });
      setFav(r.isFavorite);
      onChange?.(r.isFavorite);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setBusy(false);
    }
  }

  const label = fav ? "เอาออกจากรายการโปรด" : "เพิ่มในรายการโปรด";

  if (variant === "full") {
    return (
      <div>
        <Button variant="outline" disabled={busy} onClick={toggle} className="gap-2">
          <Heart className={`h-4 w-4 ${fav ? "fill-pink-500 text-pink-500" : ""}`} />
          {label}
        </Button>
        {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-label={label}
      title={error || label}
      className="absolute right-2 top-2 rounded-full bg-background/70 p-1.5 backdrop-blur transition hover:bg-background"
    >
      <Heart className={`h-4 w-4 ${fav ? "fill-pink-500 text-pink-500" : "text-muted-foreground"}`} />
    </button>
  );
}