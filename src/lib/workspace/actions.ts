"use server";

import { revalidatePath } from "next/cache";
import { isDemoMode } from "../supabase/config";
import { getServerSupabase } from "../supabase/server";
import { demoId, demoStore } from "../demo/store";
import {
  getBusinessProduct,
  getCurrentUser,
  getMilestones,
  getMyBusiness,
} from "../data";
import { fieldErrors, milestoneSchema, productSchema } from "../validation";
import { CHECKLIST_BY_SLUG } from "./checklists";
import type { ActionState } from "../action-state";
import type {
  BusinessMilestone,
  BusinessProduct,
  BusinessProfile,
  MilestoneStage,
} from "../types";

/**
 * The workspace is the owner-facing side of a business: the products it sells
 * and the plan it is working through.
 *
 * Every action here re-resolves the caller's own business rather than trusting
 * a business id from the form, so a member can only ever write to their own.
 */

function fail(message: string, errors?: Record<string, string>): ActionState {
  return { ok: false, message, errors };
}

/** The caller's business, or the reason they cannot write to one. */
async function ownBusiness() {
  const me = await getCurrentUser();
  if (!me) return { error: fail("You need to sign in to do that.") } as const;
  if (me.is_blocked)
    return { error: fail("Your account is suspended.") } as const;

  const business = await getMyBusiness(me.id);
  if (!business)
    return {
      error: fail("Create your business profile before adding to it."),
    } as const;

  return { me, business, error: null } as const;
}

function refresh(slug: string) {
  revalidatePath("/workspace");
  revalidatePath("/workspace/products");
  revalidatePath("/workspace/plan");
  revalidatePath(`/business-profiles/${slug}`);
}

/* ------------------------------------------------- create from a plan */

/**
 * Turns a generated plan into a real business profile.
 *
 * The plan is advisory, so this copies it into something the member owns and
 * can edit — the name, description and industry all arrive as ordinary form
 * fields they have already seen and can change before pressing the button.
 */
export async function createBusinessFromPlanAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await getCurrentUser();
  if (!me) return fail("You need to sign in to do that.");
  if (me.is_blocked) return fail("Your account is suspended.");

  const existing = await getMyBusiness(me.id);
  if (existing)
    return fail(
      `You already run ${existing.name}. Open your workspace to add to it.`,
    );

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const industry = String(formData.get("industry") ?? "").trim() || "Not set";
  const country = String(formData.get("country") ?? "").trim() || "Not set";

  if (name.length < 2)
    return fail("Give the business a name.", { name: "Enter a name" });
  if (description.length < 40)
    return fail("Describe the business in a little more detail.", {
      description: "At least 40 characters",
    });

  const slugBase = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);

  const business: BusinessProfile = {
    id: demoId("bp"),
    owner_id: me.id,
    name,
    slug: `${slugBase}-${Math.random().toString(36).slice(2, 6)}`,
    logo_url: null,
    description,
    website: null,
    industry,
    country,
    team: [{ name: me.full_name, role: "Founder" }],
    products: formData.getAll("product").map(String).filter(Boolean).slice(0, 20),
    services: [],
    goals: String(formData.get("goals") ?? "").trim(),
    looking_for: [],
    created_at: new Date().toISOString(),
  };

  if (isDemoMode) {
    demoStore().businessProfiles.unshift(business);
  } else {
    const supabase = await getServerSupabase();
    const { id: _id, ...insert } = business;
    const { error } = await supabase!.from("business_profiles").insert(insert);
    if (error) return fail(error.message);
  }

  // The plan's first steps come along as the starting build plan.
  const steps = formData.getAll("step").map(String).filter(Boolean).slice(0, 12);
  if (steps.length) {
    const rows: BusinessMilestone[] = steps.map((title, i) => ({
      id: demoId("ms"),
      business_id: business.id,
      title: title.slice(0, 180),
      detail: null,
      stage: i === 0 ? "validate" : i < 3 ? "set_up" : "launch",
      is_done: false,
      position: i,
      created_at: new Date().toISOString(),
      completed_at: null,
    }));

    if (isDemoMode) {
      demoStore().milestones.push(...rows);
    } else {
      const supabase = await getServerSupabase();
      await supabase!
        .from("business_milestones")
        .insert(rows.map(({ id: _id, ...rest }) => rest));
    }
  }

  revalidatePath("/workspace");
  revalidatePath("/business-profiles");
  return {
    ok: true,
    message: `${name} created. Add what you sell and start working through the plan.`,
    redirectTo: "/workspace",
  };
}

