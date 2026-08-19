import { Notice } from "./ui";
import type { OfflineReason } from "@/lib/types";

/**
 * Shown when a page had to fall back to its built-in template.
 *
 * This used to be a sentence tacked onto the end of the legal disclaimer,
 * which meant the one fact a reader needed — that what they are looking at is
 * not an answer to their question — arrived after four lines of small print
 * about financial advice. It is its own notice now, above the result.
 *
 * It also distinguishes the two reasons. Telling someone no provider is
 * configured when they have just configured one sends them to look in exactly
 * the wrong place.
 */
export function AiFallbackNotice({
  reason,
  what,
}: {
  reason: OfflineReason | undefined;
  /** What was being produced, e.g. "plan" or "research". */
  what: string;
}) {
  if (reason === "call_failed") {
    return (
      <Notice tone="danger" title={`This ${what} was not written by the AI`}>
        The request reached the model provider and came back with an error, so
        Buildora fell back to its built-in template — which is why this reads
        generically rather than being about your idea.
        <span className="mt-2 block text-[0.8125rem]">
          Usually the key is wrong, the account has no credit left, or too many
          requests have been made in a short time. The exact reason is in the
          server log; it is not shown here because the provider&apos;s message
          can name the account.
        </span>
      </Notice>
    );
  }

  return (
    <Notice tone="brand" title={`This ${what} was not written by the AI`}>
      No model provider is connected to this deployment, so Buildora used its
      built-in template. It is the same for every idea — a checklist rather
      than an answer about yours.
      <span className="mt-2 block text-[0.8125rem]">
        Set <code className="font-mono">ANTHROPIC_API_KEY</code> in the
        environment and redeploy to get a {what} written for what you actually
        typed.
      </span>
    </Notice>
  );
}
