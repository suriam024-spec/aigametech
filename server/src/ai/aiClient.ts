import { config } from "../config";

export class AiError extends Error {}

type GeminiReply = {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
};

// ตัวเรียก Gemini กลาง (key ส่งผ่าน header ไม่ติดใน URL/log)
async function callGemini(
  system: string,
  user: string,
  timeoutMs: number,
  generationConfig: Record<string, unknown>
): Promise<string> {
  if (!config.geminiApiKey) throw new AiError("ไม่ได้ตั้ง GEMINI_API_KEY ใน .env");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    config.aiModel
  )}:generateContent`;

  let status = 0;
  let data: unknown = null;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": config.geminiApiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    status = res.status;
    data = await res.json().catch(() => null);
  } catch {
    throw new AiError(
      `เรียก AI ไม่สำเร็จ (ต่อเน็ตไม่ได้หรือช้าเกิน ${Math.round(timeoutMs / 1000)} วินาที)`
    );
  }

  if (status < 200 || status >= 300) throw new AiError(`AI ตอบ error ${status}`);

  const parts = (data as GeminiReply | null)?.candidates?.[0]?.content?.parts;
  const text = parts?.map((p) => p.text ?? "").join("").trim();
  if (!text) throw new AiError("AI ไม่ตอบข้อความกลับมา");
  return text;
}

// ให้ Gemini ตอบเป็น JSON (ขั้น 8: AI Search)
export async function askGeminiJson(
  system: string,
  user: string,
  timeoutMs = 10000
): Promise<string> {
  return callGemini(system, user, timeoutMs, {
    temperature: 0,
    responseMimeType: "application/json",
  });
}

// ให้ Gemini ตอบเป็นข้อความธรรมดา (ขั้น 9: AI Upgrade Advisor)
export async function askGeminiText(
  system: string,
  user: string,
  timeoutMs = 10000
): Promise<string> {
  return callGemini(system, user, timeoutMs, { temperature: 0.3 });
}