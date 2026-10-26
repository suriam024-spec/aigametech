// ตรวจความถูกต้องของ seedData โดยไม่ต้องใช้ DB:  npm run check:data
import { CPUS, GPUS, GAMES, DEMO_USERS, DEMO_ACTIVITY } from "./seedData.ts";

const errors: string[] = [];
const err = (m: string) => errors.push(m);

// --- CPU / GPU ---
for (const [label, list] of [["CPU", CPUS], ["GPU", GPUS]] as const) {
  const tiers = new Set(list.map((x) => x.tier));
  for (let t = 1; t <= 5; t++) if (!tiers.has(t)) err(`${label}: ไม่มี tier ${t}`);
  if (new Set(list.map((x) => x.name)).size !== list.length) err(`${label}: ชื่อซ้ำ`);
  if (list.length < 15 / 2 || list.length > 10) err(`${label}: จำนวนผิดปกติ (${list.length})`);
}
if (CPUS.length + GPUS.length < 15 || CPUS.length + GPUS.length > 20) err("CPU+GPU รวมควรอยู่ 15-20 รุ่น");

// --- Games ---
if (GAMES.length < 20 || GAMES.length > 30) err(`จำนวนเกมควร 20-30 (มี ${GAMES.length})`);
if (new Set(GAMES.map((g) => g.name)).size !== GAMES.length) err("ชื่อเกมซ้ำ");

const inRange = (n: number) => Number.isInteger(n) && n >= 1 && n <= 5;
for (const g of GAMES) {
  const isPc = g.platforms.includes("PC");
  if (isPc && (!g.min || !g.rec)) err(`${g.name}: เกม PC ต้องมี requirements ครบ`);
  if (!isPc && (g.min || g.rec)) err(`${g.name}: ไม่ใช่เกม PC ไม่ควรมี requirements`);
  if (g.min && g.rec) {
    if (!inRange(g.min[0]) || !inRange(g.min[1]) || !inRange(g.rec[0]) || !inRange(g.rec[1])) err(`${g.name}: tier ต้องเป็น 1-5`);
    for (let i = 0; i < 3; i++) if (g.rec[i] < g.min[i]) err(`${g.name}: rec ต่ำกว่า min (ช่อง ${i})`);
  }
}

// --- demo activity อ้างชื่อเกมที่มีจริง ---
const names = new Set(GAMES.map((g) => g.name));
for (const [email, a] of Object.entries(DEMO_ACTIVITY)) {
  for (const v of a.views) if (!names.has(v.game)) err(`${email}: view เกมที่ไม่มี "${v.game}"`);
  for (const f of a.favorites) if (!names.has(f)) err(`${email}: favorite เกมที่ไม่มี "${f}"`);
}
for (const u of DEMO_USERS) {
  if (u.spec) {
    if (!CPUS.some((c) => c.name === u.spec!.cpu)) err(`${u.email}: ไม่พบ CPU`);
    if (!GPUS.some((c) => c.name === u.spec!.gpu)) err(`${u.email}: ไม่พบ GPU`);
  }
}

// --- สรุปความครอบคลุม ---
const count = (arr: string[][]) => {
  const m: Record<string, number> = {};
  arr.flat().forEach((x) => (m[x] = (m[x] ?? 0) + 1));
  return m;
};
console.log(`เกม ${GAMES.length} | Indie ${GAMES.filter((g) => g.isIndie).length} | Multiplayer ${GAMES.filter((g) => g.multiplayer).length} | ไม่ใช่ PC ${GAMES.filter((g) => !g.platforms.includes("PC")).length}`);
console.log("Platforms:", count(GAMES.map((g) => g.platforms)));
console.log("Genres:", Object.keys(count(GAMES.map((g) => g.genres))).length, "แบบ");

// --- พรีวิวผลเช็คสเปค (logic จริงจะทำในขั้นที่ 7) ---
const check = (spec: [number, number, number], g: (typeof GAMES)[number]) => {
  if (!g.min || !g.rec) return "n/a";
  if (spec.some((v, i) => v < g.min![i])) return "RED";
  if (spec.some((v, i) => v < g.rec![i])) return "YELLOW";
  return "GREEN";
};
for (const u of DEMO_USERS.filter((x) => x.spec)) {
  const c = CPUS.find((x) => x.name === u.spec!.cpu)!.tier;
  const p = GPUS.find((x) => x.name === u.spec!.gpu)!.tier;
  const spec: [number, number, number] = [c, p, u.spec!.ramGb];
  const tally: Record<string, string[]> = { GREEN: [], YELLOW: [], RED: [], "n/a": [] };
  GAMES.forEach((g) => tally[check(spec, g)].push(g.name));
  console.log(`\n${u.email} (cpu ${c} / gpu ${p} / ram ${spec[2]})`);
  for (const k of Object.keys(tally)) console.log(`  ${k.padEnd(6)} ${tally[k].length}`);
  console.log(`  RED: ${tally.RED.join(", ") || "-"}`);
}

if (errors.length) {
  console.error("\n❌ พบปัญหา:\n- " + errors.join("\n- "));
  process.exit(1);
}
console.log("\n✔ ข้อมูลผ่านการตรวจทั้งหมด");
