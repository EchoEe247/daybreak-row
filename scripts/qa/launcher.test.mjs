import test from "node:test";
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {createServer} from "node:http";
test("local launcher refuses another HTTP service on its port",async()=>{
 const server=createServer((_req,res)=>{res.writeHead(200,{"Content-Type":"text/plain"});res.end("unrelated");});
 await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
 try {
   const port=server.address().port;
   const result=await new Promise((resolve,reject)=>{
     const child=spawn("sh",["start-local.sh"],{cwd:new URL("../../",import.meta.url),env:{...process.env,DAYBREAK_PORT:String(port)}});
     let stderr="",stdout="";
     child.stderr.on("data",d=>stderr+=d.toString());
     child.stdout.on("data",d=>stdout+=d.toString());
     child.on("error",reject);
     child.on("close",code=>resolve({code,stderr,stdout}));
   });
   assert.equal(result.code,1,result.stdout+" "+result.stderr);
   assert.match(result.stderr,/different service|identity mismatch/);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
