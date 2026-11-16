import fs from "fs";
export function mk(name){
  const out=[]; 
  const rec=(id,res,ev,shot="")=>{ out.push({id,res,ev:String(ev).replace(/\s+/g," "),shot}); console.log(res,"|",id,"|",String(ev).replace(/\s+/g," ").slice(0,400)); };
  const save=()=>fs.writeFileSync(new URL(`./results-${name}.json`, import.meta.url), JSON.stringify(out,null,1));
  return {rec,save,out};
}
export const realErr=(errors)=>errors.filter(e=>!/atomFamily is deprecated/.test(e));
export const SHOTDIR="acceptance-run-1-shots/";
