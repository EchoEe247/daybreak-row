import test from "node:test";
import assert from "node:assert/strict";
import {parseGameSave,loadSaveStatus,persistGameSave,SAVE_KEY,BACKUP_KEY,RECOVERY_KEY} from "./save-codec.ts";

const good=()=>({
 version:1,name:"Alex",day:2,minute:615,money:140,food:2,
 needs:{energy:65,hunger:80,hygiene:90,social:55,fun:60},
 rel:{mara:1,ellis:2,theo:3,jun:4,idris:5},
 goals:{shower:true,meal:true,earn:false,groceries:false,talk:false,sleep:false,cushion:false,friend:false,rhythm:false,goodHour:false},
 log:["Still in the city."],place:"laundry",x:0.2,z:1225.3,yaw:0.4,
 rentMark:0,shiftDay:0,freelanceAt:2000,collapseAt:-9999,welcomed:false,
});
function memory(initial={}, fail=false){
 const db=new Map(Object.entries(initial));
 return {db,getItem(k){return db.get(k)??null;},setItem(k,v){if(fail)throw Error("QuotaExceededError");db.set(k,v);}};
}
test("valid legacy version-1 saves retain needs, money and coordinates",()=>{
 const game=good();
 assert.deepEqual(parseGameSave(game)?.needs,game.needs);
 const x=parseGameSave(game);
 assert.equal(x?.money,140);assert.equal(x?.z,1225.3);
 assert.deepEqual(x?.cityPassportVisits,[]);
 assert.deepEqual(x?.discoveredDistricts,[]);
});
test("malformed JSON, incomplete data, invalid place and non-finite or out-of-bounds coordinates are rejected",()=>{
 assert.equal(parseGameSave({version:1,money:186}),null);
 for(const data of [
 {place:"unknown"},{needs:null},{log:null},{day:0},{x:Infinity},{x:999},
 {z:-200},{minute:1440},{goals:{}},{rel:{mara:2}}, {cityPassportVisits:[null]}
 ])assert.equal(parseGameSave({...good(),...data}),null,JSON.stringify(data));
});
test("backup recovery never deletes the corrupt primary",()=>{
 const valid=JSON.stringify(good());
 const damaged=JSON.stringify({version:1,money:186});
 const store=memory({[SAVE_KEY]:damaged,[BACKUP_KEY]:valid});
 const outcome=loadSaveStatus(store);
 assert.equal(outcome.state?.money,140);
 assert.match(outcome.issue??"",/backup/);
 assert.equal(store.getItem(SAVE_KEY),damaged);
 assert.equal(persistGameSave(store,{...good(),money:153}),true);
 assert.equal(store.getItem(RECOVERY_KEY),damaged);
 assert.equal(JSON.parse(store.getItem(SAVE_KEY)).money,153);
});
test("failed storage writes cannot report success or damage a valid last save",()=>{
 const value=JSON.stringify(good());
 const store=memory({[SAVE_KEY]:value},true);
 assert.equal(persistGameSave(store,{...good(),money:200}),false);
 assert.equal(store.getItem(SAVE_KEY),value);
});
test("successful writes keep a valid previous snapshot as backup",()=>{
 const old=JSON.stringify(good());
 const store=memory({[SAVE_KEY]:old});
 assert.equal(persistGameSave(store,{...good(),money:220}),true);
 assert.equal(store.getItem(BACKUP_KEY),old);
 assert.equal(loadSaveStatus(store).state?.money,220);
});
test("read denial yields a recoverable error without clearing source storage",()=>{
 const denied={getItem(){throw Error("denied");}};
 const result=loadSaveStatus(denied);
 assert.equal(result.state,null);assert.match(result.issue??"",/could not be read/);
});
