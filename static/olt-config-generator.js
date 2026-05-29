// Generator script extracted from the original static HTML.
// This file intentionally preserves the original logic and variable names.
const TEMPLATES = [
  {
    key:'vsol_8pon_allvlan', name:'VSOL 2-8 PON · ALL VLAN',
    desc:'gem_1 INTERNET on a tagged vlan, gem_2 transparent VLAN range.',
    fields:{start:10,end:200,rangeSize:10,internet:5,id:2},
    gen:(p)=>{let t="";for(let i=+p.start;i<+p.end;i+=+p.rangeSize){let r=i+ +p.rangeSize-1;if(r>+p.end)r=+p.end;
      t+=`profile line id ${p.id++} name vlan_${i}-${r}_internet_${p.internet}
  tcont 1 dba default1
    gemport 1 tcont 1 gemport_name gem_1
      service INTERNET gemport 1 vlan ${p.internet}
      service-port 1 gemport 1 uservlan ${p.internet} vlan ${p.internet}
    gemport 2 tcont 1 gemport_name gem_2
      service VLAN gemport 2 vlan ${i}-${r}
      service-port 2 gemport 2 uservlan ${i} to ${r} transparent
commit
exit
!\n`;}return t;}
  },
  {
    key:'vsol_8pon_untag', name:'VSOL 2-8 PON · UNTAG INTERNET',
    desc:'gem_1 INTERNET untagged, gem_2 transparent VLAN range.',
    fields:{start:10,end:200,rangeSize:10,id:2},
    gen:(p)=>{let t="";for(let i=+p.start;i<+p.end;i+=+p.rangeSize){let r=i+ +p.rangeSize-1;if(r>+p.end)r=+p.end;
      t+=`profile line id ${p.id++} name vlan_${i}-${r}_internet_untag
  tcont 1 dba default1
    gemport 1 tcont 1 gemport_name gem_1
      service INTERNET gemport 1 untag
      service-port 1 gemport 1 uservlan untag vlan 1
    gemport 2 tcont 1 gemport_name gem_2
      service VLAN gemport 2 vlan ${i}-${r}
      service-port 2 gemport 2 uservlan ${i} to ${r} transparent
commit
exit
!\n`;}return t;}
  },
  {
    key:'vsol_8pon_untag_vlan1', name:'VSOL 2-8 PON · UNTAG + VLAN1',
    desc:'gem_1 INTERNET untagged, gem_2 carries range + internet vlan service-port.',
    fields:{start:10,end:200,rangeSize:10,id:2,internet:5},
    gen:(p)=>{let t="";for(let i=+p.start;i<+p.end;i+=+p.rangeSize){let r=i+ +p.rangeSize-1;if(r>+p.end)r=+p.end;
      t+=`profile line id ${p.id++} name vlan_${i}-${r}_internet_untag_vlan1
  tcont 1 dba default1
    gemport 1 tcont 1 gemport_name gem_1
      service INTERNET gemport 1 untag
      service-port 1 gemport 1 uservlan untag vlan 1
    gemport 2 tcont 1 gemport_name gem_2
      service VLAN gemport 2 vlan ${i}-${r},${p.internet}
      service-port 2 gemport 2 uservlan ${i} to ${r} transparent
      service-port 3 gemport 2 uservlan ${p.internet} vlan ${p.internet}
commit
exit
!\n`;}return t;}
  },
  {
    key:'vsol_8pon_samegem', name:'VSOL 2-8 PON · SAME GEMPORT',
    desc:'Single gemport carrying internet vlan + range, split uservlan service-ports.',
    fields:{start:10,end:200,rangeSize:10,id:2,internet:5},
    gen:(p)=>{let t="";for(let i=+p.start;i<+p.end;i+=+p.rangeSize){let r=i+ +p.rangeSize-1;if(r>+p.end)r=+p.end;
      t+=`profile line id ${p.id++} name vlan_${i}-${r}_internet
  tcont 1 name tcont_1 dba default1
    gemport 1 tcont 1 gemport_name gem_1
      service INTERNET gemport 1 vlan ${p.internet},${i}-${r}
      service-port 1 gemport 1 uservlan ${p.internet} vlan ${p.internet}
      service-port 2 gemport 1 uservlan ${i} to ${r} transparent
commit
exit
!\n`;}return t;}
  },
  {
    key:'vsol_16pon_vlan', name:'VSOL 16 PON · VLAN INTERNET',
    desc:'Per-VLAN profile (one vlan each), single gemport internet + vlan service-ports.',
    fields:{start:10,end:200,id:2,internet:5},
    gen:(p)=>{let t="";for(let i=+p.start;i<+p.end;i++){
      t+=`profile line id ${p.id++} name vlan_${i}_internet_${p.internet}
  tcont 1 name tcont_1 dba default1
    gemport 1 tcont 1 gemport_name gem_1
      service INTERNET gemport 1 vlan ${p.internet},${i}
      service-port 1 gemport 1 uservlan ${p.internet} vlan ${p.internet}
      service-port 2 gemport 1 uservlan ${i} vlan ${i}
commit
exit
!\n`;}return t;}
  },
  {
    key:'vsol_16pon_untag', name:'VSOL 16 PON · UNTAG INTERNET',
    desc:'Per-VLAN profile, gem_1 untagged internet, gem_2 single vlan. [fixed: gem_2 service-port now bound to gemport 2]',
    fields:{start:10,end:200,id:2,internet:5},
    gen:(p)=>{let t="";for(let i=+p.start;i<+p.end;i++){
      t+=`profile line id ${p.id++} name vlan_${i}_internet_untag
  tcont 1 name tcont_1 dba default1
    gemport 1 tcont 1 gemport_name gem_1
      service INTERNET gemport 1 untag
      service-port 1 gemport 1 uservlan untag vlan 1
    gemport 2 tcont 1 gemport_name gem_2
      service VLAN gemport 2 vlan ${i}
      service-port 2 gemport 2 uservlan ${i} vlan ${i}
commit
exit
!\n`;}return t;}
  },
  {
    key:'vsol_1pon_allvlan', name:'VSOL 1 PON · ALL VLAN',
    desc:'Single gemport, INTERNET tag of vlan 1 + range.',
    fields:{start:10,end:200,rangeSize:10,id:2},
    gen:(p)=>{let t="";for(let i=+p.start;i<+p.end;i+=+p.rangeSize){let r=i+ +p.rangeSize-1;if(r>+p.end)r=+p.end;
      t+=`profile line id ${p.id++} name vlan_${i}-${r}_internet
  tcont 1 dba default1
    gemport 1 tcont 1 gemport_name gem_1
      service INTERNET gemport 1 tag 1,${i}-${r}
commit
exit
!\n`;}return t;}
  },
  {
    key:'vsol_1pon_untag', name:'VSOL 1 PON · UNTAG INTERNET',
    desc:'gem_1 INTERNET untag vlan 1, gem_2 tagged range + internet vlan.',
    fields:{start:10,end:200,rangeSize:10,id:2,internet:5},
    gen:(p)=>{let t="";for(let i=+p.start;i<+p.end;i+=+p.rangeSize){let r=i+ +p.rangeSize-1;if(r>+p.end)r=+p.end;
      t+=`profile line id ${p.id++} name vlan_${i}-${r}_internet_untag
  tcont 1 dba default1
    gemport 1 tcont 1 gemport_name gem_1
      service INTERNET gemport 1 untag vlan 1
    gemport 2 tcont 1 gemport_name gem_2
      service VLAN gemport 2 tag ${i}-${r},${p.internet}
commit
exit
!\n`;}return t;}
  },
  {
    key:'bdcom', name:'BDCom OLT · flow-mapping',
    desc:'BDCom onu-flow-mapping profile. entry 1 all eth-uni, entry 2 mapped to VLAN range.',
    fields:{start:10,end:200,rangeSize:10,id:2},
    gen:(p)=>{let t="";for(let i=+p.start;i<+p.end;i+=+p.rangeSize){let r=i+ +p.rangeSize-1;if(r>+p.end)r=+p.end;
      t+=`gpon profile onu-flow-mapping flow-map-vlan-${i}-${r} id ${p.id++}
 gpon-profile entry 1 uni type eth-uni all
 gpon-profile entry 1 virtual-port 1
 gpon-profile entry 2 uni type eth-uni all
 gpon-profile entry 2 vlan ${i}-${r}
 gpon-profile entry 2 virtual-port 1
!\n`;}return t;}
  },
  {
    key:'vendo_json', name:'Vendo · JSON block',
    desc:'Per-vendo JSON entries. The counter maps to the 3rd octet; when it exceeds 255 it carries into the 2nd octet so IPs stay valid. Set base (1st octet + starting 2nd octet), vendo host, and gateway host.',
    fields:{start:151,end:199},
    textFields:{base:'10.0',vendoHost:'2',gwHost:'1'},
    gen:(p)=>{let t="";const parts=String(p.base).split('.');const o1=parts[0]||'10';let baseO2=+(parts[1]||0);
      for(let i=+p.start;i<=+p.end;i++){
        let o2=baseO2+Math.floor(i/256);let o3=i%256;
        t+=`    {
        vendoName: "VENDO ${i}",
        vendoIp: "${o1}.${o2}.${o3}.${p.vendoHost}",
        hotspotAddress: "${o1}.${o2}.${o3}.${p.gwHost}",
        interfaceName: "vlan${i}",
        enableEload: false,
        enableFreeMovies: true,
        enableVoucherVault: true,
        voucherMode: false
    },\n`;}return t;}
  }
];
const FIELD_LABELS={start:'Start VLAN',end:'End VLAN',rangeSize:'Range size',id:'Starting profile ID',internet:'Internet VLAN',base:'IP base (1st.2nd octet)',vendoHost:'Vendo host (last octet)',gwHost:'Gateway host (last octet)'};
const tabsEl=document.getElementById('tabs'),panelsEl=document.getElementById('panels');
TEMPLATES.forEach((tpl,idx)=>{
  const tab=document.createElement('button');
  tab.className='tab'+(idx===0?' active':'');tab.textContent=tpl.name;tab.onclick=()=>switchTab(idx);tabsEl.appendChild(tab);
  const panel=document.createElement('div');panel.className='panel'+(idx===0?' active':'');
  let f='';for(const k in tpl.fields){const mx=k==='rangeSize'?' max="11" min="1"':'';f+=`<div class="field"><label>${FIELD_LABELS[k]||k}</label><input type="number"${mx} data-tpl="${idx}" data-field="${k}" value="${tpl.fields[k]}"></div>`;}
  if(tpl.textFields){for(const k in tpl.textFields){f+=`<div class="field"><label>${FIELD_LABELS[k]||k}</label><input type="text" data-tpl="${idx}" data-tfield="${k}" value="${tpl.textFields[k]}"></div>`;}}
  panel.innerHTML=`<div class="controls"><h3>Parameters</h3>${f}<div class="desc">${tpl.desc}</div></div>
    <div class="output"><div class="output-bar"><div class="meta"><b id="count-${idx}">0</b> profiles · <span id="lines-${idx}">0</span> lines</div>
    <div class="btns"><button class="btn" data-copy="${idx}">Copy</button><button class="btn ghost" data-dl="${idx}">Download .sh</button></div></div>
    <pre id="out-${idx}"></pre></div>`;
  panelsEl.appendChild(panel);
});
function getParams(idx){const tpl=TEMPLATES[idx],p={};for(const k in tpl.fields){const el=document.querySelector(`input[data-tpl="${idx}"][data-field="${k}"]`);let v=el?+el.value:tpl.fields[k];if(k==='rangeSize'&&v>11)v=11;p[k]=v;}
  if(tpl.textFields){for(const k in tpl.textFields){const el=document.querySelector(`input[data-tpl="${idx}"][data-tfield="${k}"]`);p[k]=el?el.value:tpl.textFields[k];}}return p;}
