import type { Role } from "../game/types.ts";
const silhouettes: Record<string, string> = {
  striker:
    "M64 10 74 41 91 55 88 72 72 65 70 92 58 92 56 65 40 72 37 55 54 41Z",
  guardian: "M64 9 85 29 92 55 87 84 72 94 64 85 56 94 41 84 36 55 43 29Z",
  siege:
    "M59 6 69 6 71 49 82 40 89 67 76 88 68 82 60 82 52 88 39 67 46 40 57 49Z",
  support: "M64 18 77 35 91 39 92 75 76 80 64 94 52 80 36 75 37 39 51 35Z",
  salvage:
    "M53 15 75 15 82 29 94 30 94 81 81 82 75 93 53 93 47 82 34 81 34 30 46 29Z",
  scout: "M64 8 71 43 102 76 77 66 70 92 58 92 51 66 26 76 57 43Z",
  jammer:
    "M64 16 72 43 90 29 101 55 86 80 72 66 69 94 59 94 56 66 42 80 27 55 38 29 56 43Z",
  carrier:
    "M56 10 72 10 79 28 96 24 100 89 80 93 75 80 53 80 48 93 28 89 32 24 49 28Z",
};
export default function ShipGlyph({
  role,
  color = "#91c9d0",
  small = false,
}: {
  role: Role;
  color?: string;
  small?: boolean;
}) {
  return (
    <svg
      className={`ship-glyph ${small ? "small" : ""}`}
      viewBox="0 0 128 112"
      aria-hidden="true"
      style={{ color }}
    >
      <path d="M12 56H116M64 2V108" className="ship-grid" />
      <path
        d={silhouettes[role] || silhouettes.striker}
        className="ship-hull"
      />
      <path d="M59 39H69V63H59ZM58 82V99M70 82V99" className="ship-core" />
      <path d="M47 108H81" className="ship-thrust" />
    </svg>
  );
}
