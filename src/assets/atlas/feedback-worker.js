// A bounded proof of work keeps automated submissions more costly without a third-party tracker.
const encoder=new TextEncoder();
self.onmessage=async({data})=>{
 const {token,bits}=data;const payload=token.split('.')[0],start=Date.now();
 for(let counter=0;counter<10000000;counter++){
  if(counter%2048===0&&Date.now()-start>45000){postMessage({error:'timeout'});return}
  const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(payload+':'+counter)));
  if(bits===16&&digest[0]===0&&digest[1]===0){postMessage({solution:counter});return}
 }
 postMessage({error:'timeout'});
};
