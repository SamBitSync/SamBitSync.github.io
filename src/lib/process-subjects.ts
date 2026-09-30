export function recordTags(record: {subject?:string;tags?:string[]}):string[] {
 return record.tags??[];
}
export function subjectSlug(subject: string): string {
 return subject.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
}
export function subjectHref(subject: string): string {
 return `/process/subjects/${subjectSlug(subject)}/`;
}
export function topicCounts(records: {tags?:string[]}[]): {tag:string;count:number}[] {
 const counts = new Map<string,number>();
 for (const record of records) for (const tag of new Set(recordTags(record))) {
  counts.set(tag, (counts.get(tag) ?? 0) + 1);
 }
 return [...counts].map(([tag,count])=>({tag,count})).sort((a,b)=>b.count-a.count||a.tag.localeCompare(b.tag));
}
