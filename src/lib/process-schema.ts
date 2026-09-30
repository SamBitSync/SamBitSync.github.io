import {validateProcessRecords} from './process-records.ts';

// Reuse Astro's Zod instance in production and the same schema in tests.
export function createInquirySchema(z: typeof import('astro:content').z) {
const recordBase = {
 id:z.string().regex(/^[a-z0-9-]+$/),encounter:z.string().min(1),date:z.string().date(),title:z.string().min(1),subject:z.string().min(1),tags:z.array(z.string().trim().min(1).refine(tag=>!/[\/|]/.test(tag),'Use separate tags instead of joining them with a slash or pipe.')).refine(tags=>new Set(tags.map(t=>t.toLowerCase())).size===tags.length,'Duplicate tag.').default([]),summary:z.string().min(1),example:z.boolean(),reconstruction:z.string().min(1).optional(),writing:z.array(z.object({heading:z.string().min(1),paragraphs:z.array(z.string().min(1)).min(1)}).strict()).min(1).optional(),arose_from:z.string().optional(),next:z.string().optional(),
};
return z.object({records:z.array(z.discriminatedUnion('movement',[
  z.object({...recordBase,movement:z.literal('forest'),question:z.string().min(1),account:z.string().optional(),reflection:z.string().optional(),forest_attempt:z.string().optional()}).strict(),
  z.object({...recordBase,movement:z.literal('note'),account:z.string().min(1)}).strict(),
  z.object({...recordBase,movement:z.literal('autopsy'),observation:z.string().min(1),expected:z.string().min(1).optional(),status:z.enum(['open','resolved']).optional(),assessment:z.string().optional(),residue:z.string().optional(),
   rivals:z.array(z.object({id:z.string(),explanation:z.string().min(1),introduced:z.string().date()}).strict()).optional(),
   checks:z.array(z.object({id:z.string(),date:z.string().date(),description:z.string().min(1),produced:z.string().min(1),assessment:z.string().optional(),discriminates:z.enum(['yes','no','unclear']).optional(),comparisons:z.array(z.object({rival:z.string(),result:z.enum(['supports','against','inconclusive','not_tested'])}).strict()).default([])}).strict()).optional(),
  }).strict(),
  z.object({...recordBase,movement:z.literal('ship'),belief:z.string().min(1),challenge:z.string().min(1),revision:z.enum(['suspended','qualified','narrowed','withdrawn']).optional(),replacement:z.string().optional(),replacement_status:z.enum(['undecided','provisional','settled']).optional(),belief_date:z.string().date().optional(),source:z.string().optional(),provenance:z.enum(['contemporary','reconstructed']).optional(),
   consequences:z.array(z.object({id:z.string(),description:z.string().min(1),depends:z.string().min(1),kind:z.enum(['belief','explanation','decision','work']).optional(),status:z.enum(['holds','needs_repair','repaired','abandoned']).optional(),reason:z.string().optional(),href:z.string().optional()}).strict()).optional(),
   repairs:z.array(z.object({date:z.string().date(),consequence:z.string(),note:z.string().min(1)}).strict()).optional(),
  }).strict(),
 ])).min(1)}).strict().superRefine((data,ctx)=>{for(const message of validateProcessRecords(data.records))ctx.addIssue({code:'custom',message})});
}
