// Diagnostic route — visit /api/test-gemini to verify Gemini connection.
// Remove or gate this in production.
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs";

export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY ?? "";
  const modelName = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";

  const info = {
    apiKeyPresent: !!apiKey,
    apiKeyPrefix: apiKey ? apiKey.slice(0, 12) + "..." : "NOT SET",
    apiKeyLength: apiKey.length,
    modelName,
  };

  if (!apiKey || apiKey === "PASTE_GEMINI_API_KEY_HERE") {
    return NextResponse.json({ ...info, error: "API key not configured" }, { status: 400 });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent("Reply with exactly the word: CONNECTED");
    const text = result.response.text();
    return NextResponse.json({ ...info, success: true, response: text });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack?.split("\n").slice(0, 5).join("\n") : undefined;
    console.error("[test-gemini] Error:", message);
    return NextResponse.json({ ...info, success: false, error: message, stack }, { status: 500 });
  }
}
