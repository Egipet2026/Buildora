import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { BusinessPlan } from "../types";

/**
 * Business-plan generator for /start-a-business.
 *
 * Every plan this produces is indicative only. It is a structured starting
 * point for the founder's own research — not a financial projection, not
 * investment advice, and not a promise that the numbers are achievable. The
 * UI labels it as such wherever a plan is displayed.
 */

const planSchema = z.object({
  idea: z.string(),
  target_customers: z.array(z.string()),
  business_model: z.string(),
  required_resources: z.array(z.string()),
  possible_costs: z.array(
    z.object({ label: z.string(), estimate: z.string() }),
  ),
  required_roles: z.array(z.string()),
  marketing_ideas: z.array(z.string()),
  revenue_model: z.string(),
  first_steps: z.array(z.string()),
});

/**
 * The same shape as `planSchema`, expressed as JSON Schema for the API's
 * structured-output constraint. Written by hand rather than derived: the
 * SDK's `zodOutputFormat` helper targets Zod v4 and this project is on v3.
 * Structured outputs require `additionalProperties: false` on every object.
 */
const PLAN_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "idea",
    "target_customers",
    "business_model",
    "required_resources",
    "possible_costs",
    "required_roles",
    "marketing_ideas",
    "revenue_model",
    "first_steps",
  ],
  properties: {
    idea: {
      type: "string",
      description: "The idea restated in one clear sentence.",
    },
    target_customers: {
      type: "array",
      items: { type: "string" },
      description: "3–5 specific customer segments, narrowest first.",
    },
    business_model: { type: "string" },
    required_resources: { type: "array", items: { type: "string" } },
    possible_costs: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "estimate"],
        properties: {
          label: { type: "string" },
          estimate: {
            type: "string",
            description:
              "A rough range in euros with its basis, e.g. '€800–2,000 / month, depends on city'.",
          },
        },
      },
    },
    required_roles: { type: "array", items: { type: "string" } },
    marketing_ideas: { type: "array", items: { type: "string" } },
    revenue_model: { type: "string" },
    first_steps: {
      type: "array",
      items: { type: "string" },
      description: "5–7 concrete actions, in the order to do them.",
    },
  },
} as const;

const SYSTEM = `You help founders turn a rough idea into a first structured business plan on BizHub, an international business marketplace.

Write for someone who has never started a business before. Be concrete and specific to their idea — never generic filler.

Cost estimates are rough orders of magnitude for planning only. Express them as ranges in euros with the basis stated (for example "€800–2,000 / month, depends on city"). Never present a figure as a forecast, a guarantee, or an expected return.

Do not give legal, tax, accounting or investment advice. Where a step depends on local law — company registration, licences, permits, employment, VAT — say that a qualified local professional should confirm it.`;

interface PlanInput {
  idea: string;
  country?: string;
  budget?: string;
}

export async function generatePlan(input: PlanInput): Promise<BusinessPlan> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return offlinePlan(input);

  try {
    const client = new Anthropic({ apiKey });
    const context = [
      `Idea: ${input.idea}`,
      input.country ? `Country / market: ${input.country}` : null,
      input.budget ? `Starting budget: ${input.budget}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const response = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL ?? "claude-opus-5",
      max_tokens: 16000,
      system: SYSTEM,
      output_config: {
        format: { type: "json_schema", schema: PLAN_JSON_SCHEMA },
        effort: "medium",
      },
      messages: [
        {
          role: "user",
          content: `Draft an indicative first business plan for this idea.\n\n${context}`,
        },
      ],
    });

    // Safety classifiers can decline a request: that returns HTTP 200 with
    // stop_reason "refusal" and no usable content, so check before reading it.
    if (response.stop_reason === "refusal") return offlinePlan(input);

    const text = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");

    const parsed = planSchema.safeParse(JSON.parse(text));
    if (!parsed.success) return offlinePlan(input);

    return { ...parsed.data, generated_offline: false };
  } catch {
    // A planner outage must never block the page — fall back to the template.
    return offlinePlan(input);
  }
}

/**
 * Deterministic fallback used when no API key is configured or the call fails.
 * It reflects the user's own words back in a structured shape rather than
 * inventing detail it cannot know.
 */
function offlinePlan(input: PlanInput): BusinessPlan {
  const idea = input.idea.trim().replace(/\s+/g, " ");
  const market = input.country?.trim() || "your target market";

  return {
    idea,
    target_customers: [
      "The narrowest group who feel this problem most sharply today",
      "People already paying for a worse alternative",
      `Early adopters reachable in ${market} without a large budget`,
    ],
    business_model:
      "Decide early between one-off sales, subscription, commission on transactions, or service fees. Charge for the outcome your customer cares about, and pick the model that lets you get paid before you scale.",
    required_resources: [
      "A registered legal entity and a business bank account",
      "A simple website or landing page that explains the offer",
      "One reliable channel to reach the first 100 customers",
      "Basic accounting and invoicing",
      "Enough runway to survive the first six months without revenue",
    ],
    possible_costs: [
      { label: "Company registration and initial legal", estimate: "€200–1,500 one-off, varies by country" },
      { label: "Website, domain and core tooling", estimate: "€30–300 / month" },
      { label: "Accounting", estimate: "€60–250 / month" },
      { label: "Initial marketing and testing", estimate: "€300–2,000 / month" },
      { label: "Contingency", estimate: "20–30% on top of the above" },
    ],
    required_roles: [
      "Founder — sales and customer conversations",
      "Someone who can build or operate the product",
      "Accountant or bookkeeper (usually external)",
      "Legal adviser for contracts and terms (usually external)",
    ],
    marketing_ideas: [
      "Talk to 20 potential customers before building anything",
      "Publish what you learn where those customers already read",
      "Partner with a business that already serves them",
      "Test one paid channel with a small, fixed budget",
      "Ask every early customer for a referral",
    ],
    revenue_model:
      "Work backwards from a target monthly figure: how many customers at what price gets you there, and how many conversations produce one customer? If the arithmetic only works at an implausible volume, change the price or the model.",
    first_steps: [
      "Write the problem in one sentence and name exactly who has it",
      "Interview 10 people in that group — do not pitch, only listen",
      "Define the smallest version you could sell within 30 days",
      "Confirm registration, licensing and tax obligations with a local professional",
      "Get one paying customer before building anything more",
    ],
    generated_offline: true,
  };
}
