import { test } from 'node:test';
import assert from 'node:assert/strict';
import { demo, stateAt, validateDemo } from './fixtures/inquiry-demo.ts';

test('one sample log derives tests, withdrawal and separate revision states',()=>{
 assert.doesNotThrow(()=>validateDemo(demo.events));
 const before=stateAt(demo.events,6);
 assert.equal(before.withdrawn,false);
 assert.equal(before.tests.filter(e=>e.hypothesis==='boundary').length,2);
 assert.equal(before.tests.find(e=>e.hypothesis==='numerical').result,'unclear');
 const withdrawn=stateAt(demo.events,7);
 assert.equal(withdrawn.withdrawn,true);
 assert.equal(withdrawn.targets.size,0);
 assert.equal(stateAt(demo.events,8).targets.get('pooling-account'),'affected');
 const end=stateAt(demo.events,12);
 assert.equal(end.targets.get('pooling-account'),'revised');
 assert.equal(end.targets.get('glmm-note'),'affected');
});
test('sample rejects missing evidence, unknown targets and events after stop',()=>{
 const missing=structuredClone(demo.events);missing[4].produced='';
 assert.throws(()=>validateDemo(missing),/method and output/);
 const unknown=structuredClone(demo.events);unknown[8].target='missing';
 assert.throws(()=>validateDemo(unknown),/unknown revision target/);
 assert.throws(()=>validateDemo([...demo.events,{id:'after',type:'observe',subject:'boundary-fit',note:'x'}]),/follows stop/);
 const order=structuredClone(demo.events);order[7].because='future';
 assert.throws(()=>validateDemo(order),/prior evidence/);
});
