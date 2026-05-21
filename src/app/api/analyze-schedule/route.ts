export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, unauthorized, serverError } from "@/lib/api-auth";

const PROMPT = `You are a university schedule parser. The image may contain Khmer (ខ្មែរ) and/or English text.

Extract ALL courses from this timetable and return them as a JSON array. Each object must have exactly these fields:
- name: string (full course name, keep original language including Khmer)
- code: string (course code like "CS101", or empty string if not found)
- instructor: string (lecturer/teacher name, or empty string if not found)
- room: string (room/venue, or empty string if not found)
- days: string[] (days using ONLY these exact values: "Mon","Tue","Wed","Thu","Fri","Sat","Sun")
- startTime: string (24h format "HH:MM", e.g. "09:00")
- endTime: string (24h format "HH:MM", e.g. "10:30")

Rules:
- Return ONLY a valid JSON array, no explanation, no markdown code fences
- If the schedule has Khmer day names, map them: ច័ន្ទ=Mon, អង្គារ=Tue, ពុធ=Wed, ព្រហស្បតិ៍=Thu, សុក្រ=Fri, សៅរ៍=Sat, អាទិត្យ=Sun
- If you cannot find any schedule data, return []`;

const FREE_MODELS = [
  "google/gemma-4-31b-it:free",
  "nvidia/nemotron-nano-12b-v2-vl:free",
  "google/gemma-4-26b-a4b-it:free",
];

const MAX_BASE64_BYTES = 1.5 * 1024 * 1024; // 1.5 MB limit

export async function POST(req: NextRequest) {
  try {
    await verifyAuth(req);
  } catch {
    return unauthorized();
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large. Please use an image under 10 MB." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    let base64 = Buffer.from(bytes).toString("base64");

    // Truncate if still too large to avoid OOM
    if (base64.length > MAX_BASE64_BYTES) {
      base64 = base64.slice(0, MAX_BASE64_BYTES);
    }

    // Try each free model until one works
    let lastError: any = null;
    for (const model of FREE_MODELS) {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "user",
              content: [
                { type: "image_url", image_url: { url: `data:${file.type};base64,${base64}` } },
                { type: "text", text: PROMPT },
              ],
            },
          ],
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error(`Model ${model} failed:`, data?.error?.message);
        lastError = data;
        continue; // try next model
      }

      const raw = (data.choices?.[0]?.message?.content ?? "").trim();
      let courses: unknown;
      try {
        courses = JSON.parse(raw);
      } catch {
        const match = raw.match(/\[[\s\S]*\]/);
        courses = match ? JSON.parse(match[0]) : [];
      }

      return NextResponse.json({ courses });
    }

    console.error("All models failed:", lastError);
    return NextResponse.json({ error: "All AI models are currently busy. Please try again in a minute." }, { status: 503 });
  } catch (err) {
    console.error("analyze-schedule error:", err);
    return serverError();
  }
}
