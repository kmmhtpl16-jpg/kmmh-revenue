/* cashierform-pull.js — ต่อ "ฟอร์มรายรับในโปรแกรม" เข้ากับหน้าตรวจรายได้ (22 ต.ค.69)
   1) ปุ่ม "📥 ดึงจากฟอร์มในโปรแกรม" ในกล่องฟอร์มแคชเชียร์ → สร้างไฟล์ Excel แบบฟอร์มต้นฉบับจากรายการที่แคชเชียร์กรอก
      แล้วส่งเข้าช่องอัปไฟล์เดิม (ทางเดียวกับอัป Excel ทุกอย่าง: ตรวจ ①–③ · ดูดลงบัญชี · บิลเก่า)
   2) ช่วงทดลองคู่ขนาน: อัปไฟล์ Excel แล้ว ถ้ามีฟอร์มในโปรแกรมของวันเดียวกัน → แสดงผลเทียบทีละช่อง
   ต้องโหลดหลัง index.html (ใช้ sb, DATA, parseForm, beDate, TH, ensureOwnerSession, XLSX, CashierForm)
*/
(function(){
  "use strict";
  function el(id){ return document.getElementById(id); }
  function bkkToday(){ return new Date(Date.now()+7*3600e3).toISOString().slice(0,10); }
  function pickDate(){ var a=el("accDate"); return (a&&a.value)||bkkToday(); }
  function fileName(iso){ var p=iso.split("-"); return p[2]+"-"+p[1]+"-"+String(+p[0]+543).slice(2)+".xlsx"; }
  function msg(html,color){ var m=el("cf_msg"); if(m){ m.innerHTML=html; m.style.color=color||"#334155"; } }
  function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];}); }
  function accFrom(d){ var acc={bills:{},deps:{}};
    (d.bills||[]).forEach(function(b){ acc.bills[b[0]]={code:b[2],name:b[3],date:b[1],total:+b[4]}; });
    (d.deps||[]).forEach(function(x){ acc.deps[x[0]]={code:x[2],name:x[3],date:x[1],total:+x[4],method:x[5]}; });
    return acc; }
  function bills(e){ var out=[]; ["scash","xfer","credit","oldc","oldx","upk"].forEach(function(k){ (e[k]||[]).forEach(function(r){ if(r.bill&&out.indexOf(r.bill)<0) out.push(r.bill); }); }); return out; }
  function clean(e){ /* ตัดแถวที่เลขบิลผิดรูปแบบ (ฟอร์มกันส่งไว้แล้ว แต่กันซ้ำอีกชั้น) */
    var o={rcash:e.rcash||[]}, bad=[];
    ["scash","xfer","credit","oldc","oldx","upk"].forEach(function(k){ o[k]=(e[k]||[]).filter(function(r){ var ok=CashierForm.BILL_RE.test(String(r.bill||"")); if(!ok) bad.push(r.bill); return ok; }); });
    return {e:o,bad:bad}; }
  /* โหลดฟอร์มของวัน + ข้อมูล ACC แล้วสร้าง workbook */
  async function buildFor(date){
    await ensureOwnerSession();
    var f=await sb.from("rev_cashier_form").select("*").eq("date",date).maybeSingle();
    if(f.error) throw f.error; if(!f.data) return {none:true};
    var c=clean(f.data.entries||{});
    /* รายรับอื่นๆ / คืนเงิน อยู่ในตารางเดิม (ไม่อยู่ใน entries) → โหลดมาใส่ชีตสรุปด้วย ไม่งั้นยอดสองหมวดนี้ + เงินสดนำส่งผิด */
    var q=await Promise.all([
      sb.from("rev_cash_other").select("amount,channel").eq("date",date),
      sb.from("rev_cash_refund").select("amount,pay").eq("date",date)]);
    if(q[0].error) throw q[0].error; if(q[1].error) throw q[1].error;
    var a=await sb.rpc("rev_cashier_form_acc",{p_date:date,p_extra:bills(c.e)}); if(a.error) throw a.error;
    var d=a.data||{}, done=d.synced_at && new Date(d.synced_at).getTime()>=new Date(date+"T16:30:00+07:00").getTime();
    var acc=accFrom(d), miss=CashierForm.missingInAcc(c.e,acc);
    var e=Object.assign({date:date},c.e,{
      other:(q[0].data||[]).map(function(x){ return {amt:+x.amount,ch:x.channel==="cash"?"cash":"xfer"}; }),
      refund:(q[1].data||[]).map(function(x){ return {amt:+x.amount,ch:x.pay==="cash"?"cash":"xfer"}; })});
    var wb=CashierForm.buildWorkbook(XLSX,e,acc);
    return {row:f.data, wb:wb, done:done, miss:miss, bad:c.bad};
  }
  async function pull(ev){
    ev.preventDefault(); ev.stopPropagation();
    var date=pickDate();
    if(DATA && DATA.form){ msg("มีไฟล์ฟอร์มที่อัปไว้แล้วในหน้านี้ — กด ✕ ลบไฟล์เดิมก่อน แล้วค่อยดึงจากฟอร์มในโปรแกรม (กันข้อมูลลงซ้ำ)","#b91c1c"); return; }
    msg("กำลังดึงฟอร์มของวันที่ "+beDate(date)+"…");
    try{
      var r=await buildFor(date);
      if(r.none){ msg("ยังไม่มีฟอร์มในโปรแกรมของวันที่ "+beDate(date)+" — ให้แคชเชียร์กรอกที่หน้า “ฟอร์มรายรับ” ก่อน","#b45309"); return; }
      if(!r.done){ msg("ข้อมูล ACC ของวันที่ "+beDate(date)+" ยังไม่ครบ (รอรอบซิงก์ 16:30) — ดึงได้หลังซิงก์","#b45309"); return; }
      if(r.row.status!=="submitted"){ msg("แคชเชียร์ยังไม่กด “ส่งฟอร์ม” ของวันที่ "+beDate(date),"#b45309"); return; }
      if(r.miss.length||r.bad.length){ msg("ยังดึงไม่ได้: "+(r.bad.length?"เลขบิลผิดรูปแบบ "+esc(r.bad.join(", "))+" ":"")+(r.miss.length?"ไม่พบใน ACC "+esc(r.miss.join(", ")):""),"#b91c1c"); return; }
      var buf=XLSX.write(r.wb,{type:"array",bookType:"xlsx"});
      var file=new File([buf],fileName(date),{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
      var inp=el("f_form"), dt=new DataTransfer(); dt.items.add(file); inp.files=dt.files;
      inp.dispatchEvent(new Event("change",{bubbles:true}));
      msg("✓ ดึงฟอร์มในโปรแกรมของวันที่ "+beDate(date)+" แล้ว (ส่งโดย "+esc(r.row.submitted_role||"-")+")","#15803d");
    }catch(err){ msg("ดึงไม่สำเร็จ: "+esc((err&&err.message)||err),"#b91c1c"); }
  }
  /* ช่วงทดลองคู่ขนาน: เทียบไฟล์ Excel ที่อัป กับฟอร์มในโปรแกรมของวันเดียวกัน */
  var FIELDS=[["cash","เงินสด (รวมมัดจำ)"],["knv","โอน K+NV"],["ksk","โอนกสิกร"],["acc","ลงบัญชี"],["upk","UPK"],["refund","คืนเงิน"],["old","บิลเก่า"],["otherCash","รายรับอื่นๆ เงินสด"],["otherXfer","รายรับอื่นๆ โอน"]];
  async function compareAfterUpload(){
    var fx=DATA&&DATA.form; if(!fx||!fx.date) return;
    var fn=(DATA._files&&DATA._files.form)||""; if(window.__cfPulling) return;
    try{
      var r=await buildFor(fx.date); if(r.none){ msg(""); return; }
      if(!r.done){ msg("ฟอร์มในโปรแกรมของวันนี้มีแล้ว — เทียบกับ Excel ได้หลังข้อมูล ACC เข้ารอบ 16:30","#64748b"); return; }
      var fp=parseForm(r.wb), diff=[];
      FIELDS.forEach(function(k){ var a=+fx[k[0]]||0, b=+fp[k[0]]||0; if(Math.abs(a-b)>0.009) diff.push(k[1]+": Excel "+TH(a)+" · ในโปรแกรม "+TH(b)); });
      var ka=(fx.xfer||[]).map(function(x){return x.bill+"|"+(+x.knv||0)+"|"+(+x.ksk||0);}).sort().join(","), kb=(fp.xfer||[]).map(function(x){return x.bill+"|"+(+x.knv||0)+"|"+(+x.ksk||0);}).sort().join(",");
      if(ka!==kb) diff.push("รายการโอนรายบิลไม่ตรงกัน");
      var ra=(fx.retailCash||[]).reduce(function(s,v){return s+v;},0), rb=(fp.retailCash||[]).reduce(function(s,v){return s+v;},0);
      if(Math.abs(ra-rb)>0.009) diff.push("เงินสดปลีกรวม: Excel "+TH(ra)+" · ในโปรแกรม "+TH(rb));
      msg(diff.length?("🔎 เทียบกับฟอร์มในโปรแกรม: ต่าง "+diff.length+" จุด<br>"+diff.join("<br>")):"🔎 เทียบกับฟอร์มในโปรแกรม: ตรงกันทุกช่อง ✓", diff.length?"#b45309":"#15803d");
    }catch(e){ /* ตารางใหม่ยังไม่ถูกสร้าง หรือไม่มีสิทธิ์ — เงียบไว้ ไม่กวนงานเดิม */ }
  }
  function inject(){
    var d=el("d_form"); if(!d||el("cf_pull")) return;
    d.insertAdjacentHTML("beforeend",'<div style="margin-top:8px"><button type="button" class="btn sec" id="cf_pull" style="padding:4px 10px;font-size:12px">📥 ดึงจากฟอร์มในโปรแกรม</button><div id="cf_msg" style="font-size:12px;margin-top:6px;text-align:left"></div></div>');
    el("cf_pull").addEventListener("click",function(ev){ window.__cfPulling=true; pull(ev).finally(function(){ setTimeout(function(){ window.__cfPulling=false; },3000); }); });
    var inp=el("f_form"); if(inp) inp.addEventListener("change",function(){ setTimeout(compareAfterUpload,1200); });
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",inject); else inject();
})();
