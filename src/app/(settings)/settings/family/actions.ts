"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireOwner } from "@/lib/members/auth";
import type { FamilyMember, MemberPhoto, MemberRole } from "@/lib/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HEX_COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const MEMBER_PHOTOS_BUCKET = "member-photos";
const ROLES: readonly MemberRole[] = ["owner", "parent", "kid"];

/**
 * Relocated from src/app/(journal)/settings/family/actions.ts when the journal
 * module was removed. The original file also carried journal-specific
 * concerns (the shared family-context doc, per-member journal posting stats,
 * reading page goals, and the journal content-backfill maintenance job) —
 * all dropped here since journal and reading were removed along with it.
 * Roster CRUD and member photos are cross-app (calendar, home, todos all read
 * family_members / member photos) and survive unchanged.
 */

/** List all family members. Owner-only (uses service role to see every row,
 * since RLS otherwise scopes reads to the caller's own membership). */
export async function listFamilyMembers(): Promise<FamilyMember[]> {
  await requireOwner();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("family_members")
    .select(
      "email, name, role, user_id, seeded_at, birthdate, mother_email, father_email, color"
    )
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  // Owner first, then creation order. (Text role doesn't sort owner-first in the
  // query, so order it here.)
  return ((data ?? []) as FamilyMember[]).sort(
    (a, b) => Number(b.role === "owner") - Number(a.role === "owner")
  );
}

/** Add a family member to the allowlist. They're provisioned on first sign-in.
 * New members default to 'parent' — a fully-capable non-owner role. */
export async function addFamilyMember(
  emailRaw: string,
  nameRaw: string,
  role: MemberRole = "parent"
): Promise<void> {
  await requireOwner();
  const email = emailRaw.trim().toLowerCase();
  const name = nameRaw.trim();
  if (!EMAIL_RE.test(email)) throw new Error("Enter a valid email address.");
  if (!name) throw new Error("Give this person a name.");
  if (!ROLES.includes(role)) throw new Error("Pick a valid role.");
  if (role === "owner") throw new Error("There can only be one owner.");

  const admin = createAdminClient();
  const { error } = await admin
    .from("family_members")
    .insert({ email, name, role });
  if (error) {
    if (error.code === "23505") throw new Error(`${email} is already a member.`);
    throw new Error(error.message);
  }
  revalidatePath("/settings/family");
}

/** Edit a member's name and/or email. Owner-only. Changing the email keeps
 * their auth login in sync (when they've already signed in) so the sign-in
 * allowlist still matches, and cascades to all of their rows via the FKs'
 * ON UPDATE CASCADE (00104). The owner's own email is fixed and can't be changed
 * here. */
export async function updateFamilyMember(
  originalEmailRaw: string,
  nameRaw: string,
  newEmailRaw: string
): Promise<void> {
  const ownerId = await requireOwner();
  const originalEmail = originalEmailRaw.trim().toLowerCase();
  const newEmail = newEmailRaw.trim().toLowerCase();
  const name = nameRaw.trim();
  if (!name) throw new Error("Give this person a name.");
  if (!EMAIL_RE.test(newEmail)) throw new Error("Enter a valid email address.");

  const admin = createAdminClient();
  const { data: member } = await admin
    .from("family_members")
    .select("email, user_id, role")
    .eq("email", originalEmail)
    .maybeSingle();
  if (!member) throw new Error("Member not found.");

  const emailChanged = newEmail !== originalEmail;
  const isOwnerRow = member.role === "owner" || member.user_id === ownerId;
  if (emailChanged && isOwnerRow) {
    throw new Error("You can't change the owner's email.");
  }

  if (emailChanged) {
    const { data: existing } = await admin
      .from("family_members")
      .select("email")
      .eq("email", newEmail)
      .maybeSingle();
    if (existing) throw new Error(`${newEmail} is already a member.`);

    // Keep the auth login matching the allowlist key for members who've signed
    // in. Invited members have no user_id yet, so there's nothing to sync.
    if (member.user_id) {
      const { error: authErr } = await admin.auth.admin.updateUserById(
        member.user_id,
        { email: newEmail }
      );
      if (authErr) throw new Error(authErr.message);
    }
  }

  const { error } = await admin
    .from("family_members")
    .update({ email: newEmail, name })
    .eq("email", originalEmail);
  if (error) {
    if (error.code === "23505") throw new Error(`${newEmail} is already a member.`);
    throw new Error(error.message);
  }
  revalidatePath("/settings/family");
}

/** Remove a family member: revokes allowlist access and deletes their account
 * and all of their data (auth.users delete cascades). The owner cannot
 * remove themselves. */
