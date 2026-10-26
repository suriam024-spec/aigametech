import { prisma } from "../db";

const WINDOW_MS = 10 * 60 * 1000; // ไม่นับซ้ำภายใน 10 นาที

// บันทึกการเปิดดูเกม (ล้มเหลวได้ ไม่ให้กระทบการตอบหน้าเว็บ)
export async function recordView(userId: number, gameId: number): Promise<void> {
  try {
    const since = new Date(Date.now() - WINDOW_MS);
    const recent = await prisma.gameView.findFirst({
      where: { userId, gameId, createdAt: { gte: since } },
    });
    if (recent) return;
    await prisma.gameView.create({ data: { userId, gameId } });
  } catch (e) {
    console.error("recordView failed:", e);
  }
}

// บันทึกคำค้นหา (เฉพาะคำที่ไม่ว่าง และไม่ซ้ำคำเดิมภายใน 10 นาที)
export async function recordSearch(userId: number, query: string): Promise<void> {
  const q = query.trim();
  if (!q) return;
  try {
    const since = new Date(Date.now() - WINDOW_MS);
    const recent = await prisma.searchHistory.findFirst({
      where: { userId, query: q, createdAt: { gte: since } },
    });
    if (recent) return;
    await prisma.searchHistory.create({ data: { userId, query: q } });
  } catch (e) {
    console.error("recordSearch failed:", e);
  }
}