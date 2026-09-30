export const movementNames = {forest:'Forest of Ignorance',autopsy:'Black-Box Autopsy',ship:'Neurath’s Ship',note:'Process note'} as const;
export type RecordBase = {id:string;encounter:string;date:string;title:string;subject:string;tags?:string[];summary:string;example:boolean;reconstruction?:string;arose_from?:string;next?:string;writing?:{heading:string;paragraphs:string[]}[]};
export type Rival = {id:string;explanation:string;introduced:string};
export type Check = {id:string;date:string;description:string;produced:string;assessment?:string;discriminates?:'yes'|'no'|'unclear';comparisons:{rival:string;result:'supports'|'against'|'inconclusive'|'not_tested'}[]};
export type Consequence = {id:string;description:string;depends:string;kind?:'belief'|'explanation'|'decision'|'work';status?:'holds'|'needs_repair'|'repaired'|'abandoned';reason?:string;href?:string};
export type ProcessRecord = RecordBase & (
 | {movement:'forest';question:string;account?:string;reflection?:string;forest_attempt?:string}
 | {movement:'note';account:string}
 | {movement:'autopsy';observation:string;expected?:string;rivals?:Rival[];checks?:Check[];assessment?:string;residue?:string;status?:'open'|'resolved'}
 | {movement:'ship';belief:string;challenge:string;revision?:'suspended'|'qualified'|'narrowed'|'withdrawn';replacement?:string;replacement_status?:'undecided'|'provisional'|'settled';belief_date?:string;source?:string;provenance?:'contemporary'|'reconstructed';consequences?:Consequence[];repairs?:{date:string;consequence:string;note:string}[]}
);
export function validateProcessRecords(records:ProcessRecord[]):string[]{
 const errors:string[]=[];const ids=new Set(records.map(r=>r.id));
 if(ids.size!==records.length)errors.push('Duplicate Process record id.');
 const encounterDates=new Map<string,string>();
 for(const r of records){
  const fail=(s:string)=>errors.push(`Process record ${r.id}: ${s}`);
  if(r.arose_from&&!ids.has(r.arose_from))fail(`unknown arose_from ${r.arose_from}`);
  const previous=encounterDates.get(r.encounter);if(previous&&previous!==r.date)fail('shared encounter has inconsistent dates');encounterDates.set(r.encounter,r.date);
  if(r.movement==='autopsy'){
   const rivals=new Map((r.rivals??[]).map(h=>[h.id,h]));
   if(rivals.size!==(r.rivals??[]).length)fail('duplicate rival id');
   for(const c of r.checks??[])for(const comparison of c.comparisons){const rival=rivals.get(comparison.rival);if(!rival)fail(`check ${c.id} references unknown rival`);else if(rival.introduced>c.date)fail(`check ${c.id} predates the rival it tests`)}
  }
  if(r.movement==='ship'){
   const consequences=new Set((r.consequences??[]).map(c=>c.id));
   for(const repair of r.repairs??[])if(!consequences.has(repair.consequence))fail('repair references unknown consequence');
  }
 }
 return errors;
}
