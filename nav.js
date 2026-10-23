/* nav.js — เมนูซ้ายกลางของชุดโปรแกรมรายได้ (22 ต.ค.69)
   - จอคอม (กว้าง ≥ 900px): เมนูต้นไม้ด้านซ้ายแบบ ACC-BILLING แทนแถบปุ่มด้านบน · ย่อเหลือไอคอนได้
   - จอมือถือ: ไม่แตะ — ใช้แถบเมนูเดิมของแต่ละหน้า
   - สิทธิ์เห็นเมนูตาม rev_role (cashier / finance / owner) เหมือนแถบเดิม · เมนูที่ไม่มีสิทธิ์ไม่ขึ้นเลย
   - แก้เมนูที่ไฟล์นี้ไฟล์เดียว ทุกหน้าเปลี่ยนตาม
*/
(function(){
  "use strict";
  if(window.__kmNav) return; window.__kmNav=true;
  var I={
    form:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/>',
    check:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/><path d="M8 10.5l2 2 3.5-3.5"/>',
    debt:'<rect x="7" y="3" width="13" height="18" rx="2"/><path d="M4 7h5M4 11h5M4 15h5"/><path d="M12 8h5M12 12h5"/>',
    stmt:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    cart:'<path d="M3 4h2l2.4 11h10.2L20 8H7"/><circle cx="10" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/>',
    bank:'<path d="M3 10l9-6 9 6"/><path d="M5 10v8M10 10v8M14 10v8M19 10v8M3 20h18"/>',
    chart:'<path d="M4 20v-5h4v5M10 20v-8h4v8M16 20V9h4v11"/>',
    caret:'<path d="M9 6l6 6-6 6"/>', left:'<path d="M15 6l-6 6 6 6"/>'
  };
  /* roles: c=แคชเชียร์ f=การเงิน o=เจ้าของ
     "รายการเดินบัญชี K+/กสิกร" ให้แคชเชียร์เห็นได้หลังเจ้าของอนุมัติเปิดสิทธิ์ (ตอนนี้ f,o เหมือนเดิม) */
  var MENU=[
    {grp:"งานประจำวัน"},
    {id:"form",label:"ฟอร์มรายรับ",icon:"form",roles:"cfo",href:"ฟอร์มรายรับ.html"},
    {id:"audit",label:"ตรวจรายได้",icon:"check",roles:"cfo",href:"index.html",kids:[
      {id:"audit-day",label:"ตรวจรายวัน / ยืนยันยอด",href:"index.html"},
      {id:"audit-cut",label:"อนุมัติตัดบิล",href:"index.html#cutCard",roles:"o"},
      {id:"audit-pend",label:"เงินรอจับคู่",href:"index.html#pendcard"},
      {id:"audit-dep",label:"ทะเบียนมัดจำ",href:"index.html#depcard"},
      {id:"audit-hist",label:"ดูย้อนหลังรายวัน",href:"สารบัญ-รายได้.html",roles:"o"}]},
    {id:"debt",label:"ลูกหนี้ลงบัญชี",icon:"debt",roles:"cfo",href:"ลูกหนี้ลงบัญชี.html"},
    {id:"stmt",label:"รายการเดินบัญชี K+/กสิกร",icon:"stmt",roles:"fo",href:"การเงินบริษัท.html#income"},
    {grp:"ช่องทางขาย"},
    {id:"shopee",label:"Shopee",icon:"cart",roles:"fo",href:"shopee.html",kids:[
      {id:"sh-pay",label:"ออเดอร์ Shopee",href:"shopee.html#pay",roles:"fo"},
      {id:"sh-fee",label:"ค่าธรรมเนียม",href:"shopee.html#fee",roles:"fo"},
      {id:"sh-pack",label:"ค่าแพ็ค",href:"shopee.html#pack"},
      {id:"sh-pnl",label:"กำไร-ขาดทุน",href:"shopee.html#pnl",roles:"o"},
      {id:"sh-rtn",label:"ตีกลับ / ยกเลิก",href:"shopee.html#rtn"}]},
    {grp:"การเงิน / ผู้บริหาร"},
    {id:"fin",label:"การเงินบริษัท",icon:"bank",roles:"o",href:"การเงินบริษัท.html",kids:[
      {id:"fin-exp",label:"รายจ่าย",href:"การเงินบริษัท.html#expense"},
      {id:"fin-mon",label:"สรุปรายจ่ายรายเดือน",href:"การเงินบริษัท.html#monthly"},
      {id:"fin-cash",label:"กระแสเงินสด",href:"การเงินบริษัท.html#cash"},
      {id:"fin-gross",label:"กำไรขั้นต้น",href:"การเงินบริษัท.html#gross"}]},
    {id:"dash",label:"Dashboard สรุปรายได้",icon:"chart",roles:"o",href:"Dashboard-สรุปรายได้.html"}
  ];
  var ROLE_KEY={cashier:"c",finance:"f",owner:"o"};
  function role(){ var r=null; try{ r=window.ROLE||localStorage.getItem("rev_role"); }catch(e){} return ROLE_KEY[r]||null; }
  function can(x,r){ return !x.roles || (r && x.roles.indexOf(r)>=0); }
  function page(){ var p=decodeURIComponent(location.pathname.split("/").pop()||"index.html"); return p||"index.html"; }
  function curId(){
    var p=page(), h=location.hash;
    for(var i=0;i<MENU.length;i++){ var m=MENU[i]; if(!m.id) continue;
      if(m.kids){ for(var j=0;j<m.kids.length;j++){ var k=m.kids[j], kp=k.href.split("#"); if(kp[0]===p && (kp[1]?("#"+kp[1])===h:!h)) return k.id; } }
      var mp=m.href.split("#"); if(mp[0]===p && (!mp[1]||("#"+mp[1])===h)) return m.id; }
    for(var a=0;a<MENU.length;a++){ var mm=MENU[a]; if(mm.href && mm.href.split("#")[0]===p) return (mm.kids&&mm.kids[0].id)||mm.id; }
    return null;
  }
  var CSS=[
    "@media (min-width:900px){",
    " body.km-side{padding-left:248px!important}",
    " body.km-side.km-mini{padding-left:72px!important}",
    " body.km-side nav.topnav, body.km-side .wrap>nav:not(.km-nav){display:none!important}",
    " .km-aside{position:fixed;top:0;left:0;bottom:0;width:240px;background:#fbfcfc;border-right:1px solid #d6dedb;display:flex;flex-direction:column;z-index:900;font:14px/1.45 'IBM Plex Sans Thai','Sarabun',Tahoma,sans-serif;color:#18232b}",
    " body.km-mini .km-aside{width:64px}",
    "}",
    "@media (max-width:899px){ .km-aside{display:none!important} }",
    ".km-aside *{box-sizing:border-box}",
    ".km-brand{display:flex;align-items:center;gap:10px;padding:14px 14px 12px;border-bottom:1px solid #d6dedb;text-decoration:none;color:inherit}",
    ".km-logo{width:34px;height:34px;border-radius:9px;background:#1f6f5c;color:#fff;display:grid;place-items:center;font-weight:700;flex:none}",
    ".km-brand b{display:block;font-size:15px;line-height:1.2}.km-brand small{font-size:12px;color:#5d6b72}",
    ".km-nav{flex:1;overflow:auto;padding:8px;display:block!important;background:transparent!important;margin:0!important;border:0!important;position:static!important}",
    ".km-nav>div{display:block!important;margin:0;padding:0;background:transparent;border:0}",
    ".km-gt{display:block!important;margin:0!important;padding:12px 10px 4px!important;font-size:11px!important}",
    ".km-gt{font-size:11px;letter-spacing:.05em;color:#5d6b72;padding:12px 10px 4px;font-weight:600}",
    ".km-it{display:flex;align-items:center;gap:10px;width:100%;border:0;background:transparent;border-radius:8px;padding:8px 10px;text-align:left;color:#18232b;font:inherit;text-decoration:none;cursor:pointer}",
    ".km-it:hover{background:#eef3f1}.km-it.on{background:#dcefe8;color:#1f6f5c;font-weight:600}",
    ".km-it svg{width:20px;height:20px;flex:none;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}",
    ".km-it .km-l{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
    ".km-it .km-c{width:14px;height:14px;color:#5d6b72;transition:transform .15s}",
    ".km-open>.km-it .km-c{transform:rotate(90deg)}",
    ".km-sub{display:none;flex-direction:column;margin:2px 0 4px 21px;padding-left:10px;border-left:1px solid #d6dedb}",
    ".km-open>.km-sub{display:flex}.km-sub .km-it{padding:6px 10px;font-size:13.5px}",
    ".km-who{border-top:1px solid #d6dedb;padding:10px 12px;display:flex;align-items:center;gap:10px;font-size:13px}",
    ".km-who .km-wt{flex:1;min-width:0}.km-who small{display:block;color:#5d6b72;font-size:11.5px}",
    ".km-tog{border:1px solid #d6dedb;background:#fff;border-radius:7px;width:30px;height:30px;display:grid;place-items:center;cursor:pointer;flex:none}",
    ".km-tog svg{width:16px;height:16px;stroke:#18232b;fill:none;stroke-width:2}",
    "body.km-mini .km-brand .km-bt, body.km-mini .km-l, body.km-mini .km-c, body.km-mini .km-gt, body.km-mini .km-sub, body.km-mini .km-wt{display:none!important}",
    "body.km-mini .km-it{justify-content:center;padding:9px 0} body.km-mini .km-brand{justify-content:center;padding:14px 0 12px}",
    "body.km-mini .km-who{flex-direction:column;padding:10px 0} body.km-mini .km-it.km-has{background:#dcefe8;color:#1f6f5c}",
    "body.km-mini .km-tog svg{transform:rotate(180deg)} .km-sep{height:1px;background:#d6dedb;margin:8px 6px;display:none} body.km-mini .km-sep{display:block}",
    "@media print{ .km-aside{display:none!important} body.km-side{padding-left:0!important} }"
  ].join("\n");
  var open={}; try{ open=JSON.parse(localStorage.getItem("km_nav_open")||"{}")||{}; }catch(e){}
  function svg(n,c){ return '<svg class="'+(c||"")+'" viewBox="0 0 24 24">'+I[n]+'</svg>'; }
  function esc(s){ return String(s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];}); }
  function draw(){
    var r=role(), cur=curId(), aside=document.getElementById("kmAside"); if(!aside) return;
    var h="";
    MENU.forEach(function(m,ix){
      if(m.grp){ var rest=MENU.slice(ix+1), nx=-1; for(var q=0;q<rest.length;q++){ if(rest[q].grp){ nx=q; break; } }
        var sect=(nx<0?rest:rest.slice(0,nx)).filter(function(x){return can(x,r);}); if(sect.length) h+='<div class="km-gt">'+m.grp+'</div><div class="km-sep"></div>'; return; }
      if(!can(m,r)) return;
      var kids=(m.kids||[]).filter(function(k){return can(k,r);}), has=kids.some(function(k){return k.id===cur;});
      if(has) open[m.id]=1;
      var isOpen=kids.length && open[m.id];
      if(kids.length){
        h+='<div class="'+(isOpen?"km-open":"")+'"><button type="button" class="km-it'+(has?" km-has":"")+'" data-g="'+m.id+'" title="'+esc(m.label)+'">'+svg(m.icon)+'<span class="km-l">'+esc(m.label)+'</span>'+svg("caret","km-c")+'</button>';
        h+='<div class="km-sub">'+kids.map(function(k){ return '<a class="km-it'+(k.id===cur?" on":"")+'" href="'+esc(k.href)+'"><span class="km-l">'+esc(k.label)+'</span></a>'; }).join("")+'</div></div>';
      }else{
        h+='<div><a class="km-it'+(m.id===cur?" on":"")+'" href="'+esc(m.href)+'" title="'+esc(m.label)+'">'+svg(m.icon)+'<span class="km-l">'+esc(m.label)+'</span></a></div>';
      }
    });
    aside.querySelector(".km-nav").innerHTML=h;
    var rn={c:"แคชเชียร์",f:"การเงิน",o:"เจ้าของ"}[r]||"ยังไม่ได้เข้าระบบ";
    aside.querySelector(".km-wt").innerHTML=esc(rn)+"<small>กิจมั่งมีโฮม</small>";
    aside.querySelectorAll("[data-g]").forEach(function(b){ b.onclick=function(){
      var id=b.getAttribute("data-g");
      if(document.body.classList.contains("km-mini")){ document.body.classList.remove("km-mini"); try{ localStorage.setItem("km_nav_mini","0"); }catch(e){} open[id]=1; }
      else open[id]=!open[id];
      try{ localStorage.setItem("km_nav_open",JSON.stringify(open)); }catch(e){}
      draw(); }; });
  }
  /* ลิงก์ที่มี # → เปิดแท็บ (Shopee / การเงินบริษัท) หรือเลื่อนไปกล่อง (หน้าตรวจรายได้) หลังเนื้อหาโหลดเสร็จ */
  function goHash(){
    var h=(location.hash||"").slice(1); if(!h) return;
    var tries=0, t=setInterval(function(){ tries++;
      if(typeof window.tab==="function" && document.querySelector('[data-t="'+h+'"]')){ try{ window.tab(h); }catch(e){} clearInterval(t); return; }
      var el=document.getElementById(h); if(el && el.offsetHeight>0){ el.scrollIntoView({behavior:"smooth",block:"start"}); clearInterval(t); return; }
      if(tries>40) clearInterval(t); },150);
  }
  function init(){
    if(document.getElementById("kmAside")) return;
    var st=document.createElement("style"); st.textContent=CSS; document.head.appendChild(st);
    var a=document.createElement("aside"); a.id="kmAside"; a.className="km-aside"; a.setAttribute("aria-label","เมนูหลัก");
    a.innerHTML='<a class="km-brand" href="index.html"><div class="km-logo">ก</div><div class="km-bt"><b>ตรวจรายได้</b><small>กิจมั่งมีโฮม</small></div></a><nav class="km-nav"></nav><div class="km-who"><div class="km-wt"></div><button type="button" class="km-tog" title="ย่อ/ขยายเมนู" aria-label="ย่อหรือขยายเมนู">'+svg("left")+'</button></div>';
    document.body.appendChild(a); document.body.classList.add("km-side");
    try{ if(localStorage.getItem("km_nav_mini")==="1") document.body.classList.add("km-mini"); }catch(e){}
    a.querySelector(".km-tog").onclick=function(){ var m=document.body.classList.toggle("km-mini"); try{ localStorage.setItem("km_nav_mini",m?"1":"0"); }catch(e){} };
    draw(); goHash();
    window.addEventListener("hashchange",function(){ draw(); goHash(); });
    /* หน้าเดิมเปลี่ยนสิทธิ์หลังใส่ PIN → วาดเมนูใหม่ */
    var last=role(); setInterval(function(){ var r=role(); if(r!==last){ last=r; draw(); } },1000);
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init); else init();
  window.KMNav={redraw:draw, menu:MENU};
})();
