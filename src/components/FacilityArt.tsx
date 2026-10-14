import type { FacilityId } from "../empire/types.ts";
export default function FacilityArt({ facility }: { facility: FacilityId }) {
  return <span className={"facility-art " + facility} aria-hidden="true"/>;
}
