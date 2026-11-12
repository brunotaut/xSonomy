const ENDPOINT='https://uobidcahmrmfdmfbrtkt.supabase.co/functions/v1/landscape-feedback';
const CONSENT_VERSION='2026-11-12';
const form=document.querySelector('#feedbackForm'),button=document.querySelector('#feedbackSubmit'),status=document.querySelector('#feedbackStatus');
let pending=null,inFlight=false;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function solve(token,bits){return new Promise((resolve,reject)=>{const worker=new Worker('/assets/atlas/feedback-worker.js?v=20261112');const timer=setTimeout(()=>{worker.terminate();reject(Error('The spam check took too long. Please try again.'))},50000);const stop=()=>{clearTimeout(timer);worker.terminate()};worker.onmessage=({data})=>{stop();if(Number.isSafeInteger(data.solution))resolve(data.solution);else reject(Error('The spam check could not finish. Please try again.'))};worker.onerror=()=>{stop();reject(Error('The spam check could not run. Please try again, or use the email address below.'))};worker.postMessage({token,bits})})}
form.addEventListener('submit',async event=>{
 event.preventDefault();if(inFlight||!form.reportValidity())return;
 inFlight=true;button.disabled=true;form.querySelectorAll('input, textarea').forEach(el=>el.disabled=true);status.classList.remove('feedback-error');status.textContent='Running a short spam check…';
 const email=form.elements.email.value.trim(),message=form.elements.message.value.trim(),signature=JSON.stringify([email,message]);
 try{
  if(!form.elements.consent.checked)throw Error('Please agree to the privacy information before sending.');
  if(!pending||pending.signature!==signature||Date.now()-pending.started>540000){
   const started=Date.now();const response=await fetch(ENDPOINT,{cache:'no-store',signal:AbortSignal.timeout(15000)});const challenge=await response.json();if(!response.ok||challenge.difficulty!==16||challenge.consentVersion!==CONSENT_VERSION)throw Error('The form is temporarily unavailable. Please try again later.');
   const solution=await solve(challenge.token,challenge.difficulty);await sleep(Math.max(0,1700-(Date.now()-started)));
   pending={signature,started,token:challenge.token,solution};
  }
  status.textContent='Saving your suggestion…';
  const response=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,message,consent:form.elements.consent.checked,consentVersion:CONSENT_VERSION,contactWebsite:form.elements.contactWebsite.value,token:pending.token,solution:pending.solution}),signal:AbortSignal.timeout(20000)});
  const result=await response.json();if(!response.ok||!result.ok){if(result.retryChallenge)pending=null;throw Error(result.error||'We could not confirm your submission. Please try again.')}
  form.hidden=true;document.querySelector('#feedbackSuccess').hidden=false;document.querySelector('#feedbackReference').textContent='Reference: '+result.reference;document.querySelector('#feedbackSuccess').focus();pending=null;
 }catch(error){status.classList.add('feedback-error');status.textContent=error.name==='TimeoutError'||error.name==='TypeError'?'We could not confirm your submission. Your text is still here — please try again.':error.message;}
 finally{inFlight=false;button.disabled=false;form.querySelectorAll('input, textarea').forEach(el=>el.disabled=false);}
});
