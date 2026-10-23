/* cashierform-core.js — ฟอร์มรายรับแคชเชียร์ (22 ต.ค.69)
   แปลง "รายการที่แคชเชียร์กรอกในโปรแกรม" → ไฟล์ Excel หน้าตาเดียวกับฟอร์มต้นฉบับ
   เพื่อให้หน้าตรวจรายได้ใช้ทางเดิมทุกอย่าง (parseForm / ดูดลงบัญชี / บิลเก่า) โดยไม่ต้องรื้อของเดิม
   ใช้ได้ทั้งในเบราว์เซอร์ (window.CashierForm) และ node (module.exports) — ไม่มี DOM
*/
(function(root){
  "use strict";
  var RETAIL_CODE = "66-00026";
  var num = function(v){ if(typeof v==="number") return isFinite(v)?v:0; var x=parseFloat(String(v==null?"":v).replace(/,/g,"")); return isFinite(x)?x:0; };
  var r2 = function(n){ return Math.round((+n||0)*100)/100; };
  var BILL_RE = /^(KM|RA)\d{4}-\d{4}$/;
  var isRA = function(s){ return /^RA/.test(String(s||"")); };

  /* วันที่ ISO → serial ของ Excel (1900 date system) */
  function isoToSerial(iso){ var p=String(iso).split("-"); var t=Date.UTC(+p[0],+p[1]-1,+p[2]); return Math.round(t/864e5)+25569; }

  /* ฝั่งลูกค้า: ปลีก (คุณ 1) / ร้านค้า — ตัดสินจากรหัสลูกค้าใน ACC (ต้องซิงก์แล้ว) */
  function sideOf(bill, acc){
    if(isRA(bill)){ var d=acc.deps&&acc.deps[bill]; return d&&d.code&&d.code!==RETAIL_CODE?"s":"r"; }
    var b=acc.bills&&acc.bills[bill]; return b&&b.code&&b.code!==RETAIL_CODE?"s":"r";
  }
  function nameOf(bill, acc){
    if(isRA(bill)){ var d=acc.deps&&acc.deps[bill]; return d?d.name:""; }
    var b=acc.bills&&acc.bills[bill]; return b?b.name:"";
  }
  /* ตรวจว่าทุกเลขบิลที่ต้องแยกฝั่ง/ใส่ชื่อ อยู่ใน ACC แล้ว (ใช้คุมปุ่มปริ้น/ส่งฟอร์ม หลังซิงก์ 16:30) */
  function missingInAcc(e, acc){
    var out=[];
    function chk(arr){ (arr||[]).forEach(function(r){ var b=r.bill; if(!b||!BILL_RE.test(b)) return;
      var ok=isRA(b)?(acc.deps&&acc.deps[b]):(acc.bills&&acc.bills[b]); if(!ok && out.indexOf(b)<0) out.push(b); }); }
    chk(e.scash); chk(e.xfer); chk(e.credit); chk(e.oldc); chk(e.oldx); chk(e.upk);
    return out;
  }

  /* ยอดรวมแบบใบปะหน้า */
  function totals(e, acc){
    var t={cash:{r:0,s:0},knv:{r:0,s:0},ksk:{r:0,s:0},cr:{r:0,s:0},old:{c:{r:0,s:0},x:{r:0,s:0}},oc:0,ox:0,rc:0,rx:0,upk:0};
    var n2=function(v){ return r2(num(v)); };   /* ปัดทีละแถวก่อนรวม ให้ตรงกับยอดรายแถวที่ลงในชีต */
    (e.rcash||[]).forEach(function(r){ t.cash.r+=n2(r.amt); });
    (e.scash||[]).forEach(function(r){ t.cash.s+=n2(r.amt); });
    (e.xfer||[]).forEach(function(r){ var s=sideOf(r.bill,acc); t.knv[s]+=n2(r.kp); t.ksk[s]+=n2(r.ks); });
    (e.credit||[]).forEach(function(r){ t.cr[sideOf(r.bill,acc)]+=n2(r.amt); });
    (e.oldc||[]).forEach(function(r){ t.old.c[sideOf(r.bill,acc)]+=n2(r.amt); });
    (e.oldx||[]).forEach(function(r){ t.old.x[sideOf(r.bill,acc)]+=n2(r.amt); });
    (e.other||[]).forEach(function(r){ if(r.ch==="xfer") t.ox+=n2(r.amt); else t.oc+=n2(r.amt); });
    (e.refund||[]).forEach(function(r){ if(r.ch==="xfer") t.rx+=n2(r.amt); else t.rc+=n2(r.amt); });
    (e.upk||[]).forEach(function(r){ t.upk+=n2(r.amt); });
    /* ยอดเงินสดนำส่ง = เงินสด (รวมมัดจำ) + รายรับอื่นๆ เงินสด + บิลเก่าเงินสด − คืนเงินสด (เคาะ 22 ต.ค.69) */
    t.cashSend=r2(t.cash.r+t.cash.s+t.oc+t.old.c.r+t.old.c.s-t.rc);
    return t;
  }

  /* สร้าง workbook หน้าตาเหมือนไฟล์ต้นฉบับ (เฉพาะชีตฝั่งรายรับ) */
  function buildWorkbook(XLSX, e, acc){
    var t=totals(e,acc), ser=isoToSerial(e.date);
    var wb=XLSX.utils.book_new();
    function add(name, aoa, dateCells){
      var ws=XLSX.utils.aoa_to_sheet(aoa);
      (dateCells||[]).forEach(function(a){ if(ws[a]){ ws[a].t="n"; ws[a].z="d/m/yyyy"; } });
      XLSX.utils.book_append_sheet(wb, ws, name);
    }
    var S=function(o){ return r2(o.r+o.s); };
    /* 1) สรุปรายรับ-รายจ่าย — parseForm อ่านคอลัมน์ A (ป้าย) + D (ยอด) · แถว 1 คอลัมน์ D = วันที่ */
    add("สรุปรายรับ-รายจ่าย",[
      ["สรุปยอดรายรับ",null,null,ser],
      ["รายการ","ลูกค้าปลีก","สมาชิก/ร้านค้า","รวมรับ"],
      ["เงินสด (รวมมัดจำ)",r2(t.cash.r),r2(t.cash.s),S(t.cash)],
      ["โอน K+NV",r2(t.knv.r),r2(t.knv.s),S(t.knv)],
      ["โอนเข้าบัญชี กสิกร",r2(t.ksk.r),r2(t.ksk.s),S(t.ksk)],
      ["ลงบัญชี รวมสั่งทำ",r2(t.cr.r),r2(t.cr.s),S(t.cr)],
      [null,"เงินสด","เงินโอน",null],
      ["รายรับอื่นๆ",r2(t.oc),r2(t.ox),r2(t.oc+t.ox)],
      ["บิลเก่า",null,null,null],
      ["เงินสด (รวมมัดจำ)",r2(t.old.c.r),r2(t.old.c.s),S(t.old.c)],
      ["โอนเข้าบัญชี",r2(t.old.x.r),r2(t.old.x.s),S(t.old.x)],
      [null,null,null,null],
      ["คืนเงิน",r2(t.rc),r2(t.rx),r2(t.rc+t.rx)],
      ["UPK",r2(t.upk),null,r2(t.upk)],
      [null,null,null,null],
      [null,"ยอดรวมเงินสดนำส่งรายวัน",null,t.cashSend]
    ],["D1"]);
    /* 2) ร้านค้าเงินสด — B ชื่อร้าน · C ยอด (ชื่อจาก ACC) */
    var sc=[["ร้านค้า","รายการเงินสด",ser],["ลำดับ","ชื่อร้านค้า","ยอดเงิน"]];
    (e.scash||[]).forEach(function(r,i){ sc.push([i+1, nameOf(r.bill,acc)||r.bill, r2(num(r.amt))]); });
    sc.push([null,"ยอดรวม",r2(t.cash.s)]);
    add("ร้านค้าเงินสด",sc,["C1"]);
    /* 3) โอน — ซ้าย B/C/D ปลีก · ขวา G/H/I ร้านค้า */
    var L=(e.xfer||[]).filter(function(r){return sideOf(r.bill,acc)==="r";}), R=(e.xfer||[]).filter(function(r){return sideOf(r.bill,acc)==="s";});
    var xo=[["รายการโอน",null,null,null,null,null,null,ser],["ลูกค้าปลีก",null,null,null,null,"ลูกค้าสมาชิก/ร้านค้า"],
            ["ลำดับ","เลขบิล","โอนเข้า K+NV","โอนเข้ากสิกร",null,"ลำดับ","เลขบิล","โอนเข้า K+NV","โอนเข้ากสิกร"]];
    var nx=Math.max(L.length,R.length);
    for(var i=0;i<nx;i++){ var a=L[i], b=R[i];
      xo.push([a?i+1:null, a?a.bill:null, a&&num(a.kp)?r2(num(a.kp)):null, a&&num(a.ks)?r2(num(a.ks)):null, null,
               b?i+1:null, b?b.bill:null, b&&num(b.kp)?r2(num(b.kp)):null, b&&num(b.ks)?r2(num(b.ks)):null]); }
    xo.push(["รวม",null,r2(t.knv.r),r2(t.ksk.r),null,"รวม",null,r2(t.knv.s),r2(t.ksk.s)]);
    add("โอน",xo,["H1"]);
    /* 4) ลงบัญชี — ซ้าย B เลขบิล/C ยอด (ปลีก) · ขวา E ชื่อร้าน/F ยอด (ร้านค้า) · F1 = วันที่ */
    var cl=(e.credit||[]).filter(function(r){return sideOf(r.bill,acc)==="r";}), cs=(e.credit||[]).filter(function(r){return sideOf(r.bill,acc)==="s";});
    var cr=[["ลงบัญชี (รวมงานสั่งทำ)",null,null,null,null,ser],["ลำดับ","เลขบิล","ยอดเงิน",null,"สมาชิก/ร้านค้า","ยอดเงิน"]];
    var nc=Math.max(cl.length,cs.length);
    for(var j=0;j<nc;j++){ var p=cl[j], q=cs[j];
      cr.push([j+1, p?p.bill:null, p?r2(num(p.amt)):null, null, q?(nameOf(q.bill,acc)||q.bill):null, q?r2(num(q.amt)):null]); }
    cr.push([null,"ยอดรวม",r2(t.cr.r),null,"ยอดรวม",r2(t.cr.s)]);
    add("ลงบัญชี",cr,["F1"]);
    /* 5) บิลเก่า — เลขบิลอยู่ซ้าย (B/C) ทุกใบ เพราะฟอร์มใหม่มีเลขบิลเสมอ */
    var ob=[["บิลเก่า",null,null,null,null,ser],["เงินสด"],["ลำดับ","เลขบิล","ยอดเงิน",null,"สมาชิก/ร้านค้า","ยอดเงิน"]];
    (e.oldc||[]).forEach(function(r,k){ ob.push([k+1,r.bill,r2(num(r.amt)),null,null,null]); });
    ob.push([null,"ยอดรวม",r2(S(t.old.c)),null,"ยอดรวม",0]);
    ob.push(["โอนเข้าบัญชี"]); ob.push(["ลำดับ","เลขบิล","ยอดเงิน",null,"สมาชิก/ร้านค้า","ยอดเงิน"]);
    (e.oldx||[]).forEach(function(r,k){ ob.push([k+1,r.bill,r2(num(r.amt)),null,null,null]); });
    ob.push([null,"ยอดรวม",r2(S(t.old.x)),null,"ยอดรวม",0]);
    add("บิลเก่า",ob,["F1"]);
    /* 6) ง-ส คุณ1 — คอลัมน์ A ยอดเรียงลงมา · B เลข RA ในวงเล็บ · แถวสุดท้าย = ยอดรวม */
    var gs=[];
    (e.rcash||[]).forEach(function(r){ if(num(r.amt)) gs.push([r2(num(r.amt)), r.ra?("("+r.ra+")"):null]); });
    gs.push([r2(t.cash.r),null]);
    add("ง-ส คุณ1",gs);
    return wb;
  }

  var api={ RETAIL_CODE:RETAIL_CODE, BILL_RE:BILL_RE, isRA:isRA, num:num, sideOf:sideOf, nameOf:nameOf, totals:totals, missingInAcc:missingInAcc, buildWorkbook:buildWorkbook, isoToSerial:isoToSerial };
  if(typeof module!=="undefined" && module.exports) module.exports=api; else root.CashierForm=api;
})(typeof window!=="undefined"?window:this);
