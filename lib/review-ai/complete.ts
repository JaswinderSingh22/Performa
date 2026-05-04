import "server-only";

import OpenAI from "openai";
import { z } from "zod";

const assistOutputSchema = z.object({
  dimensions: z
    .array(
      z.object({
        label: z.string().min(1).max(120),
        analysis: z.string().max(12000),
        rating: z.number().int().min(1).max(5),
      }),
    )
    .min(3)
    .max(8),
  ai_draft: z.string().max(48000),
  final_review: z.string().max(48000),
});

export type AssistReviewOutput = z.infer<typeof assistOutputSchema>;

function meanRating(dimensions: { rating: number }[]): number {
  const avg =
    dimensions.reduce((sum, row) => sum + row.rating, 0) / dimensions.length;
  return Math.min(5, Math.max(1, Math.round(avg)));
}

const JSON_INSTRUCTION = `You are an experienced engineering manager writing fair, specific performance reviews.
Respond with ONLY valid JSON matching this shape (no markdown fences):
{
  "dimensions": [
    { "label": string, "analysis": string, "rating": integer 1-5 }
  ],
  "ai_draft": string,
  "final_review": string
}

Rules:
- Use 4–7 dimensions that fit this employee's role; reuse sensible labels where they still apply.
- Each "analysis" is 2–4 sentences citing behaviors, outcomes, and examples—no invented metrics.
- Ratings must align with the tone of the analyses (severe gaps → lower ratings).
- "ai_draft" is a bullet-oriented working summary for the manager (headers optional).
- "final_review" is polished prose suitable for HR/records (3–8 short paragraphs total), grounded in context.
`;

export async function runReviewAssistPrompt(args: {
  mode: "generate" | "improve";
  userBlock: string;
  /** Extra system guidance (e.g. stitched quarter narratives). */
  focusNote?: string;
}): Promise<AssistReviewOutput & { overall_rating: number }> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured on the server.");
  }

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const client = new OpenAI({ apiKey });

  const intro =
    args.mode === "generate"
      ? "Create a structured performance assessment from the context below."
      : "Improve and sharpen the assessment below—keep facts consistent with context; revise dimensions, analyses, drafts, and final narrative as needed.";

  const focus = args.focusNote?.trim()
    ? `\nAdditional focus:\n${args.focusNote.trim()}`
    : "";

  const completion = await client.chat.completions.create({
    model,
    temperature: 0.55,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `${JSON_INSTRUCTION}\n${intro}${focus}`,
      },
      {
        role: "user",
        content: args.userBlock,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content?.trim();
  if (!raw) {
    throw new Error("The model returned an empty response. Try again.");
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    throw new Error("The model returned invalid JSON.");
  }

  const parsed = assistOutputSchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new Error("The assistant output did not match the expected format.");
  }

  const out = parsed.data;
  return {
    ...out,
    overall_rating: meanRating(out.dimensions),
  };
}