export async function removeFamilyMember(emailRaw: string): Promise<void> {
  const ownerId = await requireOwner();
  const email = emailRaw.trim().toLowerCase();

  const admin = createAdminClient();

  const { data: member } = await admin
    .from("family_members")
    .select("email, user_id, role")
    .eq("email", email)
    .maybeSingle();
  if (!member) throw new Error("Member not found.");
  if (member.role === "owner" || member.user_id === ownerId) {
    throw new Error("You can't remove the owner account.");
  }

  // Remove their profile-photo files before the membership row (and its
  // journal_member_photos rows, via ON DELETE CASCADE) goes away.
  const { data: photos } = await admin
    .from("journal_member_photos")
    .select("storage_path")
    .eq("member_email", email);
  const photoPaths = (photos ?? []).map((p) => p.storage_path as string);
  if (photoPaths.length > 0) {
    await admin.storage.from(MEMBER_PHOTOS_BUCKET).remove(photoPaths);
  }

  // Deleting the auth user cascades all their per-user rows. The membership
  // row's user_id FK is ON DELETE SET NULL, so remove it explicitly too.
  if (member.user_id) {
    const { error: delErr } = await admin.auth.admin.deleteUser(member.user_id);
    if (delErr) throw new Error(delErr.message);
  }
  const { error } = await admin.from("family_members").delete().eq("email", email);
  if (error) throw new Error(error.message);

  revalidatePath("/settings/family");
}

/** Edit a member's profile: birthdate and parent links. Owner-only. */
export async function updateMemberProfile(
  emailRaw: string,
  input: {
    birthdate?: string | null;
    motherEmail?: string | null;
    fatherEmail?: string | null;
  }
): Promise<void> {
  await requireOwner();
  const email = emailRaw.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) throw new Error("Unknown member.");

  const birthdate = input.birthdate?.trim() || null;
  if (birthdate && !/^\d{4}-\d{2}-\d{2}$/.test(birthdate)) {
    throw new Error("Enter the birthdate as YYYY-MM-DD.");
  }
  const motherEmail = input.motherEmail?.trim().toLowerCase() || null;
  const fatherEmail = input.fatherEmail?.trim().toLowerCase() || null;
  if (motherEmail === email || fatherEmail === email) {
    throw new Error("A member can't be their own parent.");
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("family_members")
    .update({
      birthdate,
      mother_email: motherEmail,
      father_email: fatherEmail,
    })
    .eq("email", email);
  if (error) throw new Error(error.message);
  revalidatePath("/settings/family");
}

/** Set a member's role (owner / parent / kid). Owner-only.
 *
 * The model is single-owner: there's exactly one owner and it's a fixed account.
 * So you can move members between parent and kid, but you can't promote anyone to
 * owner or demote the owner — that would strand the family without an admin. */
export async function updateMemberRole(
  emailRaw: string,
  role: MemberRole
): Promise<void> {
  const ownerId = await requireOwner();
  const email = emailRaw.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) throw new Error("Unknown member.");
  if (!ROLES.includes(role)) throw new Error("Pick a valid role.");
  if (role === "owner") throw new Error("There can only be one owner.");

  const admin = createAdminClient();
  const { data: member } = await admin
    .from("family_members")
    .select("user_id, role")
    .eq("email", email)
    .maybeSingle();
  if (!member) throw new Error("Member not found.");
  if (member.role === "owner" || member.user_id === ownerId) {
    throw new Error("You can't change the owner's role.");
  }

  const { error } = await admin
    .from("family_members")
    .update({ role })
    .eq("email", email);
  if (error) throw new Error(error.message);
  revalidatePath("/settings/family");
}

/** Set (or clear) a member's official display color. Owner-only.
 *
 * The Calendar's per-member columns, event accents, and filter chips read
 * family_members.color (see src/lib/calendar/queries.ts); a null color falls
 * back to the deterministic per-email hash color. Pass null to clear. */
export async function updateMemberColor(
  emailRaw: string,
  colorRaw: string | null
): Promise<void> {
  await requireOwner();
  const email = emailRaw.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) throw new Error("Unknown member.");
  const color = colorRaw?.trim().toLowerCase() || null;
  if (color && !HEX_COLOR_RE.test(color)) {
    throw new Error("Enter a color as a hex value like #2563eb.");
  }

  const admin = createAdminClient();
  const { data: member } = await admin
    .from("family_members")
    .select("email")
    .eq("email", email)
    .maybeSingle();
  if (!member) throw new Error("Member not found.");

  const { error } = await admin
    .from("family_members")
    .update({ color })
    .eq("email", email);
  if (error) throw new Error(error.message);
  // Refresh both the roster and the surfaces that render the color.
  revalidatePath("/settings/family");
  revalidatePath("/calendar");
  revalidatePath("/home");
}

