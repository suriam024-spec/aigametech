import { writeFileSync } from "fs";
import { prisma } from "../src/db";

async function main() {
  const user = await prisma.user.findUnique({ where: { email: "low@demo.com" } });
  if (!user) {
    console.log("ไม่พบ low@demo.com");
    return;
  }
  const rows = await prisma.searchHistory.findMany({
    where: { userId: user.id },
    orderBy: { id: "desc" },
    take: 10,
  });
  const lines = rows.map((r) => `${r.id} | ${r.createdAt.toISOString()} | ${r.query}`);
  writeFileSync("../out4b.txt", "\ufeff" + lines.join("\n"), "utf8");
  console.log("เขียน out4b.txt แล้ว " + lines.length + " แถว");
}

main().finally(() => prisma.$disconnect());