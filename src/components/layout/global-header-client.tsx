"use client";

import { usePathname } from "next/navigation";
import {
  TooltipProvider,
} from "@/components/ui/tooltip";
import { NotificationBell } from "@/components/layout/notification-bell";
import { AppHeaderSlot } from "@/components/layout/app-header";
import { AppSwitcher } from "@/components/layout/app-switcher";
import { cn } from "@/lib/utils";
import type { AppNotifications } from "@/lib/types";

/**
 * Relocated + trimmed when the journal and Mason Bucks modules were removed.
 * The original also rendered a journal posting-streak badge and a kid's
 * Mason Bucks wallet balance — both dropped along with the tables and
 * concepts they read from. The reader's distraction-free-chrome hiding is
 * dropped too (the reader app no longer exists).
 */

// The calendar and practice apps publish their toolbars into the header's app
// slot (see AppHeaderContent in calendar-client / practice-nav), and their
// content runs wider than most apps — widen the header there so the controls
// line up with the page below.
function headerWidthClass(pathname: string | null) {
  if (pathname?.startsWith("/practice")) return "max-w-7xl";
  if (pathname?.startsWith("/calendar")) return "max-w-5xl";
  return "max-w-3xl";
}

export function GlobalHeaderClient({
  notifications,
  isOwner,
}: {
  notifications: AppNotifications;
  isOwner: boolean;
}) {
  const pathname = usePathname();

  return (
    <TooltipProvider>
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div
          className={cn(
            "relative mx-auto flex h-14 items-center gap-2 px-6",
            headerWidthClass(pathname)
          )}
        >
          <AppSwitcher isOwner={isOwner} />
          <AppHeaderSlot />
          <div className="flex shrink-0 items-center gap-2">
            {notifications.count > 0 && (
              <NotificationBell notifications={notifications} />
            )}
          </div>
        </div>
      </header>
    </TooltipProvider>
  );
}

/**
 * Instant-paint stand-in shown while GlobalHeader's data streams in: the same
 * frame and app switcher (neither needs data). The switcher assumes
 * non-owner until the real header replaces it — the only difference is an
 * extra dropdown item, visible only if the menu is opened in that moment.
 * The exception is practice, an owner-gated route: anyone seeing this shell
 * there is an owner, so we say so up front — otherwise the switcher would
 * name the fallback's first app ("Home") for a frame before resolving to
 * "Practice".
 */
export function GlobalHeaderShell() {
  const pathname = usePathname();
  const ownerByRoute = pathname?.startsWith("/practice") ?? false;

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div
        className={cn(
          "relative mx-auto flex h-14 items-center gap-2 px-6",
          headerWidthClass(pathname)
        )}
      >
        <AppSwitcher isOwner={ownerByRoute} />
        <AppHeaderSlot />
      </div>
    </header>
  );
}