// ============================================================
// Member profile photos
// ============================================================

/** All members' profile photos, keyed by member email, primary-first within
 * each member. Owner-only; signs short-lived display URLs via the service role. */
export async function getMemberPhotos(): Promise<Record<string, MemberPhoto[]>> {
  await requireOwner();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("journal_member_photos")
    .select("id, member_email, storage_path, is_primary, created_at")
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  if (rows.length === 0) return {};

  const { data: signed } = await admin.storage
    .from(MEMBER_PHOTOS_BUCKET)
    .createSignedUrls(
      rows.map((r) => r.storage_path as string),
      60 * 60
    );

  const result: Record<string, MemberPhoto[]> = {};
  rows.forEach((row, i) => {
    const email = row.member_email as string;
    (result[email] ??= []).push({
      id: row.id as string,
      url: signed?.[i]?.signedUrl ?? "",
      is_primary: row.is_primary === true,
    });
  });
  return result;
}

/** Upload one profile photo for a member. The first photo a member gets becomes
 * their primary automatically. Owner-only. */
export async function addMemberPhoto(formData: FormData): Promise<void> {
  await requireOwner();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const file = formData.get("file");
  if (!EMAIL_RE.test(email)) throw new Error("Unknown member.");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Pick an image to upload.");
  }

  const admin = createAdminClient();
  const { data: member } = await admin
    .from("family_members")
    .select("email")
    .eq("email", email)
    .maybeSingle();
  if (!member) throw new Error("Member not found.");

  const { count } = await admin
    .from("journal_member_photos")
    .select("id", { count: "exact", head: true })
    .eq("member_email", email);
  const isFirst = (count ?? 0) === 0;

  const photoId = crypto.randomUUID();
  const path = `${email}/${photoId}.jpg`;
  const { error: upErr } = await admin.storage
    .from(MEMBER_PHOTOS_BUCKET)
    .upload(path, file, { contentType: "image/jpeg", upsert: true });
  if (upErr) throw new Error(upErr.message);

  const { error } = await admin.from("journal_member_photos").insert({
    member_email: email,
    storage_path: path,
    is_primary: isFirst,
  });
  if (error) {
    await admin.storage.from(MEMBER_PHOTOS_BUCKET).remove([path]);
    throw new Error(error.message);
  }
  revalidatePath("/settings/family");
}

/** Make one of a member's photos their primary, clearing the previous primary. */
export async function setPrimaryMemberPhoto(photoId: string): Promise<void> {
  await requireOwner();
  const admin = createAdminClient();
  const { data: photo } = await admin
    .from("journal_member_photos")
    .select("id, member_email")
    .eq("id", photoId)
    .maybeSingle();
  if (!photo) throw new Error("Photo not found.");

  // Clear the existing primary first so the partial unique index never trips.
  const { error: clearErr } = await admin
    .from("journal_member_photos")
    .update({ is_primary: false })
    .eq("member_email", photo.member_email)
    .eq("is_primary", true);
  if (clearErr) throw new Error(clearErr.message);

  const { error } = await admin
    .from("journal_member_photos")
    .update({ is_primary: true })
    .eq("id", photoId);
  if (error) throw new Error(error.message);
  revalidatePath("/settings/family");
}

/** Delete one of a member's photos. If it was the primary and others remain,
 * promote the newest remaining photo to primary. Owner-only. */
export async function deleteMemberPhoto(photoId: string): Promise<void> {
  await requireOwner();
  const admin = createAdminClient();
  const { data: photo } = await admin
    .from("journal_member_photos")
    .select("id, member_email, storage_path, is_primary")
    .eq("id", photoId)
    .maybeSingle();
  if (!photo) throw new Error("Photo not found.");

  await admin.storage.from(MEMBER_PHOTOS_BUCKET).remove([photo.storage_path as string]);
  const { error } = await admin
    .from("journal_member_photos")
    .delete()
    .eq("id", photoId);
  if (error) throw new Error(error.message);

  if (photo.is_primary) {
    const { data: next } = await admin
      .from("journal_member_photos")
      .select("id")
      .eq("member_email", photo.member_email)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (next) {
      await admin
        .from("journal_member_photos")
        .update({ is_primary: true })
        .eq("id", next.id);
    }
  }
  revalidatePath("/settings/family");
}
