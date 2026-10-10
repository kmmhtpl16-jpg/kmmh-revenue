/* cutbill.js — v0.5.6 (10 ต.ค.69: เงินเข้าบัญชีอื่นที่มีสลิป นับเป็นเงินจริง) · v0.5.1 (9 ต.ค.69: เงินสดร้านค้าในฟอร์มต้องเท่ากับบิลเงินสดของร้านนั้น ไม่งั้นพัก + บอกว่าร้านค้าขาด/ลูกค้าปลีกเกินเท่าไร เคส FFF 945 vs 970) · v0.5.0 (9 ต.ค.69: (1) ลูกค้าโอนก้อนเดียวจ่ายหลายบิล → รวมยอดบิลลูกค้าเดียวกันแล้วหาในเงินที่เหลือ เคสอ้วนกลม 0196+0198=1,290 (2) โอนเกินยอดค้าง แล้วส่วนเกินถูกออกเป็นมัดจำ RA หักบิลอื่นของลูกค้าเดียวกัน เคสรุ่งชัย 0225 โอน 29,395 ค้าง 29,095 + RA6910-0002 300 หักบิล 0226) · v0.4.9 (8 ต.ค.69: เงินโอนที่เข้าบัญชีมาก่อนวันออกบิล (ทะเบียนมัดจำจับคู่บิลแล้ว + เจอในสเตทเมนต์/K+ วันที่เงินเข้า) นับเป็นเงินของบิล — เคส KM6910-0118/0119) · v0.4.7 (3 ต.ค.69: บิลเก่าที่มีเงินจ่ายวันนี้ RevCut.old) · v0.4.6 (3 ต.ค.69: นับ K+ หลัง 15:30 ของเมื่อวานด้วย) · v0.4.5 (2 ต.ค.69: ใบนับเทียบยอดที่ต้องมี = เงินสดขาย+รายรับอื่นๆ+บิลเก่าเงินสด−คืนเงิน) · v0.4.4 (1 ต.ค.69: UPK ไม่นับเป็นเงินสด · บิลเงินสดต้องรวมแล้วตรงกับเงินสดในฟอร์ม · บิลจ่ายผสม K+/โอน+เงินสด) · v0.4.0 (30 ก.ย.69)
   ตัดบิลประจำวัน: คัดบิลของวันว่าบิลไหน "ยอดตรงแล้ว พร้อมตัด" / "พักไว้" / "ไม่ต้องตัด" / "ตัดแล้ว"
   ใช้ร่วมกัน: การ์ดในหน้าตรวจรายได้ (index.html) + กระดิ่ง (bell.js)
   หลัก: ไม่มีเงินจริง ไม่ตัด · เงินโอนต้องเจอยอดใน K+/สเตทเมนต์ · เงินสดต้องมีรูปใบนับเงินสดที่ยอดตรงกับฟอร์ม
   ปุ่มอนุมัติ = บันทึกว่าเจ้าของอนุมัติ (rev_cut_approvals) · การกดตัดใน ACC-BILLING ทำโดยเลขาหลังเจ้าของสั่งในแชท Claude */
