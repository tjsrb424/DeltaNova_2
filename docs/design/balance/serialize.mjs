// Preserve JSON schemas while keeping large generated datasets reviewable by row.
export function jsonReport(data){
  const value=v=>Array.isArray(v)?`[\n${v.map(row=>'    '+JSON.stringify(row)).join(',\n')}\n  ]`:JSON.stringify(v,null,2);
  return `{\n${Object.entries(data).map(([key,v])=>'  '+JSON.stringify(key)+': '+value(v)).join(',\n')}\n}\n`;
}
