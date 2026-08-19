import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { BusinessPlan, OfflineReason } from "../types";

/**
 * Business-plan generator for /start-a-business.
 *
 * Every plan this produces is indicative only. It is a structured starting
 * point for the founder's own research — not a financial projection, not
 * investment advice, and not a promise that the numbers are achievable. The
 * UI labels it as such wherever a plan is displayed.
 */

const planSchema = z.object({
  business_name: z.string(),
  business_description: z.string(),
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
  products_services: z.array(z.string()),
  required_skills: z.array(z.string()),
  first_steps: z.array(z.string()),
  possible_competitors: z.array(z.string()),
  possible_risks: z.array(z.string()),
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
    "business_name",
    "business_description",
    "idea",
    "target_customers",
    "business_model",
    "required_resources",
    "possible_costs",
    "required_roles",
    "marketing_ideas",
    "revenue_model",
    "products_services",
    "required_skills",
    "first_steps",
    "possible_competitors",
    "possible_risks",
  ],
  properties: {
    business_name: {
      type: "string",
      description:
        "A short, plausible trading name. Avoid names likely to belong to a real company already.",
    },
    business_description: {
      type: "string",
      description:
        "Two or three sentences describing the business, suitable for a public profile.",
    },
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
    products_services: {
      type: "array",
      items: { type: "string" },
      description: "3–6 specific things this business would actually sell.",
    },
    required_skills: {
      type: "array",
      items: { type: "string" },
      description: "Skills the founder needs or must hire in.",
    },
    first_steps: {
      type: "array",
      items: { type: "string" },
      description: "5–7 concrete actions, in the order to do them.",
    },
    possible_competitors: {
      type: "array",
      items: { type: "string" },
      description:
        "Types of competitor and, where genuinely well known, named ones. Never invent a company.",
    },
    possible_risks: {
      type: "array",
      items: { type: "string" },
      description:
        "4–6 specific ways this business could fail, with what would signal each one early.",
    },
  },
} as const;

const SYSTEM = `You help founders turn a rough idea into a first structured business plan on Buildora, an international business marketplace.

Write for someone who has never started a business before.

Every field must be about THIS business. A reader must be able to tell, from
any single section, which idea it was written for. Concretely:

- Name the thing being sold, the people buying it and the place it happens.
  "Office workers in Sofia who buy breakfast on the way in" — not "early
  adopters" or "your target market".
- Cost lines must be the actual cost lines of this business. A bakery has
  flour, an oven, a lease and a night shift; a software product does not.
  Never fall back to a generic list of company registration, website and
  accounting unless those genuinely are the largest costs here.
- Competitors must be the kinds of business this one would actually lose a
  customer to in the stated country. Name real ones only where they are
  genuinely well known there; never invent a company.
- First steps must be things this founder could do this week, in order.
- Risks must be ways THIS business fails, each with the early signal that it
  is happening.

If a sentence would read the same for a bakery and a software company, it is
wrong — rewrite it until it could only be about this one.

Where the founder's description is too thin to be specific, say what you would
need to know rather than padding with generalities.

Cost estimates are rough orders of magnitude for planning only. Express them as ranges in euros with the basis stated (for example "€800–2,000 / month, depends on city"). Never present a figure as a forecast, a guarantee, or an expected return.

Do not give legal, tax, accounting or investment advice. Where a step depends on local law — company registration, licences, permits, employment, VAT — say that a qualified local professional should confirm it.`;

interface PlanInput {
  idea: string;
  country?: string;
  budget?: string;
}

export async function generatePlan(input: PlanInput): Promise<BusinessPlan> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return offlinePlan(input, "not_configured");

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
    if (response.stop_reason === "refusal")
      return offlinePlan(input, "call_failed");

    const text = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");

    const parsed = planSchema.safeParse(JSON.parse(text));
    if (!parsed.success) return offlinePlan(input, "call_failed");

    return { ...parsed.data, generated_offline: false };
  } catch (error) {
    // A planner outage must never block the page — fall back to the template.
    // The reason is logged because the page cannot show it: the message would
    // be written by the provider and may name the account or the key.
    console.error("[plan] model call failed, using template:", error);
    return offlinePlan(input, "call_failed");
  }
}

/**
 * Deterministic fallback used when no API key is configured or the call fails.
 * It reflects the user's own words back in a structured shape rather than
 * inventing detail it cannot know.
 */
function offlinePlan(
  input: PlanInput,
  reason: OfflineReason,
): BusinessPlan {
  const idea = input.idea.trim().replace(/\s+/g, " ");
  const market = input.country?.trim() || "your target market";

  return {
    business_name: "",
    business_description: idea,
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
    products_services: [
      "The smallest paid offer you could deliver within 30 days",
      "A higher-priced version for customers who need more",
      "A recurring element, if the problem recurs",
    ],
    required_skills: [
      "Talking to customers and closing the first sales",
      "Building or sourcing whatever you are selling",
      "Basic bookkeeping and knowing when to call an accountant",
    ],
    possible_competitors: [
      "Established companies already serving this market",
      "Cheaper, worse alternatives your customers tolerate today",
      "Doing nothing — often the hardest competitor to beat",
    ],
    possible_risks: [
      "Nobody will pay: watch for warm words and no orders",
      "You cannot reach customers affordably: watch acquisition cost against price",
      "One customer becomes most of your revenue",
      "Regulation you have not checked applies to you",
      "You run out of money before the model works",
    ],
    first_steps: [
      "Write the problem in one sentence and name exactly who has it",
      "Interview 10 people in that group — do not pitch, only listen",
      "Define the smallest version you could sell within 30 days",
      "Confirm registration, licensing and tax obligations with a local professional",
      "Get one paying customer before building anything more",
    ],
    generated_offline: true,
    offline_reason: reason,
  };
}
