// Presentation-only identity guard. Original participant evidence stays in financing records.
export function isNamedInvestor(record){
 const name=String(record?.name||'').trim();
 const generic=/^(?:\d+\s+)?(?:undisclosed|unnamed|unidentified|anonymous)\b/i.test(name)&&/\b(?:investors?|fund|group|subscribers)\b/i.test(name);
 return !!name&&!generic;
}
