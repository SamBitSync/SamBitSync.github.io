export type Judgment = { date: string; reason: string };
export type Question = {
  id: string; label: string; question: string; first_encountered: string;
  process_note?: string; domain?: 'technical' | 'philosophical';
  closure?: 'convergent' | 'divergent'; thought_i_knew?: boolean;
  due?: string; predicament?: 'p' | 'b'; note?: string; dissolved?: Judgment;
};
export type Event =
  | { type: 'push'; node: string }
  | { type: 'pop'; node: string; note?: string }
  | { type: 'reflect'; node: string; note: string }
  | { type: 'expose'; from: string; node: string }
  | { type: 'stop'; reason: 'time_budget' | 'deferred' | 'popped_to_root'; note?: string };
export type Attempt = { id: string; root: string; date: string; title?: string; root_commit?: string; duration_minutes?: number; note?: string; events: Event[] };
export type Edge = { id: string; from: string; to: string; type: 'sharpens' | 'exposed_while_explaining'; attempt: string };
export type Registry = { version: 2; example?: boolean; nodes: Question[]; attempts: Attempt[]; edges: (Edge & { type: 'sharpens' })[]; dissolutions: (Judgment & { edge: string })[] };

export function replay(attempt: Attempt) {
  const stack: string[] = [], touched = new Set<string>(), popped = new Set<string>();
  let maxDepth = 0;
  let termination: string | undefined;
  for (const event of attempt.events) {
    if ('node' in event) touched.add(event.node);
    if (event.type === 'push') { stack.push(event.node); popped.delete(event.node); maxDepth = Math.max(maxDepth, stack.length - 1); }
    if (event.type === 'pop') { stack.pop(); popped.add(event.node); }
    if (event.type === 'stop') termination = event.reason;
  }
  return { stack, touched, popped, maxDepth, termination };
}

// First occurrence owns provenance. Revisits never silently revive dissolved edges.
export function deriveEdges(registry: Registry): Edge[] {
  const edges: Edge[] = [];
  const seen = new Set<string>();
  for (const attempt of registry.attempts) {
    const stack: string[] = [];
    attempt.events.forEach((event, index) => {
      const from = event.type === 'expose' ? event.from : event.type === 'push' ? stack.at(-1) : undefined;
      if (from && 'node' in event) {
        const key = JSON.stringify([from, event.node]);
        if (!seen.has(key)) {
          seen.add(key);
          edges.push({ id: `${attempt.id}:${index}`, from, to: event.node, type: 'exposed_while_explaining', attempt: attempt.id });
        }
      }
      if (event.type === 'push') stack.push(event.node);
      if (event.type === 'pop') stack.pop();
    });
  }
  return [...edges, ...registry.edges];
}

export function validateForest(data: Registry): string[] {
  const errors: string[] = [];
  const nodes = new Map(data.nodes.map(n => [n.id, n]));
  const attempts = new Map(data.attempts.map(a => [a.id, a]));
  if (nodes.size !== data.nodes.length) errors.push('Duplicate node ID.');
  if (attempts.size !== data.attempts.length) errors.push('Duplicate attempt ID.');
  let unfinished = 0;
  let previousDate = '';
  for (const attempt of data.attempts) {
    const stack: string[] = [];
    let stopped = false;
    const fail = (message: string) => errors.push(`Attempt ${attempt.id}: ${message}`);
    if (!nodes.has(attempt.root)) fail(`unknown root ${attempt.root}.`);
    if (attempt.date < previousDate) fail('attempts must be in chronological order.');
    previousDate = attempt.date;
    const first = attempt.events[0];
    if (first?.type !== 'push' || first.node !== attempt.root) fail('first event must push the root.');
    attempt.events.forEach((event, index) => {
      if (stopped) fail(`event ${index}: no events allowed after stop.`);
      const refs = event.type === 'expose' ? [event.from, event.node] : 'node' in event ? [event.node] : [];
      for (const id of refs) {
        const node = nodes.get(id);
        if (!node) fail(`event ${index}: unknown node ${id}.`);
        else if (node.first_encountered > attempt.date) fail(`event ${index}: ${id} was not yet encountered.`);
      }
      if (event.type === 'push') {
        if (stack.includes(event.node)) fail(`event ${index}: ${event.node} is already on the stack; use expose to record a cycle.`);
        if (index > 0 && !stack.length) fail(`event ${index}: cannot push after leaving the root.`);
        stack.push(event.node);
      }
      if (event.type === 'pop') {
        if (stack.at(-1) !== event.node) fail(`event ${index}: pop ${event.node} does not match stack top ${stack.at(-1) ?? '(empty)'}.`);
        else stack.pop();
      }
      if (event.type === 'stop') {
        stopped = true;
        if (event.reason === 'popped_to_root' && (stack.length !== 1 || stack[0] !== attempt.root)) fail('popped_to_root requires exactly the root on the stack.');
      }
    });
    if (!stopped) unfinished++;
  }
  if (unfinished > 1) errors.push('Only one attempt may be unfinished.');
  for (const node of data.nodes) if (node.dissolved && node.dissolved.date < node.first_encountered) errors.push(`Node ${node.id}: dissolution predates encounter.`);
  const edges = deriveEdges(data);
  if (new Set(edges.map(e => e.id)).size !== edges.length) errors.push('Duplicate edge ID (including derived IDs).');
  for (const edge of edges) {
    const attempt = attempts.get(edge.attempt);
    if (!attempt) errors.push(`Edge ${edge.id}: unknown attempt ${edge.attempt}.`);
    for (const id of [edge.from, edge.to]) {
      if (!nodes.has(id)) errors.push(`Edge ${edge.id}: unknown node ${id}.`);
      else if (attempt && nodes.get(id)!.first_encountered > attempt.date) errors.push(`Edge ${edge.id}: ${id} was not yet encountered.`);
    }
  }
  const dissolved = new Set<string>();
  for (const judgment of data.dissolutions) {
    const edge = edges.find(e => e.id === judgment.edge);
    if (!edge) errors.push(`Dissolution references unknown edge ${judgment.edge}.`);
    else if (attempts.get(edge.attempt) && judgment.date < attempts.get(edge.attempt)!.date) errors.push(`Edge ${edge.id}: dissolution predates discovery.`);
    if (dissolved.has(judgment.edge)) errors.push(`Duplicate dissolution for ${judgment.edge}.`);
    dissolved.add(judgment.edge);
  }
  return errors;
}

// The selected attempt is an end-of-attempt snapshot, not a claim to preserve old wording.
export function forestView(data: Registry, root: string, selected?: Attempt) {
  const index = selected ? data.attempts.findIndex(a => a.id === selected.id) : data.attempts.length - 1;
  const attempts = data.attempts.slice(0, index + 1);
  const cutoff = selected?.date ?? '9999-12-31';
  const ids = new Set(attempts.map(a => a.id));
  const nodes = new Map(data.nodes.map(n => [n.id, n]));
  const edges = deriveEdges(data).filter(e => ids.has(e.attempt) && !data.dissolutions.some(d => d.edge === e.id && d.date <= cutoff));
  const rows: { node: Question; depth: number; reference: boolean; via?: Edge }[] = [];
  const seen = new Set<string>();
  function visit(id: string, depth: number, via?: Edge) {
    const node = nodes.get(id)!;
    const reference = seen.has(id);
    rows.push({ node, depth, reference, via });
    if (reference || (node.dissolved && node.dissolved.date <= cutoff)) return;
    seen.add(id);
    edges.filter(e => e.from === id).forEach(e => visit(e.to, depth + 1, e));
  }
  visit(root, 0);
  return rows;
}
