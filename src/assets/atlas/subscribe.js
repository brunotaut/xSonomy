const form=document.querySelector('#subscribeForm');
if(form){
 const endpoint='https://uobidcahmrmfdmfbrtkt.supabase.co/functions/v1/landscape-subscribe',version='2026-11-12';
 const button=form.querySelector('button'),status=document.querySelector('#subscribeStatus');let busy=false,pending;
 const pause=ms=>new Promise(r=>setTimeout(r,ms));
 function solve(token,bits){return new Promise((resolve,reject)=>{const worker=new Worker('/assets/atlas/feedback-worker.js?v=20261112'),timer=setTimeout(()=>{worker.terminate();reject(Error('The spam check took too long. Please try again.'))},50000);const stop=()=>{clearTimeout(timer);worker.terminate()};worker.onmessage=({data})=>{stop();Number.isSafeInteger(data.solution)?resolve(data.solution):reject(Error('The spam check could not finish. Please try again.'))};worker.onerror=()=>{stop();reject(Error('The spam check could not run. Please try again.'))};worker.postMessage({token,bits})})}
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(busy||!form.reportValidity())return;busy=true;button.disabled=true;form.elements.email.readOnly=true;status.classList.remove('subscription-error');status.textContent='Checking…';
  const email=form.elements.email.value.trim();
  try{
   if(!pending||pending.email!==email||Date.now()-pending.started>540000){const started=Date.now(),response=await fetch(endpoint,{cache:'no-store',signal:AbortSignal.timeout(15000)}),c=await response.json();if(!response.ok||c.difficulty!==16||c.consentVersion!==version)throw Error('Subscriptions are temporarily unavailable. Please try again later.');const solution=await solve(c.token,c.difficulty);await pause(Math.max(0,1700-(Date.now()-started)));pending={email,started,token:c.token,solution}}
   status.textContent='Subscribing…';const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,consent:true,consentVersion:version,contactWebsite:form.elements.contactWebsite.value,token:pending.token,solution:pending.solution}),signal:AbortSignal.timeout(20000)}),result=await response.json();if(!response.ok||!result.ok){if(result.retryChallenge)pending=null;throw Error(result.error||'Could not confirm your subscription. Please try again.')}
   form.hidden=true;status.textContent='You’re subscribed. Thank you for following xSonomy.';status.tabIndex=-1;status.focus();pending=null;
  }catch(error){status.classList.add('subscription-error');status.textContent=['TimeoutError','TypeError'].includes(error.name)?'Could not confirm your subscription. Please try again.':error.message}
  finally{busy=false;button.disabled=false;form.elements.email.readOnly=false}
 });
}
