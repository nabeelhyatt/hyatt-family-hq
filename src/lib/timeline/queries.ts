import { createClient } from "@/lib/supabase/server";
import { getTimelineEntriesPhotos } from "@/lib/timeline/actions";
import type {
  TimelineEntry,
  TimelineEntryPhoto,
  TimelineEntryWithPeople,
  TimelinePerson,
  TimelinePersonRole,
} from "@/lib/types";

/**
 * Trimmed when the journal module was removed. The original also resolved
 * each event's linked journal reflections (fetchLinkedPosts, linkedJournalIds)
 * and unioned their photos into the cover-photo candidates — dropped along
 * with journal_entries, the table it read from. Covers now come only from
 * photos pinned directly to the event.
 */

const ENTRY_COLUMNS =
  "id, title, description, category, prominence, location, start_date, start_precision, end_date, end_precision, approximate, created_at, updated_at";

type RawRow = TimelineEntry & {
  timeline_entry_people: { role: TimelinePersonRole; people: TimelinePerson | null }[];
};

export type TimelineView = "mine" | "family";

/** Split the embedded people join into subjects and mentions. */
function shape(
  row: RawRow
): Omit<TimelineEntryWithPeople, "coverPhotoUrl" | "coverVideoUrl" | "photos"> {
  const subjects: TimelinePerson[] = [];
  const mentions: TimelinePerson[] = [];
  for (const tep of row.timeline_entry_people ?? []) {
    if (!tep.people) continue;
    (tep.role === "subject" ? subjects : mentions).push(tep.people);
  }
  const { timeline_entry_people: _omit, ...entry } = row;
  void _omit;
  return { ...entry, subjects, mentions };
}

/**
 * Signed primary-avatar URL per family member email. The member-photos bucket is
 * family-readable, so this signs for any member (no owner-admin needed).
 */
async function memberAvatarUrls(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const supabase = await createClient();
  const { data } = await supabase
    .from("journal_member_photos")
    .select("member_email, storage_path")
    .eq("is_primary", true);
  if (!data?.length) return map;
  const { data: signed } = await supabase.storage
    .from("member-photos")
    .createSignedUrls(
      data.map((d) => d.storage_path as string),
      60 * 60
    );
  data.forEach((d, i) => {
    const url = signed?.[i]?.signedUrl;
    if (url) map.set((d.member_email as string).toLowerCase(), url);
  });
  return map;
}

function withAvatars(people: TimelinePerson[], avatars: Map<string, string>): TimelinePerson[] {
  return people.map((p) => ({
    ...p,
    avatarUrl: p.member_email ? avatars.get(p.member_email.toLowerCase()) ?? null : null,
  }));
}

async function fetchEntries(): Promise<{ rows: RawRow[]; email: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("timeline_entries")
    .select(`${ENTRY_COLUMNS}, timeline_entry_people(role, people(id, name, member_email))`)
    .order("start_date", { ascending: true });
  if (error) throw error;
  return {
    // PostgREST returns the to-one `people` relation as a single object at
    // runtime, but types it as an array; cast through unknown.
    rows: (data ?? []) as unknown as RawRow[],
    email: user?.email?.toLowerCase() ?? null,
  };
}

/**
 * Load the timeline for rendering.
 *
 * "mine"   — events where the viewer is a subject (resolved member_email ->
 *            family_members.email -> the viewer's auth email).
 * "family" — every event (each is one canonical row, so shared events appear
 *            once, no dedup needed).
 *
 * `withCovers` additionally resolves a representative photo per entry (for
 * the visualization); skip it for callers that don't need images.
 */
export async function loadTimeline(
  view: TimelineView,
  { withCovers = false }: { withCovers?: boolean } = {}
): Promise<TimelineEntryWithPeople[]> {
  const { rows, email } = await fetchEntries();
  let entries = rows.map(shape);
  if (view === "mine") {
    entries = email
      ? entries.filter((e) => e.subjects.some((s) => s.member_email?.toLowerCase() === email))
      : [];
  }

  const directByEntry = new Map<string, TimelineEntryPhoto[]>();
  const coverByEntry = new Map<string, string>();
  const coverVideoByEntry = new Map<string, string>();
  let avatars = new Map<string, string>();
  if (withCovers) {
    const [directPhotos, avatarMap] = await Promise.all([
      getTimelineEntriesPhotos(entries.map((e) => e.id)),
      memberAvatarUrls(),
    ]);
    avatars = avatarMap;
    for (const e of entries) {
      const direct = (directPhotos[e.id] ?? []).filter((p) => p.displayUrl);
      directByEntry.set(e.id, direct);
      if (direct[0]?.displayUrl) coverByEntry.set(e.id, direct[0].displayUrl);
      if (direct[0]?.videoUrl) coverVideoByEntry.set(e.id, direct[0].videoUrl);
    }
  }

  return entries.map((e) => ({
    ...e,
    subjects: withCovers ? withAvatars(e.subjects, avatars) : e.subjects,
    mentions: withCovers ? withAvatars(e.mentions, avatars) : e.mentions,
    photos: directByEntry.get(e.id) ?? [],
    coverPhotoUrl: coverByEntry.get(e.id) ?? null,
    coverVideoUrl: coverVideoByEntry.get(e.id) ?? null,
  }));
}

/**
 * One entry with its people. Loaded by id (not the viewer's "mine" set) so
 * you can view any visible event, including a family member's.
 */
export async function loadTimelineEntryById(
  id: string
): Promise<TimelineEntryWithPeople | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("timeline_entries")
    .select(`${ENTRY_COLUMNS}, timeline_entry_people(role, people(id, name, member_email))`)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    ...shape(data as unknown as RawRow),
    photos: [],
    coverPhotoUrl: null,
    coverVideoUrl: null,
  };
}
