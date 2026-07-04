import { Suspense } from "react";
import {
  GlobalHeaderClient,
  GlobalHeaderShell,
} from "@/components/layout/global-header-client";
import { getIsOwner, requireUserId } from "@/lib/members/auth";
import { getTodoNotifications } from "@/lib/todos/notifications";
import { createClient } from "@/lib/supabase/server";

/**
 * The global header, shared by every family-wide app (Calendar, Todos,
 * Timeline, Settings). It carries the app switcher plus notifications, which
 * are always present. The "New" action is app-specific and lives in each
 * app's own content, not here.
 *
 * The data-bearing part streams in behind Suspense: the notification query
 * takes real time, and the header sits in every layout — without the
 * boundary it would hold up the first byte of every page, so a cold PWA
 * launch sat on a blank screen until the slowest header query finished. The
 * shell paints immediately; the badge streams in place.
 *
 * Relocated + trimmed when the journal and Mason Bucks modules were removed.
 * The original also computed a per-user journal posting-streak badge and a
 * kid's Mason Bucks wallet balance directly in this file — both dropped
 * along with the tables they read from.
 */
export function GlobalHeader() {
  return (
    <Suspense fallback={<GlobalHeaderShell />}>
      <GlobalHeaderData />
    </Suspense>
  );
}

async function GlobalHeaderData() {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);

  const [todoItems, isOwner] = await Promise.all([
    getTodoNotifications(supabase, userId).catch(() => []),
    getIsOwner(supabase),
  ]);

  const notifications = {
    count: todoItems.length,
    items: todoItems,
  };

  return <GlobalHeaderClient notifications={notifications} isOwner={isOwner} />;
}
