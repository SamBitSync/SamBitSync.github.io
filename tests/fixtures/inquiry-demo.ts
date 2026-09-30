// Presentation samples: one shared encounter, not a second copy per movement.
export type Movement = 'autopsy' | 'ship';
type Base = { id: string; note: string };
export type InquiryEvent = Base & (
  | { type: 'observe'; subject: string }
  | { type: 'open'; subject: string; layer: string }
  | { type: 'hypothesize'; hypothesis: string }
  | { type: 'test'; hypothesis: string; description: string; produced: string; result: 'supported' | 'refuted' | 'unclear' }
  | { type: 'withdraw'; commitment: string; because: string }
  | { type: 'revise'; withdrawal: string; target: string; status: 'affected' | 'revised' }
  | { type: 'reflect'; withdrawal: string }
  | { type: 'stop'; reason: 'time_budget' | 'deferred' | 'session_complete' }
);
export const demo = {
  id: 'boundary-fit-demo', date: '2026-09-28', example: true,
  subject: { id:'boundary-fit', label:'A variance estimate at zero', question:'Why did the fitted between-group variation disappear?', model:'response ~ predictor + (1 | group)' },
  commitment: { id:'nonzero-variation', label:'A random intercept guarantees nonzero estimated between-group variation.' },
  hypotheses: [
    {id:'boundary', label:'A boundary estimate', mechanism:'For this data and specification, the fitted random-intercept variance sits at the boundary of the permitted parameter space.'},
    {id:'numerical', label:'A numerical problem', mechanism:'The fitted zero reflects a numerical problem rather than a stable boundary estimate.'},
  ],
  targets: [
    {id:'pooling-account', label:'Explanation of partial pooling', href:'/process/forest/glmm/', kind:'question'},
    {id:'glmm-note', label:'The GLMM written account', href:'/process/glmm/', kind:'Process note'},
  ],
  candidate: {id:'zero-is-possible', answer:'The fitted random-intercept variance can be zero.', excluded_by:'nonzero-variation'},
  events: [
    {id:'observe-fit', type:'observe', subject:'boundary-fit', note:'In this fictional fit, the model reports a boundary (singular) fit and estimates the random-intercept variance at zero.'},
    {id:'open-variance', type:'open', subject:'boundary-fit', layer:'Variance component', note:'Inspect the estimated variance component separately from the formula. This example has a random intercept only, with no random slopes or correlations.'},
    {id:'propose-boundary', type:'hypothesize', hypothesis:'boundary', note:'Perhaps zero is the fitted boundary estimate for this dataset and model. That would not establish a population variance of zero.'},
    {id:'propose-numerical', type:'hypothesize', hypothesis:'numerical', note:'Keep a numerical explanation in play until the fit has been checked. A warning alone does not distinguish these accounts.'},
    {id:'inspect-component', type:'test', hypothesis:'boundary', description:'Inspect the random-intercept variance and the singularity diagnostic.', produced:'Illustrative output: estimated variance = 0; singularity diagnostic = TRUE.', result:'supported', note:'This locates the boundary in the fitted model. It does not explain why the data led there.'},
    {id:'compare-optimizers', type:'test', hypothesis:'numerical', description:'Refit the same data and specification with an alternative optimizer and compare estimates and objective values.', produced:'Illustrative output: both optimizers return zero variance with matching objective values to the reported precision.', result:'unclear', note:'Agreement makes a simple optimizer-specific failure less compelling, but does not rule out every numerical issue.'},
    {id:'inspect-profile', type:'test', hypothesis:'boundary', description:'Inspect the fitted objective close to zero variance.', produced:'Illustrative output: the best value in the inspected neighbourhood is at the zero boundary.', result:'supported', note:'The local check is consistent with a boundary estimate. Sampling uncertainty and specification still need attention.'},
    {id:'withdraw-guarantee', type:'withdraw', commitment:'nonzero-variation', because:'inspect-component', note:'Withdraw the guarantee. Including a random intercept permits between-group variation to be estimated; it does not force the fitted variance away from zero.'},
    {id:'flag-pooling', type:'revise', withdrawal:'withdraw-guarantee', target:'pooling-account', status:'affected', note:'The explanation of pooling depends on what happens to the variance estimate. It needs to distinguish the specified model from the fitted result.'},
    {id:'rewrite-pooling', type:'revise', withdrawal:'withdraw-guarantee', target:'pooling-account', status:'revised', note:'Illustrative replacement: in this random-intercept-only fit, a variance estimate of zero collapses the fitted group intercept deviations to zero. This is a claim about the fit, not proof that the population has no between-group variation.'},
    {id:'flag-note', type:'revise', withdrawal:'withdraw-guarantee', target:'glmm-note', status:'affected', note:'Check the written account for claims that a random intercept necessarily produces distinct fitted group intercepts. The actual Process note has not been edited by this sample.'},
    {id:'reflect-change', type:'reflect', withdrawal:'withdraw-guarantee', note:'The formerly excluded answer is available again. Reopening a candidate does not make it the final explanation, and withdrawing this guarantee does not settle the competing hypotheses.'},
    {id:'stop-demo', type:'stop', reason:'time_budget', note:'Pause with the written account still to review and the numerical explanation unresolved.'},
  ] satisfies InquiryEvent[],
};
export const movements = {
  autopsy: {title:'Black-Box Autopsy', question:'What process produced this?', sample:'boundary-fit', label:'A variance estimate at zero', description:'Open a singular fit, compare two explanations, and examine what each check actually tells us.', figure:'02'},
  ship: {title:'Neurath’s Ship', question:'What else does this change?', sample:'random-intercept', label:'When a guarantee gives way', description:'Withdraw a claim about random intercepts, reopen an answer, and trace the writing that needs to change.', figure:'03'},
} as const;
export const movementFor = (event: InquiryEvent): Movement => ['observe','open','hypothesize','test'].includes(event.type) ? 'autopsy' : 'ship';
export function eventTitle(event: InquiryEvent): string {
  if(event.type === 'observe') return 'Observe · a singular fit';
  if(event.type === 'open') return `Open · ${event.layer.toLowerCase()}`;
  if(event.type === 'hypothesize' || event.type === 'test') return `${event.type === 'test' ? 'Test' : 'Hypothesize'} · ${demo.hypotheses.find(h=>h.id === event.hypothesis)!.label.toLowerCase()}`;
  if(event.type === 'withdraw') return 'Withdraw · the guarantee';
  if(event.type === 'revise') return `${event.status === 'affected' ? 'Affected' : 'Revised'} · ${demo.targets.find(t=>t.id === event.target)!.label.toLowerCase()}`;
  if(event.type === 'reflect') return 'Reflect · an answer becomes available again';
  return 'Stop · time budget';
}
export function stateAt(events: InquiryEvent[], index: number) {
  const recorded=events.slice(0,index+1);
  return {
    proposed:new Set(recorded.filter(e=>e.type==='hypothesize').map(e=>e.hypothesis)),
    tests:recorded.filter(e=>e.type==='test'),
    withdrawn:recorded.some(e=>e.type==='withdraw' && e.commitment===demo.commitment.id),
    targets:new Map(recorded.filter(e=>e.type==='revise').map(e=>[e.target,e.status])),
  };
}
export function validateDemo(events: InquiryEvent[]) {
  const ids=new Set<string>(), proposed=new Set<string>(), withdrawals=new Set<string>();
  let stopped=false;
  for(const e of events) {
    const fail=(message:string):never=>{throw new Error(`Inquiry sample, event ${e.id}: ${message}`)};
    if(ids.has(e.id)) fail('duplicate event id');
    if(stopped) fail('event follows stop');
    if(!e.note.trim()) fail('missing note');
    if((e.type==='observe'||e.type==='open') && e.subject!==demo.subject.id) fail('unknown subject');
    if(e.type==='hypothesize'||e.type==='test') {
      if(!demo.hypotheses.some(h=>h.id===e.hypothesis)) fail('unknown hypothesis');
      if(e.type==='hypothesize') proposed.add(e.hypothesis);
      else if(!proposed.has(e.hypothesis)||!e.description.trim()||!e.produced.trim()) fail('test needs a proposed hypothesis, method and output');
    }
    if(e.type==='withdraw') {
      if(e.commitment!==demo.commitment.id || !ids.has(e.because)) fail('unknown commitment or prior evidence');
      withdrawals.add(e.id);
    }
    if(e.type==='revise'||e.type==='reflect') {
      if(!withdrawals.has(e.withdrawal)) fail('unknown prior withdrawal');
      if(e.type==='revise' && !demo.targets.some(t=>t.id===e.target)) fail('unknown revision target');
    }
    if(e.type==='stop') stopped=true;
    ids.add(e.id);
  }
}
validateDemo(demo.events);
