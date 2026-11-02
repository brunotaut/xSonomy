import test from 'node:test';
import assert from 'node:assert/strict';
import {buildLandscapeEvents} from '../lib/landscape.mjs';
import {eventState,filterEvents,calendarFile,monthDays,validateEvents} from '../../src/assets/atlas/events-model.js';
const r={id:'one',slug:'uav-summit-2029',series_key:'uav-summit',name:'UAV Summit',edition_year:2029,start_date:'2029-09-11',end_date:'2029-09-13',date_status:'confirmed',event_status:'scheduled',publication_status:'ready',country_code:'DE',country:'Germany',city:'Düsseldorf',website_url:'https://example.org/',topic_tags:['uav'],event_types:['conference'],relevance_tier:'core',checked_at:'2026-11-02'};
const source={event_id:'one',url:'https://example.org/dates',source_type:'organizer',supported_fields:['dates'],finding_en:'Dates published'};
test('export includes far-future editions without a cutoff and separates undated research',()=>{
 const watch={...r,id:'two',slug:'next-edition',publication_status:'watchlist',date_status:'unannounced',start_date:'2028-01-01',end_date:'2028-01-02'};
 const out=buildLandscapeEvents({events:[r,watch,{...r,slug:'retired',publication_status:'retired'}],sources:[source,{...source,event_id:'two'}]});
 assert.equal(out.events.length,1);assert.equal(out.events[0].year,2029);assert.equal(out.watchlist.length,1);assert.equal(out.watchlist[0].start,null);assert.equal(out.watchlist[0].end,null);assert.equal(out.counts.countries,1);assert.equal(validateEvents(out),out);
});
test('dated editions need an institutional or organiser date source; unsafe links cannot become evidence',()=>{
 assert.throws(()=>buildLandscapeEvents({events:[r],sources:[{...source,source_type:'industry_media'}]}),/Unverified dated/);
 assert.throws(()=>buildLandscapeEvents({events:[r],sources:[{...source,url:'javascript:alert(1)'}]}),/evidence/);
 assert.throws(()=>buildLandscapeEvents({events:[{...r,end_date:'2029-09-10'}],sources:[source]}),/Unverified dated/);
});
test('event filters combine country, topic and year and fold city accents',()=>{
 const d=buildLandscapeEvents({events:[r],sources:[source]});
 assert.equal(filterEvents(d,{...eventState(),q:'dusseldorf',country:'DE',topic:'uav',year:'2029'},'2026-11-02').length,1);
 assert.equal(filterEvents(d,{...eventState(),country:'FR'},'2026-11-02').length,0);
 assert.equal(filterEvents(d,eventState(),'2030-01-01').length,0);
 assert.equal(filterEvents(d,{...eventState(),status:'past'},'2030-01-01').length,1);
});
test('calendar retains ongoing multi-day events through their inclusive last day',()=>{
 const d=buildLandscapeEvents({events:[r],sources:[source]});
 assert.equal(filterEvents(d,eventState(),'2029-09-13').length,1);
 assert.equal(filterEvents(d,eventState(),'2029-09-14').length,0);
});
test('calendar downloads use exclusive DTEND across month/year boundaries and escape text',()=>{
 const e={slug:'year-end',name:'Drone, UAV; Summit\nOne',description:'Research',start:'2027-12-30',end:'2027-12-31',url:'https://example.org',venue:'A',city:'B',countryName:'C'};
 const ics=calendarFile(e);assert.match(ics,/DTSTART;VALUE=DATE:20271230/);assert.match(ics,/DTEND;VALUE=DATE:20280101/);assert.ok(ics.includes('SUMMARY:Drone\\, UAV\\; Summit\\nOne'));assert.throws(()=>calendarFile({...e,start:null}),/Undated/);
 assert.deepEqual(monthDays('2028-02'),{offset:1,total:29});
});
test('shared event state preserves filters, selected edition and calendar month',()=>{
 const s=eventState('?country=DE&year=2029&view=calendar&month=2029-09&event=uav-summit-2029&status=tba');
 assert.equal(s.country,'DE');assert.equal(s.year,'2029');assert.equal(s.month,'2029-09');assert.equal(s.selected,r.slug);assert.equal(s.status,'tba');
 assert.equal(eventState('?month=2029-99&status=bad').month,'');assert.equal(eventState('?status=bad').status,'upcoming');
});

test('calendar export folds long Unicode lines within the iCalendar byte limit',()=>{
 const e={slug:'long',name:'Дрон'.repeat(50),description:'Research',start:'2028-02-28',end:'2028-02-29',url:'https://example.org'};
 for(const line of calendarFile(e).split('\r\n'))assert.ok(new TextEncoder().encode(line).length<=75);
 assert.match(calendarFile(e),/DTEND;VALUE=DATE:20280301/);
});
