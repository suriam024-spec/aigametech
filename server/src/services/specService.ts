import { prisma } from "../db";
import { HttpError } from "../utils/httpError";

export const RAM_MIN = 2;
export const RAM_MAX = 128;

const optionSelect = { id: true, name: true, tier: true, note: true } as const;

export async function getOptions() {
  const [cpus, gpus] = await Promise.all([
    prisma.cpuOption.findMany({
      select: optionSelect,
      orderBy: [{ tier: "asc" }, { name: "asc" }],
    }),
    prisma.gpuOption.findMany({
      select: optionSelect,
      orderBy: [{ tier: "asc" }, { name: "asc" }],
    }),
  ]);
  return { cpus, gpus };
}

export async function getMySpec(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      ramGb: true,
      cpu: { select: optionSelect },
      gpu: { select: optionSelect },
    },
  });
  if (!user) {
    throw new HttpError(401, "ไม่พบบัญชีนี้ กรุณาเข้าสู่ระบบใหม่");
  }
  return {
    cpu: user.cpu,
    gpu: user.gpu,
    ramGb: user.ramGb,
    isSet: user.cpu !== null && user.gpu !== null && user.ramGb !== null,
  };
}

export async function saveMySpec(
  userId: number,
  input: { cpuId: number; gpuId: number; ramGb: number },
) {
  // ไม่เชื่อค่าจาก frontend: เช็คว่า id มีอยู่จริงในตาราง
  const [cpu, gpu] = await Promise.all([
    prisma.cpuOption.findUnique({ where: { id: input.cpuId } }),
    prisma.gpuOption.findUnique({ where: { id: input.gpuId } }),
  ]);
  if (!cpu) throw new HttpError(400, "ไม่พบ CPU ที่เลือก");
  if (!gpu) throw new HttpError(400, "ไม่พบการ์ดจอที่เลือก");

  await prisma.user.update({
    where: { id: userId },
    data: { cpuId: cpu.id, gpuId: gpu.id, ramGb: input.ramGb },
  });
  return getMySpec(userId);
}

export async function clearMySpec(userId: number) {
  await prisma.user.update({
    where: { id: userId },
    data: { cpuId: null, gpuId: null, ramGb: null },
  });
  return getMySpec(userId);
}