/**
 * Copies a starter checklist into the build plan.
 *
 * The steps are ordinary milestones afterwards — editable, deletable, and the
 * owner's own. Steps already in the plan are skipped rather than duplicated.
 */
export async function adoptChecklistAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const owned = await ownBusiness();
  if (owned.error) return owned.error;
  const { business } = owned;

  const template = CHECKLIST_BY_SLUG[String(formData.get("template") ?? "")];
  if (!template) return fail("Choose a checklist first.");

  const existing = await getMilestones(business.id);
  const known = new Set(existing.map((m) => m.title.toLowerCase()));
  const fresh = template.steps.filter((s) => !known.has(s.title.toLowerCase()));

  if (!fresh.length)
    return fail("Every step in that checklist is already in your plan.");

  const rows: BusinessMilestone[] = fresh.map((step, i) => ({
    id: demoId("ms"),
    business_id: business.id,
    title: step.title,
    detail: step.detail ?? null,
    stage: step.stage,
    is_done: false,
    position: existing.length + i,
    created_at: new Date().toISOString(),
    completed_at: null,
  }));

  if (isDemoMode) {
    demoStore().milestones.push(...rows);
  } else {
    const supabase = await getServerSupabase();
    const { error } = await supabase!
      .from("business_milestones")
      .insert(rows.map(({ id: _id, ...rest }) => rest));
    if (error) return fail(error.message);
  }

  refresh(business.slug);
  return {
    ok: true,
    message: `Added ${rows.length} steps from “${template.name}”.`,
  };
}

/* ---------------------------------------------------------------- products */

export async function saveProductAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const owned = await ownBusiness();
  if (owned.error) return owned.error;
  const { me, business } = owned;

  const parsed = productSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return fail("Please fix the highlighted fields.", fieldErrors(parsed.error));
  const v = parsed.data;

  // A product with stock explicitly set to zero is out of stock, whatever the
  // owner picked — the storefront should never promise what isn't there.
  const status =
    v.stock === 0 && v.status === "published" ? "out_of_stock" : v.status;

  const fields = {
    name: v.name,
    description: v.description,
    price_cents: v.price,
    currency: v.currency.toUpperCase(),
    unit: v.unit || null,
    sku: v.sku || null,
    stock: v.stock,
    status,
  };

  if (v.id) {
    const existing = await getBusinessProduct(v.id);
    if (!existing || existing.business_id !== business.id)
      return fail("That product does not belong to your business.");

    if (isDemoMode) {
      Object.assign(existing, fields);
    } else {
      const supabase = await getServerSupabase();
      const { error } = await supabase!
        .from("business_products")
        .update(fields)
        .eq("id", v.id);
      if (error) return fail(error.message);
    }

    refresh(business.slug);
    return { ok: true, message: "Product updated." };
  }

  const product: BusinessProduct = {
    id: demoId("pr"),
    business_id: business.id,
    owner_id: me.id,
    image_url: null,
    created_at: new Date().toISOString(),
    ...fields,
  };

  if (isDemoMode) {
    demoStore().businessProducts.unshift(product);
  } else {
    const supabase = await getServerSupabase();
    const { id: _id, ...insert } = product;
    const { error } = await supabase!.from("business_products").insert(insert);
    if (error) return fail(error.message);
  }

  refresh(business.slug);
  return {
    ok: true,
    message:
      status === "published"
        ? "Product published to your storefront."
        : "Saved as a draft — publish it when you are ready.",
  };
}

export async function setProductStatusAction(formData: FormData) {
  const owned = await ownBusiness();
  if (owned.error) return;
  const { business } = owned;

  const id = String(formData.get("id") ?? "");
  const next = String(formData.get("status") ?? "");
  if (!["draft", "published", "out_of_stock"].includes(next)) return;

  const existing = await getBusinessProduct(id);
  if (!existing || existing.business_id !== business.id) return;

  if (isDemoMode) {
    existing.status = next as BusinessProduct["status"];
  } else {
    const supabase = await getServerSupabase();
    await supabase!
      .from("business_products")
      .update({ status: next })
      .eq("id", id);
  }

  refresh(business.slug);
}

export async function deleteProductAction(formData: FormData) {
  const owned = await ownBusiness();
  if (owned.error) return;
  const { business } = owned;

  const id = String(formData.get("id") ?? "");
  const existing = await getBusinessProduct(id);
  if (!existing || existing.business_id !== business.id) return;

  if (isDemoMode) {
    const rows = demoStore().businessProducts;
    const index = rows.findIndex((p) => p.id === id);
    if (index >= 0) rows.splice(index, 1);
  } else {
    const supabase = await getServerSupabase();
    await supabase!.from("business_products").delete().eq("id", id);
  }

  refresh(business.slug);
}

