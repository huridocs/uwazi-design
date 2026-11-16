import { entities, entityTypes } from "/Users/juanmnl/Developer/huridocs/uwazi_app/app/src/data/entities";
import { references } from "/Users/juanmnl/Developer/huridocs/uwazi_app/app/src/data/references";
console.log(JSON.stringify({ entities: entities.map(e=>({id:e.id,title:e.title,typeId:e.typeId,country:(e as any).country,createdAt:e.createdAt,published:e.published,searchFields:(e as any).searchFields,fields:(e as any).fields,descriptors:(e as any).descriptors})), types: entityTypes, references }));
