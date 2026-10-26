import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function SpecNote({ specReady }: { specReady: boolean }) {
  const { user } = useAuth();
  return (
    <p className="text-xs text-muted-foreground">
      {!user ? (
        <>
          <Link to="/login" className="text-accent hover:underline">เข้าสู่ระบบ</Link> และตั้งสเปคเครื่อง เพื่อดูว่าเกมไหนเล่นได้
        </>
      ) : !specReady ? (
        <>
          ยังไม่ได้ตั้งสเปคเครื่อง{" "}
          <Link to="/specs" className="text-accent hover:underline">ไปตั้งสเปค</Link>
        </>
      ) : (
        "ผลเช็คสเปคเป็นการประมาณเท่านั้น"
      )}
    </p>
  );
}