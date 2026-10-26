import { prisma } from "../src/db";
import { getRecommendations } from "../src/services/recommendationService";

const GENRE = (process.argv[2] ?? "Roguelike").toLowerCase();

async function show(label: string, userId: number) {
  const r = await getRecommendations(userId);
  console.log(`--- ${label} --- basedOn=${r.basedOn} topGenres=${r.topGenres.join(", ") || "-"}`);
  r.items.forEach((g, i) => console.log(`${i + 1}. ${g.name} [${g.genres.join("/")}] pop=${g.popularity}`));
}

async function main() {
  const user = await prisma.user.findUnique({ where: { email: "low@demo.com" } });
  if (!user) throw new Error("ไม่พบ low@demo.com");

  const games = await prisma.game.findMany();
  const have = new Set((await prisma.favorite.findMany({ where: { userId: user.id } })).map((f) => f.gameId));
  const targets = games
    .filter((g) => g.genres.toLowerCase().includes(GENRE) && !have.has(g.id))
    .slice(0, Number(process.argv[3] ?? 1));
  console.log(`เกมแนว "${GENRE}" ที่จะกด Favorite ชั่วคราว:`, targets.map((g) => g.name).join(", ") || "(ไม่พบ ลองชื่อแนวอื่น)");

  await show("ก่อน", user.id);

  const createdGameIds: number[] = [];
  try {
    for (const g of targets) {
      await prisma.favorite.create({ data: { userId: user.id, gameId: g.id } });
      createdGameIds.push(g.id);
    }
    await show("หลังกด Favorite", user.id);
  } finally {
    if (createdGameIds.length) {
      await prisma.favorite.deleteMany({ where: { userId: user.id, gameId: { in: createdGameIds } } });
    }
    console.log("ลบ Favorite ชั่วคราวคืนแล้ว:", createdGameIds.length, "แถว");
  }
}

main().finally(() => prisma.$disconnect());