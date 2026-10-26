import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { CPUS, GPUS, GAMES, DEMO_USERS, DEMO_ACTIVITY } from "./seedData";

const prisma = new PrismaClient();

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

async function main() {
  // ล้างข้อมูลเก่า (เรียงจากตารางลูกไปตารางแม่) -> รันซ้ำได้
  await prisma.gameView.deleteMany();
  await prisma.searchHistory.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.user.deleteMany();
  await prisma.game.deleteMany();
  await prisma.cpuOption.deleteMany();
  await prisma.gpuOption.deleteMany();

  // ---------- CPU / GPU ----------
  await prisma.cpuOption.createMany({ data: CPUS });
  await prisma.gpuOption.createMany({ data: GPUS });
  const cpus = await prisma.cpuOption.findMany();
  const gpus = await prisma.gpuOption.findMany();

  // ---------- Games ----------
  for (const g of GAMES) {
    await prisma.game.create({
      data: {
        name: g.name,
        description: g.description,
        genres: JSON.stringify(g.genres),
        tags: JSON.stringify(g.tags),
        platforms: JSON.stringify(g.platforms),
        price: g.price,
        releaseDate: new Date(g.releaseDate),
        difficulty: g.difficulty,
        multiplayer: g.multiplayer,
        playTime: g.playTime,
        isIndie: g.isIndie,
        image: `https://picsum.photos/seed/${encodeURIComponent(g.name)}/600/340`,
        minCpuTier: g.min?.[0] ?? null,
        minGpuTier: g.min?.[1] ?? null,
        minRamGb: g.min?.[2] ?? null,
        recCpuTier: g.rec?.[0] ?? null,
        recGpuTier: g.rec?.[1] ?? null,
        recRamGb: g.rec?.[2] ?? null,
      },
    });
  }
  const games = await prisma.game.findMany();

  // ---------- Users ----------
  for (const u of DEMO_USERS) {
    await prisma.user.create({
      data: {
        email: u.email,
        passwordHash: await bcrypt.hash(u.password, 10),
        role: u.role,
        cpuId: u.spec ? cpus.find((c) => c.name === u.spec!.cpu)!.id : null,
        gpuId: u.spec ? gpus.find((x) => x.name === u.spec!.gpu)!.id : null,
        ramGb: u.spec?.ramGb ?? null,
      },
    });
  }

  // ---------- Activity ----------
  const gameId = (name: string) => {
    const g = games.find((x) => x.name === name);
    if (!g) throw new Error(`seed: ไม่พบเกม "${name}"`);
    return g.id;
  };

  for (const [email, act] of Object.entries(DEMO_ACTIVITY)) {
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });

    await prisma.gameView.createMany({
      data: act.views.map((v) => ({
        userId: user.id,
        gameId: gameId(v.game),
        createdAt: daysAgo(v.daysAgo),
      })),
    });
    await prisma.favorite.createMany({
      data: act.favorites.map((name) => ({ userId: user.id, gameId: gameId(name) })),
    });
    await prisma.searchHistory.createMany({
      data: act.searches.map((s) => ({
        userId: user.id,
        query: s.query,
        filters: s.genres ? JSON.stringify({ genres: s.genres }) : null,
        createdAt: daysAgo(s.daysAgo),
      })),
    });
  }

  // ---------- สรุป ----------
  const [nCpu, nGpu, nGame, nUser, nView, nFav, nSearch] = await Promise.all([
    prisma.cpuOption.count(),
    prisma.gpuOption.count(),
    prisma.game.count(),
    prisma.user.count(),
    prisma.gameView.count(),
    prisma.favorite.count(),
    prisma.searchHistory.count(),
  ]);
  console.log("Seed สำเร็จ ✔");
  console.table({ cpus: nCpu, gpus: nGpu, games: nGame, users: nUser, views: nView, favorites: nFav, searches: nSearch });
  console.log("\nบัญชีตัวอย่าง:");
  for (const u of DEMO_USERS) console.log(`  ${u.role.padEnd(5)} ${u.email}  /  ${u.password}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
