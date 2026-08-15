import type { ListingKind } from "./types";

/** A top-level marketplace as shown in navigation and on the home page. */
export interface MarketplaceDef {
  kind: ListingKind;
  slug: string;
  name: string;
  icon: string;
  tagline: string;
  /** Categories offered when creating a listing of this kind. */
  categories: { slug: string; name: string }[];
}

const cat = (name: string) => ({
  slug: name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, ""),
  name,
});

export const MARKETPLACES: MarketplaceDef[] = [
  {
    kind: "business",
    slug: "businesses",
    name: "Businesses",
    icon: "🏢",
    tagline: "Acquire a company that already has customers and revenue.",
    categories: [
      "SaaS",
      "E-commerce",
      "Mobile Apps",
      "Websites",
      "Agencies",
      "Local Businesses",
      "Startups",
      "Content Businesses",
      "Technology Businesses",
      "Other",
    ].map(cat),
  },
  {
    kind: "patent",
    slug: "patents",
    name: "Patents & Technologies",
    icon: "📜",
    tagline: "Buy rights to or license protected intellectual property.",
    categories: [
      "Green Technology",
      "Energy",
      "Electronics",
      "AI",
      "Software",
      "Robotics",
      "Manufacturing",
      "Automotive",
      "Medical Technology",
      "Agriculture",
      "Water Technology",
      "Other",
    ].map(cat),
  },
  {
    kind: "digital_asset",
    slug: "digital-assets",
    name: "SaaS, Apps & Digital Assets",
    icon: "💻",
    tagline: "Websites, domains, apps, source code and APIs.",
    categories: [
      "Websites",
      "Domains",
      "SaaS",
      "Mobile Apps",
      "Software",
      "APIs",
      "Templates",
      "Digital Products",
      "AI Tools",
      "Source Code Projects",
    ].map(cat),
  },
  {
    kind: "service",
    slug: "services",
    name: "Experts & Services",
    icon: "👨‍💻",
    tagline: "Hire the specialists your business needs to move.",
    categories: [
      "Developers",
      "Designers",
      "Marketing",
      "SEO",
      "Accountants",
      "Lawyers",
      "Business Consultants",
      "Copywriters",
      "Video Editors",
      "AI Specialists",
      "Sales Specialists",
    ].map(cat),
  },
  {
    kind: "partner",
    slug: "partners",
    name: "Business Partners",
    icon: "🤝",
    tagline: "Find a co-founder or partner to build with.",
    categories: [
      "Co-founder",
      "Operating Partner",
      "Distribution Partner",
      "Technical Partner",
      "Franchise Partner",
      "Other",
    ].map(cat),
  },
  {
    kind: "idea",
    slug: "ideas",
    name: "Business Ideas",
    icon: "💡",
    tagline: "Validated concepts and playbooks ready to execute.",
    categories: [
      "SaaS",
      "Marketplace",
      "Local Services",
      "E-commerce",
      "Content",
      "Hardware",
      "Other",
    ].map(cat),
  },
  {
    kind: "product",
    slug: "products",
    name: "Products & Suppliers",
    icon: "📦",
    tagline: "Source products, manufacturing and wholesale supply.",
    categories: [
      "Manufacturers",
      "Wholesale",
      "Private Label",
      "Dropshipping",
      "Packaging",
      "Logistics",
      "Other",
    ].map(cat),
  },
  {
    kind: "ai_tool",
    slug: "ai-tools",
    name: "AI Tools",
    icon: "🤖",
    tagline: "Models, agents and automation you can plug in today.",
    categories: [
      "Agents",
      "Automation",
      "Content Generation",
      "Data & Analytics",
      "Customer Support",
      "Developer Tools",
      "Other",
    ].map(cat),
  },
  {
    kind: "marketing",
    slug: "marketing",
    name: "Marketing",
    icon: "📣",
    tagline: "Growth channels, media buying and campaign partners.",
    categories: [
      "Paid Ads",
      "Content & SEO",
      "Social Media",
      "Email",
      "Influencers",
      "PR",
      "Other",
    ].map(cat),
  },
];

export const MARKETPLACE_BY_KIND: Record<ListingKind, MarketplaceDef> =
  Object.fromEntries(MARKETPLACES.map((m) => [m.kind, m])) as Record<
    ListingKind,
    MarketplaceDef
  >;

export const MARKETPLACE_BY_SLUG: Record<string, MarketplaceDef> =
  Object.fromEntries(MARKETPLACES.map((m) => [m.slug, m]));

export function categoryName(kind: ListingKind, slug: string): string {
  const found = MARKETPLACE_BY_KIND[kind]?.categories.find(
    (c) => c.slug === slug,
  );
  return found?.name ?? slug;
}

/**
 * Investment opportunities are intentionally *not* a live marketplace.
 * Offering or brokering investments is a regulated activity in most
 * jurisdictions, so the surface stays informational until the platform is
 * licensed to operate it. See `/legal/marketplace-rules`.
 */
export const REGULATED_SURFACES = [
  {
    slug: "investment-opportunities",
    name: "Investment Opportunities",
    icon: "💰",
    note: "Planned. Enabled only once the platform meets the applicable financial-promotion and securities requirements in each market it serves.",
  },
];

/** Countries used across filters and listing forms. */
export const COUNTRIES = [
  "Bulgaria",
  "Germany",
  "Spain",
  "France",
  "Italy",
  "Netherlands",
  "Poland",
  "Portugal",
  "Romania",
  "Sweden",
  "Switzerland",
  "United Kingdom",
  "United States",
  "Canada",
  "United Arab Emirates",
  "Singapore",
  "Australia",
  "Remote / Global",
];
