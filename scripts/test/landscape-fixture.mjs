export function fixture() {
  const sectors = [
    ['u','uav','UAV',null], ['p','uav-platform','Platforms','u'], ['v','uav-vtol','VTOL','p'],
    ['e','uav-ecosystem','Enabling technology','u'], ['a','eco-autonomy','Autonomy','e'],
    ['c','counter-uas','Counter-UAS',null], ['d','cuas-detection','Detection','c'], ['r','cuas-det-radar','Radar','d'],
    ['i','cuas-integrated','Integrated systems','c'],
  ].map(([id,slug,name,parent_id])=>({id,slug,name,parent_id}));
  const companies = ['uav','cuas','both','draft','excluded','review','candidate','outside','unclassified','missing-status'].map(id=>({id,name:id,slug:id,publication_status:'live',hq_country:'Germany',source_urls:[],description:'',website:'https://example.com'}));
  companies.find(c=>c.id==='draft').publication_status='draft';
  companies.find(c=>c.id==='outside').hq_country='United States';
  delete companies.find(c=>c.id==='missing-status').publication_status;
  return {
    companies, sectors,
    countries:[{code:'DE',name:'Germany',is_landscape_scope:true},{code:'GB',name:'United Kingdom',is_landscape_scope:true},{code:'US',name:'United States',is_landscape_scope:false}],
    candidates:companies.map(c=>({company_id:c.id,status:({excluded:'excluded',review:'needs_review',candidate:'candidate'})[c.id]||'included'})),
    assignments:companies.filter(c=>c.id!=='unclassified').map(c=>({company_id:c.id,sector_id:c.id==='cuas'?'i':'v',source_urls:[]})).concat([{company_id:'both',sector_id:'r',source_urls:['https://example.com/radar','javascript:alert(1)']}]),
    productsByCompany:new Map([['uav',[{name:'Example aircraft',url:'/uav/example-aircraft/'}]]]),
  };
}

