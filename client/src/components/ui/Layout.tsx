import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { Gamepad2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { buttonVariants } from "@/components/ui/button";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `text-sm transition-colors hover:text-accent ${isActive ? "text-accent" : "text-muted-foreground"}`;

export default function Layout() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-6">
            <Link to="/" className="font-heading flex items-center gap-2 text-lg font-extrabold text-primary">
              <Gamepad2 className="h-5 w-5" /> AI GameTech
            </Link>
            <nav className="flex items-center gap-4">
              <NavLink to="/" end className={linkClass}>หน้าแรก</NavLink>
              <NavLink to="/explore" className={linkClass}>สำรวจเกม</NavLink>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {loading ? null : user ? (
              <>
                <span className="hidden max-w-[180px] truncate text-sm text-muted-foreground sm:inline">
                  {user.email}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    logout();
                    navigate("/");
                  }}
                >
                  ออกจากระบบ
                </Button>
              </>
            ) : (
              <>
  <Link to="/login" className={buttonVariants({ variant: "ghost", size: "sm" })}>
    เข้าสู่ระบบ
  </Link>
  <Link to="/register" className={buttonVariants({ size: "sm" }) + " glow"}>
    สมัครสมาชิก
  </Link>
</>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}