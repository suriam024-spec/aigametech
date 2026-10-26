import { prisma } from "../db";
import { HttpError } from "../utils/httpError";
import { askGeminiText } from "../ai/aiClient";
import { buildUpgradeSystemPrompt, buildUpgradeUserMessage } from "../ai/upgradePrompt";
import type { Alternative, PartOption, Shortfall, UpgradeData } from "../ai/upgradePrompt";
import { checkSpec } from "./specCheckService";
import type { Gap, SpecCheck, UserSpec } from "./specCheckService";
import { getMySpec, getOptions } from "./specService";

export interface UpgradeAdviceResult {
  advice: string;
  usedAi: boolean;
  status: "smooth" | "minimum" | "fail";
  notice: string | null;
}

const LAPTOP_NOTE =
  "ถ้าเป็นโน้ตบุ๊ก ส่วนใหญ่เปลี่ยน CPU/การ์ดจอเองไม่ได้ ลองลดกราฟิกหรือเลือกเกมที่เครื่องเล่นได้แทน";

function parseList(raw: string): string[] {
  try {
    const v: unknown = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

// เลือกรุ่นที่ tier ต่ำสุดที่ยังถึงเกณฑ์ (และสูงกว่าที่ผู้ใช้มี) สูงสุด 2 รุ่น
function pickLowest(pool: PartOption[], needTier: number, haveTier: number): PartOption[] {
  const eligible = pool
    .filter((o) => o.tier >= needTier && o.tier > haveTier)
    .sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name));
  if (eligible.length === 0) return [];
  const lowest = eligible[0].tier;
  return eligible
    .filter((o) => o.tier === lowest)
    .slice(0, 2)
    .map((o) => ({ name: o.name, tier: o.tier }));
}

function buildShortfalls(check: SpecCheck, cpus: PartOption[], gpus: PartOption[]): Shortfall[] {
  const list: Shortfall[] = [];

  const add = (
    part: Shortfall["part"],
    unit: Shortfall["unit"],
    gap: Gap,
    pool?: PartOption[]
  ) => {
    if (gap.have >= gap.needRec) return; // ถึงเกณฑ์ที่แนะนำแล้ว ไม่ต้องอัปเกรด
    const belowMin = gap.have < gap.needMin;
    const item: Shortfall = {
      part,
      unit,
      have: gap.have,
      needMin: gap.needMin,
      needRec: gap.needRec,
      belowMin,
    };
    if (pool) {
      item.forMinimum = belowMin ? pickLowest(pool, gap.needMin, gap.have) : [];
      // ถ้าเป้าหมายขั้นต่ำกับที่แนะนำเป็น tier เดียวกัน ไม่ต้องส่งซ้ำ
      item.forSmooth =
        belowMin && gap.needRec <= gap.needMin ? [] : pickLowest(pool, gap.needRec, gap.have);
    }
    list.push(item);
  };

  add("CPU", "tier", check.cpuGap, cpus);
  add("GPU", "tier", check.gpuGap, gpus);
  add("RAM", "GB", check.ramGap);
  return list;
}

// เกมทางเลือก: Genre ซ้ำ + เครื่องเล่นได้ (ไม่ใช่ fail) เรียงตามจำนวน Genre ที่ตรง แล้ว 🟢 ก่อน 🟡
function pickAlternatives(
  currentId: number,
  genres: string[],
  games: Awaited<ReturnType<typeof prisma.game.findMany>>,
  spec: UserSpec
): Alternative[] {
  const wanted = new Set(genres.map((g) => g.toLowerCase()));
  const found: (Alternative & { id: number; overlap: number })[] = [];

  for (const g of games) {
    if (g.id === currentId) continue;
    const c = checkSpec(g, spec);
    if (!c) continue; // เกมคอนโซลล้วน ไม่มีการเช็คสเปค
    const status = c.status;
    if (status === "fail") continue;
    const gGenres = parseList(g.genres);
    const overlap = gGenres.filter((x) => wanted.has(x.toLowerCase())).length;
    if (overlap === 0) continue;
    found.push({ id: g.id, name: g.name, genres: gGenres, status, overlap });
  }

  found.sort((a, b) => {
    if (b.overlap !== a.overlap) return b.overlap - a.overlap;
    if (a.status !== b.status) return a.status === "smooth" ? -1 : 1;
    return a.id - b.id;
  });

  return found.slice(0, 3).map((f) => ({ name: f.name, genres: f.genres, status: f.status }));
}

