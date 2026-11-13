import { groupImage, homeImage } from "@/components/og/share-card";
import { formatPartyDate } from "@/lib/format";
import { getGroupPreview } from "@/server/groups";

/**
 * Share preview image of a join link: "Sali na sa bunutan ng {group}" and
 * the party date, nothing else (no names, counts, codenames). Only the
 * join page points here; /me and the organizer page use the generic image.
 * Unknown groups get the generic image, so the response says nothing about
 * whether a slug exists.
 */
export async function GET(_request: Request, { params }: RouteContext<"/g/[slug]/og">) {
  const { slug } = await params;
  const group = await getGroupPreview(slug).catch(() => null);
  const image = group
    ? await groupImage({ name: group.name, partyDate: formatPartyDate(group.partyDate) })
    : await homeImage();
  // Renames should show up within minutes, not stay cached for a year.
  image.headers.set("Cache-Control", "public, max-age=600, s-maxage=600");
  return image;
}
