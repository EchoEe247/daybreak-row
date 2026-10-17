import {execFileSync} from "node:child_process";
import {readFileSync,statSync} from "node:fs";
const root=new URL("../../",import.meta.url);
const files=execFileSync("git",["ls-files","-z"],{cwd:root,encoding:"utf8"}).split("\0").filter(Boolean);
const patterns=[
 ["private_key",/-----BEGIN (?:RSA |OPENSSH |EC |DSA )?PRIVATE KEY-----/],
 ["github_token",/(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})/],
 ["openai_key",/sk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{25,}/],
 ["aws_access_key",/AKIA[0-9A-Z]{16}/],
];
const suspicious=[];
for(const file of files) {
  if(!/\.(?:mjs|cjs|js|ts|tsx|json|md|sh|yml|yaml|toml|txt|env)$/.test(file))continue;
  try {
    if(statSync(new URL("../../"+file,import.meta.url)).size>2e6)continue;
    const data=readFileSync(new URL("../../"+file,import.meta.url),"utf8");
    for(const [kind,re] of patterns)if(re.test(data))suspicious.push(file+" ("+kind+")");
  }catch{/* binary or generated */}
}
if(suspicious.length){console.error("Potential tracked secrets (values intentionally suppressed):",...suspicious);process.exitCode=1;}
else console.log("Tracked-file secret-pattern scan passed:",files.length,"tracked paths checked.");
