"use client";

import { useState, useTransition } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MemberAvatar } from "@/components/family/member-avatar";
import { MemberPhotoDialog } from "@/components/family/member-photo-dialog";
import {
  removeFamilyMember,
  updateFamilyMember,
  updateMemberColor,
  updateMemberProfile,
  updateMemberRole,
} from "@/app/(settings)/settings/family/actions";
import type { FamilyMember, MemberPhoto, MemberRole } from "@/lib/types";

/**
 * Relocated from src/components/journal/family-manager.tsx when the journal
 * module was removed. The original also showed per-member journal posting
 * stats, a reading-goal badge, and an "edit this member's journal settings"
 * link (journal's per-member "member mode") — all dropped since journal and
 * reading were removed along with them. Roster CRUD (name/email/role/color/
 * birthdate/parent links) and photo management survive unchanged.
 */

const ROLE_LABELS: Record<MemberRole, string> = {
  owner: "Owner",
  parent: "Parent",
  kid: "Kid",
};
const ASSIGNABLE_ROLES: MemberRole[] = ["parent", "kid"];

// Quick-pick swatches for a member's calendar color; any other hex is still
// reachable through the custom picker. Kept in sync with the dev seed defaults.
const PRESET_COLORS = [
  "#2563eb", // blue
  "#7c3aed", // purple
  "#16a34a", // green
  "#ea580c", // orange
  "#db2777", // pink
  "#0891b2", // cyan
  "#d97706", // amber
  "#dc2626", // red
  "#0d9488", // teal
  "#64748b", // slate
];

