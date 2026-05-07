import "server-only";

import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface SelfReviewPayload {
  employeeName: string;
  role: string;
  cycleName: string;
  highlights: string;
  challenges: string;
  goalsNextPeriod: string;
  collaborationNote: string;
  growthAreas: string;
  supportNeeded: string;
  selfRating: number | null;
}

export interface SuggestedRemarks {
  highlights_remark: string;
  challenges_remark: string;
  goals_remark: string;
  growth_remark: string;
  final_remark: string;
  overall_rating: number;
}

export async function suggestManagerRemarks(
  payload: SelfReviewPayload,
): Promise<SuggestedRemarks> {
  const prompt = `You are a thoughtful engineering manager giving structured feedback on a team member's self-review.
  
Employee: ${payload.employeeName} (${payload.role})
Review cycle: ${payload.cycleName}

Self-review responses:
Highlights: ${payload.highlights || "Not provided"}
Challenges: ${payload.challenges || "Not provided"}
Goals for next period: ${payload.goalsNextPeriod || "Not provided"}
Collaboration: ${payload.collaborationNote || "Not provided"}
Growth areas: ${payload.growthAreas || "Not provided"}
Support needed: ${payload.supportNeeded || "Not provided"}
Self-rating: ${payload.selfRating ? `${payload.selfRating}/5` : "Not provided"}

Write concise, constructive manager remarks for each section. Be specific, fair, and encouraging. Use plain professional language (no bullet points, no markdown).

Respond with ONLY valid JSON (no fences):
{
  "highlights_remark": string,
  "challenges_remark": string,
  "goals_remark": string,
  "growth_remark": string,
  "final_remark": string (2-3 sentences overall assessment),
  "overall_rating": integer 1-5
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.5,
    max_tokens: 1200,
  });

  const raw = response.choices[0]?.message?.content?.trim() ?? "{}";
  try {
    const parsed = JSON.parse(raw) as SuggestedRemarks;
    return {
      highlights_remark: parsed.highlights_remark ?? "",
      challenges_remark: parsed.challenges_remark ?? "",
      goals_remark: parsed.goals_remark ?? "",
      growth_remark: parsed.growth_remark ?? "",
      final_remark: parsed.final_remark ?? "",
      overall_rating: Math.min(5, Math.max(1, Number(parsed.overall_rating) || 3)),
    };
  } catch {
    throw new Error("AI failed to generate remarks. Try again.");
  }
}
