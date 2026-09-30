import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateForest, deriveEdges, replay, forestView } from '../src/lib/forest.ts';
const demo = JSON.parse(readFileSync(new URL('./fixtures/forest-registry.json', import.meta.url)));
const clone = () => structuredClone(demo);
test('branch replay, circular discovery, and historical cutoff', () => {
 assert.deepEqual(validateForest(demo), []);
 assert.equal(replay(demo.attempts[0]).maxDepth, 4);
 assert.deepEqual(replay(demo.attempts[1]).stack, ['glmm']);
 assert.equal(replay(demo.attempts[1]).maxDepth, 3);
 assert.ok(forestView(demo, 'glmm').some(r => r.reference && r.node.id === 'glmm'));
 assert.ok(!forestView(demo, 'glmm', demo.attempts[0]).some(r => r.node.id === 'lmm'));
});
test('revisit preserves provenance; exposure needs no push', () => {
 const data = clone(); data.attempts[1].events.splice(1,0,{type:'expose',from:'glmm',node:'glm'});
 assert.equal(deriveEdges(data).filter(e => e.from === 'glmm' && e.to === 'glm').length, 1);
 assert.equal(deriveEdges(data).find(e => e.from === 'glmm' && e.to === 'glm').attempt, 'glmm-01');
 assert.ok(deriveEdges(data).some(e => e.to === 'model-checking'));
});
test('bad pops, duplicate stack nodes, unknown references and post-stop events fail', () => {
 for (const event of [{type:'pop',node:'odds'},{type:'push',node:'glmm'},{type:'reflect',node:'missing',note:'x'}]) {
  const data=clone();data.attempts[0].events.splice(1,0,event);assert.ok(validateForest(data).length);
 }
 const data=clone();data.attempts[0].events.push({type:'reflect',node:'glmm',note:'x'});assert.ok(validateForest(data).some(e=>e.includes('after stop')));
});
test('one active attempt and valid dissolution targets', () => {
 const data=clone();data.attempts.forEach(a=>a.events.pop());assert.ok(validateForest(data).some(e=>e.includes('Only one')));
 const bad=clone();bad.dissolutions.push({edge:'missing',date:'2026-09-28',reason:'x'});assert.ok(validateForest(bad).some(e=>e.includes('unknown edge')));
 const retired=clone();retired.dissolutions.push({edge:'glmm-01:1',date:'2026-09-28',reason:'Reconsidered'});
 assert.deepEqual(validateForest(retired),[]);
 assert.ok(!forestView(retired,'glmm').some(r=>r.node.id==='glm'));
 assert.ok(forestView(retired,'glmm',retired.attempts[0]).some(r=>r.node.id==='glm'));
});
