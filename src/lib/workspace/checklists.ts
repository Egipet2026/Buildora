import type { MilestoneStage } from "../types";

/**
 * Starter checklists by business type.
 *
 * These are the steps almost every business of that shape has to work
 * through — a starting point the owner then edits, not a definition of done.
 * Anything that depends on local law is written as "check", never as an
 * instruction, because the answer differs by country.
 */

export interface ChecklistStep {
  title: string;
  detail?: string;
  stage: MilestoneStage;
}

export interface ChecklistTemplate {
  slug: string;
  name: string;
  icon: string;
  blurb: string;
  steps: ChecklistStep[];
}

const COMMON_SETUP: ChecklistStep[] = [
  {
    title: "Check what registration and licences apply to you",
    detail: "Company form, permits, VAT thresholds — confirm with a local professional.",
    stage: "set_up",
  },
  {
    title: "Register the business and open a business bank account",
    stage: "set_up",
  },
  {
    title: "Set up bookkeeping and invoicing",
    detail: "Cheap and boring now beats reconstructing a year of receipts later.",
    stage: "set_up",
  },
];

export const CHECKLISTS: ChecklistTemplate[] = [
  {
    slug: "online-store",
    name: "Starting an online store",
    icon: "🛒",
    blurb: "Physical products sold through your own shop.",
    steps: [
      { title: "Choose the business model", detail: "Own stock, print on demand, or dropship — each changes your cash flow.", stage: "validate" },
      { title: "Choose the first products and check the margin", detail: "Landed cost, shipping, returns and payment fees, before you fall in love with a product.", stage: "validate" },
      { title: "Find and vet a supplier", detail: "Order samples yourself before you commit to anything.", stage: "validate" },
      ...COMMON_SETUP,
      { title: "Build the shop", detail: "One product page done properly beats a full catalogue done badly.", stage: "set_up" },
      { title: "Set up payments and check the fees", stage: "set_up" },
      { title: "Write the returns, shipping and privacy policies", detail: "Consumer law sets minimums — check what applies where you sell.", stage: "set_up" },
      { title: "Create the branding and product photography", stage: "set_up" },
      { title: "Test the whole checkout as a customer, including a refund", stage: "launch" },
      { title: "Launch to one channel and one audience", stage: "launch" },
      { title: "Get the first 10 orders and ask every buyer what nearly stopped them", stage: "launch" },
      { title: "Work out the cost of acquiring a customer against their value", stage: "grow" },
    ],
  },
  {
    slug: "saas",
    name: "Starting a SaaS",
    icon: "💻",
    blurb: "Software sold by subscription.",
    steps: [
      { title: "Interview 10 people with the problem — do not pitch", stage: "validate" },
      { title: "Write the one job the product does, in one sentence", stage: "validate" },
      { title: "Get three people to agree to pay before you build", detail: "A signed intent is worth a hundred encouraging conversations.", stage: "validate" },
      ...COMMON_SETUP,
      { title: "Build the smallest version that does the job end to end", stage: "set_up" },
      { title: "Decide pricing and how you will bill", stage: "set_up" },
      { title: "Check what data protection law applies to you", detail: "Where the data lives, what you must disclose, how long you keep it.", stage: "set_up" },
      { title: "Onboard the first paying customer by hand", stage: "launch" },
      { title: "Instrument activation and churn", detail: "You cannot fix retention you are not measuring.", stage: "launch" },
      { title: "Reach ten paying customers before adding a second feature area", stage: "grow" },
    ],
  },
  {
    slug: "services",
    name: "Starting a service business",
    icon: "🧑‍💼",
    blurb: "Selling your own or your team's expertise.",
    steps: [
      { title: "Name the specific outcome you sell, not the hours", stage: "validate" },
      { title: "Price one packaged offer rather than an hourly rate", stage: "validate" },
      { title: "Line up the first three prospects from people who already know you", stage: "validate" },
      ...COMMON_SETUP,
      { title: "Write a contract and a scope template", detail: "Have a lawyer review it once; reuse it forever.", stage: "set_up" },
      { title: "Decide payment terms and a deposit", detail: "Late payment kills more service businesses than lack of work.", stage: "set_up" },
      { title: "Deliver the first engagement and write down what took longest", stage: "launch" },
      { title: "Ask for a referral and a written review", stage: "launch" },
      { title: "Raise the price or productise the delivery", stage: "grow" },
    ],
  },
  {
    slug: "local",
    name: "Starting a local business",
    icon: "🏪",
    blurb: "Premises, staff and customers who walk in.",
    steps: [
      { title: "Count the actual foot traffic at the times you would trade", stage: "validate" },
      { title: "Work out the rent and staffing you can support at realistic volume", stage: "validate" },
      ...COMMON_SETUP,
      { title: "Check premises, health, safety and signage requirements", detail: "These are local and unforgiving. Confirm before you sign a lease.", stage: "set_up" },
      { title: "Negotiate the lease with a break clause", stage: "set_up" },
      { title: "Fit out, and set up the till and stock control", stage: "set_up" },
      { title: "Hire and train the first staff", detail: "Employment law, contracts and payroll — check what applies.", stage: "set_up" },
      { title: "Soft-open for a week before you advertise", stage: "launch" },
      { title: "Claim the local map listing and ask for reviews", stage: "launch" },
      { title: "Track takings per day and per hour, and staff to match", stage: "grow" },
    ],
  },
];

export const CHECKLIST_BY_SLUG: Record<string, ChecklistTemplate> =
  Object.fromEntries(CHECKLISTS.map((c) => [c.slug, c]));
