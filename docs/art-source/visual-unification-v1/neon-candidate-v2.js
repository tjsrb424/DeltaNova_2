// Candidate design source. Promoted to the demo only after visual review.
export const symbols=Object.freeze({
  planet:'<circle cx="12" cy="12" r="6.5"/><ellipse cx="12" cy="12" rx="11" ry="3.5" transform="rotate(-32 12 12)"/>',
  build:'<path d="m3 9 9-5 9 5-9 5zM3 9v9l9 4 9-4V9M12 14v8M8 3h8M12 3v3"/>',
  research:'<path d="m12 2 8.7 5v10L12 22l-8.7-5V7z"/><circle cx="12" cy="12" r="3"/><path d="M12 2v4m8.7 1-3.5 2m3.5 8-3.5-2M12 22v-4m-8.7-1 3.5-2M3.3 7l3.5 2"/>',
  fleet:'<path d="m12 3 3 6v8l-3-2-3 2V9zM7 11l-4 7v3l4-2m10-8 4 7v3l-4-2M12 7v4"/>',
  compass:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 1v4m0 14v4M1 12h4m14 0h4m-2-9-4 4"/>',
  galaxy:'<circle cx="12" cy="12" r="2"/><path d="M20.5 10a8.5 8.5 0 0 0-15-3M3.5 14a8.5 8.5 0 0 0 15 3M16 7a6 6 0 0 1 0 10M8 7a6 6 0 0 0 0 10"/><circle cx="5" cy="6.5" r="1"/><circle cx="19" cy="17.5" r="1"/>',
  guild:'<path d="m12 2 3 2v4l-3 2-3-2V4zM5 14l3 2v4l-3 2-3-2v-4zm14 0 3 2v4l-3 2-3-2v-4zM10 9l-4 5m8-5 4 5M8 18h8"/>',
  reports:'<path d="M6 3h9l4 4v14H6zM14 3v5h5M9 12h7M9 16h4M3 6v13"/>',
  defense:'<path d="m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6zM8 12l3 3 5-6"/>',
  practice:'<path d="m3 7 9-5 9 5-9 5zM3 12l9 5 9-5M3 17l9 5 9-5"/>',
  more:'<rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="3" width="6" height="6" rx="1"/><rect x="3" y="15" width="6" height="6" rx="1"/><rect x="15" y="15" width="6" height="6" rx="1"/>',
  settings:'<path d="M3 6h18M3 12h18M3 18h18"/><circle cx="8" cy="6" r="2" fill="var(--dn-surface,#111b2b)"/><circle cx="16" cy="12" r="2" fill="var(--dn-surface,#111b2b)"/><circle cx="10" cy="18" r="2" fill="var(--dn-surface,#111b2b)"/>',
  station:'<path d="M9 7h6v11H9zM2 6h4v13H2zM18 6h4v13h-4zM6 12h3m6 0h3M12 7V2m-3 0h6M12 18v4"/>',
  alloy:'<path d="m12 2 9 5v10l-9 5-9-5V7zM3 7l9 5 9-5M12 12v10"/>',
  crystal:'<path d="m8 3-5 7 9 12 9-12-5-7zM3 10h18M8 3l4 19 4-19"/>',
  fuel:'<path d="M12 2C9 7 5 10 5 15a7 7 0 0 0 14 0c0-5-4-8-7-13zM9 15a3 3 0 0 0 3 3"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
  arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',
  back:'<path d="M20 12H4m6-6-6 6 6 6"/>',
  close:'<path d="m6 6 12 12M18 6 6 18"/>',
  warning:'<path d="m12 3 10 18H2zM12 9v5M12 17v.1"/>',
  check:'<circle cx="12" cy="12" r="9"/><path d="m7 12 3 3 7-7"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 10v7m0-10v.1"/>',
  expand:'<path d="M8 3H3v5M16 3h5v5M21 16v5h-5M8 21H3v-5"/>',
  diplomacy:'<path d="M3 4h18v13H10l-5 4v-4H3zM7 8h10M7 12h6"/>',
  rankings:'<path d="M4 21h16M6 17v-5h4v5m4 0V7h4v10M5 6l5-3 4 1 5-2"/>',
});
const aliases={target:'compass',shield:'defense',group:'guild',recon:'compass',evasion:'arrow',career:'compass'};
export const icon=name=>`<svg class="dn-icon" data-symbol="${Object.hasOwn(symbols,name)?name:aliases[name]||'info'}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${symbols[name]||symbols[aliases[name]]||symbols.info}</svg>`;
export const shipSymbols=Object.freeze({
  striker:'<path d="m16 3 5 9v15l-5-3-5 3V12zM8 12l-4 8v7l5-3m15-12 4 8v7l-5-3M16 8v9"/>',
  guardian:'<path d="m16 3 10 10v14l-6-3-4 3-4-3-6 3V13zM11 13v8m10-8v8M13 10h6"/>',
  siege:'<path d="M16 2v18m-4-10 4-5 4 5v18l-4-3-4 3zM8 17H5v11l6-3m13-8h3v11l-6-3"/>',
  support:'<path d="m16 7 6 5v14l-6-3-6 3V12zM6 12l-3 4v7l4 3m19-14 3 4v7l-4 3M13 16h6m-3-3v6"/><circle cx="16" cy="4" r="2"/>',
  salvage:'<path d="M11 8h10v19H11zM4 11h7v12H4zm17 0h7v12h-7zM13 3h6v5M15 12h2m-2 5h2m-2 5h2M6 26v3m20-3v3"/>',
  scout:'<path d="m16 3 3 14 10 8-11-3-2 6-2-6-11 3 10-8zM16 9v8"/>',
  jammer:'<circle cx="16" cy="8" r="5"/><path d="m12 5 8 6M16 13v6M9 19h14v9l-7-3-7 3zM5 9v13m22-13v13M3 9h4m18 0h4"/>',
  carrier:'<path d="m5 9 7-5v17h8V4l7 5v19l-7-3h-8l-7 3zM8 12v9m16-9v9M15 9h2m-2 4h2"/>',
});
export const shipIcon=id=>`<svg class="dn-ship-icon" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${shipSymbols[id]||shipSymbols.striker}</svg>`;
