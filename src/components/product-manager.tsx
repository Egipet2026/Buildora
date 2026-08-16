"use client";

import { useActionState, useEffect, useState } from "react";
import { Dialog, FormMessage, SubmitButton } from "./dialog";
import { Field } from "./ui";
import {
  deleteProductAction,
  saveProductAction,
  setProductStatusAction,
} from "@/lib/workspace/actions";
import { IDLE } from "@/lib/action-state";
import { formatMoney } from "@/lib/money";
import type { BusinessProduct, ProductStatus } from "@/lib/types";

const STATUS_LABEL: Record<ProductStatus, string> = {
  draft: "Draft",
  published: "Live",
  out_of_stock: "Out of stock",
};

const STATUS_CLASS: Record<ProductStatus, string> = {
  draft: "badge",
  published: "badge badge-verified",
  out_of_stock: "badge badge-gold",
};

/**
 * The owner's product list.
 *
 * Editing and creating share one dialog: the difference is whether a product
 * id travels with the form, which is also what the server uses to decide
 * between an insert and an update on a product it re-checks you own.
 */
export function ProductManager({ products }: { products: BusinessProduct[] }) {
  const [editing, setEditing] = useState<BusinessProduct | null>(null);
  const [creating, setCreating] = useState(false);
  const open = creating || editing !== null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[0.875rem] text-[var(--color-ink-2)]">
          {products.length
            ? `${products.length} ${products.length === 1 ? "item" : "items"} — only published ones appear on your public page.`
            : "Nothing here yet. Add what your business actually sells."}
        </p>
        <button
          type="button"
          className="btn btn-brand"
          onClick={() => setCreating(true)}
        >
          Add a product or service
        </button>
      </div>

      {products.length ? (
        <div className="card divide-y divide-[var(--color-line)] overflow-hidden">
          {products.map((product) => (
            <div
              key={product.id}
              className="flex flex-wrap items-start justify-between gap-4 p-5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <p className="font-semibold">{product.name}</p>
                  <span className={STATUS_CLASS[product.status]}>
                    {STATUS_LABEL[product.status]}
                  </span>
                </div>
                <p className="mt-1.5 line-clamp-2 text-[0.8125rem] leading-relaxed text-[var(--color-ink-3)]">
                  {product.description}
                </p>
                <p className="mt-2.5 text-[0.8125rem] text-[var(--color-ink-2)]">
                  <span className="font-semibold text-[var(--color-ink)]">
                    {product.price_cents === null
                      ? "Price on request"
                      : formatMoney(product.price_cents, product.currency)}
                  </span>
                  {product.unit ? ` ${product.unit}` : ""}
                  {product.stock !== null ? ` · ${product.stock} in stock` : " · made to order"}
                  {product.sku ? ` · ${product.sku}` : ""}
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setEditing(product)}
                >
                  Edit
                </button>

                <form action={setProductStatusAction}>
                  <input type="hidden" name="id" value={product.id} />
                  <input
                    type="hidden"
                    name="status"
                    value={product.status === "published" ? "draft" : "published"}
                  />
                  <button type="submit" className="btn btn-ghost btn-sm">
                    {product.status === "published" ? "Unpublish" : "Publish"}
                  </button>
                </form>

                <form
                  action={deleteProductAction}
                  onSubmit={(e) => {
                    if (!confirm(`Delete “${product.name}”? This cannot be undone.`))
                      e.preventDefault();
                  }}
                >
                  <input type="hidden" name="id" value={product.id} />
                  <button
                    type="submit"
                    className="btn btn-ghost btn-sm text-[var(--color-danger)]"
                  >
                    Delete
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <ProductDialog
        key={editing?.id ?? "new"}
        open={open}
        product={editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
      />
    </div>
  );
}

function ProductDialog({
  open,
  product,
  onClose,
}: {
  open: boolean;
  product: BusinessProduct | null;
  onClose: () => void;
}) {
  const [state, action, pending] = useActionState(saveProductAction, IDLE);

  useEffect(() => {
    if (state.ok) onClose();
    // `onClose` is stable enough here — re-running on a fresh success is the
    // only behaviour that matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const priceValue =
    product?.price_cents != null ? (product.price_cents / 100).toFixed(2) : "";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={product ? "Edit product" : "Add a product or service"}
      description="This is what buyers see on your storefront. Keep the price and stock honest — it is your shop window."
    >
      <form action={action} className="space-y-4">
        {product ? <input type="hidden" name="id" value={product.id} /> : null}

        <Field label="Name" htmlFor="p-name" error={state.errors?.name} required>
          <input
            id="p-name"
            name="name"
            className="input"
            defaultValue={product?.name ?? ""}
            placeholder="Dispatch Board — Team plan"
            required
          />
        </Field>

        <Field
          label="What the buyer gets"
          htmlFor="p-description"
          error={state.errors?.description}
          required
        >
          <textarea
            id="p-description"
            name="description"
            className="textarea min-h-28"
            defaultValue={product?.description ?? ""}
            placeholder="Describe what is included, who it suits and how it is delivered."
            required
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Price"
            htmlFor="p-price"
            error={state.errors?.price}
            hint="Leave blank for price on request."
          >
            <input
              id="p-price"
              name="price"
              className="input"
              inputMode="decimal"
              defaultValue={priceValue}
              placeholder="249.00"
            />
          </Field>

          <Field label="Currency" htmlFor="p-currency">
            <select
              id="p-currency"
              name="currency"
              className="select"
              defaultValue={product?.currency ?? "EUR"}
            >
              {["EUR", "USD", "GBP", "BGN"].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Unit"
            htmlFor="p-unit"
            hint="e.g. per month, each, per project."
          >
            <input
              id="p-unit"
              name="unit"
              className="input"
              defaultValue={product?.unit ?? ""}
              placeholder="per month"
            />
          </Field>

          <Field
            label="Stock"
            htmlFor="p-stock"
            error={state.errors?.stock}
            hint="Blank means made to order."
          >
            <input
              id="p-stock"
              name="stock"
              className="input"
              inputMode="numeric"
              defaultValue={product?.stock ?? ""}
              placeholder="34"
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="SKU or reference" htmlFor="p-sku">
            <input
              id="p-sku"
              name="sku"
              className="input"
              defaultValue={product?.sku ?? ""}
              placeholder="ORB-DB-25"
            />
          </Field>

          <Field label="Visibility" htmlFor="p-status">
            <select
              id="p-status"
              name="status"
              className="select"
              defaultValue={product?.status ?? "draft"}
            >
              <option value="draft">Draft — only you can see it</option>
              <option value="published">Live on my storefront</option>
              <option value="out_of_stock">Live, but out of stock</option>
            </select>
          </Field>
        </div>

        <FormMessage state={state} />

        <SubmitButton pending={pending}>
          {product ? "Save changes" : "Save product"}
        </SubmitButton>

        <p className="text-[0.6875rem] leading-relaxed text-[var(--color-ink-3)]">
          BizHub does not take payment for storefront products. Buyers enquire
          through your inbox and you agree terms directly with them.
        </p>
      </form>
    </Dialog>
  );
}
