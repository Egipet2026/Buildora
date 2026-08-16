import type {
  BusinessProfile,
  Conversation,
  Favorite,
  Listing,
  Message,
  Notification,
  Offer,
  PlatformSettings,
  Profile,
  Report,
  Transaction,
  VerificationRequest,
} from "../types";
import { DEFAULT_SETTINGS } from "../money";
import type {
  DemoAccount,
  DemoSession,
  OtpChallenge,
} from "../auth/types";
import {
  DEMO_BUSINESS_PROFILES,
  DEMO_CONVERSATIONS,
  DEMO_FAVORITES,
  DEMO_LISTINGS,
  DEMO_MESSAGES,
  DEMO_NOTIFICATIONS,
  DEMO_OFFERS,
  DEMO_PROFILES,
  DEMO_REPORTS,
  DEMO_TRANSACTIONS,
  DEMO_VERIFICATIONS,
} from "./seed";

/**
 * Mutable in-memory copy of the seed data.
 *
 * Demo-mode writes land here so the whole product — offers, messaging,
 * moderation, favourites — behaves like the real thing within a server
 * process. It is deliberately not persisted: a restart returns the dataset to
 * its pristine state, which is what you want from a demo.
 *
 * The store hangs off `globalThis` so Next.js dev-server module reloads don't
 * silently reset it mid-session.
 */
export interface DemoStore {
  profiles: Profile[];
  listings: Listing[];
  offers: Offer[];
  conversations: Conversation[];
  messages: Message[];
  favorites: Favorite[];
  notifications: Notification[];
  transactions: Transaction[];
  reports: Report[];
  verifications: VerificationRequest[];
  businessProfiles: BusinessProfile[];
  settings: PlatformSettings;

  // --- credentials, only used when Supabase is not configured -------------
  accounts: DemoAccount[];
  challenges: OtpChallenge[];
  sessions: DemoSession[];
}

const GLOBAL_KEY = Symbol.for("bizhub.demo.store");

function build(): DemoStore {
  // Structured clone keeps the frozen seed arrays pristine.
  return {
    profiles: structuredClone(DEMO_PROFILES),
    listings: structuredClone(DEMO_LISTINGS),
    offers: structuredClone(DEMO_OFFERS),
    conversations: structuredClone(DEMO_CONVERSATIONS),
    messages: structuredClone(DEMO_MESSAGES),
    favorites: structuredClone(DEMO_FAVORITES),
    notifications: structuredClone(DEMO_NOTIFICATIONS),
    transactions: structuredClone(DEMO_TRANSACTIONS),
    reports: structuredClone(DEMO_REPORTS),
    verifications: structuredClone(DEMO_VERIFICATIONS),
    businessProfiles: structuredClone(DEMO_BUSINESS_PROFILES),
    settings: { ...DEFAULT_SETTINGS },
    accounts: [],
    challenges: [],
    sessions: [],
  };
}

export function demoStore(): DemoStore {
  const g = globalThis as unknown as Record<symbol, DemoStore | undefined>;
  g[GLOBAL_KEY] ??= build();
  return g[GLOBAL_KEY]!;
}

let counter = 0;
/** Monotonic id generator for demo-mode inserts. */
export function demoId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}${counter.toString(36)}`;
}
