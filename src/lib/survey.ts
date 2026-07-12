// The survey grammar: every entry in the site is an accessioned document
// in an ongoing survey of language, sighted from one of three stations.

export const SHEET_PREFIX = {
  maps: "M",
  meta: "F",
  process: "L",
  project: "A",
} as const;

// Accession numbers are chronological: the first document acquired is 01.
export function accessionIndex(
  entries: { id: string; data: { date: Date } }[],
  prefix: string,
): Map<string, string> {
  const sorted = [...entries].sort(
    (a, b) => a.data.date.valueOf() - b.data.date.valueOf(),
  );
  const m = new Map<string, string>();
  sorted.forEach((e, i) =>
    m.set(e.id, `${prefix}-${String(i + 1).padStart(2, "0")}`),
  );
  return m;
}

export function accessionRange(count: number, prefix: string): string {
  if (count === 0) return "—";
  if (count === 1) return `${prefix}-01`;
  return `${prefix}-01 – ${prefix}-${String(count).padStart(2, "0")}`;
}

// Which station a process entry was sighted from, by dimension.
export type Station = "philosophy" | "experiments" | "modeling";

export function stationFor(dimension: string): Station {
  if (["empirical", "troubleshooting"].includes(dimension))
    return "experiments";
  if (["formal", "implementation"].includes(dimension)) return "modeling";
  return "philosophy"; // exploration, canon, readings, structured-learning
}
