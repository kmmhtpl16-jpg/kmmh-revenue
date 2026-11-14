/* formcheck.js — ตรวจรายได้ "ฟอร์มแคชเชียร์เป็นตัวตั้ง" (REV-FORM-FIRST · v0.3.0 · 14 พ.ย.69)
   หลัก: ฟอร์มที่แคชเชียร์ส่ง = ตัวตั้ง · หาหลักฐานทีละบรรทัด · ห้ามเดา ห้ามย้ายเงินข้ามหมวด/ข้ามวัน
   ตัวตรวจล้วน ไม่ต่อฐาน ไม่มี DOM — ใช้ได้ทั้งเบราว์เซอร์ (window.FormCheck) และ node (module.exports)

   กฎที่คุณหลิงเคาะ (6 พ.ย.69):
   1 ลูกค้าร้านค้ารหัสเดียวกัน โอนก้อนเดียวจ่ายหลายใบ ยอดรวมตรงเป๊ะ = เจอ (ลูกค้าปลีกโอนรวม = พักให้คุณหลิงดู ตามกฎตัดบิล 22 ต.ค.)
   2 เงินเข้าก่อนวันฟอร์ม = เจอ แสดงบรรทัด "เงินเข้า dd/mm" ไม่ย้ายยอด · เงินแต่ละก้อนใช้ได้ครั้งเดียว (ย้อนได้ไม่เกิน EARLY_DAYS วัน) · ห้ามใช้เงินที่เข้าหลังวันฟอร์ม
   3 แถวติดธง "รับเข้าบัญชีอื่น" (source หรือ ref) + มีสลิป + ผูกเลขบิล + ยอดตรง + วันที่เงินเข้าอยู่ในช่วง = หลักฐานของบรรทัดนั้น
   4 โอนขาดไม่เกิน 10 บาท = ผ่าน แสดงยอดที่ขาด · เงินสด (ใบนับ) ขาด/เกินเท่าไรก็ติดธง
   5 บิลที่ ACC หักด้วยมัดจำ RA = หลักฐานคือเงินของ RA (ต้องยืนยันเงิน RA ได้จริง) · บิลเดียวกันหลายวันไม่นับเงินซ้ำ
   6 มัดจำอ่านจาก acc_deposits / acc_deposit_uses เท่านั้น
   ข้อจำกัดที่รู้ (ตามกฎที่เคาะ): K+ ไม่มีชื่อผู้โอน → จับคู่ด้วยยอด + บัญชี + วัน เท่านั้น
*/
(function(root){
  "use strict";
  var RETAIL = "66-00026";
  var EARLY_DAYS = 7;          /* เงินเข้าก่อนวันฟอร์ม ย้อนได้กี่วัน */
  var SHORT_MAX = 1000;        /* 10 บาท (หน่วยสตางค์) */
  var SUBSET_MAX = 16;         /* จำนวนใบสูงสุดที่ลองจับหลายใบต่อก้อน (2^16 แบบ) */
  var AMT_RE = /^-?\d+(\.\d{1,2})?$/;

  /* ยอดเงิน → สตางค์ · รูปแบบไม่ถูก = NaN (ห้ามเดาเป็น 0) · ช่องว่าง = 0 */
  function cents(v){ if(v==null||v==="") return 0; if(typeof v==="number") return isFinite(v)?Math.round(v*100):NaN;
    var s=String(v).replace(/,/g,"").trim(); if(s==="") return 0; return AMT_RE.test(s)?Math.round(parseFloat(s)*100):NaN; }
  function baht(c){ if(!isFinite(c)) return "?"; var n=c/100; return n.toLocaleString("en-US",{minimumFractionDigits:(c%100?2:0),maximumFractionDigits:2}); }
  function dmy(iso){ var p=String(iso||"").slice(0,10).split("-"); return p.length===3?(p[2]+"/"+p[1]):String(iso||""); }
  function dayNum(iso){ var p=String(iso).slice(0,10).split("-"); return Math.round(Date.UTC(+p[0],+p[1]-1,+p[2])/864e5); }
  function isRA(b){ return /^RA\d{4}-\d{4}$/.test(String(b||"")); }
  function isKM(b){ return /^KM\d{4}-\d{4}$/.test(String(b||"")); }
  function normBill(b){ return String(b||"").trim().toUpperCase(); }
  function normCn(c){ return String(c==null?"":c).replace(/\s+/g,"").toUpperCase(); }   /* เลขใบลดหนี้รูปแบบเดียวทุกจุด */
  function uniq(a){ return a.filter(function(v,i){ return a.indexOf(v)===i; }); }

  /* ---------- กองเงิน (ใช้ร่วมทุกวัน ก้อนละครั้ง) ----------
     money = { kp:[{id,date,t,amt}], ks:[{id,date,amt,who}] }   amt หน่วยบาท
     ks = แถวฝากในสเตทเมนต์กสิกรที่ไม่ใช่ยอดโอนเข้าจาก K+ (dep>0 && !kp) */
  function Pool(money){
    var self=this; self.used={}; self.by={kp:[],ks:[]};
    ["kp","ks"].forEach(function(ch){ (money&&money[ch]||[]).forEach(function(m,i){
      self.by[ch].push({id:m.id||(ch+"|"+m.date+"|"+i), ch:ch, date:String(m.date).slice(0,10), dn:dayNum(m.date), t:m.t||"", c:cents(m.amt), who:m.who||""}); }); });
  }
  /* early=false: วันเดียวกัน · early=true: 1..EARLY_DAYS วันก่อน (ไม่มีวันหลังเด็ดขาด) */
  Pool.prototype.list=function(chs, dn, early){
    var out=[], self=this;
    chs.forEach(function(ch){ self.by[ch].forEach(function(m){ if(self.used[m.id]||!isFinite(m.c)||m.c<=0) return;
      if(early? (m.dn<dn && m.dn>=dn-EARLY_DAYS) : (m.dn===dn)) out.push(m); }); });
    out.sort(function(a,b){ return b.dn-a.dn || (a.t<b.t?-1:a.t>b.t?1:0); });
    return out;
  }
  Pool.prototype.take=function(m, who){ this.used[m.id]=who||true; };
  /* ทุกก้อน (รวมที่ใช้แล้ว) ช่วงวัน [lo, hi] — ใช้ตรวจว่าหลักฐานนอกบัญชีซ้ำกับเงินในบัญชีร้านไหม */
  Pool.prototype.all=function(chs, lo, hi){ var out=[], self=this;
    chs.forEach(function(ch){ self.by[ch].forEach(function(m){ if(isFinite(m.c)&&m.c>0&&m.dn>=lo&&m.dn<=hi) out.push(m); }); }); return out; };

  /* หา subset ของบรรทัด (≤ SUBSET_MAX) ที่ผลรวม = target  คืน array index หรือ null */
  function subsetSum(lines, target){
    var n=Math.min(lines.length, SUBSET_MAX), best=null;
    for(var mask=1; mask<(1<<n); mask++){
      var s=0, k=0; for(var i=0;i<n;i++) if(mask&(1<<i)){ s+=lines[i].c; k++; }
      if(s===target && (!best || k>best.k)) best={mask:mask,k:k};
    }
    if(!best) return null; var idx=[]; for(var j=0;j<n;j++) if(best.mask&(1<<j)) idx.push(j); return idx;
  }

  /* ---------- ข้อมูล ACC ----------
     acc = { bills:{KM..:{date,code,name,total}}, deps:{RA..:{date,code,name,total,method}},
             uses:[{ra,bill,amt}], cns:[{cn,bill,amt}] }   (cns = ใบลดหนี้ที่หักบิลนั้น ทั้งจากบิลอื่นและบิลตัวเอง · กันซ้ำด้วย cn+bill) */
  function usesOf(acc, bill){ return (acc.uses||[]).filter(function(u){ return u.bill===bill; }); }
  function cnsOf(acc, bill){ var seen={}; return (acc.cns||[]).filter(function(c){ var k=c.cn+"|"+c.bill; if(c.bill!==bill||seen[k]) return false; seen[k]=1; return true; }); }

  /* ---------- ตรวจหลายวันตามลำดับ (เงินก้อนเดียวใช้ได้ครั้งเดียวข้ามวัน) ----------
     days: [{date, form, proof, refunds:[{bill,kind,cn,amt,pay}], others:[{item,amt,ch}], acc,
             stmt:{ks:bool, kp:bool}, bankPartial}]
     shared: {money, pending:[{id,date,amount,source,ref,slip,status,bill}]} */
  function checkDays(days, shared){
    var pool=new Pool(shared&&shared.money);
    var ctx={pool:pool, pendUsed:{}, ra:{}, seenBill:{}, pending:(shared&&shared.pending)||[], cnRefunds:(shared&&shared.cnRefunds)||null, shortBy:{}, raUses:{}};
    (ctx.cnRefunds||[]).forEach(function(r){ r.cn=normCn(r.cn); });
    var list=(days||[]).slice().sort(function(a,b){ return a.date<b.date?-1:1; });
    list.forEach(function(d){ (d.refunds||[]).forEach(function(r){ r.cn=normCn(r.cn); }); if(d.acc) (d.acc.cns||[]).forEach(function(c){ c.cn=normCn(c.cn); }); });
    var out=list.map(function(d){ return checkDay(d, ctx); });
    /* เงินที่ไม่มีบรรทัดไหนใช้ — คิดหลังตรวจครบทุกวัน · ข้อมูลประกอบ ไม่นับเป็นผิด */
    out.forEach(function(R){ var dn=dayNum(R.date); ["kp","ks"].forEach(function(ch){ pool.list([ch],dn,false).forEach(function(m){ R.info.unusedMoney.push({ch:ch,amt:m.c/100,t:m.t,who:m.who}); }); }); });
    return out;
  }

  function checkDay(d, ctx){
    var date=String(d.date).slice(0,10), dn=dayNum(date), f=d.form||{}, acc=d.acc||{bills:{},deps:{},uses:[],cns:[]};
    var R={date:date, lines:[], notes:[], ok:[], info:{notInForm:[], unusedMoney:[]}, counts:{xfer:0,found:0}};
    function line(lv, cat, text, extra){ var o={lv:lv, cat:cat, text:text}; if(extra) for(var k in extra) o[k]=extra[k]; (lv==="note"?R.notes:lv==="ok"?R.ok:R.lines).push(o); return o; }
    function billOf(no){ return acc.bills&&acc.bills[no]; }
    function depOf(no){ return acc.deps&&acc.deps[no]; }
    /* มัดจำที่ ACC หักบิล นับเฉพาะ RA ที่ออกไม่หลังวันฟอร์ม (RA ที่รับทีหลัง = ลูกค้าจ่ายทีหลัง วันนั้นยังเป็นลงบัญชี) */
    function usesNow(no){ return usesOf(acc,no).filter(function(u){ var dp=depOf(u.ra); return !dp || String(dp.date).slice(0,10)<=date; }); }
    function usesLater(no){ return usesOf(acc,no).filter(function(u){ var dp=depOf(u.ra); return dp && String(dp.date).slice(0,10)>date; }); }
    /* ยอดหักมัดจำต่อ RA สะสมจากทุกวัน (RA→บิล→ยอด · ภาพล่าสุดของคู่เดิมนับครั้งเดียว) */
    var snap={}; (acc.uses||[]).forEach(function(u){ var k=u.ra+"|"+u.bill; snap[k]=(snap[k]||0)+cents(u.amt); });   /* รวมแถวซ้ำในภาพวันนี้ก่อน (ฐานเดียวกับ depC) */
    Object.keys(snap).forEach(function(k){ var p=k.split("|"); (ctx.raUses[p[0]]=ctx.raUses[p[0]]||{})[p[1]]=snap[k]; });
    var BOX={rcash:"เงินสดปลีก",scash:"ร้านค้าเงินสด",xfer:"โอน",credit:"ลงบัญชี",oldc:"บิลเก่าเงินสด",oldx:"บิลเก่าโอน",upk:"UPK"};

    /* ===== 0) ตรวจรูปแถว: ยอดต้องเป็นตัวเลข ≥ 0 · เลขบิลต้องมีใน ACC (ไม่มี = ติดธง ห้ามข้าม) ===== */
    Object.keys(BOX).forEach(function(k){ (f[k]||[]).forEach(function(r,i){
      var fs=k==="xfer"?["kp","ks"]:["amt"], bad=fs.filter(function(x){ var c=cents(r[x]); return !isFinite(c)||c<0; });
      var no=normBill(k==="rcash"?r.ra:r.bill), tot=fs.reduce(function(s,x){ var c=cents(r[x]); return s+(isFinite(c)?c:0); },0);
      if(bad.length){ line("bad","form",BOX[k]+" แถว "+(i+1)+(no?" "+no:"")+": ยอด \""+bad.map(function(x){return r[x];}).join(", ")+"\" ไม่ใช่ตัวเลขที่ถูกต้อง",{bill:no}); r._bad=true;
        if(isRA(no)){ var sr=ctx.ra[no]=ctx.ra[no]||{}; sr.bad=true; sr.formDate=sr.formDate||date; }   /* RA ลงฟอร์มผิดรูป = ยืนยันไม่ได้ ห้ามไปหาเงินเองแทน */
        return; }
      if(k==="rcash"){ if(no&&!isRA(no)){ line("bad","form","เงินสดปลีก แถว "+(i+1)+": เลข RA \""+r.ra+"\" ไม่ถูกต้อง"); r._bad=true; } return; }
      if(!no){ if(tot){ line("bad","form",BOX[k]+" แถว "+(i+1)+": มียอด "+baht(tot)+" แต่ไม่มีเลขบิล"); r._bad=true; } return; }
      if(isRA(no)){ if(k!=="scash"&&k!=="xfer"){ line("bad","form",BOX[k]+" "+no+" — ใส่เลขใบรับมัดจำ (RA) ในกล่องนี้ไม่ได้ (ลงรับมัดจำได้เฉพาะเงินสด/โอนของวันนี้)",{bill:no}); r._bad=true; return; }
        if(!depOf(no)){ line("bad","ra",BOX[k]+" "+no+" ไม่พบใบรับมัดจำใน ACC",{bill:no}); r._bad=true; } return; }
      if(!isKM(no)||!billOf(no)){ line("bad","form",BOX[k]+" "+no+" "+baht(tot)+" ไม่พบบิลนี้ใน ACC",{bill:no}); r._bad=true; return; }
      var old=(k==="oldc"||k==="oldx"), bd=String(billOf(no).date).slice(0,10);
      if(old && bd>=date){ line("bad","form",BOX[k]+" "+no+" เป็นบิลวันที่ "+dmy(bd)+" ไม่ใช่บิลเก่า",{bill:no}); r._bad=true; }
      else if(!old && bd!==date){ line("bad","form",BOX[k]+" "+no+" เป็นบิลวันที่ "+dmy(bd)+" — ต้องลงในกล่องบิลเก่า",{bill:no}); r._bad=true; }
    }); });
    function rows(k){ return (f[k]||[]).filter(function(r){ return !r._bad; }); }

    /* ===== 0b) คืนเงินเพราะรับเกิน (overpay): ตรวจก่อนนับเงินสด — ผิดเงื่อนไข = แถวคืนเงินผิด → ใบนับวันนี้ยืนยัน RA ไม่ได้
       · อ้างเลข RA ไม่ได้ (คืนมัดจำ = หลักฐานรายการถอนในสเตทเมนต์ ไม่ใช่คืนรับเกิน)
       · รวมต่อบิลต้องไม่เกินเงินที่บิลนั้นรับในฟอร์มวันนี้ (เงินสด/โอน ทั้งบิลวันนี้และบิลเก่า) */
    var rfCn={}; (ctx.cnRefunds||[]).concat(ctx.cnRefunds?[]:(d.refunds||[])).forEach(function(r){ if(!r.cn) return; if(ctx.cnRefunds && String(r.date).slice(0,10)>date) return; var c=cents(r.amt); if(isFinite(c)&&c>0) rfCn[r.cn]=(rfCn[r.cn]||0)+c; });
    /* นับเฉพาะเงินรับใหม่: บิลที่ ACC ปิดเต็มใบด้วยมัดจำ (+ใบลดหนี้สุทธิ) แล้ว ไม่ถือว่ามีเงินรับใหม่ — เงื่อนไขเดียวกับขั้น 3b/4 */
    function raFull(no){ var b=billOf(no); if(!b) return false; var dc=usesNow(no).reduce(function(s,u){return s+cents(u.amt);},0); return dc>0 && dc+cnNet(no)>=cents(b.total); }
    var recv={}; ["scash","oldc"].forEach(function(k){ rows(k).forEach(function(r){ var no=normBill(r.bill); if(raFull(no)) return; recv[no]=(recv[no]||0)+cents(r.amt); }); });
    rows("oldx").forEach(function(r){ var no=normBill(r.bill); if(raFull(no)) return; recv[no]=(recv[no]||0)+cents(r.amt); });
    rows("xfer").forEach(function(r){ var no=normBill(r.bill); if(raFull(no)) return; recv[no]=(recv[no]||0)+cents(r.kp)+cents(r.ks); });
    var ovp={}, cnUnverified=false; (d.refunds||[]).forEach(function(r){ var no=normBill(r.bill), c=cents(r.amt);
      /* คืนเงินทุกชนิดอ้างเลข RA ไม่ได้ (คืนมัดจำ = รายการถอนในสเตทเมนต์) — ตรวจก่อนยอด เพื่อให้ RA เสียแม้ยอดผิดรูป */
      if(isRA(no)){ line("bad","refund","คืนเงินอ้างใบรับมัดจำ "+no+" "+String(r.amt)+" — คืนมัดจำต้องดูจากรายการถอนในสเตทเมนต์",{bill:no}); r._bad=true; var sr=ctx.ra[no]=ctx.ra[no]||{}; sr.bad=true; sr.formDate=sr.formDate||date; return; }
      if(r._bad||!isFinite(c)||c<0) return;
      /* คืนเงินที่อ้าง CN ซึ่งไม่อยู่ในข้อมูล ACC ที่โหลด → หน้านี้ยืนยันไม่ได้ → ใบนับวันนั้นห้ามใช้ยืนยันเงินมัดจำเงินสด */
      /* คืนเงินที่อ้าง CN: ต้องเจอ CN ใน ACC ที่โหลด และยอดคืนสะสมของ CN นั้น (ทุกวันถึงวันนี้) ไม่เกินยอด CN · ไม่งั้น = พักให้คุณหลิงดู + ใบนับวันนั้นห้ามยืนยันมัดจำเงินสด */
      if(r.kind==="cn" && String(r.cn||"").trim()){ var cnNo=String(r.cn).trim(), cnRow=(acc.cns||[]).filter(function(x){ return x.cn===cnNo; })[0];
        var cum=((ctx.cnRefunds||d.refunds||[]).filter(function(q){ return String(q.cn||"").trim()===cnNo && (!ctx.cnRefunds || String(q.date).slice(0,10)<=date); }).reduce(function(s,q){ var v=cents(q.amt); return s+(isFinite(v)&&v>0?v:0); },0));
        if(!cnRow || cum>cents(cnRow.amt)){ cnUnverified=true;
          line("hold","refund","คืนเงิน"+(r.pay==="cash"?"สด":"")+" "+baht(c)+" อ้าง "+cnNo+(no?" บิล "+no:"")+" — "+(!cnRow?"หน้านี้หาใบลดหนี้นี้ใน ACC ไม่เจอ":"คืนสะสม "+baht(cum)+" เกินยอดใบลดหนี้ "+baht(cents(cnRow.amt)))+" ให้คุณหลิงดู",{bill:no}); } }
      if(r.kind==="cn"){ if(!String(r.cn||"").trim()){ line("bad","refund","คืนเงินแบบใบลดหนี้ "+(no||"")+" "+baht(c)+" ไม่มีเลขใบลดหนี้",{bill:no}); r._bad=true; } return; }
      if(r.kind!=="overpay"){ line("bad","refund","คืนเงิน "+(no||"")+" "+baht(c)+" ชนิด \""+(r.kind||"")+"\" ตรวจไม่ได้",{bill:no}); r._bad=true; return; }
      (ovp[no]=ovp[no]||[]).push(r); });
    Object.keys(ovp).forEach(function(no){ var sum=ovp[no].reduce(function(s,r){return s+cents(r.amt);},0);
      if(sum>(recv[no]||0)){ line("bad","refund","คืนเงินรับเกิน "+(no||"(ไม่มีเลขบิล)")+" "+baht(sum)+" มากกว่าที่บิลนี้รับในฟอร์มวันนี้ "+baht(recv[no]||0),{bill:no}); ovp[no].forEach(function(r){ r._bad=true; }); } });

    /* ===== 1) เงินสด: ยอดนำส่งตามฟอร์ม = ใบนับเงิน ===== */
    var cashC=0;
    ["rcash","scash","oldc"].forEach(function(k){ rows(k).forEach(function(r){ var c=cents(r.amt); if(isFinite(c)) cashC+=c; }); });
    /* แถวเงินสด/รายรับอื่น/คืนเงินที่ผิดรูป → ใบนับวันนี้ใช้ยืนยันอะไรไม่ได้ (กันหักล้างยอด) */
    var cashDirty=["rcash","scash","oldc"].some(function(k){ return (f[k]||[]).some(function(r){ return r._bad; }); });
    (d.others||[]).forEach(function(o,i){ var c=cents(o.amt); if(!isFinite(c)||c<0){ line("bad","form","รายรับอื่นๆ แถว "+(i+1)+": ยอด \""+o.amt+"\" ไม่ถูกต้อง"); o._bad=true; return; } if(o.ch!=="xfer") cashC+=c; });
    (d.refunds||[]).forEach(function(r,i){ var c=cents(r.amt); if(!isFinite(c)||c<0){ line("bad","form","คืนเงิน แถว "+(i+1)+": ยอด \""+r.amt+"\" ไม่ถูกต้อง"); r._bad=true; } });
    cashDirty=cashDirty||(d.others||[]).some(function(o){return o._bad;})||(d.refunds||[]).some(function(r){return r._bad;});
    var refundCash=0; (d.refunds||[]).forEach(function(r){ if(r.pay==="cash" && !r._bad){ var c=cents(r.amt); if(isFinite(c)) refundCash+=c; } });
    cashC-=refundCash;
    var cashOk=false;
    if(d.proof==null||String(d.proof).trim()==="") line("wait","cash","ยังไม่มีใบนับเงินสด (ฟอร์มนำส่ง "+baht(cashC)+")");
    else if(!isFinite(cents(d.proof))||cents(d.proof)<0) line("bad","cash","ยอดใบนับเงินสด \""+d.proof+"\" ไม่ถูกต้อง (ต้องเป็นตัวเลขไม่ติดลบ)");
    else if(cashC<0) line("hold","cash","ยอดเงินสดนำส่งตามฟอร์มติดลบ "+baht(cashC)+" (คืนเงินสดมากกว่าที่รับ) — ให้คุณหลิงดูว่าเอาเงินจากไหนมาคืน");
    else { var pc=cents(d.proof), df=pc-cashC;
      if(df===0){ cashOk=!cashDirty && !cnUnverified; line("ok","cash","เงินสดนำส่ง "+baht(cashC)+" = ใบนับ"+(refundCash?" (หักคืนเงินสด "+baht(refundCash)+")":"")); }
      else line("bad","cash","เงินสด"+(df<0?"ขาด ":"เกิน ")+baht(Math.abs(df))+" — ฟอร์มนำส่ง "+baht(cashC)+" · ใบนับ "+baht(pc), {diff:df}); }

    /* ===== 2) มัดจำ RA ที่รับวันนี้ (ฟอร์ม): ยอดตรง ACC · เงินสด = ผ่านเมื่อใบนับตรง · โอน = ผ่านเมื่อเจอเงิน (ข้อ 5) ===== */
    var raRows={};
    rows("rcash").forEach(function(r){ if(r.ra){ var ra=normBill(r.ra); (raRows[ra]=raRows[ra]||[]).push({c:cents(r.amt),ch:"cash"}); } });
    rows("scash").forEach(function(r){ var no=normBill(r.bill); if(isRA(no)) (raRows[no]=raRows[no]||[]).push({c:cents(r.amt),ch:"cash"}); });
    rows("xfer").forEach(function(r){ var no=normBill(r.bill); if(isRA(no)) (raRows[no]=raRows[no]||[]).push({c:cents(r.kp)+cents(r.ks),ch:"xfer"}); });
    var raToday={};
    Object.keys(raRows).forEach(function(ra){ var dp=depOf(ra); if(!dp){ if(!R.lines.some(function(l){return l.bill===ra;})) line("bad","ra",ra+" ลงรับ "+baht(raRows[ra].reduce(function(s,x){return s+x.c;},0))+" แต่ไม่พบใบรับมัดจำใน ACC",{bill:ra}); return; } var got=raRows[ra].reduce(function(s,x){return s+x.c;},0);
      var st=ctx.ra[ra]=ctx.ra[ra]||{};
      if(st.formDate && st.formDate!==date){ line("bad","ra",ra+" ลงรับในฟอร์มซ้ำ (ลงแล้ววันที่ "+dmy(st.formDate)+")",{bill:ra}); return; }
      st.formDate=date;
      if(cents(dp.total)!==got){ line("bad","ra",ra+" ลงรับ "+baht(got)+" แต่ใบรับมัดจำใน ACC "+baht(cents(dp.total)),{bill:ra}); st.bad=true; return; }
      if(String(dp.date).slice(0,10)>date){ line("bad","ra",ra+" ลงรับเงินในฟอร์มก่อนวันออกใบรับมัดจำ ("+dmy(dp.date)+")",{bill:ra}); st.bad=true; return; }
      if(String(dp.date).slice(0,10)!==date) line("note","ra",ra+" ใบรับมัดจำออกวันที่ "+dmy(dp.date)+" แต่ลงรับเงินในฟอร์มวันนี้",{bill:ra});
      raToday[ra]=raRows[ra].every(function(x){return x.ch==="cash";})?"cash":raRows[ra].every(function(x){return x.ch==="xfer";})?"xfer":"mix"; });

    /* ===== 3) เงินโอน: ทุกบรรทัดต้องเจอเงินก้อนนั้น ===== */
    var X=[];
    function codeOf(no){ var b=billOf(no); if(b) return b.code; var dp=depOf(no); return dp?dp.code:""; }
    function nameOf(no){ var b=billOf(no); if(b) return b.name||""; var dp=depOf(no); return dp?(dp.name||""):""; }
    rows("xfer").forEach(function(r){ var no=normBill(r.bill);
      if(cents(r.kp)) X.push({bill:no, c:cents(r.kp), chs:["kp"], src:"โอน K+"});
      if(cents(r.ks)) X.push({bill:no, c:cents(r.ks), chs:["ks"], src:"โอนกสิกร"}); });
    rows("oldx").forEach(function(r){ var no=normBill(r.bill), c=cents(r.amt); if(!c) return;
      if(r.chq){ line("hold","xfer","บิลเก่า "+no+" "+baht(c)+" จ่ายด้วยเช็ค — หน้านี้ไม่ตรวจเช็ค ให้คุณหลิงกดในการ์ดตามทางเดิม",{bill:no}); return; }
      var chs=r.ch==="kplus"?["kp"]:r.ch==="ksk"?["ks"]:["kp","ks"];
      X.push({bill:no, c:c, chs:chs, src:"บิลเก่าโอน"+(r.ch==="kplus"?" K+":r.ch==="ksk"?" กสิกร":" (ไม่ระบุบัญชี)"), old:true}); });
    (d.others||[]).forEach(function(o){ if(o.ch!=="xfer"||o._bad) return; var c=cents(o.amt);
      if(c) X.push({bill:"", c:c, chs:["kp","ks"], src:"รายรับอื่นๆ โอน "+(o.item||"")}); });
    X.forEach(function(x){ x.code=x.bill?codeOf(x.bill):""; x.name=x.bill?nameOf(x.bill):""; });
    R.counts.xfer=X.length;
    function done(x, how, lv){ x.done=true; x.how=how; R.counts.found++; if(lv==="note") line("note","xfer",how,{bill:x.bill}); }
    function lbl(x){ return (x.bill||x.src)+" "+baht(x.c); }

    function oneToOne(early, only){ X.forEach(function(x){ if(x.done||x.defer||(only&&!only(x))) return;
      var ms=ctx.pool.list(x.chs, dn, early);
      for(var i=0;i<ms.length;i++) if(ms[i].c===x.c){ ctx.pool.take(ms[i],x.bill||x.src);
        done(x, lbl(x)+" — เจอ "+(ms[i].ch==="kp"?"K+":"กสิกร")+(early?" เงินเข้า "+dmy(ms[i].date)+(ms[i].t?" "+String(ms[i].t).slice(11,16):""):""), early?"note":null); return; } }); }

    /* 3a) แถวรับมัดจำ RA แบบโอน → หาเงินก่อน (เพื่อให้บิลที่หัก RA วันเดียวกันยืนยันได้) */
    var isRAline=function(x){ return isRA(x.bill); };
    otherAcc(isRAline); oneToOne(false,isRAline); oneToOne(true,isRAline);

    /* เงินของ RA ยืนยันแล้วหรือยัง: (ก) ลงฟอร์มเงินสดและใบนับวันนั้นตรง (ข) ลงฟอร์มแบบโอนและเจอเงินทุกบรรทัด
       (ค) ไม่อยู่ในฟอร์มเลย และ ACC ระบุรับโอน → หาเงิน 1–2 ก้อนวันออก RA ที่รวมตรงยอด RA (วันออก RA ต้องไม่หลังวันฟอร์ม) */
    function settleTodayRA(){ Object.keys(raToday).forEach(function(ra){ var st=ctx.ra[ra]; if(st.ok||st.bad) return;
      if(raToday[ra]==="cash"){ if(cashOk) st.ok="ลงเงินสด "+dmy(date)+" ใบนับตรง"; else if(cnUnverified) st.why="วันรับมัดจำ ("+dmy(date)+") มีคืนเงินใบลดหนี้ที่หน้านี้ยืนยันไม่ได้"; }
      else { var ls=X.filter(function(x){return x.bill===ra;}); if(ls.length&&ls.every(function(x){return x.done&&!x.hold;})&&raToday[ra]==="xfer") st.ok="ลงโอน "+dmy(date)+" เจอเงิน"; } }); }
    settleTodayRA();
    function raVerify(ra){
      var st=ctx.ra[ra]=ctx.ra[ra]||{}, dp0=depOf(ra), um=ctx.raUses[ra]||{};
      var usedC=Object.keys(um).reduce(function(s,b){ return s+um[b]; },0);
      if(dp0 && usedC>cents(dp0.total)){ st.over=usedC; return false; }     /* ACC หัก RA รวมเกินยอด RA = ยืนยันไม่ได้ */
      if(st.bad) return false; if(st.ok) return true; if(st.formDate) return false;   /* เสียแล้ว = เสียตลอด แม้เคยผ่าน */   /* ลงฟอร์มแล้วแต่ยังไม่ผ่าน = ห้ามหาเงินอื่นแทน */
      var dp=depOf(ra); if(!dp) return false;
      if(String(dp.date).slice(0,10)>date) return false;
      if(String(dp.method||"").trim()!=="เงินโอน") return false;   /* หาเงินเองได้เฉพาะ RA ที่ ACC ระบุ "เงินโอน" · เงินสด/ว่าง/อื่น ๆ ที่ไม่เคยลงฟอร์ม = ยืนยันไม่ได้ */
      if(st.tried) return false; st.tried=true;
      var rdn=dayNum(dp.date), want=cents(dp.total), ms=ctx.pool.list(["ks","kp"], rdn, false);
      for(var i=0;i<ms.length;i++) if(ms[i].c===want){ ctx.pool.take(ms[i],ra); st.ok="เงินเข้า "+dmy(dp.date)+" "+baht(want)+" (ไม่ได้ลงฟอร์ม)"; return true; }
      for(var a=0;a<ms.length;a++) for(var b=a+1;b<ms.length;b++) if(ms[a].c+ms[b].c===want){ ctx.pool.take(ms[a],ra); ctx.pool.take(ms[b],ra);
        st.ok="เงินเข้า "+dmy(dp.date)+" 2 ก้อน "+baht(ms[a].c)+" + "+baht(ms[b].c)+" (ไม่ได้ลงฟอร์ม)"; return true; }
      return false;
    }
    function raWhy(ra){ var st=ctx.ra[ra]||{}, dp=depOf(ra);
      if(!dp) return "ไม่พบ "+ra+" ใน ACC"; if(st.over) return ra+" ถูกหักรวม "+baht(st.over)+" เกินยอดใบรับมัดจำ "+baht(cents(dp.total)); if(st.bad) return ra+" ยอดที่ลงฟอร์มไม่ตรง ACC";
      if(st.why) return ra+" "+st.why;
      if(st.formDate) return ra+" ลงฟอร์มวันที่ "+dmy(st.formDate)+" แต่เงินยังไม่ผ่าน";
      if(String(dp.date).slice(0,10)>date) return ra+" ออกหลังวันฟอร์ม";
      return ra+" ยังไม่เจอเงินมัดจำ"; }

    /* 3b) บิลที่ ACC หักมัดจำครบเต็มใบ → หลักฐานคือเงิน RA (ไม่หาเงินรายบิล ไม่นับซ้ำ) */
    function cnNet(no){ return cnsOf(acc,no).reduce(function(s,c){ return s+Math.max(0,cents(c.amt)-(rfCn[c.cn]||0)); },0); }
    /* คืนเงินที่อ้าง CN สะสมถึงวันนี้ (ทุกวันก่อนหน้า + วันนี้) — CN ที่คืนเงินไปแล้วหักบิลไม่ได้อีก */
    X.forEach(function(x){ if(x.done||!isKM(x.bill)) return; var b=billOf(x.bill); if(!b) return;
      var us=usesNow(x.bill), depC=us.reduce(function(s,u){return s+cents(u.amt);},0);
      if(!us.length || depC+cnNet(x.bill)<cents(b.total)) return;
      if(x.c>cents(b.total)){ x.done=true; line("bad","xfer",lbl(x)+" "+x.src+" — ACC หักมัดจำเต็มใบแล้ว แต่ฟอร์มลงรับเกินยอดบิล "+baht(cents(b.total)),{bill:x.bill}); return; }
      var ras=uniq(us.map(function(u){return u.ra;}));
      var bad=ras.filter(function(ra){ return !raVerify(ra); });
      /* RA ยืนยันเงินไม่ได้ → ติดธงเลย ห้ามไปจับเงินก้อนอื่นที่ยอดเท่ากันแทน */
      if(bad.length && bad.every(function(ra){ var st=ctx.ra[ra]||{}; return raToday[ra] && !st.bad && !st.over; })){ x.defer=ras; return; }   /* RA ลงฟอร์มวันนี้ ยังรอผลหาเงิน → ตัดสินท้ายขั้น */
      if(bad.length){ x.done=true; line("bad","xfer",lbl(x)+" "+x.src+" — ACC หักมัดจำเต็มใบ แต่ "+bad.map(raWhy).join(", "),{bill:x.bill}); return; }
      var rep=ctx.seenBill[x.bill]&&ctx.seenBill[x.bill]!==date?" · บิลนี้ลงแล้ววันที่ "+dmy(ctx.seenBill[x.bill])+" ไม่นับเงินซ้ำ":"";
      done(x, lbl(x)+" — ACC หักมัดจำ "+ras.join(", ")+" เต็มใบ (เงิน RA: "+ras.map(function(ra){return ctx.ra[ra].ok;}).join(" · ")+")"+rep, "note"); });

    /* 3c) รับเข้าบัญชีอื่น: แถวติดธง + สลิป + ผูกเลขบิล + ยอดตรง + วันที่เงินเข้า [วันฟอร์ม−EARLY, วันฟอร์ม] (เรียกก่อนขั้น 3a เพื่อให้ RA ใช้หลักฐานนี้ได้) */
    function otherAcc(only){ X.forEach(function(x){ if(x.done||x.defer||!x.bill||(only&&!only(x))) return;
      var p=ctx.pending.filter(function(q){ return !ctx.pendUsed[q.id] && !(q.slip && ctx.pendUsed["slip:"+q.slip]) && q.bill===x.bill && cents(q.amount)===x.c && q.status==="matched" &&
        (/รับเข้าบัญชีอื่น/.test(q.source||"")||/บัญชีอื่น/.test(q.ref||"")); });
      if(!p.length) return;
      var inWin=p.filter(function(q){ if(!q.date) return false; var qd=dayNum(q.date); return qd<=dn && qd>=dn-EARLY_DAYS; });
      if(!inWin.length){ x.otherWhy=" (มีแถวติดธงบัญชีอื่น แต่วันที่เงินเข้า "+p.map(function(q){return q.date?dmy(q.date):"ไม่มีวันที่";}).join(",")+" อยู่นอกช่วง)"; return; }
      var withSlip=inWin.filter(function(q){ return !!q.slip; });
      if(!withSlip.length){ x.otherWhy=" (มีแถวติดธงบัญชีอื่น แต่ไม่มีสลิป)"; return; }
      /* มีเงินยอดเดียวกันที่ยังไม่มีใครใช้ในบัญชีร้าน (ช่วงเดียวกัน) → อาจเป็นก้อนเดียวกันที่ติดธงผิด ห้ามผ่านเอง ให้คุณหลิงดู */
      var twins=ctx.pool.all(["kp","ks"],dn-EARLY_DAYS,dn).filter(function(m){ return m.c===x.c; });   /* รวมก้อนที่ใช้แล้ว */
      if(twins.length){ x.done=true; x.hold=true; ctx.pendUsed[withSlip[0].id]=x.bill+"@"+date; ctx.pendUsed["slip:"+withSlip[0].slip]=x.bill+"@"+date;
        twins.forEach(function(m){ if(!ctx.pool.used[m.id]) ctx.pool.take(m,"hold-other:"+x.bill); });
        var tw=twins[0], by=ctx.pool.used[tw.id];
        line("hold","xfer",lbl(x)+" — มีแถวติดธงรับเข้าบัญชีอื่น แต่เจอยอดเดียวกันใน"+(tw.ch==="kp"?"K+":"กสิกร")+" "+dmy(tw.date)+(typeof by==="string"&&by.indexOf("hold-other:")!==0?" (ก้อนนี้ใช้กับ "+by+" แล้ว)":"")+" — ให้คุณหลิงดูว่าเป็นก้อนเดียวกันไหม",{bill:x.bill}); return; }
      ctx.pendUsed[withSlip[0].id]=x.bill+"@"+date; ctx.pendUsed["slip:"+withSlip[0].slip]=x.bill+"@"+date;   /* สลิปเดียวใช้ได้ครั้งเดียว แม้มีหลายแถว */
      done(x, lbl(x)+" — รับเข้าบัญชีอื่น (ติดธง + มีสลิป · เงินเข้า "+dmy(withSlip[0].date)+")", "note"); }); }
    otherAcc();

    /* 3d) ลูกค้าร้านค้ารหัสเดียวกัน หลายใบ = ก้อนเดียว (ยอดรวมตรงเป๊ะ) · ลูกค้าปลีก = พักให้คุณหลิงดู */
    function groups(early){
      var G={};
      X.forEach(function(x){ if(x.done||x.defer||!x.code) return; var k=x.code+"|"+x.chs.join(","); (G[k]=G[k]||[]).push(x); });
      Object.keys(G).forEach(function(k){ var g=G[k]; if(g.length<2) return;
        var ms=ctx.pool.list(g[0].chs, dn, early).sort(function(a,b){ return b.c-a.c; });
        ms.forEach(function(m){ var rest=g.filter(function(x){return !x.done;}); if(rest.length<2) return;
          var idx=subsetSum(rest, m.c); if(!idx||idx.length<2) return;
          var pick=idx.map(function(i){return rest[i];});
          var bills=pick.map(function(x){return x.bill.slice(-4);}).join("+");
          if(pick[0].code===RETAIL){
            ctx.pool.take(m,"hold:"+bills);
            pick.forEach(function(x){ x.done=true; x.hold=true; R.counts.found++; });
            line("hold","xfer","ลูกค้าปลีกโอนก้อนเดียว "+baht(m.c)+" จ่าย "+pick.length+" ใบ ("+bills+")"+(early?" เงินเข้า "+dmy(m.date):"")+" — พักให้คุณหลิงดู (กฎ 22 ต.ค.)");
            return; }
          ctx.pool.take(m,"grp:"+bills);
          pick.forEach(function(x){ x.done=true; x.how="กลุ่ม"; R.counts.found++; });
          line(early?"note":"ok","xfer",(pick[0].name||pick[0].code)+" "+pick.length+" ใบ ("+bills+") รวม "+baht(m.c)+" = โอนก้อนเดียว "+(m.ch==="kp"?"K+":"กสิกร")+(early?" เงินเข้า "+dmy(m.date):""));
        }); });
    }
    oneToOne(false); groups(false); oneToOne(true); groups(true);

    /* 3e) โอนขาดไม่เกิน 10 บาท (ทีละใบ หรือทั้งกลุ่มร้านค้าเดียวกัน) */
    var shortBy=ctx.shortBy;   /* ยอดขาดสะสมต่อบิล (ทุกแถว ทุกบัญชี ทุกวัน) ต้องไม่เกิน 10 บาท */
    function shortTry(xs){ var need=xs.reduce(function(s,x){return s+x.c;},0);
      var chs=xs[0].chs, ms=ctx.pool.list(chs,dn,false).concat(ctx.pool.list(chs,dn,true));
      for(var i=0;i<ms.length;i++){ var gap=need-ms[i].c; if(gap>0 && gap<=SHORT_MAX && xs.every(function(x){ return !x.bill || (shortBy[x.bill]||0)+gap<=SHORT_MAX; })){ ctx.pool.take(ms[i],"short");
        xs.forEach(function(x){ if(x.bill) shortBy[x.bill]=(shortBy[x.bill]||0)+gap; });
        xs.forEach(function(x){ x.done=true; R.counts.found++; });
        line("note","xfer",(xs.length>1?(xs[0].name||xs[0].code)+" "+xs.length+" ใบ ("+xs.map(function(x){return x.bill.slice(-4);}).join("+")+")":lbl(xs[0]))+
          " — เงินเข้า "+baht(ms[i].c)+(ms[i].dn!==dn?" ("+dmy(ms[i].date)+")":"")+" ขาด "+baht(gap)+" บาท ปัดผ่าน (กฎ ≤10 บาท)",{short:gap}); return true; } }
      return false; }
    X.forEach(function(x){ if(!x.done && !x.defer && !isRA(x.bill)) shortTry([x]); });
    var G2={}; X.forEach(function(x){ if(x.done||x.defer||!x.code||x.code===RETAIL||isRA(x.bill)) return; var k=x.code+"|"+x.chs.join(","); (G2[k]=G2[k]||[]).push(x); });
    Object.keys(G2).forEach(function(k){ if(G2[k].length>1) shortTry(G2[k]); });
    settleTodayRA();
    X.forEach(function(x){ if(!x.defer||x.done) return; var ras=x.defer; x.defer=null;
      var bad=ras.filter(function(ra){ return !raVerify(ra); });
      if(bad.length){ x.done=true; line("bad","xfer",lbl(x)+" "+x.src+" — ACC หักมัดจำเต็มใบ แต่ "+bad.map(raWhy).join(", "),{bill:x.bill}); return; }
      done(x, lbl(x)+" — ACC หักมัดจำ "+ras.join(", ")+" เต็มใบ (เงิน RA: "+ras.map(function(ra){return ctx.ra[ra].ok;}).join(" · ")+")", "note"); });

    /* 3f) ที่เหลือ = หาหลักฐานไม่เจอ · สเตทเมนต์ไม่มี/ยังไม่ครบวัน = รอ */
    X.forEach(function(x){ if(x.done) return;
      var noStmt=x.chs.every(function(ch){ return d.stmt && d.stmt[ch]===false; });
      var partial=d.bankPartial && x.chs.indexOf("ks")>=0;
      var alt=x.chs.length===1?(x.chs[0]==="kp"?"ks":"kp"):null;
      var other=alt?ctx.pool.list([alt],dn,false).concat(ctx.pool.list([alt],dn,true)).filter(function(m){return m.c===x.c;})[0]:null;
      var why=other?" — แต่เจอยอดนี้ใน"+(other.ch==="kp"?"K+":"กสิกร")+" "+dmy(other.date)+" (ฟอร์มอาจเลือกบัญชีผิด แก้ที่ฟอร์ม)":
        x.raMissing?" (ACC หักมัดจำเต็มใบ แต่ "+x.raMissing.map(raWhy).join(", ")+")":(x.otherWhy||"");
      if(noStmt||partial) line("wait","xfer",lbl(x)+" "+x.src+" — "+(noStmt?"ยังไม่มี"+(x.chs[0]==="kp"?"ไฟล์ K+":"สเตทเมนต์")+"ของวันนี้":"สเตทเมนต์วันนี้ยังไม่ครบวัน (ถึง "+d.bankPartial+")"),{bill:x.bill});
      else line("bad","xfer",lbl(x)+" "+x.src+" ไม่เจอใน"+(x.chs.length>1?"K+/สเตทเมนต์":x.chs[0]==="kp"?"K+":"สเตทเมนต์กสิกร")+why,{bill:x.bill,amt:x.c}); });

    /* ===== 4) บิลของวันใน ACC เทียบยอดที่ลงในฟอร์ม (+ มัดจำที่หักต้องยืนยันเงินได้) ===== */
    var paid={};
    function addPaid(b,c,src){ (paid[b]=paid[b]||[]).push({c:c,src:src}); }
    rows("scash").forEach(function(r){ addPaid(normBill(r.bill),cents(r.amt),"เงินสด"); });
    rows("xfer").forEach(function(r){ addPaid(normBill(r.bill),cents(r.kp)+cents(r.ks),"โอน"); });
    rows("credit").forEach(function(r){ addPaid(normBill(r.bill),cents(r.amt),"ลงบัญชี"); });
    rows("upk").forEach(function(r){ addPaid(normBill(r.bill),cents(r.amt),"UPK"); });
    /* คืนเงินเพราะรับเกิน (kind overpay) → ยอดที่บิลได้จริง = ที่ลงรับ − ที่คืน */
    (d.refunds||[]).forEach(function(r){ var b=normBill(r.bill), c=cents(r.amt); if(r.kind==="overpay" && !r._bad && b && isFinite(c)) addPaid(b,-c,"คืนเงินรับเกิน"); });
    var expRetail=0, rcashC=0, satang=0;
    rows("rcash").forEach(function(r){ if(!r.ra) rcashC+=cents(r.amt); });
    Object.keys(acc.bills||{}).sort().forEach(function(no){
      var b=acc.bills[no]; if(String(b.date).slice(0,10)!==date) return;
      var ent=paid[no]||[], entC=ent.reduce(function(s,x){return s+x.c;},0);
      var us=usesNow(no), depC=us.reduce(function(s,u){return s+cents(u.amt);},0), cnC=cnNet(no);
      var ul=usesLater(no); if(ul.length) line("note","bill",no+" ACC หักมัดจำ "+uniq(ul.map(function(u){return u.ra;})).join(",")+" ทีหลัง (ออก "+uniq(ul.map(function(u){return dmy(depOf(u.ra).date);})).join(",")+") — วันนี้ไม่นับ",{bill:no});
      var tot=cents(b.total), rem=tot-entC-depC-cnC, upk=/UPK/i.test(b.name||"");
      if(!isFinite(tot)||tot<0||!isFinite(rem)){ line("bad","bill",no+" ยอดใน ACC อ่านไม่ได้ ตรวจบิลนี้ไม่ได้",{bill:no}); return; }
      var how=[]; ent.forEach(function(x){ how.push(x.src+" "+baht(x.c)); });
      /* มัดจำที่ ACC หักบิลนี้ (เต็มใบหรือบางส่วน) ต้องยืนยันเงิน RA ได้ */
      if(depC>0){ var nr=uniq(us.map(function(u){return u.ra;})).filter(function(ra){ return !raVerify(ra); });
        if(nr.length) line("bad","ra",no+" "+(b.name||"")+" ACC หักมัดจำ "+baht(depC)+" แต่ "+nr.map(raWhy).join(", "),{bill:no}); }
      if(depC>0 && depC+cnC>=tot){
        if(entC>tot){ line("bad","bill",no+" ACC หักมัดจำเต็มใบแล้ว แต่ฟอร์มลงรับ "+how.join(" + ")+" เกินยอดบิล "+baht(tot),{bill:no}); return; }
        if(ent.some(function(x){return x.src==="เงินสด";})){ line("bad","bill",no+" ACC หักมัดจำเต็มใบแล้ว แต่ฟอร์มลงรับเงินสดอีก "+how.join(" + "),{bill:no}); return; }
        if(entC && ent.some(function(x){return x.src!=="โอน";})) line("note","bill",no+" ACC หักมัดจำ "+uniq(us.map(function(u){return u.ra;})).join(",")+" เต็มใบ · ฟอร์มลง "+how.join(" + ")+" ไม่นับเงินซ้ำ",{bill:no});
        return; }
      if(depC) how.push("มัดจำ "+baht(depC)); if(cnC) how.push("ใบลดหนี้ "+baht(cnC));
      if(b.code===RETAIL && !upk){
        if(rem>0){ expRetail+=rem; satang+=Math.min(rem, tot%100); }    /* สิทธิ์ปัดเศษ = เศษสตางค์ของยอดบิลจริงเท่านั้น */
        else if(rem<0) line("bad","bill",no+" คุณ 1 ลงรวม "+baht(tot-rem)+" เกินยอดบิล "+baht(tot),{bill:no});
        return; }
      if(!ent.length && !depC && !cnC){ R.info.notInForm.push({bill:no,name:b.name,amt:tot}); return; }
      /* ร้าน UPK: ยอดในกล่อง UPK ต่างจาก ACC ได้ตามปกติ — ส่วนต่าง = ราคาต้นทุนที่กิจมั่งมีโฮมจ่ายมาโฮมจริง (คุณหลิง 14 พ.ย.69) · UPK ไม่ใช่เงินสด/โอน */
      if(rem!==0 && upk && ent.length && ent.every(function(x){ return x.src==="UPK"; }) && !usesOf(acc,no).length && !cnsOf(acc,no).length){   /* มีมัดจำ/ใบลดหนี้ผูกบิลอยู่ (แม้ยอดสุทธิเป็น 0) = ตรวจแบบเดิม */
        line("note","upk",no+" "+(b.name||"")+" ฟอร์มลง UPK "+baht(entC)+" · ACC "+baht(tot)+" · ต่าง "+baht(Math.abs(rem))+" (ส่วนต่างราคาต้นทุนที่จ่ายมาโฮม ไม่ใช่เงินหาย)",{bill:no}); return; }
      if(rem!==0) line("bad","bill",no+" "+(b.name||"")+" บิล "+baht(tot)+" ลงรับรวม "+baht(tot-rem)+" → "+(rem>0?"ขาด ":"เกิน ")+baht(Math.abs(rem))+(how.length?" ("+how.join(" + ")+")":""),{bill:no,diff:-rem});
    });
    var rDiff=rcashC-expRetail;
    if(rDiff<0 && -rDiff<=satang) line("note","cash","เงินสดปลีกปัดเศษสตางค์ "+baht(-rDiff)+" (บิลปลีกมีเศษสตางค์รวม "+baht(satang)+")",{diff:rDiff});
    else if(rDiff!==0) line("bad","cash","เงินสดปลีก (คุณ 1) ในฟอร์ม "+baht(rcashC)+" แต่บิลปลีกใน ACC ที่เหลือจ่ายสด "+baht(expRetail)+" → "+(rDiff<0?"ขาด ":"เกิน ")+baht(Math.abs(rDiff)),{diff:rDiff});

    /* ===== 5) บิลเก่า / ลงบัญชี / UPK: ยอดต้องไม่เกินยอดบิลหลังหักมัดจำ+ใบลดหนี้ (ยอดค้างจริงตรวจที่รอบตัดบิลตามเดิม) ===== */
    var sumOld={};
    ["oldc","oldx"].forEach(function(k){ rows(k).forEach(function(r){ var no=normBill(r.bill); if(isKM(no)) sumOld[no]=(sumOld[no]||0)+cents(r.amt); }); });
    (d.refunds||[]).forEach(function(r){ var no=normBill(r.bill), c=cents(r.amt); if(r.kind==="overpay" && !r._bad && sumOld[no]!=null && isFinite(c)) sumOld[no]-=c; });
   /* คืนเงินรับเกินของบิลเก่า หักก่อนเทียบยอดบิล */
    Object.keys(sumOld).forEach(function(no){ var b=billOf(no); if(!b) return;
      var cap=cents(b.total)-usesNow(no).reduce(function(s,u){return s+cents(u.amt);},0)-cnNet(no);
      var full=usesNow(no).length && cap<=0;
      if(usesNow(no).length){ var nr=uniq(usesNow(no).map(function(u){return u.ra;})).filter(function(ra){ return !raVerify(ra); });
        if(nr.length && !R.lines.some(function(l){return l.bill===no;})) line("bad","ra","บิลเก่า "+no+" ACC หักมัดจำ แต่ "+nr.map(raWhy).join(", "),{bill:no}); }
      if(full && sumOld[no]>cents(b.total)) line("bad","old","บิลเก่า "+no+" ACC หักมัดจำเต็มใบแล้ว แต่ฟอร์มลงรับ "+baht(sumOld[no])+" เกินยอดบิล "+baht(cents(b.total)),{bill:no});
      if(full && rows("oldc").some(function(r){return normBill(r.bill)===no;})) line("bad","old","บิลเก่า "+no+" ACC หักมัดจำเต็มใบแล้ว แต่ฟอร์มลงรับเงินสดอีก",{bill:no});
      if(!full && sumOld[no]>cap) line("bad","old","บิลเก่า "+no+" ลงรับ "+baht(sumOld[no])+" เกินยอดบิลที่ต้องจ่าย "+baht(cap),{bill:no}); });
    rows("upk").forEach(function(r){ var no=normBill(r.bill), b=billOf(no); if(b && !/UPK/i.test(b.name||"")) line("bad","upk",no+" ลงกล่อง UPK แต่บิลเป็นของ "+(b.name||""),{bill:no}); });

    ["scash","xfer","credit","upk","oldc","oldx"].forEach(function(k){ (f[k]||[]).forEach(function(r){ var no=normBill(r.bill); if(isKM(no)) ctx.seenBill[no]=ctx.seenBill[no]||date; }); });

    var lv=R.lines.some(function(l){return l.lv==="bad";})?"bad":R.lines.some(function(l){return l.lv==="hold";})?"hold":R.lines.some(function(l){return l.lv==="wait";})?"wait":"ok";
    R.status=lv;
    R.summary=dmy(date)+(lv==="ok"?" ตรงครบ"+(R.notes.length?" ("+R.notes.length+" บรรทัดให้ดูประกอบ)":""):lv==="wait"?" รอข้อมูล":lv==="hold"?" พักให้คุณหลิงดู":" ไม่ตรง "+R.lines.filter(function(l){return l.lv==="bad";}).length+" บรรทัด");
    return R;
  }

  /* ---------- แปลงข้อมูลดิบจากฐาน → รูปที่ตัวตรวจใช้ ---------- */
  function moneyFromDaily(dailyRows){
    var kp=[], ks=[];
    (dailyRows||[]).forEach(function(r){ var dt=String(r.date).slice(0,10);
      (r.kplus_rows||[]).forEach(function(k,i){ kp.push({id:"kp|"+dt+"|"+i, date:dt, t:k.t||"", amt:k.amt}); });
      (r.bank_rows||[]).forEach(function(b,i){ if(+b.dep>0 && !b.kp) ks.push({id:"ks|"+dt+"|"+i, date:dt, amt:b.dep, who:String(b.detail||"").replace(/\++$/,"")}); }); });
    return {kp:kp, ks:ks};
  }
  function accFromRpc(a){
    var o={bills:{},deps:{},uses:[],cns:[]}; if(!a) return o;
    /* ยอดทุกช่องต้องอ่านได้และไม่ติดลบ ไม่งั้นหยุด (ห้ามปล่อยค่าเพี้ยนเข้าคำนวณ) */
    function amt(v,what){ if(v==null||String(v).trim()==="") throw new Error("ข้อมูล ACC ไม่มียอด: "+what); var c=cents(v); if(!isFinite(c)||c<0) throw new Error("ข้อมูล ACC ยอดอ่านไม่ได้: "+what); return v; }
    (a.bills||[]).forEach(function(r){ o.bills[r[0]]={date:String(r[1]).slice(0,10), code:r[2], name:r[3], total:amt(r[4],r[0])}; });
    (a.deps||[]).forEach(function(r){ o.deps[r[0]]={date:String(r[1]).slice(0,10), code:r[2], name:r[3], total:amt(r[4],r[0]), method:r[5]||""}; });
    (a.uses||[]).forEach(function(r){ o.uses.push({ra:r[0], bill:r[1], amt:amt(r[2],r[0]+"→"+r[1])}); });
    (a.cns||[]).forEach(function(r){ o.cns.push({cn:r[0], bill:r[2]||r[1], amt:amt(r[3],r[0])}); });
    (a.cns_self||[]).forEach(function(r){ o.cns.push({cn:r[0], bill:r[1], amt:amt(r[2],r[0])}); });
    return o;
  }

  var api={ checkDays:checkDays, moneyFromDaily:moneyFromDaily, accFromRpc:accFromRpc, cents:cents, baht:baht, dmy:dmy, RETAIL:RETAIL, EARLY_DAYS:EARLY_DAYS, SHORT_MAX:SHORT_MAX, version:"0.4.7" };
  if(typeof module!=="undefined" && module.exports) module.exports=api; else root.FormCheck=api;
})(typeof window!=="undefined"?window:this);
