import { z } from "zod";
import { MARKETPLACES } from "./taxonomy";

const KINDS = MARKETPLACES.map((m) => m.kind) as [string, ...string[]];

/** Euro string from a form input → integer cents. Rejects negatives. */
const euros = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s,€]/g, ""))
  .refine((v) => v === "" || /^\d+(\.\d{1,2})?$/.test(v), {
    message: "Enter a valid amount",
  })
  .transform((v) => (v === "" ? 0 : Math.round(parseFloat(v) * 100)));

const optionalUrl = z
  .string()
  .trim()
  .refine((v) => v === "" || /^https?:\/\/\S+\.\S+/.test(v), {
    message: "Enter a full URL starting with http:// or https://",
  })
  .transform((v) => (v === "" ? null : v));

/** Newline- or comma-separated textarea → trimmed string array. */
const lines = z
  .string()
  .default("")
  .transform((v) =>
    v
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 40),
  );

export const listingSchema = z.object({
  kind: z.enum(KINDS),
  title: z.string().trim().min(6, "Give the listing a clear title").max(140),
  category: z.string().trim().min(1, "Choose a category"),
  summary: z
    .string()
    .trim()
    .min(20, "Write at least one full sentence")
    .max(220, "Keep the summary under 220 characters"),
  description: z
    .string()
    .trim()
    .min(80, "Buyers need real detail — at least 80 characters")
    .max(20_000),
  country: z.string().trim().min(1, "Choose a country"),
  price: euros,
  dealTypes: z
    .array(z.enum(["purchase", "license_exclusive", "license_non_exclusive"]))
    .min(1, "Choose at least one deal type"),

  // Financials — all optional, all in euros.
  annualRevenue: euros.optional(),
  monthlyRevenue: euros.optional(),
  annualExpenses: euros.optional(),
  annualProfit: euros.optional(),

  website: optionalUrl.optional(),
  socials: z.string().default(""),
  businessModel: z.string().trim().max(120).default(""),
  yearFounded: z
    .string()
    .default("")
    .refine(
      (v) => v === "" || (/^\d{4}$/.test(v) && +v >= 1800 && +v <= new Date().getFullYear()),
      { message: "Enter a valid year" },
    ),
  reasonForSelling: z.string().trim().max(2000).default(""),
  assetsIncluded: lines,
  isOnline: z.enum(["online", "offline", ""]).default(""),

  // Patents & technologies.
  patentNumber: z.string().trim().max(80).default(""),
  jurisdiction: z.string().trim().max(120).default(""),
  patentStatus: z.string().trim().max(80).default(""),
  rightsHolder: z.string().trim().max(160).default(""),
  filingDate: z.string().trim().max(40).default(""),
  technologyField: z.string().trim().max(160).default(""),
  licensePrice: euros.optional(),
  licensePeriod: z.string().trim().max(40).default(""),

  // Services & partners.
  skills: lines,
  experienceYears: z.string().default(""),
  rateUnit: z.string().trim().max(40).default(""),
  investmentRequired: euros.optional(),
  remote: z.enum(["remote", "onsite", ""]).default(""),

  /** The seller must confirm they hold the rights they are offering. */
  rightsConfirmed: z
    .literal("on", { errorMap: () => ({ message: "You must confirm you hold the rights to what you are listing" }) }),
});

export type ListingInput = z.infer<typeof listingSchema>;

export const offerSchema = z.object({
  listingId: z.string().min(1),
  amount: euros.refine((v) => v > 0, "Enter an offer amount"),
  dealType: z.enum(["purchase", "license_exclusive", "license_non_exclusive"]),
  message: z
    .string()
    .trim()
    .min(10, "Add a short message for the seller")
    .max(4000),
  parentOfferId: z.string().optional(),
});

export const messageSchema = z.object({
  conversationId: z.string().min(1),
  body: z.string().trim().min(1, "Write a message").max(6000),
});

export const startConversationSchema = z.object({
  listingId: z.string().min(1),
  body: z.string().trim().min(10, "Write a short message").max(6000),
});

export const businessProfileSchema = z.object({
  name: z.string().trim().min(2, "Enter your business name").max(120),
  description: z.string().trim().min(40, "Describe what your business does").max(4000),
  website: optionalUrl.optional(),
  industry: z.string().trim().min(2, "Enter an industry").max(120),
  country: z.string().trim().min(1, "Choose a country"),
  goals: z.string().trim().max(2000).default(""),
  products: lines,
  services: lines,
  team: lines,
  lookingFor: z.array(z.string()).default([]),
});

export const reportSchema = z.object({
  targetType: z.enum(["listing", "user", "message"]),
  targetId: z.string().min(1),
  reason: z.string().trim().min(3, "Choose a reason").max(120),
  details: z.string().trim().max(4000).default(""),
});

export const verificationSchema = z.object({
  kind: z.enum(["seller", "business", "patent"]),
  listingId: z.string().optional(),
  evidence: z
    .string()
    .trim()
    .min(20, "Describe what you can provide as evidence")
    .max(4000),
});

export const businessPlanSchema = z.object({
  idea: z
    .string()
    .trim()
    .min(15, "Describe your idea in a sentence or two")
    .max(2000),
  country: z.string().trim().max(80).default(""),
  budget: z.string().trim().max(80).default(""),
});

/** Flattens a ZodError into `{ field: message }` for inline form errors. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    out[key] ??= issue.message;
  }
  return out;
}
