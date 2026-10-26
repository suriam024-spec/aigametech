import { prisma } from "../src/db";
import { recordView, recordSearch } from "../src/services/activityService";
import { addFavorite, removeFavorite } from "../src/services/favoriteService";

async function main() {
  const low = await prisma.user.findUnique({ where: { email: "low@demo.com" } });
  if (!low) return console.log("ไม่พบ low@demo.com");
  console.log("เวลาตอนนี้ =", new Date().toISOString());

  // ส่วน A: ดูข้อมูลที่บันทึกไปแล้ว
  const views = await prisma.gameView.findMany({
    where: { userId: low.id, gameId: 19 },
    orderBy: { createdAt: "asc" },
  });
  console.log("A1) GameViews เกม 19 ของ low =", views.length);
  views.forEach((v) => console.log("    createdAt =", v.createdAt));

  const hades = await prisma.searchHistory.findMany({
    where: { userId: low.id, query: "hades" },
    orderBy: { createdAt: "asc" },
  });
  console.log("A2) SearchHistory 'hades' ของ low =", hades.length);
  hades.forEach((s) => console.log("    createdAt =", s.createdAt));

  const recent = await prisma.searchHistory.findMany({
    where: { userId: low.id },
    orderBy: { createdAt: "desc" },
    take: 8,
  });
  console.log("A3) คำค้นล่าสุด 8 รายการของ low:");
  recent.forEach((s) => console.log("    ", JSON.stringify(s.query), s.createdAt));

  // ส่วน B: เรียกฟังก์ชันตรงๆ ไม่ผ่าน HTTP
  const before = await prisma.gameView.count({ where: { userId: low.id, gameId: 19 } });
  await recordView(low.id, 19);
  await recordView(low.id, 19);
  await recordView(low.id, 19);
  const after = await prisma.gameView.count({ where: { userId: low.id, gameId: 19 } });
  console.log("B1) recordView 3 ครั้งติด: เพิ่ม", after - before, "แถว (ต้อง 0 หรือ 1 ห้ามเกิน 1)");

  await recordSearch(low.id, "zz-test");
  await recordSearch(low.id, "zz-test");
  const zz = await prisma.searchHistory.count({ where: { userId: low.id, query: "zz-test" } });
  console.log("B2) recordSearch 2 ครั้งติด: มี", zz, "แถว (ต้อง 1)");
  await prisma.searchHistory.deleteMany({ where: { userId: low.id, query: "zz-test" } });

  await addFavorite(low.id, 19);
  await addFavorite(low.id, 19);
  const fav = await prisma.favorite.count({ where: { userId: low.id, gameId: 19 } });
  console.log("B3) addFavorite 2 ครั้งติด: มี", fav, "แถว (ต้อง 1)");
  await removeFavorite(low.id, 19);
  const left = await prisma.favorite.count({ where: { userId: low.id, gameId: 19 } });
  console.log("B4) removeFavorite แล้วเหลือ", left, "แถว (ต้อง 0)");

  // ส่วน C: ทดสอบการเทียบเวลา
  const day = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const probe = await prisma.gameView.findFirst({
    where: { userId: low.id, gameId: 19, createdAt: { gte: day } },
  });
  console.log("C) findFirst(createdAt >= 24 ชม.ก่อน) =", probe ? "เจอ" : "ไม่เจอ", "(ถ้า A1 มีแถว ต้อง 'เจอ')");
}

main().catch(console.error).finally(() => prisma.$disconnect());