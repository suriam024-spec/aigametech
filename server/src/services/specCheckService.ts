import { prisma } from "../db";

export type PartResult = "pass" | "fail";
export interface Gap {
  have: number;
  needMin: number;
  needRec: number;
}
export interface SpecCheck {
  status: "smooth" | "minimum" | "fail"; // 🟢 / 🟡 / 🔴
  cpu: PartResult;
  gpu: PartResult;
  ram: PartResult;
  cpuGap: Gap;
  gpuGap: Gap;
  ramGap: Gap;
}
export interface UserSpec {
  cpuTier: number;
  gpuTier: number;
  ramGb: number;
}
export interface GameRequirements {
  minCpuTier: number | null;
  minGpuTier: number | null;
  minRamGb: number | null;
  recCpuTier: number | null;
  recGpuTier: number | null;
  recRamGb: number | null;
}

// เกมที่ไม่มี requirement (ไม่ใช่เกม PC) -> คืน null = ข้ามการเช็ค
export function checkSpec(game: GameRequirements, spec: UserSpec): SpecCheck | null {
  if (game.minCpuTier == null || game.minGpuTier == null || game.minRamGb == null) {
    return null;
  }

  const cpuGap: Gap = {
    have: spec.cpuTier,
    needMin: game.minCpuTier,
    needRec: game.recCpuTier ?? game.minCpuTier,
  };
  const gpuGap: Gap = {
    have: spec.gpuTier,
    needMin: game.minGpuTier,
    needRec: game.recGpuTier ?? game.minGpuTier,
  };
  const ramGap: Gap = {
    have: spec.ramGb,
    needMin: game.minRamGb,
    needRec: game.recRamGb ?? game.minRamGb,
  };
  const gaps = [cpuGap, gpuGap, ramGap];

  const passMin = (g: Gap) => g.have >= g.needMin;
  const passRec = (g: Gap) => g.have >= g.needRec;

  let status: SpecCheck["status"];
  if (gaps.every(passRec)) status = "smooth";
  else if (gaps.every(passMin)) status = "minimum";
  else status = "fail";

  return {
    status,
    cpu: passMin(cpuGap) ? "pass" : "fail",
    gpu: passMin(gpuGap) ? "pass" : "fail",
    ram: passMin(ramGap) ? "pass" : "fail",
    cpuGap,
    gpuGap,
    ramGap,
  };
}

// คืน null ถ้าผู้ใช้ยังตั้งสเปคไม่ครบ
export async function loadUserSpec(userId: number): Promise<UserSpec | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.cpuId == null || user.gpuId == null || user.ramGb == null) {
    return null;
  }
  const [cpu, gpu] = await Promise.all([
    prisma.cpuOption.findUnique({ where: { id: user.cpuId } }),
    prisma.gpuOption.findUnique({ where: { id: user.gpuId } }),
  ]);
  if (!cpu || !gpu) return null;
  return { cpuTier: cpu.tier, gpuTier: gpu.tier, ramGb: user.ramGb };
}