function render(idx){const tpl=TEMPLATES[idx],out=tpl.gen(getParams(idx));document.getElementById('out-'+idx).textContent=out;
  const c=(out.match(/^!/gm)||[]).length||(out.match(/},/g)||[]).length;
  document.getElementById('count-'+idx).textContent=c;
  document.getElementById('lines-'+idx).textContent=out.split('\n').length-1;}
function switchTab(idx){document.querySelectorAll('.tab').forEach((el,i)=>el.classList.toggle('active',i===idx));document.querySelectorAll('.panel').forEach((el,i)=>el.classList.toggle('active',i===idx));}
function toast(m){const t=document.getElementById('toast');t.textContent=m;t.classList.add('show');clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('show'),1600);} 
document.addEventListener('input',e=>{if(e.target.dataset.tpl!==undefined)render(+e.target.dataset.tpl);});
document.addEventListener('click',e=>{
  if(e.target.dataset.copy!==undefined){navigator.clipboard.writeText(document.getElementById('out-'+e.target.dataset.copy).textContent).then(()=>toast('Copied to clipboard'));}
  if(e.target.dataset.dl!==undefined){const idx=e.target.dataset.dl,txt=document.getElementById('out-'+idx).textContent,b=new Blob([txt],{type:'text/plain'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=TEMPLATES[idx].key+'.sh';a.click();URL.revokeObjectURL(a.href);toast('Downloaded');}
});
TEMPLATES.forEach((_,i)=>render(i));
