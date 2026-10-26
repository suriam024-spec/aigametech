import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

type Result<T> = { key: string; data?: T; error?: string };

export function useApi<T>(path: string) {
  const { user, loading: authLoading } = useAuth();
  // รอให้เช็ค token เสร็จก่อน แล้วค่อยดึง (กัน guest/user ปนกัน)
  const key = authLoading ? null : `${path}|${user?.id ?? "guest"}`;
  const [result, setResult] = useState<Result<T> | null>(null);

  useEffect(() => {
    if (key === null) return;
    let cancelled = false;
    api<T>(path)
      .then((data) => {
        if (!cancelled) setResult({ key, data });
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setResult({ key, error: e instanceof ApiError ? e.message : "เกิดข้อผิดพลาด กรุณาลองใหม่" });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [key, path]);

  const loading = key === null || result?.key !== key;
  const error = result?.key === key ? result.error : undefined;
  return { data: result?.data, error, loading };
}