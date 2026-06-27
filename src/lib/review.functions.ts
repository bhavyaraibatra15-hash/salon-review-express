import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  visitType: z.string().min(1),
  tone: z.string().min(1),
  whoAreYou: z.string().min(1),
  whyChose: z.string().min(1),
  liked: z.array(z.string()).min(1),
  impact: z.string().min(1),
  staffName: z.string().optional().default(""),
  notes: z.string().optional().default(""),
  salonName: z.string().optional().default("JazzUp Salon Wakad"),
  salonLocation: z.string().optional().default("Wakad, Pune"),
});

export type ReviewInput = z.infer<typeof InputSchema>;
export type ReviewOutput = { short: string; medium: string; detailed: string };

const SYSTEM_PROMPT = (salonName: string, salonLocation: string) =>
  `You are helping a real customer of ${salonName} in ${salonLocation} write an authentic Google review based on their actual visit. Use ONLY the details the customer selected — service type, tone, what they liked, staff name, outcome, and notes. Write in natural, simple, India-friendly English the way a genuine customer writes. Vary sentence openings; never start with 'I recently visited'. No exaggeration, no fake claims, never invent details the customer did not select. Return strict JSON: {"short": "1-2 sentences", "medium": "2-3 sentences", "detailed": "3-5 sentences"}. Return only the JSON, nothing else.`;

function buildUserMessage(d: ReviewInput) {
  return [
    `Service: ${d.visitType}`,
    `Tone: ${d.tone}`,
    `Customer profile: ${d.whoAreYou}`,
    `Why chose this salon: ${d.whyChose}`,
    `What they liked most: ${d.liked.join(", ")}`,
    `Outcome/impact: ${d.impact}`,
    d.staffName ? `Staff name (mention naturally if provided): ${d.staffName}` : "",
    d.notes ? `Additional notes: ${d.notes}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

async function callGateway(data: ReviewInput): Promise<ReviewOutput> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY not configured");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: SYSTEM_PROMPT(data.salonName, data.salonLocation) },
        { role: "user", content: buildUserMessage(data) },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (res.status === 429) throw new Error("Rate limit reached. Please wait a moment and try again.");
  if (res.status === 402) throw new Error("AI credits exhausted. Please add credits to continue.");
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI gateway error (${res.status}): ${text.slice(0, 200)}`);
  }

  const json = await res.json();
  const content: string = json?.choices?.[0]?.message?.content ?? "";
  let parsed: ReviewOutput;
  try {
    parsed = JSON.parse(content);
  } catch {
    // try extracting JSON
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("AI returned invalid format");
    parsed = JSON.parse(match[0]);
  }
  if (!parsed.short || !parsed.medium || !parsed.detailed) {
    throw new Error("AI response missing required fields");
  }
  return parsed;
}

export const generateReview = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<ReviewOutput> => {
    try {
      return await callGateway(data);
    } catch (err) {
      // one retry
      try {
        return await callGateway(data);
      } catch (err2) {
        throw err2 instanceof Error ? err2 : new Error(String(err2));
      }
    }
  });
