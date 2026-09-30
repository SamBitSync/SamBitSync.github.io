import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateProcessRecords } from '../src/lib/process-records.ts';
import {validateForest,replay} from '../src/lib/forest.ts';
const { records } = JSON.parse(readFileSync(new URL('./fixtures/inquiries-september.json', import.meta.url),'utf8'));
const registry=JSON.parse(readFileSync(new URL('./fixtures/forest-september.json', import.meta.url),'utf8'));
test('month preview has valid references and shared encounters',()=>{
 assert.deepEqual(validateProcessRecords(records),[]);
 assert.equal(records.length,13);
 assert.equal(new Set(records.map(r=>r.encounter)).size,12);
 assert.deepEqual(new Set(records.map(r=>r.movement)),new Set(['forest','autopsy','ship','note']));
});
test('references and chronology reject broken records',()=>{
 const unknown=structuredClone(records);unknown[0].arose_from='missing';
 assert.match(validateProcessRecords(unknown).join(' '),/unknown arose_from/);
 const chronology=structuredClone(records);
 const autopsy=chronology.find(r=>r.movement==='autopsy'&&r.checks?.some(c=>c.comparisons.length));
 autopsy.rivals.forEach(r=>r.introduced='2099-01-01');
 assert.match(validateProcessRecords(chronology).join(' '),/predates/);
 const repair=structuredClone(records);repair.find(r=>r.movement==='ship').repairs=[{date:'2026-09-24',consequence:'missing',note:'Invalid reference'}];
 assert.match(validateProcessRecords(repair).join(' '),/unknown consequence/);
});
test('reconstructed Forest links preserve recurrence and unresolved stacks',()=>{
 assert.deepEqual(validateForest(registry),[]);
 for(const r of records.filter(r=>r.movement==='forest')){
  const a=registry.attempts.find(a=>a.id===r.forest_attempt);
  assert.ok(a);assert.equal(a.date,r.date);
 }
 const glmm=registry.attempts.filter(a=>a.root==='lsn-glmm');
 assert.equal(glmm.length,2);
 assert.deepEqual(replay(glmm[0]).stack,[]);
 assert.deepEqual(replay(glmm[1]).stack,['lsn-glmm','comparable-trials','same-construction','causal-chain']);
 assert.deepEqual(replay(registry.attempts.find(a=>a.id==='vwp-competitor')).stack,['competitor-definition','phonology-orthography','cross-language-equivalence']);
 assert.equal(records.find(r=>r.id==='lsn-glmm-29').arose_from,'le-coding');
 assert.equal(records.find(r=>r.id==='le-coding').arose_from,'no-le');
 assert.doesNotMatch(JSON.stringify(records),/P-559D1105|P-C55EF251/);
});
