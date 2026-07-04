import { SettingsNav } from "@/components/settings/settings-nav";
import { LogoutButton } from "@/components/settings/logout-button";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/members/auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Settings",
};

/**
 * Relocated + trimmed from src/app/(journal)/settings/layout.tsx when the
 * journal module was removed. The original's sidebar showed "recent file
 * edits" for the journal's editable agent files (Interviewer/Present/etc.) —
 * dropped since those files no longer exist.
 */
export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);
  // One row gives us both the role (owner gates the Family tab) and the
  // name/email to show above Log out.
  const { data: me } = await supabase
    .from("family_members")
    .select("name, email, role")
    .eq("user_id", userId)
    .maybeSingle();
  const isOwner = me?.role === "owner";
  const canManage = me?.role === "owner" || me?.role === "parent";

  return (
    <div className="mx-auto w-full max-w-5xl px-6 pb-24 pt-12">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_240px]">
        <div className="min-w-0">
          <SettingsNav isOwner={isOwner} canManage={canManage} />
          {children}
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="border-t border-border pt-6 lg:border-t-0 lg:pt-0">
            <p className="font-serif text-sm text-foreground">
              {me?.name || me?.email || "Signed in"}
            </p>
            {me?.name && me?.email && (
              <p className="text-xs text-muted-foreground">{me.email}</p>
            )}
            <div className="mt-3">
              <LogoutButton />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