export function FamilyManager({
  members,
  photosByEmail,
}: {
  members: FamilyMember[];
  photosByEmail: Record<string, MemberPhoto[]>;
}) {
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleRemove(member: FamilyMember) {
    if (
      !window.confirm(
        `Remove ${member.name || member.email}'s invitation? They haven't signed in yet.`
      )
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await removeFamilyMember(member.email);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't remove member.");
      }
    });
  }

  return (
    <div className="mt-6">
      <div className="divide-y divide-border rounded-lg border border-border">
        {members.map((m) => {
          const photos = photosByEmail[m.email] ?? [];
          const primary = photos.find((p) => p.is_primary) ?? photos[0];
          const hasSignedIn = m.user_id != null;
          return (
            <div
              key={m.email}
              className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap"
            >
              <MemberPhotoDialog
                member={m}
                photos={photos}
                trigger={
                  <button
                    type="button"
                    aria-label={`Manage photos for ${m.name || m.email}`}
                    className="rounded-full ring-offset-2 ring-offset-background transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
                  >
                    <MemberAvatar name={m.name} url={primary?.url} size="md" />
                  </button>
                }
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "h-2.5 w-2.5 shrink-0 rounded-full",
                      !m.color && "ring-1 ring-inset ring-border",
                    )}
                    style={m.color ? { backgroundColor: m.color } : undefined}
                    title={m.color ?? "No color set"}
                    aria-hidden
                  />
                  <span className="font-serif text-sm text-foreground">
                    {m.name || "—"}
                  </span>
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                    {ROLE_LABELS[m.role]}
                  </span>
                  {m.role !== "owner" && !hasSignedIn && (
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                      Invited
                    </span>
                  )}
                </div>
                <span className="block truncate text-xs text-muted-foreground">
                  {m.email}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setEditingMember(m)}
                disabled={pending}
                aria-label={`Edit ${m.name || m.email}`}
                className="text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
              >
                <Pencil className="h-4 w-4" />
              </button>
              {m.role !== "owner" && !hasSignedIn && (
                <button
                  type="button"
                  onClick={() => handleRemove(m)}
                  disabled={pending}
                  aria-label={`Remove ${m.name || m.email}'s invitation`}
                  title="Remove invitation"
                  className="text-muted-foreground transition-colors hover:text-destructive disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

      {editingMember && (
        <EditMemberDialog
          key={editingMember.email}
          member={editingMember}
          allMembers={members}
          onClose={() => setEditingMember(null)}
        />
      )}
    </div>
  );
}

const NO_PARENT = "__none__";

function EditMemberDialog({
  member,
  allMembers,
  onClose,
}: {
  member: FamilyMember;
  allMembers: FamilyMember[];
  onClose: () => void;
}) {
  const isOwner = member.role === "owner";
  const [name, setName] = useState(member.name ?? "");
  const [email, setEmail] = useState(member.email);
  const [role, setRole] = useState<MemberRole>(member.role);
  const [birthdate, setBirthdate] = useState(member.birthdate ?? "");
  const [color, setColor] = useState(member.color ?? "");
  const [motherEmail, setMotherEmail] = useState(member.mother_email ?? NO_PARENT);
  const [fatherEmail, setFatherEmail] = useState(member.father_email ?? NO_PARENT);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // A member can't be their own parent.
  const parentChoices = allMembers.filter((m) => m.email !== member.email);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const newEmail = email.trim().toLowerCase();
    startTransition(async () => {
      try {
        // Name/email first: editing the email cascades dependent rows
        // (parent links, calendar sources, etc.) to the new address.
        await updateFamilyMember(member.email, name, newEmail);
        if (!isOwner && role !== member.role) {
          await updateMemberRole(newEmail, role);
        }
        await updateMemberProfile(newEmail, {
          birthdate: birthdate || null,
          motherEmail: motherEmail === NO_PARENT ? null : motherEmail,
          fatherEmail: fatherEmail === NO_PARENT ? null : fatherEmail,
        });
        const newColor = color.trim().toLowerCase() || null;
        if (newColor !== (member.color ?? null)) {
          await updateMemberColor(newEmail, newColor);
        }
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't save changes.");
      }
    });
  }

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit family member</DialogTitle>
          <DialogDescription>
            Update {member.name || member.email}&apos;s details and parents.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="edit-name">Name</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="edit-email">Email address</Label>
            <Input
              id="edit-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isOwner}
            />
            {isOwner && (
              <p className="text-xs text-muted-foreground">
                The owner&apos;s email can&apos;t be changed here.
              </p>
            )}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="edit-role">Role</Label>
            {isOwner ? (
              <>
                <Input id="edit-role" value="Owner" disabled />
                <p className="text-xs text-muted-foreground">
                  The owner&apos;s role can&apos;t be changed.
                </p>
              </>
            ) : (
              <Select
                value={role}
                onValueChange={(v) => setRole(v as MemberRole)}
              >
                <SelectTrigger id="edit-role" className="w-full">
                  <SelectValue>{ROLE_LABELS[role]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {ASSIGNABLE_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <ColorField value={color} onChange={setColor} />
          <div className="grid gap-1.5">
            <Label htmlFor="edit-birthdate">Birthdate</Label>
            <Input
              id="edit-birthdate"
              type="date"
              value={birthdate}
              onChange={(e) => setBirthdate(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <ParentSelect
              id="edit-mother"
              label="Mother"
              value={motherEmail}
              choices={parentChoices}
              onChange={setMotherEmail}
            />
            <ParentSelect
              id="edit-father"
              label="Father"
              value={fatherEmail}
              choices={parentChoices}
              onChange={setFatherEmail}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter showCloseButton>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ColorField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const current = value.toLowerCase();
  const isCustom = current !== "" && !PRESET_COLORS.includes(current);
  return (
    <div className="grid gap-1.5">
      <Label>Color</Label>
      <div className="flex flex-wrap items-center gap-2">
        {PRESET_COLORS.map((c) => {
          const active = current === c;
          return (
            <button
              key={c}
              type="button"
              onClick={() => onChange(c)}
              aria-label={`Use ${c}`}
              aria-pressed={active}
              className={cn(
                "h-6 w-6 rounded-full transition",
                active
                  ? "ring-2 ring-foreground ring-offset-2 ring-offset-background"
                  : "ring-1 ring-border hover:ring-foreground/40",
              )}
              style={{ backgroundColor: c }}
            />
          );
        })}
        {/* Custom color: shows the picked color when it isn't a preset. */}
        <label
          title="Custom color"
          className={cn(
            "relative inline-flex h-6 w-6 cursor-pointer items-center justify-center overflow-hidden rounded-full transition",
            isCustom
              ? "ring-2 ring-foreground ring-offset-2 ring-offset-background"
              : "ring-1 ring-border hover:ring-foreground/40",
          )}
          style={isCustom ? { backgroundColor: current } : undefined}
        >
          <input
            type="color"
            value={current || "#888888"}
            onChange={(e) => onChange(e.target.value)}
            aria-label="Custom color"
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
          {!isCustom && <Plus className="h-3.5 w-3.5 text-muted-foreground" />}
        </label>
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            Reset
          </button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Used to identify this person across the app.
      </p>
    </div>
  );
}

function ParentSelect({
  id,
  label,
  value,
  choices,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  choices: FamilyMember[];
  onChange: (value: string) => void;
}) {
  const selected = choices.find((m) => m.email === value);
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={(v) => onChange(v ?? NO_PARENT)}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue>
            {value === NO_PARENT ? "None" : selected?.name ?? value}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NO_PARENT}>None</SelectItem>
          {choices.map((m) => (
            <SelectItem key={m.email} value={m.email}>
              {m.name ?? m.email}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
