/* mpager.js — v0.4.3 (1 ต.ค.69: แก้การ์ดตัดบิลเป็นกล่องขาวว่าง + เปิดไว้เอง) · v0.4.1 (30 ก.ย.69) โหมดมือถือของหน้าตรวจรายได้ (จอกว้าง ≤640px เท่านั้น · บนคอมไม่เปลี่ยน)
   เจ้าของสั่ง: 1) ซ่อนทุกการ์ด กดหัวการ์ดค่อยขยาย  2) ตารางโชว์แค่คอลัมน์สำคัญ (วันที่ · ใคร/บิล · ยอด)
               3) โชว์แค่ 5 รายการ ที่เหลือให้เปิดดูในโปรแกรมบนคอม
   ใช้กับการ์ดที่ render ใหม่เรื่อยๆ (เฝ้าดูด้วย MutationObserver) · จำว่าการ์ดไหนเปิดอยู่ตามหัวการ์ด
   ซ่อนด้วย class (ไม่แตะ style ของแถว เพื่อไม่ชนกับการกาง/ซ่อนแถวย่อยของหน้าเดิม) */
(function(){
  if(!window.matchMedia || !window.matchMedia("(max-width:640px)").matches) return;
  var PER=5, OPEN={}, busy=false;
  var st=document.createElement("style");
  st.textContent=
    ".mp-off,.mp-hc{display:none!important}"+
    ".card td.mp-who,.card th.mp-who{white-space:normal!important;text-align:left!important;min-width:120px}"+
    ".mp-more{margin:8px 0 2px;font-size:13.5px;color:#78716c;text-align:center;background:#fafaf9;border:1px dashed #e7e5e4;border-radius:10px;padding:8px}"+
    ".mp-head{cursor:pointer;user-select:none}"+
    ".mp-tog{display:inline-block;margin-left:6px;font-size:13px;font-weight:700;color:#15803d;white-space:nowrap}"+
    ".mp-col.mp-shut>:not(.mp-head){display:none!important}"+
    ".mp-col.mp-shut{padding-bottom:12px}"+
    ".mp-col.mp-shut .mp-head h2,.mp-col.mp-shut>h2{margin-bottom:0}";
  document.head.appendChild(st);

  function cardKey(c){ var h=c.querySelector("h2,h3"); return (c.id||"")+"|"+(h?h.textContent:"").replace(/[\d,.\s·/()]+/g," ").replace(/[▸▾] (เปิด|ย่อ)/g,"").trim().slice(0,30); }
  function headOf(c){ var h=c.querySelector("h2,h3"); if(!h) return null; var x=h; while(x.parentElement && x.parentElement!==c) x=x.parentElement; return x.parentElement===c?x:null; }

  /* 1) การ์ดย่อ/ขยาย */
  function setupCard(c){
    if(c.id==="dayBar"||c.id==="err") return;
    var head=headOf(c); if(!head) return;
    var h=c.querySelector("h2,h3"), key=cardKey(c);
    if(!c.classList.contains("mp-col")){
      c.classList.add("mp-col");
      /* v0.4.3: ผูกคลิกที่ตัวการ์ด (ไม่ผูกที่หัว) เพราะการ์ดที่วาดใหม่ทั้งก้อน (เช่น ตัดบิลประจำวัน) หัวเดิมหายไป */
      c.addEventListener("click",function(e){
        var hd=e.target.closest(".mp-head"); if(!hd||hd.parentElement!==c) return;
        if(e.target.closest("input,select,button,a,label,textarea")) return;
        var k=cardKey(c); OPEN[k]=!isOpen(c); paint(c);
      });
    }
    head.classList.add("mp-head"); /* v0.4.3: ใส่ทุกรอบ — ไม่งั้นการ์ดที่วาดใหม่ถูกซ่อนหมดจนเหลือกล่องขาวว่าง */
    if(!h.querySelector(".mp-tog")){ var t=document.createElement("span"); t.className="mp-tog"; h.appendChild(t); }
    paint(c);
  }
  /* v0.4.3: การ์ดตัดบิลประจำวันเปิดไว้ตั้งแต่แรก (เจ้าของใช้กดอนุมัติบนมือถือ) */
  var OPEN_DEFAULT={cutCard:true};
  function isOpen(c){ var k=cardKey(c); return (k in OPEN)? !!OPEN[k] : !!OPEN_DEFAULT[c.id]; }
  function paint(c){
    var open=isOpen(c), t=c.querySelector(".mp-tog");
    c.classList.toggle("mp-shut",!open); if(t) t.textContent=open?"▾ ย่อ":"▸ เปิด";
  }

  /* 2) คอลัมน์สำคัญ + 3) แค่ 5 รายการ */
  function isSub(tr){ if(tr.classList.contains("billsub") || /^pg_/.test(tr.id||"")) return true; return tr.cells.length===1 && tr.cells[0].colSpan>1; }
  function keepCols(tb){
    var hr=tb.tHead&&tb.tHead.rows[0]; if(!hr) return null;
    var hs=[].map.call(hr.cells,function(x){ return x.textContent.trim(); });
    if(hs.length<=3) return null;
    var keep=[0];
    var who=hs.findIndex(function(t,i){ return i>0 && /ลูกค้า|ใครโอน|บิล|รายการ|ชื่อ/.test(t); });
    var amt=hs.findIndex(function(t,i){ return i>0 && /ยอด|จำนวนเงิน|บาท/.test(t); });
    if(who>0) keep.push(who); if(amt>0 && keep.indexOf(amt)<0) keep.push(amt);
    if(keep.length<3){ for(var i=1;i<hs.length && keep.length<3;i++){ if(keep.indexOf(i)<0 && hs[i]) keep.push(i); } }
    return {keep:keep, n:hs.length, who:who};
  }
  function trimTable(tb){
    var body=tb.tBodies[0]; if(!body) return;
    var kc=keepCols(tb);
    if(kc){ [].slice.call(tb.rows).forEach(function(r){
      if(r.cells.length!==kc.n) return;
      [].forEach.call(r.cells,function(cell,i){ cell.classList.toggle("mp-hc",kc.keep.indexOf(i)<0); cell.classList.toggle("mp-who",i===kc.who); });
    }); }
    var rows=[].slice.call(body.rows), groups=[], g=null;
    rows.forEach(function(r){ if(isSub(r)&&g){ g.push(r); } else { g=[r]; groups.push(g); } });
    groups.forEach(function(gr,i){ gr.forEach(function(r){ r.classList.toggle("mp-off", i>=PER); }); });
    var nx=tb.nextElementSibling, note=(nx&&nx.classList&&nx.classList.contains("mp-more"))?nx:null;
    var extra=groups.length-PER, hid=kc?(kc.n-kc.keep.length):0;
    if(extra<=0 && !hid){ if(note) note.remove(); return; }
    var txt=(extra>0?"+ อีก "+extra+" รายการ · ":"")+(hid?"ซ่อน "+hid+" คอลัมน์ · ":"")+"ดูครบในโปรแกรมบนคอม";
    if(!note){ note=document.createElement("div"); note.className="mp-more"; tb.after(note); }
    if(note.textContent!==txt) note.textContent=txt;
  }
  function run(){
    if(busy) return; busy=true;
    try{
      [].forEach.call(document.querySelectorAll(".wrap .card"),function(c){ if(!c.parentElement.closest(".card")) setupCard(c); });
      [].forEach.call(document.querySelectorAll(".card table"),function(tb){
        if(tb.parentElement.closest("table")) return;
        if(tb.closest("[data-nopage]")) return;
        trimTable(tb);
      });
    }finally{ setTimeout(function(){ busy=false; },0); }
  }
  var tmr=null;
  new MutationObserver(function(ms){
    if(busy) return;
    var mine=ms.every(function(m){ var t=m.target; return t.classList && (t.classList.contains("mp-more")||t.classList.contains("mp-tog")||(t.closest&&t.closest(".mp-more,.mp-tog"))); });
    if(mine) return;
    clearTimeout(tmr); tmr=setTimeout(run,60);
  }).observe(document.body,{childList:true,subtree:true});
  window.mpagerRun=run;
  setTimeout(run,300);
})();
