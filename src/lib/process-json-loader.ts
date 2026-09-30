import {glob, type Loader} from 'astro/loaders';

// Astro 5's glob loader returns early for an empty directory, retaining cached
// entries. Rebuild these small JSON collections from their source on each sync.
export function processJsonLoader(base:string):Loader {
 const loader=glob({base,pattern:'*.json'});
 return {
  ...loader,
  name:'process-json-loader',
  async load(context) {
   context.store.clear();
   await loader.load(context);
  },
 };
}
