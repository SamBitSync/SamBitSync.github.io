import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {processJsonLoader} from '../src/lib/process-json-loader.ts';

test('an empty JSON directory removes previously cached Process records',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'process-empty-'));
 assert.ok(resolve(directory).startsWith(resolve(tmpdir())));
 try {
  const store=new Map([['removed-example',{id:'removed-example'}]]);
  await processJsonLoader(pathToFileURL(directory).href+'/').load({
   config:{root:pathToFileURL(process.cwd()).href+'/',legacy:{collections:false}},store,
   logger:{warn(){}},entryTypes:new Map(),
  });
  assert.equal(store.size,0);
 } finally { rmdirSync(directory); }
});