/* -------------------------------------------------------------- milestones */

export async function addMilestoneAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const owned = await ownBusiness();
  if (owned.error) return owned.error;
  const { business } = owned;

  const parsed = milestoneSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return fail("Please fix the highlighted fields.", fieldErrors(parsed.error));

  const existing = await getMilestones(business.id);
  const milestone: BusinessMilestone = {
    id: demoId("ms"),
    business_id: business.id,
    title: parsed.data.title,
    detail: parsed.data.detail || null,
    stage: parsed.data.stage,
    is_done: false,
    position: existing.length,
    created_at: new Date().toISOString(),
    completed_at: null,
  };

  if (isDemoMode) {
    demoStore().milestones.push(milestone);
  } else {
    const supabase = await getServerSupabase();
    const { id: _id, ...insert } = milestone;
    const { error } = await supabase!.from("business_milestones").insert(insert);
    if (error) return fail(error.message);
  }

  refresh(business.slug);
  return { ok: true, message: "Step added." };
}

export async function toggleMilestoneAction(formData: FormData) {
  const owned = await ownBusiness();
  if (owned.error) return;
  const { business } = owned;

  const id = String(formData.get("id") ?? "");
  const all = await getMilestones(business.id);
  const milestone = all.find((m) => m.id === id);
  if (!milestone) return;

  const done = !milestone.is_done;
  const completedAt = done ? new Date().toISOString() : null;

  if (isDemoMode) {
    milestone.is_done = done;
    milestone.completed_at = completedAt;
  } else {
    const supabase = await getServerSupabase();
    await supabase!
      .from("business_milestones")
      .update({ is_done: done, completed_at: completedAt })
      .eq("id", id);
  }

  refresh(business.slug);
}

export async function deleteMilestoneAction(formData: FormData) {
  const owned = await ownBusiness();
  if (owned.error) return;
  const { business } = owned;

  const id = String(formData.get("id") ?? "");
  const all = await getMilestones(business.id);
  if (!all.some((m) => m.id === id)) return;

  if (isDemoMode) {
    const rows = demoStore().milestones;
    const index = rows.findIndex((m) => m.id === id);
    if (index >= 0) rows.splice(index, 1);
  } else {
    const supabase = await getServerSupabase();
    await supabase!.from("business_milestones").delete().eq("id", id);
  }

  refresh(business.slug);
}

/**
 * Turns the generated plan's first steps into real milestones.
 *
 * The plan itself stays advisory — this only copies the steps the member
 * chose to keep into a checklist they then own and edit.
 */
export async function adoptPlanStepsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const owned = await ownBusiness();
  if (owned.error) return owned.error;
  const { business } = owned;

  const steps = formData
    .getAll("step")
    .map((s) => String(s).trim())
    .filter(Boolean)
    .slice(0, 20);

  if (!steps.length) return fail("Pick at least one step to add.");

  const existing = await getMilestones(business.id);
  const known = new Set(existing.map((m) => m.title.toLowerCase()));
  const fresh = steps.filter((s) => !known.has(s.toLowerCase()));
  if (!fresh.length)
    return fail("Those steps are already in your plan.");

  // The generated steps run roughly in order, so the first few are validation
  // work and the rest is setting the business up.
  const stageFor = (index: number): MilestoneStage =>
    index === 0 ? "validate" : index < 3 ? "set_up" : "launch";

  const rows: BusinessMilestone[] = fresh.map((title, i) => ({
    id: demoId("ms"),
    business_id: business.id,
    title: title.slice(0, 180),
    detail: null,
    stage: stageFor(i),
    is_done: false,
    position: existing.length + i,
    created_at: new Date().toISOString(),
    completed_at: null,
  }));

  if (isDemoMode) {
    demoStore().milestones.push(...rows);
  } else {
    const supabase = await getServerSupabase();
    const insert = rows.map(({ id: _id, ...rest }) => rest);
    const { error } = await supabase!.from("business_milestones").insert(insert);
    if (error) return fail(error.message);
  }

  refresh(business.slug);
  return {
    ok: true,
    message: `Added ${rows.length} ${rows.length === 1 ? "step" : "steps"} to your build plan.`,
    redirectTo: "/workspace/plan",
  };
}
