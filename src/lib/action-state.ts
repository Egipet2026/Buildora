import type { BusinessPlan, ListingDraft, MarketResearch } from "./types";

/**
 * Shared result shape for every server action, plus its initial value.
 *
 * These live outside `actions.ts` because a `"use server"` module may only
 * export async functions — a constant or an interface there is a build error.
 */
export interface ActionState {
  ok: boolean;
  message?: string;
  /** Field-level validation errors, keyed by input name. */
  errors?: Record<string, string>;
  /** Populated on success so the client can navigate. */
  redirectTo?: string;
}

export type PlanState = ActionState & { plan?: BusinessPlan };
export type ResearchState = ActionState & { research?: MarketResearch };
export type ListingDraftState = ActionState & { draft?: ListingDraft };

export const IDLE: ActionState = { ok: false };
