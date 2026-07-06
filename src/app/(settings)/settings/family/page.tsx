import { redirect } from "next/navigation";
import { FamilyManager } from "@/components/family/family-manager";
import { getIsAdult, getIsOwner } from "@/lib/members/auth";
import { getMemberPhotos, listFamilyMembers } from "./actions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Family Settings",
};

export default async function FamilySettingsPage() {
  // Owner-only. Parents (who can still see Calendars) land there instead; a
  // kid has neither tab, so they're bounced all the way to Home rather than
  // ping-ponging between the two settings pages.
  if (!(await getIsOwner())) {
    redirect((await getIsAdult()) ? "/settings/calendars" : "/home");
  }

  const [members, photosByEmail] = await Promise.all([
    listFamilyMembers(),
    getMemberPhotos(),
  ]);
  return <FamilyManager members={members} photosByEmail={photosByEmail} />;
}
