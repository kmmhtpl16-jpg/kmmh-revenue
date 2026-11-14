/* formcheck-load.js — ดึงข้อมูลให้ formcheck.js (อ่านอย่างเดียว · ไม่มีการเขียนฐาน) · REV-FORM-FIRST v0.3.4 14 พ.ย.69
   ใช้ session เดิมของหน้ารายได้ (sb-rev-kmmh) · ตารางเดียวกับที่หน้าตรวจรายได้อ่านอยู่แล้ว + RPC rev_cashier_form_acc (มีอยู่แล้ว)
   ให้ผลของแต่ละวันไม่ขึ้นกับช่วงที่เลือก: ไล่ตรวจทุกฟอร์มตั้งแต่ฟอร์มแรก (EPOCH) แต่แสดงเฉพาะช่วงที่เลือก · เงินย้อนถึงวันออก RA ที่เก่าที่สุดที่ถูกอ้างในประวัติทั้งหมด (ไม่อิงช่วงที่เลือก)
   ดึงไม่ครบ/ดึงไม่ได้ = หยุดทั้งหน้า (ไม่แสดงผลครึ่ง ๆ) */
(function(root){
  "use strict";
  var EPOCH="2026-10-28", ROW_CAP=900;   /* EPOCH = ฟอร์มแรกที่ส่งในระบบ → ไล่ตรวจตั้งแต่ฟอร์มแรกทุกครั้ง ผลไม่ขึ้นกับช่วงที่เลือก (เงินก้อนละครั้งตลอดประวัติ) */
  function iso(dn){ return new Date(dn*864e5).toISOString().slice(0,10); }
  function dn(s){ var p=String(s).slice(0,10).split("-"); return Math.round(Date.UTC(+p[0],+p[1]-1,+p[2])/864e5); }
  function billsIn(e){ var s={}; ["scash","xfer","credit","oldc","oldx","upk"].forEach(function(k){ (e[k]||[]).forEach(function(r){ var b=String(r.bill||"").trim().toUpperCase(); if(/^(KM|RA)\d{4}-\d{4}$/.test(b)) s[b]=1; }); });
    (e.rcash||[]).forEach(function(r){ var b=String(r.ra||"").trim().toUpperCase(); if(/^RA\d{4}-\d{4}$/.test(b)) s[b]=1; }); return Object.keys(s); }
  async function must(q, what){ var r=await q; if(r.error) throw new Error((what||"ดึงข้อมูล")+": "+(r.error.message||String(r.error)));
    if(Array.isArray(r.data) && r.data.length>=ROW_CAP) throw new Error((what||"ดึงข้อมูล")+" มีแถวมากเกิน "+ROW_CAP+" — เลือกช่วงวันสั้นลง");
    return r.data; }

  async function loadForms(sb, lo, hi){
    return must(sb.from("rev_cashier_form").select("date,entries,status").gte("date",lo).lte("date",hi).eq("status","submitted").order("date"),"ฟอร์มรายรับ"); }
  async function accFor(sb, date, e, refundBills){
    var extra=billsIn(e); (refundBills||[]).forEach(function(b){ b=String(b||"").trim().toUpperCase(); if(/^KM\d{4}-\d{4}$/.test(b) && extra.indexOf(b)<0) extra.push(b); });   /* ให้ RPC ส่งใบลดหนี้ของบิลที่มีคืนเงินมาด้วย */
    var a=await must(sb.rpc("rev_cashier_form_acc",{p_date:date,p_extra:extra}),"ข้อมูล ACC "+date);
    if(a==null || typeof a!=="object" || !["bills","deps","uses","cns"].every(function(k){ return Array.isArray(a[k]); }) || (a.cns_self!=null && !Array.isArray(a.cns_self))) throw new Error("สิทธิ์อ่านข้อมูล ACC ไม่พอ หรือข้อมูล ACC "+date+" ไม่ครบ");
    var have={}; (a.deps||[]).forEach(function(r){ have[r[0]]=1; });
    var ras=(a.uses||[]).map(function(u){return u[0];}).filter(function(x){ return x && !have[x]; });
    if(ras.length){ var a2=await must(sb.rpc("rev_cashier_form_acc",{p_date:date,p_extra:extra.concat(ras)}),"ข้อมูล RA "+date);
      if(!a2||!Array.isArray(a2.deps)) throw new Error("ดึงใบรับมัดจำไม่ได้ "+date); a.deps=a2.deps; }
    return a; }

  /* ดึง ACC ทีละ 6 วันพร้อมกัน (ไม่ให้หน้าช้าเมื่อย้อนหลายวัน) */
  var refundBillsBy=null;
  async function accAll(sb, forms, accBy){ for(var i=0;i<forms.length;i+=6){ var part=forms.slice(i,i+6);
    var got=await Promise.all(part.map(function(f){ var d=String(f.date).slice(0,10); return accFor(sb,d,f.entries||{},(refundBillsBy&&refundBillsBy[d])||[]); }));
    part.forEach(function(f,k){ accBy[String(f.date).slice(0,10)]=got[k]; }); } }
  async function load(sb, from, to){
    var FC=root.FormCheck, back=FC.EARLY_DAYS;
    var lo=from<EPOCH?from:EPOCH;
    var forms=await loadForms(sb, lo, to);
    var rb=await must(sb.from("rev_cash_refund").select("date,bill_no").gte("date",lo).lte("date",to),"บิลที่มีคืนเงิน");
    refundBillsBy={}; rb.forEach(function(r){ var d=String(r.date).slice(0,10); (refundBillsBy[d]=refundBillsBy[d]||[]).push(r.bill_no); });
    var accBy={};
    await accAll(sb, forms, accBy);
    /* วันออก RA ที่ถูกหักบิลในช่วง → ตรวจฟอร์มย้อนถึงวันนั้นด้วย (เงิน RA ยืนยันจากฟอร์มวันรับมัดจำ) */
    var minRa=lo;
    Object.keys(accBy).forEach(function(d){ (accBy[d].deps||[]).forEach(function(r){ var rd=String(r[1]).slice(0,10); if(rd<minRa) minRa=rd; }); });
    /* RA ที่ออกก่อนฟอร์มแรก: ไม่มีฟอร์มให้ตรวจ → ดึงเงินย้อนถึงวันออก RA เพื่อหาเงินมัดจำตามกติกา (ก้อนละครั้ง) */
    var moneyLo=iso(dn(minRa<lo?minRa:lo)-back);
    var res=await Promise.all([
      must(sb.from("rev_daily").select("date,kplus_rows,bank_rows,bank_asof").gte("date",moneyLo).lte("date",to).order("date"),"K+/สเตทเมนต์"),
      must(sb.from("rev_cash_proof").select("date,amount").gte("date",lo).lte("date",to),"ใบนับเงินสด"),
      must(sb.from("rev_cash_refund").select("date,bill_no,kind,cn_no,amount,pay").gte("date",lo).lte("date",to),"คืนเงิน"),
      must(sb.from("rev_cash_other").select("date,item,amount,channel").gte("date",lo).lte("date",to),"รายรับอื่นๆ"),
      must(sb.from("rev_pending").select("id,date,amount,source,ref,slip_path,status,matched_bill_no").gte("date",iso(dn(lo)-back)).lte("date",to).or("source.eq.รับเข้าบัญชีอื่น,ref.ilike.*บัญชีอื่น*"),"แถวติดธงบัญชีอื่น"),
      must(sb.from("rev_audit").select("date,status").gte("date",from).lte("date",to),"ผลหน้าเดิม"),
      must(sb.from("rev_cash_refund").select("date,cn_no,amount").not("cn_no","is",null).lte("date",to).order("date"),"คืนเงินที่อ้างใบลดหนี้")
    ]);
    var daily=res[0], proof={}, ref={}, oth={}, audit={};
    res[1].forEach(function(r){ proof[String(r.date).slice(0,10)]=r.amount; });
    res[2].forEach(function(r){ var d=String(r.date).slice(0,10); (ref[d]=ref[d]||[]).push({bill:r.bill_no,kind:r.kind,cn:r.cn_no,amt:r.amount,pay:r.pay}); });
    res[3].forEach(function(r){ var d=String(r.date).slice(0,10); (oth[d]=oth[d]||[]).push({item:r.item,amt:r.amount,ch:r.channel}); });
    res[5].forEach(function(r){ audit[String(r.date).slice(0,10)]=r.status; });
    var dailyBy={}; daily.forEach(function(r){ dailyBy[String(r.date).slice(0,10)]=r; });
    var days=forms.map(function(f){ var date=String(f.date).slice(0,10), dd=dailyBy[date];
      return { date:date, form:f.entries||{}, proof:(date in proof)?proof[date]:null, refunds:ref[date]||[], others:oth[date]||[],
        acc:FC.accFromRpc(accBy[date]), shown:date>=from,
        stmt:{ kp:!!(dd&&dd.kplus_rows&&dd.kplus_rows.length), ks:!!(dd&&dd.bank_rows&&dd.bank_rows.length) },
        bankPartial:dd&&dd.bank_asof||null, oldStatus:audit[date]||null }; });
    var pending=res[4].map(function(p){ return {id:p.id,date:p.date?String(p.date).slice(0,10):null,amount:p.amount,source:p.source,ref:p.ref,slip:p.slip_path,status:p.status,bill:String(p.matched_bill_no||"").trim().toUpperCase()}; });
    var cnRefunds=res[6].filter(function(r){ return r.cn_no; }).map(function(r){ return {date:String(r.date).slice(0,10), cn:r.cn_no, amt:r.amount}; });
    return { days:days, shared:{ money:FC.moneyFromDaily(daily), pending:pending, cnRefunds:cnRefunds }, range:{from:from,to:to,loadedFrom:lo} };
  }
  root.FormCheckLoad=load;
})(typeof window!=="undefined"?window:this);
