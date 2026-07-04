import { createAdminClient } from "@/lib/supabase/admin";

export type MembershipResult =
  | { allowed: false }
  | { allowed: true; isOwner: boolean };

/**
 * Allowlist check + first-sign-in provisioning for a family member.
 *
 * Called on every sign-in (magic links re-fire), so it's idempotent: a member
 * who has already signed in before just gets their owner claim refreshed. A
 * member not on the allowlist is rejected — the caller signs them out.
 *
 * Relocated from src/lib/journal/provisioning.ts when the journal module was
 * removed — the original also seeded a new member's per-user journal rows
 * (question types, interviewer/present docs, journal_settings) on first
 * sign-in. That seeding is gone along with the journal tables it wrote to;
 * this version only does the allowlist + linking work every app depends on.
 */
export async function ensureProvisioned(user: {
  id: string;
  email?: string | null;
}): Promise<MembershipResult> {
  const email = user.email?.toLowerCase().trim();
  if (!email) return { allowed: false };

  const admin = createAdminClient();

  const { data: member } = await admin
    .from("family_members")
    .select("email, user_id, role")
    .eq("email", email)
    .maybeSingle();
  if (!member) return { allowed: false };

  const isOwner = member.role === "owner";

  // Link the auth user to the membership row the first time we see them.
  // Middleware gates /practice by reading the role from this row directly.
  if (member.user_id !== user.id) {
    await admin
      .from("family_members")
      .update({ user_id: user.id })
      .eq("email", email);
  }

  return { allowed: true, isOwner };
}