// ข้อความสำรองตอน AI ล่ม (Backend ประกอบเอง จากผลเทียบสเปค)
function buildFallbackAdvice(
  status: "minimum" | "fail",
  shortfalls: Shortfall[],
  alternatives: Alternative[]
): string {
  const unitText = (s: Shortfall, n: number) => (s.unit === "tier" ? `tier ${n}` : `${n} GB`);
  const lines: string[] = [];

  lines.push(
    status === "fail"
      ? "เครื่องของคุณยังต่ำกว่าเกณฑ์ขั้นต่ำของเกมนี้:"
      : "เครื่องของคุณเล่นเกมนี้ได้ที่ระดับขั้นต่ำ ถ้าอยากเล่นให้ลื่นขึ้น:"
  );
  for (const s of shortfalls) {
    if (s.belowMin) {
      lines.push(`• ขาด ${s.part}: ต้องการ ${unitText(s, s.needMin)} ขึ้นไป (เครื่องคุณ ${unitText(s, s.have)})`);
    } else {
      lines.push(`• ${s.part} ควรถึง ${unitText(s, s.needRec)} เพื่อเล่นลื่น (เครื่องคุณ ${unitText(s, s.have)})`);
    }
  }
  if (alternatives.length > 0) {
    lines.push(`เกมทางเลือกที่เครื่องคุณเล่นได้: ${alternatives.map((a) => a.name).join(", ")}`);
  }
  lines.push(LAPTOP_NOTE);
  return lines.join("\n");
}

export async function getUpgradeAdvice(userId: number, gameId: number): Promise<UpgradeAdviceResult> {
  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game) throw new HttpError(404, "ไม่พบเกมนี้");

  const { cpu, gpu, ramGb } = await getMySpec(userId);
  if (!cpu || !gpu || ramGb == null) {
    throw new HttpError(400, "กรุณาตั้งสเปคเครื่องก่อนใช้ AI Upgrade Advisor");
  }
  const spec: UserSpec = { cpuTier: cpu.tier, gpuTier: gpu.tier, ramGb };

  const check = checkSpec(game, spec);
  if (!check) throw new HttpError(400, "เกมนี้ไม่มีบน PC จึงไม่มีการเช็คสเปค");

  // ผ่านเกณฑ์ที่แนะนำแล้ว: ตอบเอง ไม่เรียก AI (ประหยัดโควตา)
  if (check.status === "smooth") {
    return {
      advice: "เครื่องของคุณผ่านเกณฑ์ที่เกมแนะนำแล้วทุกด้าน ไม่ต้องอัปเกรดเพื่อเล่นเกมนี้",
      usedAi: false,
      status: "smooth",
      notice: null,
    };
  }
  const status: "minimum" | "fail" = check.status === "fail" ? "fail" : "minimum";

  const [options, allGames] = await Promise.all([getOptions(), prisma.game.findMany()]);
  const genres = parseList(game.genres);
  const shortfalls = buildShortfalls(check, options.cpus, options.gpus);
  const alternatives = pickAlternatives(game.id, genres, allGames, spec);

  const data: UpgradeData = {
    game: { name: game.name, genres, status },
    machine: {
      cpu: { name: cpu.name, tier: cpu.tier },
      gpu: { name: gpu.name, tier: gpu.tier },
      ramGb,
    },
    shortfalls,
    alternatives,
  };

  try {
    const text = await askGeminiText(
      buildUpgradeSystemPrompt(),
      buildUpgradeUserMessage(data),
      10000
    );
    const advice = text.replace(/\*\*/g, "").replace(/^\s*\d+\)\s*/gm, "").trim();
    return { advice, usedAi: true, status, notice: null };
  } catch (err) {
    console.warn(
      "[ai/upgrade] AI ใช้ไม่ได้ ใช้คำแนะนำพื้นฐานแทน:",
      err instanceof Error ? err.message : err
    );
    return {
      advice: buildFallbackAdvice(status, shortfalls, alternatives),
      usedAi: false,
      status,
      notice: "AI ไม่พร้อมใช้งานตอนนี้ จึงแสดงคำแนะนำพื้นฐานจากการเทียบสเปคแทน",
    };
  }
}