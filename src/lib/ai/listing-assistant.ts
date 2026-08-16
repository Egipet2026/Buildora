import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { ListingDraft, ListingKind } from "../types";
import { MARKETPLACE_BY_KIND } from "../taxonomy";

/**
 * Drafting help for sellers writing a listing.
 *
 * It rewrites what the seller has already told us — it never adds a fact.
 * That constraint is the whole design: a model that invents revenue figures,
 * customer counts or guarantees on a marketplace listing would be producing
 * false statements about a real business under a real person's name.
 */

const draftSchema = z.object({
  title: z.string(),
  summary: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
  faq: z.array(z.object({ question: z.string(), answer: z.string() })),
});

const DRAFT_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "summary", "description", "tags", "faq"],
  properties: {
    title: {
      type: "string",
      description: "Under 90 characters. Concrete and specific, no superlatives.",
    },
    summary: {
      type: "string",
      description: "One or two sentences, under 200 characters.",
    },
    description: {
      type: "string",
      description:
        "Several short paragraphs of plain text: what it is, what is included, who it suits, why it is being sold. No markdown headings.",
    },
    tags: {
      type: "array",
      items: { type: "string" },
      description: "5–8 lowercase keywords a buyer would actually search for.",
    },
    faq: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["question", "answer"],
        properties: {
          question: { type: "string" },
          answer: {
            type: "string",
            description:
              "Answer only from what the seller supplied. Where the answer is not known, say the buyer should ask the seller.",
          },
        },
      },
      description: "3–5 questions a serious buyer would ask.",
    },
  },
} as const;

const SYSTEM = `You help a seller write a clear listing on Bizora, an international business marketplace.

Work only from what the seller has written. You must not invent, estimate or imply any fact they did not give you — no revenue, profit, customer numbers, growth rates, dates, locations, technologies or credentials. If an obvious detail is missing, put it in the FAQ as something the buyer should ask, rather than filling it in yourself.

Never write marketing superlatives, urgency, or any promise about future performance. Never describe anything as guaranteed, risk-free, verified, certified or patented unless the seller stated it. Buyers make financial decisions on this text and the seller is legally responsible for it.

Write plainly, in the seller's own register. Short sentences. No exclamation marks.`;

export interface DraftInput {
  kind: ListingKind;
  notes: string;
  title?: string;
}

export async function draftListing(
  input: DraftInput,
): Promise<ListingDraft | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  // No key means no draft. A local template here would either be empty or
  // would invent the very details the prompt above forbids.
  if (!apiKey) return null;

  try {
    const client = new Anthropic({ apiKey });
    const marketplace = MARKETPLACE_BY_KIND[input.kind];

    const response = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL ?? "claude-opus-5",
      max_tokens: 8000,
      system: SYSTEM,
      output_config: {
        format: { type: "json_schema", schema: DRAFT_JSON_SCHEMA },
        effort: "low",
      },
      messages: [
        {
          role: "user",
          content: [
            `Marketplace: ${marketplace?.name ?? input.kind}`,
            input.title ? `Working title: ${input.title}` : null,
            "",
            "What the seller wrote:",
            input.notes,
          ]
            .filter((line) => line !== null)
            .join("\n"),
        },
      ],
    });

    if (response.stop_reason === "refusal") return null;

    const text = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");

    const parsed = draftSchema.safeParse(JSON.parse(text));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
