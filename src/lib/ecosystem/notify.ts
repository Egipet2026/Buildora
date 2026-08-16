import "server-only";

import { isDemoMode } from "../supabase/config";
import { getServerSupabase } from "../supabase/server";
import { demoId, demoStore } from "../demo/store";
import type { Notification, NotificationType } from "../types";

/**
 * Inserting a notification, shared by every ecosystem module.
 *
 * The marketplace has its own copy inside `lib/actions.ts`; this one exists so
 * the ecosystem modules do not have to import from that file and drag the
 * whole marketplace action surface along with them.
 */
export async function notify(n: {
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
}): Promise<void> {
  const row: Notification = {
    id: demoId("n"),
    is_read: false,
    created_at: new Date().toISOString(),
    ...n,
  };

  if (isDemoMode) {
    demoStore().notifications.unshift(row);
    return;
  }

  const supabase = await getServerSupabase();
  const { id: _id, ...insert } = row;
  await supabase?.from("notifications").insert(insert);
}
