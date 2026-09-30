import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {z} from 'zod';
import {createInquirySchema} from '../src/lib/process-schema.ts';
import {topicCounts} from '../src/lib/process-subjects.ts';
const schema=createInquirySchema(z);
const sparse=JSON.parse(readFileSync(new URL('./fixtures/sparse-inquiries.json',import.meta.url),'utf8'));

test('sparse Autopsy and Ship require only their movement core',()=>{
 const parsed=schema.parse(sparse);
 assert.deepEqual(parsed.records.map(r=>r.tags),[[],[]]);
 for(const [movement,field] of [['autopsy','observation'],['ship','belief'],['ship','challenge']]){
  const broken=structuredClone(sparse);delete broken.records.find(r=>r.movement===movement)[field];
  assert.equal(schema.safeParse(broken).success,false);
 }
});

test('checks can stand alone; revisions need no replacement or repairs',()=>{
 const data=structuredClone(sparse);
 data.records[0].checks=[{id:'rerun',date:'2026-09-30',description:'Repeat the run',produced:'The result repeated.'}];
 for(const revision of ['suspended','qualified','narrowed','withdrawn']){
  data.records[1].revision=revision;
  assert.deepEqual(schema.parse(data).records[0].checks[0].comparisons,[]);
 }
 data.records[1].replacement_status='undecided';
 assert.equal(schema.safeParse(data).success,true);
 data.records[1].consequences=[{id:'one',description:'Revisit the default',depends:''}];
 assert.equal(schema.safeParse(data).success,false);
});

test('topic counts span movements and separate tags stay separate',()=>{
 assert.deepEqual(topicCounts([{tags:['LSN','Statistics']},{tags:['LSN']},{tags:['Statistics','Statistics']},{tags:['GLMM']},{}]),[
  {tag:'LSN',count:2},{tag:'Statistics',count:2},{tag:'GLMM',count:1},
 ]);
 for(const tags of [['LSN/Statistics'],['LSN','lsn']]){
  const data=structuredClone(sparse);data.records[0].tags=tags;
  assert.equal(schema.safeParse(data).success,false);
 }
});
