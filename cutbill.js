/* cutbill.js — v0.7.0 (20 ต.ค.69: กล่อง "คืนเงิน (ไม่ออกบิล)" rev_cash_refund — คืนเพราะโอนเกิน (เคส 0770 พูนกิจ โอน 12,610 บิล 12,510 คืนสด 100) · บิลเงินสดที่ใบลดหนี้คืนเงินจนคงค้าง 0 นับเข้ายอดเงินสด (เคส 0738 210) · โอนคืนอ่านจากกล่องแทนรายจ่ายหมวดโอนเงินคืนลูกค้า · K+ หลังตัดรอบดู "วันที่มีข้อมูลล่าสุด" แทนเมื่อวาน (วันจันทร์ไปดูวันเสาร์ เคส 0710 25,220 / 0713 200)) · v0.6.0 (14 ต.ค.69: แคชเชียร์ลงช่องโอนผิดช่อง (K+ ↔ กสิกร) — เจอเงินในอีกบัญชี = พักไว้ + เตือน "เงินเข้าจริงทาง K+/กสิกร โปรดแก้รายการในไฟล์ Excel แล้วอัปเอกสารใหม่" ไม่ตัดให้เอง · เคส KM6910-0456 ป้ายอะแด็ปดีไซน์ 4,250 ลงช่องกสิกร แต่เข้า K+ 12/10 17:36) · v0.5.9 (13 ต.ค.69: บิลเก่าที่มีเงินเข้าแต่แคชเชียร์ยังไม่แจ้งในชีตบิลเก่า = รอแคชเชียร์แจ้ง ขึ้นเตือนแต่อนุมัติไม่ได้ · เคสเจียง-ฟิวเจอร์ 10,878.80) · v0.5.8 (13 ต.ค.69: คืนเงินตามใบลดหนี้ที่โอนคืน (รายจ่ายหมวด "โอนเงินคืนลูกค้า") ไม่หักจากเงินสดในลิ้นชัก · เคสกราเซีย 970 โอน 10/10) · v0.5.7 (13 ต.ค.69: จ่ายเต็มบิลแล้วคืนเงินสดตามใบลดหนี้ ไม่นับเป็นเงินเกิน · เงินสดร้านค้านับส่วนเงินสดของบิลจ่ายผสม) · v0.5.6 (10 ต.ค.69: เงินเข้าบัญชีอื่นที่มีสลิป นับเป็นเงินจริง) · v0.5.1 (9 ต.ค.69: เงินสดร้านค้าในฟอร์มต้องเท่ากับบิลเงินสดของร้านนั้น ไม่งั้นพัก + บอกว่าร้านค้าขาด/ลูกค้าปลีกเกินเท่าไร เคส FFF 945 vs 970) · v0.5.0 (9 ต.ค.69: (1) ลูกค้าโอนก้อนเดียวจ่ายหลายบิล → รวมยอดบิลลูกค้าเดียวกันแล้วหาในเงินที่เหลือ เคสอ้วนกลม 0196+0198=1,290 (2) โอนเกินยอดค้าง แล้วส่วนเกินถูกออกเป็นมัดจำ RA หักบิลอื่นของลูกค้าเดียวกัน เคสรุ่งชัย 0225 โอน 29,395 ค้าง 29,095 + RA6910-0002 300 หักบิล 0226) · v0.4.9 (8 ต.ค.69: เงินโอนที่เข้าบัญชีมาก่อนวันออกบิล (ทะเบียนมัดจำจับคู่บิลแล้ว + เจอในสเตทเมนต์/K+ วันที่เงินเข้า) นับเป็นเงินของบิล — เคส KM6910-0118/0119) · v0.4.7 (3 ต.ค.69: บิลเก่าที่มีเงินจ่ายวันนี้ RevCut.old) · v0.4.6 (3 ต.ค.69: นับ K+ หลัง 15:30 ของเมื่อวานด้วย) · v0.4.5 (2 ต.ค.69: ใบนับเทียบยอดที่ต้องมี = เงินสดขาย+รายรับอื่นๆ+บิลเก่าเงินสด−คืนเงิน) · v0.4.4 (1 ต.ค.69: UPK ไม่นับเป็นเงินสด · บิลเงินสดต้องรวมแล้วตรงกับเงินสดในฟอร์ม · บิลจ่ายผสม K+/โอน+เงินสด) · v0.4.0 (30 ก.ย.69)
   ตัดบิลประจำวัน: คัดบิลของวันว่าบิลไหน "ยอดตรงแล้ว พร้อมตัด" / "พักไว้" / "ไม่ต้องตัด" / "ตัดแล้ว"
   ใช้ร่วมกัน: การ์ดในหน้าตรวจรายได้ (index.html) + กระดิ่ง (bell.js)
   หลัก: ไม่มีเงินจริง ไม่ตัด · เงินโอนต้องเจอยอดใน K+/สเตทเมนต์ · เงินสดต้องมีรูปใบนับเงินสดที่ยอดตรงกับฟอร์ม
   ปุ่มอนุมัติ = บันทึกว่าเจ้าของอนุมัติ (rev_cut_approvals) · การกดตัดใน ACC-BILLING ทำโดยเลขาหลังเจ้าของสั่งในแชท Claude */
