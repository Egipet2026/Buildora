import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { MarketResearch, OfflineReason } from "../types";

/**
 * Indicative market research for /market-research.
 *
 * This is a model's structured summary of what it has read, not market data.
 * It has no access to any dataset, cannot see current figures, and may be out
 * of date or wrong. Every surface that shows it says so, and the prompt below
 * forbids inventing statistics precisely because a fabricated number is the
 * most damaging thing this feature could produce.
 */

const researchSchema = z.object({
  overview: z.string(),
  competitors: z.array(z.object({ name: z.string(), note: z.string() })),
  target_audience: z.array(z.string()),
  opportunities: z.array(z.string()),
  risks: z.array(z.string()),
  differentiation: z.array(z.string()),
});

const RESEARCH_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "overview",
    "competitors",
    "target_audience",
    "opportunities",
    "risks",
    "differentiation",
  ],
  properties: {
    overview: {
      type: "string",
      description:
        "How this market works: who buys, how they buy, what shapes prices. Qualitative only — no invented figures or market sizes.",
    },
    competitors: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "note"],
        properties: {
          name: {
            type: "string",
            description:
              "A type of competitor, or a genuinely well-known company. Never invent a company name.",
          },
          note: { type: "string" },
        },
      },
    },
    target_audience: { type: "array", items: { type: "string" } },
    opportunities: { type: "array", items: { type: "string" } },
    risks: { type: "array", items: { type: "string" } },
    differentiation: {
      type: "array",
      items: { type: "string" },
      description: "Concrete ways a new entrant could be different, not better adjectives.",
    },
  },
} as const;

const SYSTEM = `You summarise how a market works for a founder considering entering it, on Buildora, an international business marketplace.

You have no access to market data, databases or current figures. Never state market sizes, growth rates, market shares, revenue figures or any other statistic as fact — you cannot verify any of them. Describe structure, behaviour and dynamics instead: who buys, how they decide, what drives cost and price, where margin sits, what typically goes wrong.

Never invent a company. Name only companies you are confident genuinely exist and are well known in this market; otherwise describe the type of competitor.

Be specific to the industry, country and product given. Say plainly when something varies by country or when the founder needs to check it locally.

Do not give legal, tax, accounting or investment advice.`;

export interface ResearchInput {
  industry: string;
  country: string;
  customer: string;
  product: string;
}

export async function generateResearch(
  input: ResearchInput,
): Promise<MarketResearch> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return offlineResearch(input, "not_configured");

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL ?? "claude-opus-5",
      max_tokens: 8000,
      system: SYSTEM,
      output_config: {
        format: { type: "json_schema", schema: RESEARCH_JSON_SCHEMA },
        effort: "medium",
      },
      messages: [
        {
          role: "user",
          content: [
            `Industry: ${input.industry}`,
            `Country / market: ${input.country}`,
            `Target customer: ${input.customer}`,
            `Product or service: ${input.product}`,
          ].join("\n"),
        },
      ],
    });

    if (response.stop_reason === "refusal")
      return offlineResearch(input, "call_failed");

    const text = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");

    const parsed = researchSchema.safeParse(JSON.parse(text));
    if (!parsed.success) return offlineResearch(input, "call_failed");

    return {
      industry: input.industry,
      country: input.country,
      ...parsed.data,
      generated_offline: false,
    };
  } catch (error) {
    console.error("[research] model call failed, using template:", error);
    return offlineResearch(input, "call_failed");
  }
}

/**
 * The fallback deliberately contains no claims about the market.
 *
 * With no model available the honest output is a research method, not a
 * fabricated overview of an industry nobody has looked at.
 */
function offlineResearch(
  input: ResearchInput,
  reason: OfflineReason,
): MarketResearch {
  return {
    industry: input.industry,
    country: input.country,
    overview:
      "No model provider is configured, so Buildora cannot draft an overview of this market. What follows is the method rather than the answer: the questions worth answering yourself, in the order they matter.",
    competitors: [
      {
        name: "Direct competitors",
        note: "Search for what your customer would type. The first page is your real competition.",
      },
      {
        name: "Cheaper substitutes",
        note: "The worse option people tolerate today, including spreadsheets and doing nothing.",
      },
      {
        name: "Adjacent providers",
        note: "Companies already trusted by your customer who could add your offer tomorrow.",
      },
    ],
    target_audience: [
      "Write down the narrowest group who feel this problem most sharply",
      "Find where twenty of them already gather, online or in person",
      "Ask what they currently pay for and what they gave up on",
    ],
    opportunities: [
      "Segments the incumbents refuse to serve because they are too small",
      "Steps in the current process customers describe as painful",
      "Places where price and value are obviously mismatched",
    ],
    risks: [
      "The market is smaller than it looks from outside",
      "Customers are reachable only through channels you cannot afford",
      "A regulated element you have not checked applies to you",
      "The incumbent can copy you faster than you can grow",
    ],
    differentiation: [
      "Serve one segment completely rather than everyone partly",
      "Change what is being sold, not just the price",
      "Compete on the part of the experience competitors treat as an afterthought",
    ],
    generated_offline: true,
    offline_reason: reason,
  };
}
