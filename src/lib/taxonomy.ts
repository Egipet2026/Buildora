import type { ListingKind } from "./types";

/** A top-level marketplace as shown in navigation and on the home page. */
export interface MarketplaceDef {
  kind: ListingKind;
  slug: string;
  name: string;
  icon: string; // SVG icon now
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

// SVG Icons - Professional and modern
const ICONS = {
  business: `<svg class="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
  </svg>`,
  patent: `<svg class="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/>
  </svg>`,
  digital_asset: `<svg class="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="2" y1="20" x2="22" y2="20"/><line x1="6" y1="17" x2="6" y2="20"/><line x1="18" y1="17" x2="18" y2="20"/>
  </svg>`,
  service: `<svg class="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>`,
  partner: `<svg class="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>`,
  idea: `<svg class="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>`,
  product: `<svg class="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
    <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>`,
  ai_tool: `<svg class="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
    <circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/><path d="M12 9v6M15 9v6M9 9v6"/><circle cx="12" cy="12" r="9" fill="none"/>
  </svg>`,
  marketing: `<svg class="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
    <path d="M9 11l3 3L22 4"/><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
  </svg>`,
  investment: `<svg class="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
    <path d="M12 2v20M2 12h20"/><path d="M7 7h10v10H7z"/><circle cx="12" cy="12" r="3"/>
  </svg>`,
};

export const MARKETPLACES: MarketplaceDef[] = [
  {
    kind: "business",
    slug: "businesses",
    name: "Businesses",
    icon: ICONS.business,
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
    icon: ICONS.patent,
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
    icon: ICONS.digital_asset,
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
    icon: ICONS.service,
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
    icon: ICONS.partner,
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
    icon: ICONS.idea,
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
    icon: ICONS.product,
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
    icon: ICONS.ai_tool,
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
    icon: ICONS.marketing,
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
    icon: ICONS.investment,
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