(function(){
  var RETAIL_CUS="26-6", SHOPEE_CUS="137-7", UPK_CUS="3-3";
  /* v0.7.0: วันแรกที่ใช้กล่องคืนเงิน — ก่อนวันนี้ใช้กติกาเดิม (ช่องคืนสดใน Excel + รายจ่ายหมวดโอนเงินคืนลูกค้า) */
  var REFUND_FROM="2026-10-19";
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
    /* v0.7.0 กล่องคืนเงิน: แถวคืนเงินของวันนี้ → ยอดต่อบิล / ปัญหาต่อบิล / ด่านรวมของวัน */
    var RF={on:!!D.refundOn, by:{}, prob:{}, ovUsed:{}, gate:null, xfer:0, sum:0, rows:(D.refunds||[]), photo:!!D.refundPhoto};
    if(RF.on){
      var wdP=(D.refundWd||[]).slice(), cnT={};
      RF.rows.forEach(function(x){ var bn=String(x.bill_no||"").trim(), a=r2(x.amount); var e=RF.by[bn]=RF.by[bn]||{cn:0,ov:0};
        if(x.kind==="overpay") e.ov=r2(e.ov+a); else e.cn=r2(e.cn+a);
        RF.sum=r2(RF.sum+a);
        if(x.pay==="transfer"){ RF.xfer=r2(RF.xfer+a); if(!take(wdP,a)) RF.prob[bn]="ยังไม่เจอเงินโอนคืน "+TH(a)+" ในสเตทเมนต์"; }
        if(x.kind==="cn"){ var cv=(D.cnValid||{})[x.cn_no];
          if(!cv) RF.prob[bn]="รอ ACC ยืนยันใบลดหนี้ "+x.cn_no;
          else if(bn!==cv.bill && bn!==cv.bill2) RF.prob[bn]="ใบลดหนี้ "+x.cn_no+" ไม่ได้ผูกกับบิลนี้ (ACC: "+[cv.bill,cv.bill2].filter(Boolean).join(" / ")+")";
          else { cnT[x.cn_no]=r2((cnT[x.cn_no]||0)+a); if(cnT[x.cn_no]>num(cv.amt)+0.01) RF.prob[bn]="คืนเงินเกินใบลดหนี้ "+x.cn_no+" ("+TH(cv.amt)+")"; } }
      });
      if(D.refundErr) RF.gate="โหลดกล่องคืนเงินไม่ได้";
      else if(Math.abs(RF.sum-r2(D.refund))>1) RF.gate= RF.rows.length? "ใบคืนเงินรวม "+TH(RF.sum)+" ไม่ตรงกับคืนเงินในฟอร์ม "+TH(D.refund) : "ฟอร์มมีคืนเงิน "+TH(D.refund)+" แต่ยังไม่ได้ลงกล่องคืนเงิน";
      else if(RF.rows.length && !RF.photo) RF.gate="รอรูปใบคืนเงิน";
    }
    var rfX=RF.on? Math.min(RF.xfer, num(D.refund)) : Math.min(num(D.refundXfer), num(D.refund)); /* v0.5.8 คืนเงินที่โอนคืน (มีรายจ่ายหมวดโอนเงินคืนลูกค้า) ไม่ได้ออกจากลิ้นชัก */
    var expCash = (D.cash==null)? null : r2(num(D.cash)+num(D.otherSum)+num(D.oldCash)-(num(D.refund)-rfX));
    var proofOk = !!(D.proof && !D.proofPending && expCash!=null && Math.abs(num(D.proof.amount)-expCash)<0.01);
    var R={ t:[], c:[], h:[], s:[], done:[], appr:[], cut:[], proofOk:proofOk, proof:D.proof||null, cash:D.cash, expCash:expCash, refundXfer:rfX, refundXferRows:D.refundXferRows||[], refund:RF, cashExtra:[] };
    /* v0.5.8 ใบนับไม่ตรง: ส่วนต่างเท่ากับคืนเงิน CN ใบไหนที่ยังหาโอนคืนไม่เจอ → บอกให้ไปลงหมวด */
    var cpHint=""; if(D.proof && !proofOk && expCash!=null){ var dfx=r2(num(D.proof.amount)-expCash); var hit=(D.cnRefundOpen||[]).filter(function(c){ return Math.abs(num(c.cash)-dfx)<=1; })[0]; if(hit) cpHint=" · ต่าง "+TH(dfx)+" เท่ากับคืนเงิน "+(hit.cn_no||"ใบลดหนี้")+" — ถ้าโอนคืน ให้ลงรายจ่ายหมวด \"โอนเงินคืนลูกค้า\""; } R.cpHint=cpHint;
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
    /* v0.5.7 (13 ต.ค.69): ลูกค้าจ่ายเต็มบิลแล้วคืนของ — ACC หักยอดค้างด้วยใบลดหนี้ (บิลเดิม) และคืนเงินสดจากลิ้นชัก
       ส่วนที่จ่ายเกินยอดค้าง = เงินสดที่คืนตามใบลดหนี้ (ช่อง "คืนสดจริง" ในตารางคุม CN) ไม่ใช่เงินเกิน · เคส 0386 กราเซีย / 0402 มีคุณ 12 ต.ค.69 */
    function cnBack(b){ var c=RF.on? num((RF.by[b.no]||{}).cn) : num((D.cnCash||{})[b.no]); var red=r2(num(b.tot)-num(b.out)); if(!(c>0.5)||!(red>0.5)) return 0; return r2(Math.min(c,red)); }
    function takePre(bill,amt){ var L=pre[bill]||[]; var i=L.findIndex(function(x){ return Math.abs(num(x.amt)-amt)<=1; }); if(i<0) return null; return L.splice(i,1)[0]; }
    (D.bills||[]).forEach(function(b){
      b.out=r2(b.out); b.dep=r2(b.dep); b.retail=(b.cus===RETAIL_CUS);
      var ap=apprMap[b.no];
      if(ap && ap.status==="cut"){ R.cut.push({b:b,ap:ap}); return; }
      if(b.out<=0.01){
        /* v0.7.0: บิลเงินสดที่คืนของจนคงค้าง 0 (เคส 0738) — เงินสดที่ลูกค้าจ่ายยังอยู่ในช่องเงินสดของฟอร์ม และเงินที่คืนอยู่ในช่องคืนเงิน → นับเข้ายอดบิลเงินสด */
        if(RF.on && RF.by[b.no] && RF.by[b.no].cn>0.5 && !(D.xfer||[]).some(function(x){ return x.bill===b.no; }) && b.cus!==SHOPEE_CUS && b.cus!==UPK_CUS && !(b.dep>0) && (b.retail || !(D.acct||[]).some(function(n){ return nameHit(n,b.name); }))) R.cashExtra.push({b:b, amt:r2(Math.min(RF.by[b.no].cn, num(b.tot)))});
        R.done.push({b:b}); return; }
      if(ap && ap.status==="approved"){ R.appr.push({b:b,ap:ap}); return; }
      if(b.cus===SHOPEE_CUS){ R.s.push({b:b,why:"Shopee — ตัดตามวันที่ Shopee โอนเงินเข้า"}); return; }
      if(b.cus===UPK_CUS){ R.s.push({b:b,why:"UPK — ตัดตามยอดที่ UPK จ่ายจริง (ไม่ใช่เงินสดหน้าร้าน)"}); return; }
      if(!b.retail && (D.acct||[]).some(function(n){ return nameHit(n,b.name); })){ R.s.push({b:b,why:"ลงบัญชี — ตัดเมื่อลูกค้าจ่ายจริง"}); return; }
      var xs=(D.xfer||[]).filter(function(x){ return x.bill===b.no && !x.ra; });
      if(xs.length){
        var got=0, src=[], raHit=null, wrong=[], wrongAmt=0;
        xs.forEach(function(x){
          var kv=num(x.knv), ks=num(x.ksk);
          var pk, ps;
          if(kv>0){ if((pk=takePre(b.no,kv))){ got+=kv; src.push(preLbl(pk,date0)+" "+TH(kv)); } else if(take(kp,kv)){ got+=kv; src.push("K+ "+TH(kv)); } else if(take(bk,kv)){ wrongAmt+=kv; wrong.push("เงินเข้าจริงทางกสิกร "+TH(kv)+" (แคชเชียร์ลงช่อง K+)"); } }
          if(ks>0){ if((ps=takePre(b.no,ks))){ got+=ks; src.push(preLbl(ps,date0)+" "+TH(ks)); } else if(take(bk,ks)){ got+=ks; src.push("เข้ากสิกร "+TH(ks)); } else if(take(kp,ks)){ wrongAmt+=ks; wrong.push("เงินเข้าจริงทาง K+ "+TH(ks)+" (แคชเชียร์ลงช่องกสิกร)"); } }
          /* v0.6.0: หาในช่องที่แคชเชียร์ลงไม่เจอ แต่เจอยอดนี้ในอีกบัญชี → จองยอดไว้ให้บิลนี้ แต่ไม่ตัด ให้แคชเชียร์แก้ไฟล์ Excel ก่อน */
        });
        got=r2(got);
        if(wrong.length && Math.abs(r2(got+wrongAmt)-b.out)<=1){ R.h.push({b:b, why: wrong.join(" + ")+" — โปรดแก้รายการในไฟล์ Excel แล้วอัปเอกสารใหม่", fix:true}); return; }
        var ovR=RF.on? num((RF.by[b.no]||{}).ov) : 0; /* v0.7.0 ลูกค้าโอนเกิน ร้านคืนส่วนเกิน (ใบคืนเงิน) */
        if(ovR>0.5 && Math.abs(got-ovR-b.out)<=1){ RF.ovUsed[b.no]=1; R.t.push({b:b, method:"เงินโอน", src:src.join(" + ")+" · คืนเงินโอนเกิน "+TH(ovR)+" (ใบคืนเงิน)"}); return; }
        if(Math.abs(got-b.out)<=1) R.t.push({b:b, method:"เงินโอน", src:src.join(" + ")+(b.dep>0?" · หักมัดจำแล้ว "+TH(b.dep):"")});
        else if(got>0 && got<b.out-1 && !(b.dep>0)) cashC.push({b:b, part:r2(b.out-got), mixed:src.join(" + ")}); /* v0.4.4: จ่ายผสม — ส่วนที่เหลือเป็นเงินสด */
        else if(got>b.out+1 && cnBack(b)>0 && Math.abs(got-b.out-cnBack(b))<=1) R.t.push({b:b, method:"เงินโอน", src:src.join(" + ")+" · ส่วนเกิน "+TH(cnBack(b))+" = คืนเงินสดลูกค้าตามใบลดหนี้"});
        else if(got>b.out+1 && (raHit=raExcess(b, r2(got-b.out)))) R.t.push({b:b, method:"เงินโอน", src:src.join(" + ")+" · ส่วนเกิน "+TH(got-b.out)+" = มัดจำ "+raHit.ra+" (หักบิล "+raHit.bill+")"});
        else if(!got){ var hh={b:b, why:"หาเงินโอนเข้าไม่เจอใน K+/สเตทเมนต์"}; R.h.push(hh);
          var sk=0, ss=0; xs.forEach(function(x){ sk+=num(x.knv); ss+=num(x.ksk); }); noMoney.push({h:hh, b:b, knv:r2(sk), ksk:r2(ss)}); }
        else R.h.push({b:b, why: "เงินเข้า "+TH(got)+" ไม่เท่ายอดค้าง "+TH(b.out)});
        return;
      }
      if(b.dep>0){ R.h.push({b:b, why:"มีมัดจำ — งานสั่ง รอลูกค้าจ่ายครบ"}); return; }
      var cb0=cnBack(b); cashC.push({b:b, part:r2(b.out+cb0), cnb:cb0});
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
    var cashSum=r2(cashC.reduce(function(s,x){ return s+x.part; },0)+R.cashExtra.reduce(function(s,x){ return s+x.amt; },0)); R.cashSum=cashSum;
    var sumOk=(D.cash!=null && Math.abs(cashSum-num(D.cash))<=1); R.cashSumOk=sumOk;
    /* v0.5.1 (9 ต.ค.69): เงินสดร้านค้า — ยอดที่แคชเชียร์ลงช่อง "ร้านค้าเงินสด" ต้องเท่ากับบิลเงินสดของร้านนั้นวันนี้
       ไม่เท่า = ลงผิดช่อง (เงินไปปนในเงินสดลูกค้าปลีก) → พักบิลร้านนั้น + บอกส่วนต่าง ให้แคชเชียร์แก้ฟอร์ม · เคส FFF ลง 945 บิลรวม 970 */
    var shopBad={}; R.shopWarn=[];
    if(D.shop){
      var grpS={}; cashC.forEach(function(x){ if(x.b.retail) return; var k=x.b.cus||x.b.no; (grpS[k]=grpS[k]||[]).push(x); });
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
    /* v0.7.0: บิลที่คืนเงินจนคงค้าง 0 ถูกนับเข้ายอดเงินสด — ถ้าแถวคืนเงินของบิลนั้นมีปัญหา ยอดเงินสดทั้งวันเชื่อไม่ได้ */
    var cxProb=null;
    if(RF.on){ Object.keys(RF.by).forEach(function(bn){ if(RF.by[bn].ov>0.5 && !RF.ovUsed[bn]){ RF.prob[bn]="ใบคืนเงินโอนเกิน "+TH(RF.by[bn].ov)+" ไม่ตรงกับเงินที่โอนเข้าบิลนี้"; if(!cxProb) cxProb=bn.slice(-4)+": "+RF.prob[bn]; } }); }
    R.cashExtra.forEach(function(x){ if(!cxProb && RF.prob[x.b.no]) cxProb=x.b.no.slice(-4)+": "+RF.prob[x.b.no]; });
    cashC.forEach(function(x){
      var b=x.b;
      if(shopBad[b.no]){ R.h.push({b:b, cash:true, why:shopBad[b.no]}); return; }
      if(RF.on && RF.prob[b.no]){ R.h.push({b:b, cash:true, why:RF.prob[b.no]}); return; }
      if(!proofOk) R.h.push({b:b, cash:true, why: D.proofPending? "มีคำขอแก้ไขยอดเงินสด รออนุมัติ" : D.proof? "ยอดใบนับเงินสดไม่ตรงกับยอดที่ต้องมี "+TH(expCash)+cpHint : "รอรูปใบนับเงินสด"});
      else if(RF.on && (RF.gate||cxProb)) R.h.push({b:b, cash:true, why:(RF.gate||cxProb)+" — ต้องตรวจก่อน"});
      else if(!sumOk) R.h.push({b:b, cash:true, why:"บิลเงินสดรวม "+TH(cashSum)+" ไม่ตรงกับเงินสดในฟอร์ม "+TH(D.cash)+" — ต้องตรวจก่อน"});
      else if(x.mixed) R.c.push({b:b, method:"เงินโอน + เงินสด", src:x.mixed+" + เงินสด "+TH(x.part)});
      else R.c.push({b:b, method:"เงินสด", src:"ใบนับเงินสดตรงกับยอดที่ต้องมี"+(x.cnb>0?" · รับ "+TH(x.part)+" คืนตามใบลดหนี้ "+TH(x.cnb):"")});
    });
    /* v0.7.0: บิลเงินโอนที่ผูกกับแถวคืนเงิน — มีปัญหารายบิล หรือด่านรวมของวันไม่ผ่าน → พักไว้ */
    if(RF.on){ R.t=R.t.filter(function(x){ var no=x.b.no, why=RF.prob[no] || (RF.gate && RF.by[no] ? RF.gate+" — ต้องตรวจก่อน" : null);
      if(why){ R.h.push({b:x.b, why:why}); return false; } return true; }); }
    return R;
  }
  function preLbl(p,d0){ return p.other ? ("โอนเข้าบัญชีอื่น (มีสลิป) "+dmy(p.d)) : (p.d<d0 ? "โอนเข้ามาก่อน "+dmy(p.d) : "โอนเข้า "+dmy(p.d)+" (ลงมัดจำ)"); }
  function prevDays(iso,n){ var p=String(iso).split("-"); var d=new Date(Date.UTC(+p[0],+p[1]-1,+p[2])); d.setUTCDate(d.getUTCDate()-n); return d.toISOString().slice(0,10); }
  function dmy(iso){ var p=String(iso||"").slice(0,10).split("-"); return p.length===3? (+p[2])+"/"+(+p[1]) : String(iso||""); }
  function TH(n){ return r2(n).toLocaleString("th-TH",{minimumFractionDigits:0,maximumFractionDigits:2}); }

  function prevDay(iso){ var p=String(iso).split("-"); var d=new Date(Date.UTC(+p[0],+p[1]-1,+p[2])); d.setUTCDate(d.getUTCDate()-1); return d.toISOString().slice(0,10); }
  /* v0.5.8: CN ที่คืนเงิน (ช่องคืนสดจริง) ↔ รายจ่ายหมวด "โอนเงินคืนลูกค้า" ยอดเท่ากัน ±1 · ช่วง 3 วันก่อน–60 วันหลังวันใบลดหนี้ · 1 รายการต่อ 1 ใบ (ใกล้วันที่สุดก่อน)
     หลักเดียวกับหน้ารายละเอียดวัน (กฎ 15 ก.ย.69) — ใช้ได้ทั้งหน้าตัดบิลและกรอบใบนับเงินสด */
  function shiftISO(iso,n){ var p=String(iso).slice(0,10).split("-"); var d=new Date(Date.UTC(+p[0],+p[1]-1,+p[2])); d.setUTCDate(d.getUTCDate()+n); return d.toISOString().slice(0,10); }
  async function refundXfer(s, date, cns){
    var L=(cns||[]).filter(function(c){ return num(c.cash)>0.5; }); var out={amt:0, rows:[], open:[]}; if(!L.length||!s) return out;
    var ex=[]; try{ var r=await s.from("rev_expenses").select("exp_date,amount,description,ref,category").gte("exp_date",shiftISO(date,-3)).lte("exp_date",shiftISO(date,60)).ilike("category","%คืน%ลูกค้า%"); ex=(r&&r.data)||[]; }catch(e){ out.open=L.slice(); return out; }
    var t0=Date.parse(String(date).slice(0,10)); ex=ex.slice().sort(function(a,b){ return Math.abs(Date.parse(String(a.exp_date).slice(0,10))-t0)-Math.abs(Date.parse(String(b.exp_date).slice(0,10))-t0); });
    var used={}; L.forEach(function(c){ var i=ex.findIndex(function(x,j){ return !used[j] && Math.abs(num(x.amount)-num(c.cash))<=1; });
      if(i>=0){ used[i]=1; out.amt=r2(out.amt+num(c.cash)); out.rows.push({cn_no:c.cn_no||"", cust:c.cust||"", amt:num(c.cash), exp_date:String(ex[i].exp_date).slice(0,10), desc:ex[i].description||ex[i].ref||""}); } else out.open.push(c); });
    return out;
  }
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
      s.from("rev_daily").select("date,kplus_rows").lt("date",date).gte("date",shiftISO(date,-7)), /* v0.7.0 ย้อน 7 วัน หา K+ ของวันขายล่าสุด */
      s.rpc("rev_shop_cash_decl",{p_date:date}),
      s.from("rev_audit").select("date,status").lt("date",date).gte("date",shiftISO(date,-7))
    ]);
    /* v0.4.6 (3 ต.ค.69): บิลหลังตัดรอบ 15:30 ลงวันที่วันถัดไป → K+ ที่เข้าหลัง 15:30 ของเมื่อวาน เป็นเงินของบิลวันนี้ (เคส KM6910-0054 72 บาท โอน 1/10 16:55) */
    /* v0.7.0: ไล่ย้อนจากเมื่อวาน หาวันแรกที่มีรายงาน K+ (วันจันทร์ข้ามวันอาทิตย์ที่ร้านปิด ไปวันเสาร์)
       ข้ามได้เฉพาะวันที่ปิดจริง = rev_audit สถานะ "วันหยุด" หรือ ACC ไม่มีบิลขายเลย
       วันขายที่ยังไม่มี K+ → หยุด ไม่ถอยไปวันเก่ากว่า (กันเงิน K+ ก้อนที่เป็นของบิลวันนั้นถูกเสนอให้บิลวันนี้ซ้ำ) */
    var kLate=[], kLateWarn=null;
    var byD={}, auD={}; ((q[8]&&q[8].data)||[]).forEach(function(r){ byD[r.date]=r; }); ((q[10]&&q[10].data)||[]).forEach(function(a){ auD[a.date]=a; });
    for(var ki=1; ki<=7; ki++){ var kd=shiftISO(date,-ki), kr=byD[kd];
      if(kr && (kr.kplus_rows||[]).length){ kLate=kr.kplus_rows.filter(function(x){ var m=String(x.t||"").match(/(\d{1,2}):(\d{2})/); return m && (+m[1]*60+ +m[2])>=15*60+30; }).map(function(x){ return num(x.amt); }); break; }
      var closed=(auD[kd] && auD[kd].status==="วันหยุด");
      if(!closed){ try{ var kb=await s.rpc("rev_cut_bills",{p_date:kd}); closed=!kb.error && Array.isArray(kb.data) && kb.data.length===0; }catch(e){ closed=false; } }
      if(!closed){ kLateWarn="ยังไม่มีรายงาน K+ ของ "+dmy(kd)+" (เงินโอนหลัง 15:30 ของวันนั้นเป็นของบิลวันนี้)"; break; } }
    var au=(q[1]&&q[1].data)||null, dd=(q[3]&&q[3].data)||{}, det=(au&&au.detail)||{};
    var pre=await preMoney(s, date, det.xfer||[]);
    var rfOn=String(date)>=REFUND_FROM;
    var rfx=rfOn? {amt:0, rows:[], open:[]} : await refundXfer(s, date, det.cns||[]);
    var RFD=rfOn? await refundData(s, date) : {};
    return {
      date:date, status:au?au.status:null,
      bills:(q[0]&&q[0].data)||[],
      xfer:det.xfer||[], cash:(det.form_cash!=null?num(det.form_cash):null),
      otherSum:((q[6]&&q[6].data)||[]).reduce(function(s2,x){ return s2+num(x.amount); },0), oldCash:num(det.form_old_cash), refund:num(det.form_refund_cash!=null?det.form_refund_cash:(au&&au.form_refund)),
      acct:((q[2]&&q[2].data)||[]).map(function(x){ return x.customer; }),
      kp:(dd.kplus_rows||[]).map(function(x){ return num(x.amt); }).concat(kLate),
      bk:(dd.bank_rows||[]).filter(function(x){ return num(x.dep)>0; }).map(function(x){ return num(x.dep); }),
      kLateWarn:kLateWarn, hasK:!!(dd.kplus_rows&&dd.kplus_rows.length), hasB:!!(dd.bank_rows&&dd.bank_rows.length),
      shop:((q[9]&&!q[9].error&&Array.isArray(q[9].data))? q[9].data : null),
      proof:(q[4]&&q[4].data)||null, proofPending:((q[7]&&q[7].data)||[]).length,
      appr:(q[5]&&q[5].data)||[],
      pre:pre, refundXfer:rfx.amt, refundXferRows:rfx.rows, cnRefundOpen:rfx.open,
      refundOn:rfOn, refunds:RFD.rows||[], refundPhoto:RFD.photo||null, refundErr:RFD.err||null, cnValid:RFD.cnValid||{}, refundWd:RFD.wd||[],
      cnCash:(det.cns||[]).reduce(function(m,c){ var k=String(c.bill||"").trim(), v=num(c.cash); if(k&&v>0) m[k]=r2((m[k]||0)+v); return m; },{})
    };
  }
  /* v0.4.9 (8 ต.ค.69): ลูกค้าโอนเงินเข้าบัญชีมาก่อนวันออกบิล → การเงินลงทะเบียนมัดจำ (rev_deposits) แล้วจับคู่กับเลขบิล
     ชีตโอนของวันออกบิลลงบิลนั้นเป็นเงินโอน แต่ K+/สเตทเมนต์ของวันนั้นไม่มียอดนี้ (เข้าไปแล้ววันก่อน) → เดิมพักว่า "หาเงินโอนเข้าไม่เจอ"
     เคสจริง: KM6910-0118 รุ่งชัย 12,325 · KM6910-0119 คุณเต๋า 36,480 — เงินเข้ากสิกร 2/10 บิลออก 3/10
     นับให้เฉพาะเมื่อ (1) ทะเบียนมัดจำผูกเลขบิลนี้ (2) วันที่เงินเข้าก่อนวันบิล (3) เจอยอดนั้นจริงในสเตทเมนต์/K+ ของวันที่เงินเข้า
     · ข้ามแถวโอนที่มีเลข RA (มัดจำใน ACC หักจากบิลไปแล้ว) */
  /* v0.7.0 (20 ต.ค.69): ข้อมูลกล่องคืนเงินของวัน — แถวคืนเงิน · รูปล่าสุด · ใบลดหนี้ที่มีจริงใน ACC · ยอดเงินออกในสเตทเมนต์ (วันนั้น–3 วันถัดไป) ไว้ตรวจโอนคืน */
  async function refundData(s, date){
    var o={rows:[], photo:null, err:null, cnValid:{}, wd:[]};
    try{
      var q=await Promise.all([ s.from("rev_cash_refund").select("*").eq("date",date).order("id"), s.from("rev_cash_refund_proof").select("image_path,uploaded_at,uploaded_role").eq("date",date).order("id",{ascending:false}).limit(1) ]);
      if(q[0].error) throw q[0].error; if(q[1].error) throw q[1].error;
      o.rows=q[0].data||[]; o.photo=(q[1].data||[])[0]||null;
      if(o.rows.some(function(x){ return x.kind==="cn"; })){ var c=await s.rpc("rev_refund_cn_check",{p_cns:o.rows.filter(function(x){ return x.kind==="cn"; }).map(function(x){ return x.cn_no; })}); if(c.error) throw c.error; (c.data||[]).forEach(function(z){ o.cnValid[z.cn]=z; }); }
      if(o.rows.some(function(x){ return x.pay==="transfer"; })){ var w=await s.from("rev_daily").select("bank_rows").gte("date",date).lte("date",shiftISO(date,3)); if(w.error) throw w.error;
        (w.data||[]).forEach(function(r){ (r.bank_rows||[]).forEach(function(x){ if(num(x.wd)>0) o.wd.push(num(x.wd)); }); }); }
    }catch(e){ console.warn("RevCut.refundData",e); o.err=(e&&e.message)||String(e); }
    return o;
  }
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
    var L=(r.data||[]).map(function(x){ return {b:{no:x.no,name:x.name,date:x.date,out:r2(x.out),retail:false}, amt:r2(x.amt), method:x.method, src:x.src, grp:x.grp, wait:!!x.wait}; });
    var nos=L.map(function(x){return x.b.no;}), am={}, cx={};
    if(nos.length){ var a=await s.from("rev_cut_approvals").select("*").in("bill_no",nos); ((a&&a.data)||[]).forEach(function(z){ if(z.status!=="cancelled") am[z.bill_no]=z; else cx[z.bill_no]=z; }); }
    var O={ready:[],appr:[],done:[],wait:[]};
    L.forEach(function(x){ var ap=am[x.b.no]; x.ap=ap||null;
      if((ap&&ap.status==="cut") || x.b.out<=0.01) O.done.push(x);
      else if(ap&&ap.status==="approved") O.appr.push(x);
      else if(x.wait) O.wait.push(x); /* v0.5.9 เงินเข้าแล้วแต่แคชเชียร์ยังไม่แจ้ง — เตือนอย่างเดียว ห้ามอนุมัติ */
      else if(x.amt>0.01){ x.apc=cx[x.b.no]||null; if(x.amt<x.b.out-0.01) x.src+=" · จ่ายบางส่วน "+TH(x.amt)+" จากค้าง "+TH(x.b.out); O.ready.push(x); } });
    return O;
  }
  window.RevCut={ classify:classify, load:load, refundXfer:refundXfer, refundData:refundData, REFUND_FROM:REFUND_FROM, compute:compute, old:old, TH:TH, num:num, r2:r2, RETAIL_CUS:RETAIL_CUS };
})();