(function(){
  var RETAIL_CUS="26-6", SHOPEE_CUS="137-7", UPK_CUS="3-3";
  function num(v){ if(v==null) return 0; var n=parseFloat(String(v).replace(/[, ]/g,"")); return isNaN(n)?0:n; }
  function r2(n){ return Math.round(num(n)*100)/100; }
  function norm(s){ return String(s||"").replace(/บริษัท|จำกัด|ห้างหุ้นส่วนจำกัด|หจก\.?|ร้าน|คุณ|นาย|นางสาว|นาง|\s|\(|\)|\.|-/g,"").toLowerCase(); }
  function nameHit(a,b){ a=norm(a); b=norm(b); return !!(a&&b&&(a.indexOf(b)>=0||b.indexOf(a)>=0)); }
  function SB(){ try{ if(typeof sb!=="undefined" && sb) return sb; }catch(e){} return window.sb||null; }

  /* D = {bills, xfer, cash, acct:[names], kp:[amt], bk:[amt], proof:{amount,image_path}|null, appr:[rows]} */
  function classify(D){
    var date0=String(D.date||"").slice(0,10);
    var kp=(D.kp||[]).slice(), bk=(D.bk||[]).slice();
    var apprMap={}; (D.appr||[]).forEach(function(a){ if(a.status!=="cancelled") apprMap[a.bill_no]=a; });
    /* v0.4.5: ใบนับเทียบกับ "ยอดเงินสดที่ต้องมี" = เงินสดขาย + รายรับอื่นๆ (ลงในโปรแกรม) + บิลเก่าเงินสด − คืนเงิน */
    var expCash = (D.cash==null)? null : r2(num(D.cash)+num(D.otherSum)+num(D.oldCash)-num(D.refund));
    var proofOk = !!(D.proof && !D.proofPending && expCash!=null && Math.abs(num(D.proof.amount)-expCash)<0.01);
    var R={ t:[], c:[], h:[], s:[], done:[], appr:[], cut:[], proofOk:proofOk, proof:D.proof||null, cash:D.cash, expCash:expCash };
    var noMoney=[], raUsed={}; /* v0.5.0 */
    var billByNo={}; (D.bills||[]).forEach(function(z){ billByNo[z.no]=z; });
    var cashC=[]; /* v0.4.4: ผู้สมัครเงินสด {b, part, mixed} — ตัดสินรวมทีเดียวท้ายลูป */
    function take(arr,amt){ var i=arr.findIndex(function(x){ return Math.abs(num(x)-amt)<=1; }); if(i<0) return false; arr.splice(i,1); return true; }
    /* v0.4.9: เงินที่โอนเข้ามาก่อนวันออกบิล ผูกกับเลขบิลนี้แล้ว — ใช้ก่อนยอดของวันนี้ (กันไปกินยอดวันนี้ของบิลอื่นที่ยอดเท่ากัน) */
    var pre={}; Object.keys(D.pre||{}).forEach(function(k){ pre[k]=(D.pre[k]||[]).slice(); });
    /* v0.5.0 (2): ส่วนที่โอนเกินยอดค้าง = มัดจำ RA ในชีตโอนที่ไปหักบิลอื่นของลูกค้าเดียวกันวันนี้ (ใช้แต่ละ RA ได้ครั้งเดียว) */
    function raExcess(b,ex){
      var L=(D.xfer||[]); for(var i=0;i<L.length;i++){ var x=L[i]; if(!x.ra||raUsed[x.ra+"|"+x.bill]||x.bill===b.no) continue;
        var ob=billByNo[x.bill]; if(!ob||ob.cus!==b.cus||!(num(ob.dep)>0)) continue;
        if(Math.abs(r2(num(x.knv)+num(x.ksk))-ex)<=1){ raUsed[x.ra+"|"+x.bill]=1; return {ra:x.ra, bill:x.bill}; } }
      return null;
    }
    function takePre(bill,amt){ var L=pre[bill]||[]; var i=L.findIndex(function(x){ return Math.abs(num(x.amt)-amt)<=1; }); if(i<0) return null; return L.splice(i,1)[0]; }
    (D.bills||[]).forEach(function(b){
      b.out=r2(b.out); b.dep=r2(b.dep); b.retail=(b.cus===RETAIL_CUS);
      var ap=apprMap[b.no];
      if(ap && ap.status==="cut"){ R.cut.push({b:b,ap:ap}); return; }
      if(b.out<=0.01){ R.done.push({b:b}); return; }
      if(ap && ap.status==="approved"){ R.appr.push({b:b,ap:ap}); return; }
      if(b.cus===SHOPEE_CUS){ R.s.push({b:b,why:"Shopee — ตัดตามวันที่ Shopee โอนเงินเข้า"}); return; }
      if(b.cus===UPK_CUS){ R.s.push({b:b,why:"UPK — ตัดตามยอดที่ UPK จ่ายจริง (ไม่ใช่เงินสดหน้าร้าน)"}); return; }
      if(!b.retail && (D.acct||[]).some(function(n){ return nameHit(n,b.name); })){ R.s.push({b:b,why:"ลงบัญชี — ตัดเมื่อลูกค้าจ่ายจริง"}); return; }
      var xs=(D.xfer||[]).filter(function(x){ return x.bill===b.no && !x.ra; });
      if(xs.length){
        var got=0, src=[], raHit=null;
        xs.forEach(function(x){
          var kv=num(x.knv), ks=num(x.ksk);
          var pk, ps;
          if(kv>0){ if((pk=takePre(b.no,kv))){ got+=kv; src.push(preLbl(pk,date0)+" "+TH(kv)); } else if(take(kp,kv)){ got+=kv; src.push("K+ "+TH(kv)); } }
          if(ks>0){ if((ps=takePre(b.no,ks))){ got+=ks; src.push(preLbl(ps,date0)+" "+TH(ks)); } else if(take(bk,ks)){ got+=ks; src.push("เข้ากสิกร "+TH(ks)); } }
        });
        got=r2(got);
        if(Math.abs(got-b.out)<=1) R.t.push({b:b, method:"เงินโอน", src:src.join(" + ")+(b.dep>0?" · หักมัดจำแล้ว "+TH(b.dep):"")});
        else if(got>0 && got<b.out-1 && !(b.dep>0)) cashC.push({b:b, part:r2(b.out-got), mixed:src.join(" + ")}); /* v0.4.4: จ่ายผสม — ส่วนที่เหลือเป็นเงินสด */
        else if(got>b.out+1 && (raHit=raExcess(b, r2(got-b.out)))) R.t.push({b:b, method:"เงินโอน", src:src.join(" + ")+" · ส่วนเกิน "+TH(got-b.out)+" = มัดจำ "+raHit.ra+" (หักบิล "+raHit.bill+")"});
        else if(!got){ var hh={b:b, why:"หาเงินโอนเข้าไม่เจอใน K+/สเตทเมนต์"}; R.h.push(hh);
          var sk=0, ss=0; xs.forEach(function(x){ sk+=num(x.knv); ss+=num(x.ksk); }); noMoney.push({h:hh, b:b, knv:r2(sk), ksk:r2(ss)}); }
        else R.h.push({b:b, why: "เงินเข้า "+TH(got)+" ไม่เท่ายอดค้าง "+TH(b.out)});
        return;
      }
      if(b.dep>0){ R.h.push({b:b, why:"มีมัดจำ — งานสั่ง รอลูกค้าจ่ายครบ"}); return; }
      cashC.push({b:b, part:b.out});
    });
    /* v0.5.0 (1): โอนก้อนเดียวจ่ายหลายบิล — บิลที่หาเงินไม่เจอของลูกค้า (รหัสเดียวกัน ไม่ใช่ลูกค้าทั่วไป) ช่องทางเดียวกัน
       ลองรวมยอดทีละชุด (ชุดใหญ่ก่อน อย่างน้อย 2 บิล) แล้วหาในเงิน K+/สเตทเมนต์ที่ยังไม่ถูกจับคู่ */
    var grp={}; noMoney.forEach(function(n){ if(n.b.retail||!n.b.cus) return; var ch=(n.knv>0&&!(n.ksk>0))?"knv":(n.ksk>0&&!(n.knv>0))?"ksk":null; if(!ch) return;
      var k=n.b.cus+"|"+ch; (grp[k]=grp[k]||[]).push(n); });
    Object.keys(grp).forEach(function(k){
      var L=grp[k], ch=k.split("|").pop(), pool=(ch==="knv")?kp:bk; if(L.length<2||L.length>8) return;
      var left=L.slice();
      for(var size=left.length; size>=2; size--){
        var found=true;
        while(found && left.length>=size){ found=false;
          var n=left.length, masks=[];
          for(var m=1;m<(1<<n);m++){ var c=0; for(var j=0;j<n;j++) if(m&(1<<j)) c++; if(c===size) masks.push(m); }
          for(var mi=0; mi<masks.length; mi++){
            var pick=left.filter(function(_,j){ return masks[mi]&(1<<j); });
            var sum=r2(pick.reduce(function(a,x){ return a+x[ch]; },0));
            var okOut=pick.every(function(x){ return Math.abs(x[ch]-x.b.out)<=1; });
            if(okOut && take(pool,sum)){
              var nos=pick.map(function(x){ return x.b.no.slice(-4); }).join("+");
              pick.forEach(function(x){ var i=R.h.indexOf(x.h); if(i>=0) R.h.splice(i,1);
                R.t.push({b:x.b, method:"เงินโอน", src:(ch==="knv"?"K+ ":"เข้ากสิกร ")+"โอนรวม "+TH(sum)+" (จ่ายบิล "+nos+")"}); });
              left=left.filter(function(x){ return pick.indexOf(x)<0; }); found=true; break;
            }
          }
        }
      }
    });
    /* v0.4.4: บิลเงินสดทั้งวันต้องรวมแล้วตรงกับเงินสดในฟอร์ม (±1) ถึงจะพร้อมตัด — ไม่ตรง = พักทั้งก้อน (กันบิลที่ยังไม่จ่ายหลุดเป็นเงินสด เช่น UPK) */
    var cashSum=r2(cashC.reduce(function(s,x){ return s+x.part; },0)); R.cashSum=cashSum;
    var sumOk=(D.cash!=null && Math.abs(cashSum-num(D.cash))<=1); R.cashSumOk=sumOk;
    /* v0.5.1 (9 ต.ค.69): เงินสดร้านค้า — ยอดที่แคชเชียร์ลงช่อง "ร้านค้าเงินสด" ต้องเท่ากับบิลเงินสดของร้านนั้นวันนี้
       ไม่เท่า = ลงผิดช่อง (เงินไปปนในเงินสดลูกค้าปลีก) → พักบิลร้านนั้น + บอกส่วนต่าง ให้แคชเชียร์แก้ฟอร์ม · เคส FFF ลง 945 บิลรวม 970 */
    var shopBad={}; R.shopWarn=[];
    if(D.shop){
      var grpS={}; cashC.forEach(function(x){ if(x.b.retail||x.mixed) return; var k=x.b.cus||x.b.no; (grpS[k]=grpS[k]||[]).push(x); });
      Object.keys(grpS).forEach(function(k){
        var L=grpS[k], sum=r2(L.reduce(function(a,x){ return a+x.part; },0)), row=null;
        D.shop.forEach(function(sr){ var bl=String(sr.bills||"").split(/\s*,\s*/); if(L.some(function(x){ return bl.indexOf(x.b.no)>=0; })) row=sr; });
        var dec=row? r2(num(row.amt)) : 0, d=r2(sum-dec); if(Math.abs(d)<=1) return;
        var nm=L[0].b.name||"", why;
        if(!row) why="ร้านค้าไม่ได้ลงในช่องเงินสดร้านค้า (บิลรวม "+TH(sum)+") → เงินสดลูกค้าปลีกเกิน "+TH(sum)+" — ให้แคชเชียร์ย้ายไปลงช่องร้านค้าเงินสดแล้วอัปใหม่";
        else if(d>0) why="เงินสดร้านค้าลง "+TH(dec)+" แต่บิลรวม "+TH(sum)+" → ร้านค้าขาด "+TH(d)+" · เงินสดลูกค้าปลีกเกิน "+TH(d)+" — ให้แคชเชียร์แก้ฟอร์มแล้วอัปใหม่";
        else why="เงินสดร้านค้าลง "+TH(dec)+" แต่บิลรวม "+TH(sum)+" → ร้านค้าเกิน "+TH(-d)+" · เงินสดลูกค้าปลีกขาด "+TH(-d)+" — ให้แคชเชียร์แก้ฟอร์มแล้วอัปใหม่";
        L.forEach(function(x){ shopBad[x.b.no]=why; });
        R.shopWarn.push({name:nm, bills:L.map(function(x){ return x.b.no; }), declared:dec, sum:sum, diff:d, why:why});
      });
    }
    cashC.forEach(function(x){
      var b=x.b;
      if(shopBad[b.no]){ R.h.push({b:b, cash:true, why:shopBad[b.no]}); return; }
      if(!proofOk) R.h.push({b:b, cash:true, why: D.proofPending? "มีคำขอแก้ไขยอดเงินสด รออนุมัติ" : D.proof? "ยอดใบนับเงินสดไม่ตรงกับยอดที่ต้องมี "+TH(expCash) : "รอรูปใบนับเงินสด"});
      else if(!sumOk) R.h.push({b:b, cash:true, why:"บิลเงินสดรวม "+TH(cashSum)+" ไม่ตรงกับเงินสดในฟอร์ม "+TH(D.cash)+" — ต้องตรวจก่อน"});
      else if(x.mixed) R.c.push({b:b, method:"เงินโอน + เงินสด", src:x.mixed+" + เงินสด "+TH(x.part)});
      else R.c.push({b:b, method:"เงินสด", src:"ใบนับเงินสดตรงกับยอดที่ต้องมี"});
    });
    return R;
  }
  function preLbl(p,d0){ return p.other ? ("โอนเข้าบัญชีอื่น (มีสลิป) "+dmy(p.d)) : (p.d<d0 ? "โอนเข้ามาก่อน "+dmy(p.d) : "โอนเข้า "+dmy(p.d)+" (ลงมัดจำ)"); }
  function prevDays(iso,n){ var p=String(iso).split("-"); var d=new Date(Date.UTC(+p[0],+p[1]-1,+p[2])); d.setUTCDate(d.getUTCDate()-n); return d.toISOString().slice(0,10); }
  function dmy(iso){ var p=String(iso||"").slice(0,10).split("-"); return p.length===3? (+p[2])+"/"+(+p[1]) : String(iso||""); }
  function TH(n){ return r2(n).toLocaleString("th-TH",{minimumFractionDigits:0,maximumFractionDigits:2}); }

  function prevDay(iso){ var p=String(iso).split("-"); var d=new Date(Date.UTC(+p[0],+p[1]-1,+p[2])); d.setUTCDate(d.getUTCDate()-1); return d.toISOString().slice(0,10); }
  async function load(date){
    var s=SB(); if(!s) throw new Error("เชื่อม Supabase ไม่ได้");
    var q=await Promise.all([
      s.rpc("rev_cut_bills",{p_date:date}),
      s.from("rev_audit").select("status,detail,form_refund").eq("date",date).maybeSingle(),
      s.from("rev_credit_bills").select("customer").eq("bill_date",date).eq("source","auto-form"),
      s.from("rev_daily").select("kplus_rows,bank_rows").eq("date",date).maybeSingle(),
      s.from("rev_cash_proof").select("amount,image_path,uploaded_at,uploaded_role").eq("date",date).maybeSingle(),
      s.from("rev_cut_approvals").select("*").eq("bill_date",date),
      s.from("rev_cash_other").select("amount").eq("date",date).eq("channel","cash"),
      s.from("rev_cash_proof_req").select("id").eq("date",date).eq("status","pending"),
      s.from("rev_daily").select("kplus_rows").eq("date",prevDay(date)).maybeSingle(),
      s.rpc("rev_shop_cash_decl",{p_date:date})
    ]);
    /* v0.4.6 (3 ต.ค.69): บิลหลังตัดรอบ 15:30 ลงวันที่วันถัดไป → K+ ที่เข้าหลัง 15:30 ของเมื่อวาน เป็นเงินของบิลวันนี้ (เคส KM6910-0054 72 บาท โอน 1/10 16:55) */
    var kLate=(((q[8]&&q[8].data)||{}).kplus_rows||[]).filter(function(x){ var m=String(x.t||"").match(/(\d{1,2}):(\d{2})/); return m && (+m[1]*60+ +m[2])>=15*60+30; }).map(function(x){ return num(x.amt); });
    var au=(q[1]&&q[1].data)||null, dd=(q[3]&&q[3].data)||{}, det=(au&&au.detail)||{};
    var pre=await preMoney(s, date, det.xfer||[]);
    return {
      date:date, status:au?au.status:null,
      bills:(q[0]&&q[0].data)||[],
      xfer:det.xfer||[], cash:(det.form_cash!=null?num(det.form_cash):null),
      otherSum:((q[6]&&q[6].data)||[]).reduce(function(s2,x){ return s2+num(x.amount); },0), oldCash:num(det.form_old_cash), refund:num(det.form_refund_cash!=null?det.form_refund_cash:(au&&au.form_refund)),
      acct:((q[2]&&q[2].data)||[]).map(function(x){ return x.customer; }),
      kp:(dd.kplus_rows||[]).map(function(x){ return num(x.amt); }).concat(kLate),
      bk:(dd.bank_rows||[]).filter(function(x){ return num(x.dep)>0; }).map(function(x){ return num(x.dep); }),
      hasK:!!(dd.kplus_rows&&dd.kplus_rows.length), hasB:!!(dd.bank_rows&&dd.bank_rows.length),
      shop:((q[9]&&!q[9].error&&Array.isArray(q[9].data))? q[9].data : null),
      proof:(q[4]&&q[4].data)||null, proofPending:((q[7]&&q[7].data)||[]).length,
      appr:(q[5]&&q[5].data)||[],
      pre:pre
    };
  }
  /* v0.4.9 (8 ต.ค.69): ลูกค้าโอนเงินเข้าบัญชีมาก่อนวันออกบิล → การเงินลงทะเบียนมัดจำ (rev_deposits) แล้วจับคู่กับเลขบิล
     ชีตโอนของวันออกบิลลงบิลนั้นเป็นเงินโอน แต่ K+/สเตทเมนต์ของวันนั้นไม่มียอดนี้ (เข้าไปแล้ววันก่อน) → เดิมพักว่า "หาเงินโอนเข้าไม่เจอ"
     เคสจริง: KM6910-0118 รุ่งชัย 12,325 · KM6910-0119 คุณเต๋า 36,480 — เงินเข้ากสิกร 2/10 บิลออก 3/10
     นับให้เฉพาะเมื่อ (1) ทะเบียนมัดจำผูกเลขบิลนี้ (2) วันที่เงินเข้าก่อนวันบิล (3) เจอยอดนั้นจริงในสเตทเมนต์/K+ ของวันที่เงินเข้า
     · ข้ามแถวโอนที่มีเลข RA (มัดจำใน ACC หักจากบิลไปแล้ว) */
  async function preMoney(s, date, xfer){
    var out={};
    try{
      var bills=[]; (xfer||[]).forEach(function(x){ var b=String(x.bill||"").trim(); if(b && !x.ra && (num(x.knv)>0||num(x.ksk)>0) && bills.indexOf(b)<0) bills.push(b); });
      if(!bills.length) return out;
      var dq=await s.from("rev_deposits").select("deposit_no,customer,amount,used_amount,received_date,matched_bill_no,status,note").in("matched_bill_no",bills);
      var deps=((dq&&dq.data)||[]).filter(function(d){ var rd=String(d.received_date||"").slice(0,10); return rd && rd<=date && d.status!=="cancelled" && d.status!=="refunded"; }); /* v0.5.6: รวมวันเดียวกับบิลด้วย */
      /* v0.5.6 (10 ต.ค.69): เงินที่ลูกค้าโอนเข้าบัญชีอื่น (ไม่ใช่ K+/กสิกรร้าน) แต่แนบสลิปติดธง "รับเข้าบัญชีอื่น" แล้ว = มีเงินจริง
         เคส KM6910-0308 โมเดิร์น ดี 20,300 — สลิปผูกบิลตรง หรือผูกผ่านมัดจำ (โน้ตมัดจำ "จากเงินรอจับคู่ MPxxxx") */
      var oq=await s.from("rev_pending").select("date,amount,match_batch,matched_bill_no,slip_path").eq("source","รับเข้าบัญชีอื่น").eq("status","matched").not("slip_path","is",null).lte("date",date).gte("date",prevDays(date,62));
      var oth=((oq&&oq.data)||[]).slice();
      function takeOth(pred){ var i=oth.findIndex(pred); if(i<0) return null; return oth.splice(i,1)[0]; }
      bills.forEach(function(b){ var p; while((p=takeOth(function(x){ return String(x.matched_bill_no||"").trim()===b; }))){ (out[b]=out[b]||[]).push({amt:r2(num(p.amount)), d:String(p.date).slice(0,10), other:true}); } });
      if(!deps.length) return out;
      var days=[]; deps.forEach(function(d){ var rd=String(d.received_date).slice(0,10); if(days.indexOf(rd)<0) days.push(rd); });
      var rq=await s.from("rev_daily").select("date,kplus_rows,bank_rows").in("date",days);
      var pool={}; ((rq&&rq.data)||[]).forEach(function(r){
        pool[r.date]=(r.bank_rows||[]).filter(function(x){ return num(x.dep)>0 && !x.kp; }).map(function(x){ return num(x.dep); })
          .concat((r.kplus_rows||[]).map(function(x){ return num(x.amt); })); });
      deps.forEach(function(d){
        var rd=String(d.received_date).slice(0,10), amt=r2(num(d.used_amount)>0? d.used_amount : d.amount), P=pool[rd]||[];
        if(amt<=0.5) return; var b=String(d.matched_bill_no).trim();
        var i=P.findIndex(function(v){ return Math.abs(v-r2(d.amount))<=1; });
        if(i>=0){ P.splice(i,1); (out[b]=out[b]||[]).push({amt:amt, d:rd, cust:d.customer||d.deposit_no||""}); return; }
        var mb=(String(d.note||"").match(/MP\d{6}-[A-Z0-9]+/)||[])[0];
        var op=mb && takeOth(function(x){ return x.match_batch===mb && Math.abs(num(x.amount)-num(d.amount))<=1; });
        if(op) (out[b]=out[b]||[]).push({amt:amt, d:rd, cust:d.customer||d.deposit_no||"", other:true});
      });
    }catch(e){ console.warn("RevCut.preMoney",e); }
    return out;
  }
  async function compute(date){ var D=await load(date); var R=classify(D); R.D=D; return R; }
  /* v0.4.7 (3 ต.ค.69): บิลเก่าที่มีเงินจ่ายเข้ามาในวันนี้ (เงินโอนที่จับคู่บิลแล้ว + เงินสดจากชีตบิลเก่า) — คุณหลิงสั่งเพิ่มหลังเคส 2/10 ตราช้าง/เจริญสินชัย หลุด
     แยกเป็น พร้อมตัด / อนุมัติแล้ว รอตัด / ตัดแล้ว · ตัดแล้ว = ACC ไม่ค้าง หรือ rev_cut_approvals status=cut */
  async function old(date){
    var s=SB(); if(!s) throw new Error("เชื่อม Supabase ไม่ได้");
    var r=await s.rpc("rev_cut_oldbills",{p_date:date}); if(r.error) throw r.error;
    var L=(r.data||[]).map(function(x){ return {b:{no:x.no,name:x.name,date:x.date,out:r2(x.out),retail:false}, amt:r2(x.amt), method:x.method, src:x.src, grp:x.grp}; });
    var nos=L.map(function(x){return x.b.no;}), am={};
    if(nos.length){ var a=await s.from("rev_cut_approvals").select("*").in("bill_no",nos); ((a&&a.data)||[]).forEach(function(z){ if(z.status!=="cancelled") am[z.bill_no]=z; }); }
    var O={ready:[],appr:[],done:[]};
    L.forEach(function(x){ var ap=am[x.b.no]; x.ap=ap||null;
      if((ap&&ap.status==="cut") || x.b.out<=0.01) O.done.push(x);
      else if(ap&&ap.status==="approved") O.appr.push(x);
      else if(x.amt>0.01){ if(x.amt<x.b.out-0.01) x.src+=" · จ่ายบางส่วน "+TH(x.amt)+" จากค้าง "+TH(x.b.out); O.ready.push(x); } });
    return O;
  }
  window.RevCut={ classify:classify, load:load, compute:compute, old:old, TH:TH, num:num, r2:r2, RETAIL_CUS:RETAIL_CUS };
})();
