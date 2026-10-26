import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { Button, buttonVariants } from "@/components/ui/button";
import OptionCombobox, { type SpecOption } from "@/components/OptionCombobox";

interface SpecOptionsResponse {
  cpus: SpecOption[];
  gpus: SpecOption[];
}

interface MySpec {
  cpu: SpecOption | null;
  gpu: SpecOption | null;
  ramGb: number | null;
  isSet: boolean;
}

const RAM_CHOICES = [4, 8, 16, 32, 64, 128];

function SpecForm({
  options,
  initial,
}: {
  options: SpecOptionsResponse;
  initial: MySpec;
}) {
  const [saved, setSaved] = useState<MySpec>(initial);
  const [cpuId, setCpuId] = useState<number | null>(initial.cpu?.id ?? null);
  const [gpuId, setGpuId] = useState<number | null>(initial.gpu?.id ?? null);
  const [ramGb, setRamGb] = useState<number | null>(initial.ramGb);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const complete = cpuId !== null && gpuId !== null && ramGb !== null;

  async function onSave() {
    if (!complete) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await api<MySpec>("/me/specs", {
        method: "PUT",
        body: { cpuId, gpuId, ramGb },
      });
      setSaved(result);
      setMessage("บันทึกแล้ว");
    } catch (err) {
      setError(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  async function onClear() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await api<MySpec>("/me/specs", { method: "DELETE" });
      setSaved(result);
      setCpuId(null);
      setGpuId(null);
      setRamGb(null);
      setMessage("ล้างสเปคแล้ว");
    } catch (err) {
      setError(err instanceof Error ? err.message : "ล้างสเปคไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-4 text-sm">
        <div className="mb-1 font-medium">สเปคที่บันทึกไว้ตอนนี้</div>
        {saved.isSet && saved.cpu && saved.gpu ? (
          <div className="space-y-0.5 text-muted-foreground">
            <div>CPU: {saved.cpu.name} (Tier {saved.cpu.tier})</div>
            <div>การ์ดจอ: {saved.gpu.name} (Tier {saved.gpu.tier})</div>
            <div>RAM: {saved.ramGb} GB</div>
          </div>
        ) : (
          <div className="text-muted-foreground">ยังไม่ได้ตั้งสเปค</div>
        )}
      </div>

      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        <div className="mb-1 font-medium text-foreground">
          ไม่รู้สเปคเครื่องตัวเอง? ดูได้ใน 1 นาที
        </div>
        <ol className="list-decimal space-y-0.5 pl-5">
          <li>กดปุ่ม Win + R บนคีย์บอร์ด</li>
          <li>พิมพ์ dxdiag แล้วกด Enter (ถ้ามีหน้าต่างถาม ให้กด Yes/ตกลง)</li>
          <li>แท็บ System: ดูชื่อ Processor (CPU) และ Memory (RAM)</li>
          <li>แท็บ Display: ดูชื่อ Name (การ์ดจอ)</li>
        </ol>
        <p className="mt-2">
          ถ้าไม่แน่ใจรุ่น ให้เลือกรุ่นที่ใกล้เคียงจากคำอธิบายใต้ชื่อ
          ผลเช็คสเปคเป็นการประมาณเท่านั้น
        </p>
      </div>

      <OptionCombobox
        label="CPU (ตัวประมวลผล)"
        options={options.cpus}
        value={cpuId}
        onChange={setCpuId}
      />
      <OptionCombobox
        label="การ์ดจอ (GPU)"
        options={options.gpus}
        value={gpuId}
        onChange={setGpuId}
      />

      <div>
        <div className="mb-1 text-sm font-medium">RAM (GB)</div>
        <div className="flex flex-wrap gap-2">
          {RAM_CHOICES.map((gb) => (
            <Button
              key={gb}
              type="button"
              variant={ramGb === gb ? "default" : "outline"}
              onClick={() => setRamGb(gb)}
            >
              {gb} GB
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={onSave} disabled={!complete || busy}>
          {busy ? "กำลังบันทึก..." : "บันทึกสเปค"}
        </Button>
        {saved.isSet && (
          <Button
            type="button"
            variant="outline"
            onClick={onClear}
            disabled={busy}
          >
            ล้างสเปค
          </Button>
        )}
        {!complete && (
          <span className="text-xs text-muted-foreground">
            เลือก CPU, การ์ดจอ และ RAM ให้ครบก่อนบันทึก
          </span>
        )}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {message && (
        <p className="text-sm text-emerald-400">
          {message}{" "}
          <Link to="/explore" className="underline">
            ไปดูเกมที่เครื่องคุณเล่นได้ →
          </Link>
        </p>
      )}
    </div>
  );
}

export default function SpecsPage() {
  const opts = useApi<SpecOptionsResponse>("/specs/options");
  const mine = useApi<MySpec>("/me/specs");

  const error = opts.error ?? mine.error;
  const loading = opts.loading || mine.loading;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-heading mb-1 text-2xl">My Specs</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        ตั้งสเปคเครื่องของคุณ แล้วเว็บจะบอกว่าเกมไหนเล่นได้ลื่น เล่นได้ขั้นต่ำ หรือไม่ผ่าน
        เปลี่ยนสเปคเมื่อไหร่ก็ได้ เพื่อดูว่าเครื่องระดับใหม่เล่นเกมอะไรได้เพิ่ม
      </p>

      {loading && <p className="text-sm text-muted-foreground">กำลังโหลด...</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}
      {!loading && !error && opts.data && mine.data && (
        <SpecForm options={opts.data} initial={mine.data} />
      )}

      <div className="mt-8">
        <Link to="/" className={buttonVariants({ variant: "ghost" })}>
          ← กลับหน้าแรก
        </Link>
      </div>
    </div>
  );
}