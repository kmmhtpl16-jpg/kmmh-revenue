/* credit-acc.js — ลูกหนี้ลงบัญชีเทียบ ACC (22 ต.ค.69)
   1) ตอนเปิดหน้า: เติมบิลค้างจาก ACC ที่ยังไม่อยู่ในทะเบียน (rev_credit_sync_acc · ไม่สร้างซ้ำ)
   2) การ์ด "ACC ตัดแล้ว": บิลที่ในทะเบียนยังค้าง แต่ ACC มีใบเสร็จ RC ครบแล้ว → ปุ่ม "ปิดตาม ACC" (คนกด ไม่ปิดเอง)
   ฟังก์ชันฝั่งฐานข้อมูลยังไม่มี = เงียบ ไม่กวนหน้าเดิม */
(function(){
  "use strict";
  function esc(s){ return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];}); }
  function TH(n){ return (+n||0).toLocaleString("th-TH",{minimumFractionDigits:2,maximumFractionDigits:2}); }
  function be(s){ if(!s) return "—"; var p=String(s).slice(0,10).split("-"); return (+p[2])+"/"+(+p[1])+"/"+(+p[0]+543); }
  function role(){ try{ return (typeof ROLE!=="undefined"&&ROLE)||localStorage.getItem("rev_role"); }catch(e){ return null; } }
  var LAST=[];
  var _synced=false;
  window.__creditAccSync=async function(){
    if(_synced) return; _synced=true;
    var added=0;
    var fail=null;
    try{ var r=await sb.rpc("rev_credit_sync_acc",{}); if(r.error) fail=r.error; else added=+r.data||0; }catch(e){ fail=e; }
    /* เติมจาก ACC ไม่สำเร็จ = บิลลงบัญชีร้านค้าใหม่ยังไม่เข้าทะเบียน (ฟอร์มไม่ดูดแถวชื่อร้านแล้ว) → ต้องบอก ไม่เงียบ · เปิดหน้าใหม่ลองซ้ำได้ */
    var ok=false; try{ ok=await loadPaid(); }catch(e){ ok=false; }
    var old=document.getElementById("accSyncFail"); if(old) old.remove();
    if(fail||!ok){ _synced=false; var s=document.getElementById("summaryCard"); if(s)
      s.insertAdjacentHTML("beforebegin",'<div class="card" id="accSyncFail" style="border-color:#fecaca;background:#fef2f2;color:#b91c1c">⚠ '+
        (fail?'เติมบิลค้างจาก ACC ไม่สำเร็จ — บิลลงบัญชีร้านค้าใหม่อาจยังไม่อยู่ในทะเบียน':'โหลดรายการ "ACC ตัดแล้ว" ไม่สำเร็จ')+' · ลองเปิดหน้าใหม่ ถ้ายังขึ้นแจ้งห้อง Code</div>'); }
    var m=document.getElementById("accSyncMsg"); if(m&&added) m.textContent="เติมบิลค้างจาก ACC "+added+" ใบ";
    return added;
  };
  /* หน้าเดิมเรียก boot() ก่อนไฟล์นี้โหลด → รอให้เข้าระบบแล้วค่อยเติมจาก ACC และโหลดทะเบียนใหม่ถ้ามีบิลเพิ่ม */
  (function wait(n){ if(!role()||typeof sb==="undefined"||!sb){ if(n<120) setTimeout(function(){wait(n+1);},500); return; }
    (typeof ensureOwnerSession==="function"?ensureOwnerSession():Promise.resolve()).then(async function(){
      var added=await window.__creditAccSync(); if(added && typeof loadRegister==="function") loadRegister(); }); })(0);
  async function loadPaid(){
    var r; try{ r=await sb.rpc("rev_credit_acc_paid"); }catch(e){ return false; } if(!r||r.error) return false;
    LAST=r.data||[]; draw(); return true;
  }
  function draw(){
    var card=document.getElementById("accPaidCard");
    if(!card){ var s=document.getElementById("summaryCard"); if(!s) return;
      s.insertAdjacentHTML("beforebegin",'<div class="card" id="accPaidCard" style="border-color:#bbf7d0;background:#f0fdf4"></div>'); card=document.getElementById("accPaidCard"); }
    if(!LAST.length){ card.style.display="none"; return; }
    card.style.display="";
    var canClose=(role()==="owner"||role()==="finance"), tot=LAST.reduce(function(s,x){return s+(+x.remain||0);},0);
    card.innerHTML='<div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center"><b>✅ ACC ตัดแล้ว แต่ในทะเบียนยังค้าง '+LAST.length+' ใบ · '+TH(tot)+' บาท</b>'+
      (canClose?'<button type="button" class="btn" id="accCloseAll">ปิดตาม ACC ทั้งหมด</button>':'')+'</div>'+
      '<div class="muted" style="font-size:13px;margin:4px 0 8px">ยังนับอยู่ในยอดค้างด้านล่างจนกว่าจะกดปิด · กดปิดแล้วโปรแกรมบันทึกรับชำระส่วนที่เหลือพร้อมเลขใบเสร็จ RC จาก ACC</div>'+
      '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13.5px"><tr style="text-align:left;color:#64748b"><th>เลขบิล</th><th>ลูกค้า</th><th>วันที่บิล</th><th style="text-align:right">ค้างในทะเบียน</th><th>ใบเสร็จ ACC</th><th></th></tr>'+
      LAST.map(function(x){ return '<tr style="border-top:1px solid #dcfce7"><td>'+esc(x.bill_no)+'</td><td>'+esc(x.customer)+'</td><td>'+be(x.bill_date)+'</td><td style="text-align:right">'+TH(x.remain)+'</td><td>'+esc(x.rc||"")+(x.rc_date?' <span class="muted">('+be(x.rc_date)+')</span>':'')+'</td><td>'+(canClose?'<button type="button" class="btn sec" data-close="'+esc(x.id)+'" style="padding:2px 10px">ปิดตาม ACC</button>':'')+'</td></tr>'; }).join("")+
      '</table></div><div id="accSyncMsg" class="muted" style="font-size:12px;margin-top:6px"></div>';
    card.querySelectorAll("[data-close]").forEach(function(b){ b.onclick=function(){ closeIds([b.getAttribute("data-close")],b); }; });
    var all=document.getElementById("accCloseAll"); if(all) all.onclick=function(){
      if(all.dataset.sure!=="1"){ all.dataset.sure="1"; all.textContent="กดอีกครั้งเพื่อยืนยันปิด "+LAST.length+" ใบ"; return; }
      closeIds(LAST.map(function(x){return x.id;}),all); };
  }
  async function closeIds(ids,btn){
    if(btn){ btn.disabled=true; btn.textContent="กำลังปิด…"; }
    try{ var r=await sb.rpc("rev_credit_close_by_acc",{p_ids:ids,p_by:role()}); if(r.error) throw r.error;
      await loadPaid(); if(typeof loadRegister==="function") loadRegister();
    }catch(e){ if(btn){ btn.disabled=false; btn.textContent="ปิดไม่สำเร็จ ลองใหม่"; } }
  }
})();
