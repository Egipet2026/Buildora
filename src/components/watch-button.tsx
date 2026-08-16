import { toggleWatchAction } from "@/lib/ecosystem/actions";

/**
 * Adds a listing to the watchlist.
 *
 * Distinct from a favourite on purpose: a favourite is a bookmark, a watch is
 * a request to be told when the price moves. Both exist because they answer
 * different questions.
 */
export function WatchButton({
  listingId,
  watching,
  className = "btn btn-outline w-full",
}: {
  listingId: string;
  watching: boolean;
  className?: string;
}) {
  return (
    <form action={toggleWatchAction}>
      <input type="hidden" name="listingId" value={listingId} />
      <button type="submit" className={className}>
        {watching ? "◉ Watching price" : "◎ Watch the price"}
      </button>
    </form>
  );
}
