/* cutbill.js — v0.9.3 (24 ต.ค.69: บิลมีมัดจำ ส่วนที่เหลือจ่ายเงินสดวันนี้ — นับเข้ายอดบิลเงินสดเมื่อรวมแล้วตรงเงินสดในฟอร์มพอดี (ชุดเดียว) ด่านเงินสดของวันผ่าน ตัดได้ · ไม่ตรง = พักบิลมัดจำ ไม่ทำให้บิลอื่นติด · เคส 0986 23/10 มัดจำสด 10,182 + สด 2,000) · v0.9.2 (23 ต.ค.69: อ่านผ่าน view rev_form_check แทน — v0.9.1 อ่านตาราง rev_form_declared ตรงแล้วโดน permission denied ทำให้ตัวอนุมัติอัตโนมัติปิดทั้งวัน) · v0.9.1 (23 ต.ค.69: ชื่อร้านลงบัญชีอ่านจาก rev_form_declared ด้วย — หลังตรวจรายได้ v0.6.0 ไม่เก็บแถวลงบัญชีชื่อร้านใน rev_credit_bills · เคส 0941 ส่งเสริมบริการ 760) · v0.9.0 (22 ต.ค.69: ตัดบิลอัตโนมัติ ขั้นที่ 2 — autoPick() คัดใบ "พร้อมตัด" ที่กฎอนุมัติให้เองได้ (ไม่รวมลูกค้าปลีกโอนก้อนเดียวหลายบิล · ใบที่เคยมีรายการอนุมัติ/ยกเลิก) · วันที่ข้อมูลไม่ครบ · โหลดส่วนไหนไม่ได้ · มีเลขบิลชีตโอนหาไม่เจอ · บิลก่อนวันเริ่มใช้ 22 ต.ค.69 หรือเก่าเกิน 7 วัน = ไม่คัดทั้งวัน · load() ส่ง loadErr) · v0.8.1 (22 ต.ค.69: มัดจำที่รับเป็นเงินสดวันนี้ นับเข้ายอดบิลเงินสด เคส 0842 RA6910-0006 5,000 · ด่านเงินสดของวันแสดงบรรทัดเดียวบนหัวรายการ ไม่แปะซ้ำทุกบิล) · v0.8.0 (21 ต.ค.69: ลูกค้าปลีกลงบัญชี (เลขบิลในชีตลงบัญชี) = ไม่ต้องตัด เคส 0824 · ลูกค้าปลีกโอนก้อนเดียวจ่ายหลายบิล เฉพาะเลขบิลติดกัน เคส 0817+0818=120 · บิลเปิดย้อนหลัง (เลขอยู่หลังบิลแรกของวันถัดไป) แยกพัก ไม่ทำให้บิลเงินสดอื่นติด เคส 0850 · R.unk เลขบิลในชีตโอนที่ไม่มีใน ACC (ย้ายมาจากตาราง ④)) · v0.7.0 (20 ต.ค.69: กล่อง "คืนเงิน (ไม่ออกบิล)" rev_cash_refund — คืนเพราะโอนเกิน (เคส 0770 พูนกิจ โอน 12,610 บิล 12,510 คืนสด 100) · บิลเงินสดที่ใบลดหนี้คืนเงินจนคงค้าง 0 นับเข้ายอดเงินสด (เคส 0738 210) · โอนคืนอ่านจากกล่องแทนรายจ่ายหมวดโอนเงินคืนลูกค้า · K+ หลังตัดรอบดู "วันที่มีข้อมูลล่าสุด" แทนเมื่อวาน (วันจันทร์ไปดูวันเสาร์ เคส 0710 25,220 / 0713 200)) · v0.6.0 (14 ต.ค.69: แคชเชียร์ลงช่องโอนผิดช่อง (K+ ↔ กสิกร) — เจอเงินในอีกบัญชี = พักไว้ + เตือน "เงินเข้าจริงทาง K+/กสิกร โปรดแก้รายการในไฟล์ Excel แล้วอัปเอกสารใหม่" ไม่ตัดให้เอง · เคส KM6910-0456 ป้ายอะแด็ปดีไซน์ 4,250 ลงช่องกสิกร แต่เข้า K+ 12/10 17:36) · v0.5.9 (13 ต.ค.69: บิลเก่าที่มีเงินเข้าแต่แคชเชียร์ยังไม่แจ้งในชีตบิลเก่า = รอแคชเชียร์แจ้ง ขึ้นเตือนแต่อนุมัติไม่ได้ · เคสเจียง-ฟิวเจอร์ 10,878.80) · v0.5.8 (13 ต.ค.69: คืนเงินตามใบลดหนี้ที่โอนคืน (รายจ่ายหมวด "โอนเงินคืนลูกค้า") ไม่หักจากเงินสดในลิ้นชัก · เคสกราเซีย 970 โอน 10/10) · v0.5.7 (13 ต.ค.69: จ่ายเต็มบิลแล้วคืนเงินสดตามใบลดหนี้ ไม่นับเป็นเงินเกิน · เงินสดร้านค้านับส่วนเงินสดของบิลจ่ายผสม) · v0.5.6 (10 ต.ค.69: เงินเข้าบัญชีอื่นที่มีสลิป นับเป็นเงินจริง) · v0.5.1 (9 ต.ค.69: เงินสดร้านค้าในฟอร์มต้องเท่ากับบิลเงินสดของร้านนั้น ไม่งั้นพัก + บอกว่าร้านค้าขาด/ลูกค้าปลีกเกินเท่าไร เคส FFF 945 vs 970) · v0.5.0 (9 ต.ค.69: (1) ลูกค้าโอนก้อนเดียวจ่ายหลายบิล → รวมยอดบิลลูกค้าเดียวกันแล้วหาในเงินที่เหลือ เคสอ้วนกลม 0196+0198=1,290 (2) โอนเกินยอดค้าง แล้วส่วนเกินถูกออกเป็นมัดจำ RA หักบิลอื่นของลูกค้าเดียวกัน เคสรุ่งชัย 0225 โอน 29,395 ค้าง 29,095 + RA6910-0002 300 หักบิล 0226) · v0.4.9 (8 ต.ค.69: เงินโอนที่เข้าบัญชีมาก่อนวันออกบิล (ทะเบียนมัดจำจับคู่บิลแล้ว + เจอในสเตทเมนต์/K+ วันที่เงินเข้า) นับเป็นเงินของบิล — เคส KM6910-0118/0119) · v0.4.7 (3 ต.ค.69: บิลเก่าที่มีเงินจ่ายวันนี้ RevCut.old) · v0.4.6 (3 ต.ค.69: นับ K+ หลัง 15:30 ของเมื่อวานด้วย) · v0.4.5 (2 ต.ค.69: ใบนับเทียบยอดที่ต้องมี = เงินสดขาย+รายรับอื่นๆ+บิลเก่าเงินสด−คืนเงิน) · v0.4.4 (1 ต.ค.69: UPK ไม่นับเป็นเงินสด · บิลเงินสดต้องรวมแล้วตรงกับเงินสดในฟอร์ม · บิลจ่ายผสม K+/โอน+เงินสด) · v0.4.0 (30 ก.ย.69)
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
  function billKey(s){ return String(s==null?"":s).split("(")[0].replace(/\s+/g,"").toUpperCase(); }
  function billSeq(no){ var m=/^(KM\d{4})-(\d+)$/.exec(String(no||"")); return m? {p:m[1], n:+m[2]} : null; }
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
    var lateC=[]; /* v0.8.0 บิลเงินสดที่เปิดย้อนหลัง */
    var depC=[], depCn=[]; /* v0.9.3 บิลมีมัดจำ — ส่วนที่เหลือเป็นเงินสดวันนี้หรือยัง · depCn = บิลมัดจำที่มีคืนเงินตามใบลดหนี้ */
    /* v0.8.1 (22 ต.ค.69): มัดจำที่รับเป็นเงินสดวันนี้ (RA ใน ACC ช่องเงินสด) — เงินอยู่ในลิ้นชัก + แคชเชียร์ลงในเงินสดของฟอร์มแล้ว
       แต่บิลที่ผูกมัดจำถูกพักทั้งใบ → ยอดบิลเงินสดขาดเท่ามัดจำ · เคส KM6910-0842 7,130 = มัดจำสด RA6910-0006 5,000 + ค้าง 2,130 (21/10) */
    var raCash=(D.raCash||[]).map(function(x){ return {no:String(x.no||""), amt:r2(x.amt), bill:String(x.bill||"").trim(), name:x.name||""}; }).filter(function(x){ return x.amt>0.01; });
    function raCashOf(no){ return raCash.filter(function(x){ return x.bill===no; })[0]||null; }
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
      /* v0.8.0 (21 ต.ค.69): ลูกค้าปลีกลงบัญชี — ชีตลงบัญชีช่องลูกค้าปลีกใส่เลขบิล (rev_credit_bills.customer = เลขบิล) → ไม่ต้องตัดวันนี้
         เคส KM6910-0824 บิล 2,640 = มัดจำ RA6910-0005 1,320 + ลงบัญชี 1,320 (เดิมพักว่า "มีมัดจำ — รอลูกค้าจ่ายครบ") */
      if(b.retail && (D.acct||[]).some(function(n){ return billKey(n)===b.no; })){ R.s.push({b:b,why:"ลงบัญชี "+TH(b.out)+" — ตัดเมื่อลูกค้าจ่ายจริง"+(b.dep>0?" · หักมัดจำแล้ว "+TH(b.dep):"")}); return; }
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
      /* v0.9.3 (24 ต.ค.69): บิลมีมัดจำ ส่วนที่เหลืออาจจ่ายเป็นเงินสดวันนี้ (เคส 0986 23/10 มัดจำสด 10,182 + สด 2,000) หรือยังไม่จ่าย (เคส 0842 21/10 จ่าย 2,130 วันที่ 23/10)
         → แยกไว้ก่อน นับส่วนที่เหลือเป็นเงินสดเฉพาะเมื่อรวมแล้วเงินสดในฟอร์มตรงพอดี (ตัดสินท้ายลูป) · มัดจำนับแค่ใน raSum (มัดจำสดวันนี้) ไม่นับซ้ำ */
      if(b.dep>0){ var rcD=raCashOf(b.no);
        if(cnBack(b)>0){ depCn.push(b); R.h.push({b:b, why:(rcD? "มัดจำเงินสด "+TH(rcD.amt)+" รับวันนี้ ("+rcD.no+") นับในเงินสดแล้ว" : "หักมัดจำแล้ว "+TH(b.dep))+" · มีคืนเงินตามใบลดหนี้ "+TH(cnBack(b))+" ด้วย — ต้องตรวจเอง"}); return; } /* มัดจำ + ใบลดหนี้คืนเงิน ไม่จับคู่อัตโนมัติ — และระงับการจับคู่บิลมัดจำ/ย้อนหลังใบอื่นทั้งวัน (กันเงินของใบนี้ไปตัดใบอื่น) */
        depC.push({b:b, part:b.out, rc:rcD}); return; }
      var cb0=cnBack(b);
      /* v0.8.0: บิลเปิดย้อนหลัง = ลงวันที่วันนี้ แต่เลขบิลอยู่หลังบิลแรกของวันถัดไป (เปิดหลังตัดรอบ 15:30 แล้วย้อนวันที่) — แยกไว้ก่อน ตัดสินท้ายลูป */
      var sq=billSeq(b.no), nf=billSeq(D.nextFirst);
      if(sq && nf && sq.p===nf.p && sq.n>nf.n){ lateC.push({b:b, part:r2(b.out+cb0), cnb:cb0}); return; }
      cashC.push({b:b, part:r2(b.out+cb0), cnb:cb0});
    });
    /* v0.5.0 (1): โอนก้อนเดียวจ่ายหลายบิล — บิลที่หาเงินไม่เจอของลูกค้า (รหัสเดียวกัน ไม่ใช่ลูกค้าทั่วไป) ช่องทางเดียวกัน
       ลองรวมยอดทีละชุด (ชุดใหญ่ก่อน อย่างน้อย 2 บิล) แล้วหาในเงิน K+/สเตทเมนต์ที่ยังไม่ถูกจับคู่ */
    /* v0.8.0 (21 ต.ค.69): ลูกค้าปลีก (คุณ 1) ก็โอนก้อนเดียวจ่ายหลายบิลได้ — แต่รหัสลูกค้าเดียวกันหมดทั้งร้าน
       จึงรวมได้เฉพาะบิลที่เลขติดกัน (ห่างกันไม่เกิน 5 เลข) ชุดละ 2–3 บิล · เคส 0817 85 + 0818 35 = โอนกสิกร 120 (20/10) */
    var grp={}; noMoney.forEach(function(n){ if(!n.b.cus) return; var ch=(n.knv>0&&!(n.ksk>0))?"knv":(n.ksk>0&&!(n.knv>0))?"ksk":null; if(!ch) return;
      var k=n.b.cus+"|"+ch; (grp[k]=grp[k]||[]).push(n); });
    /* ลูกค้าปลีก: แบ่งเป็นกลุ่มบิลเลขติดกัน (ห่างจากบิลก่อนหน้าไม่เกิน 5 เลข) แต่ละกลุ่มคิดแยก */
    Object.keys(grp).forEach(function(k){ var L=grp[k]; if(!L.length||!L[0].b.retail) return; delete grp[k];
      var S=L.filter(function(x){ return billSeq(x.b.no); }).sort(function(a,b){ return billSeq(a.b.no).n-billSeq(b.b.no).n; }), ci=0, prev=null;
      var cnt=0; S.forEach(function(x){ var q=billSeq(x.b.no).n; if((prev!=null && q-prev>5) || cnt>=8){ ci++; cnt=0; } prev=q; cnt++; var kk=k+"|c"+ci; (grp[kk]=grp[kk]||[]).push(x); }); }); /* กลุ่มละไม่เกิน 8 บิล (เกินแบ่งเป็นช่วง) */
    Object.keys(grp).sort(function(a,b){ return (grp[a][0].b.retail?1:0)-(grp[b][0].b.retail?1:0); }).forEach(function(k){ /* ลูกค้าร้านค้าก่อน ลูกค้าปลีกทีหลัง */
      var L=grp[k], ch=k.split("|")[1], pool=(ch==="knv")?kp:bk; if(L.length<2||L.length>8) return;
      var isR=L[0].b.retail;
      var left=L.slice();
      for(var size=Math.min(left.length, isR?3:left.length); size>=2; size--){
        var found=true;
        while(found && left.length>=size){ found=false;
          var n=left.length, masks=[];
          for(var m=1;m<(1<<n);m++){ var c=0; for(var j=0;j<n;j++) if(m&(1<<j)) c++; if(c===size) masks.push(m); }
          for(var mi=0; mi<masks.length; mi++){
            var pick=left.filter(function(_,j){ return masks[mi]&(1<<j); });
            var sum=r2(pick.reduce(function(a,x){ return a+x[ch]; },0));
            var okOut=pick.every(function(x){ return Math.abs(x[ch]-x.b.out)<=1; });
            if(okOut && isR){ var sqs=pick.map(function(x){ var q=billSeq(x.b.no); return q?q.n:NaN; }); okOut=sqs.every(function(v){ return !isNaN(v); }) && (Math.max.apply(null,sqs)-Math.min.apply(null,sqs))<=5; }
            if(okOut && take(pool,sum)){
              var nos=pick.map(function(x){ return x.b.no.slice(-4); }).join("+");
              pick.forEach(function(x){ var i=R.h.indexOf(x.h); if(i>=0) R.h.splice(i,1);
                R.t.push({b:x.b, method:"เงินโอน", grp:nos, src:(ch==="knv"?"K+ ":"เข้ากสิกร ")+"โอนรวม "+TH(sum)+" (จ่ายบิล "+nos+")"+(isR?" · ลูกค้าปลีก เลขบิลติดกัน ดูให้แน่ใจก่อนอนุมัติ":"")}); });
              left=left.filter(function(x){ return pick.indexOf(x)<0; }); found=true; break;
            }
          }
        }
      }
    });
    /* v0.4.4: บิลเงินสดทั้งวันต้องรวมแล้วตรงกับเงินสดในฟอร์ม (±1) ถึงจะพร้อมตัด — ไม่ตรง = พักทั้งก้อน (กันบิลที่ยังไม่จ่ายหลุดเป็นเงินสด เช่น UPK) */
    var raSum=r2(raCash.reduce(function(s,x){ return s+x.amt; },0)); R.raCash=raCash; R.raSum=raSum; /* v0.8.1 */
    var cashSum=r2(cashC.reduce(function(s,x){ return s+x.part; },0)+R.cashExtra.reduce(function(s,x){ return s+x.amt; },0)+raSum); R.cashSum=cashSum;
    var sumOk=(D.cash!=null && Math.abs(cashSum-num(D.cash))<=1);
    /* v0.9.3 (24 ต.ค.69): ยอดเงินสดยังไม่ตรง → หาว่าเงินที่ขาดคือ "ส่วนที่เหลือของบิลมีมัดจำ" (แต่ละใบ) และ/หรือ "บิลเปิดย้อนหลัง" (ทั้งก้อน แบบ v0.8.0) ชุดไหน
       รวมได้เท่าที่ขาดพอดี (±1) ชุดเดียว = นับเป็นเงินสดวันนี้ ตัดได้ · หลายชุด = ไม่เดา ด่านไม่ผ่าน · ไม่มีชุดไหน = ด่านไม่ผ่าน (จับเงินสดขาด/เกินตามเดิม)
       ยอดตรงอยู่แล้ว = ไม่นับส่วนที่เหลือ พักบิลมัดจำ (เคส 0842 21/10 ลูกค้ามาจ่าย 2,130 วันที่ 23/10) ไม่ทำให้บิลอื่นติด
       มัดจำนับแค่ใน raSum (มัดจำเงินสดที่รับวันนี้) — ส่วนนี้นับแค่ b.out ไม่นับมัดจำซ้ำ · เคส 23/10: 48,842 (รวมมัดจำสด 10,182) + 0986 ส่วนที่เหลือ 2,000 = ฟอร์ม 50,842 */
    var lateSum=r2(lateC.reduce(function(s,x){ return s+x.part; },0)), nfS=String(D.nextFirst||"").slice(-4);
    var cand=depC.slice(); if(lateC.length) cand.push({lateAll:true, part:lateSum});
    var depIn=[], lateIn=false, depAmb=0, depMany=0, depNeed=r2(num(D.cash)-cashSum), CAND_MAX=12;
    if(cand.length && !sumOk && D.cash!=null && !depCn.length){
      if(cand.length>CAND_MAX) depMany=cand.length;
      else { var hit=[];
        for(var cm=1; cm<(1<<cand.length) && hit.length<2; cm++){ var cs=0; for(var cj=0; cj<cand.length; cj++) if(cm&(1<<cj)) cs+=cand[cj].part; if(Math.abs(r2(cs)-depNeed)<=1) hit.push(cm); }
        if(hit.length===1){ cand.forEach(function(x,j){ if(!(hit[0]&(1<<j))) return; if(x.lateAll){ lateIn=true; lateC.forEach(function(y){ cashC.push(y); }); } else { x.dep=true; cashC.push(x); depIn.push(x); } cashSum=r2(cashSum+x.part); }); sumOk=true; }
        else if(hit.length>1) depAmb=hit.length; }
    }
    var depOut=depC.filter(function(x){ return depIn.indexOf(x)<0; });
    /* v0.8.0: บิลเปิดย้อนหลัง — รวมแล้วยอดเงินสดตรงฟอร์ม = แคชเชียร์ลงฟอร์มแล้ว นับเป็นบิลเงินสดปกติ (ตัดสินร่วมกับบิลมัดจำข้างบน) · ไม่งั้นพักไว้ ไม่ให้ไปทำให้บิลเงินสดอื่นติด */
    R.late=[];
    if(lateC.length && !lateIn) lateC.forEach(function(x){ var h={b:x.b, cash:true, late:true, why:"เปิดบิลย้อนหลัง (เลขบิลอยู่หลังบิล "+nfS+" ของวันถัดไป) — ไม่อยู่ในยอดเงินสดของฟอร์ม ให้แคชเชียร์ลงฟอร์ม Excel แล้วอัปใหม่"}; R.h.push(h); R.late.push(h); });
    R.cashSum=cashSum; R.cashSumOk=sumOk;
    depOut.forEach(function(x){ var b=x.b, rc=x.rc;
      R.h.push({b:b, why:(rc? "มัดจำเงินสด "+TH(rc.amt)+" รับวันนี้ ("+rc.no+") นับในเงินสดแล้ว" : "หักมัดจำแล้ว "+TH(b.dep))
        +" · ส่วนที่เหลือ "+TH(x.part)+(sumOk? " ไม่อยู่ในยอดเงินสดของฟอร์ม — ยังไม่นับว่าลูกค้าจ่าย ตัดเมื่อลูกค้าจ่ายครบ (ถ้าลูกค้าจ่ายแล้ววันนี้ = เงินสดขาด "+TH(x.part)+" ให้ตรวจ)" : " — รอด่านเงินสดของวัน (ดูบนสุด)")}); });
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
    /* v0.8.1 (22 ต.ค.69): ด่านเงินสดที่เป็นของ "ทั้งวัน" — เก็บข้อความไว้ที่ R.cashGate แสดงบรรทัดเดียวบนหัวรายการ
       แต่ละบิลขึ้นแค่ "รอด่านเงินสดของวัน" (เดิมแปะข้อความยาวซ้ำทุกบิล ดูเหมือนทุกบิลผิด) */
    R.cashGate = !proofOk? (D.proofPending? "มีคำขอแก้ไขยอดเงินสด รออนุมัติ" : D.proof? "ยอดใบนับเงินสดไม่ตรงกับยอดที่ต้องมี "+TH(expCash)+cpHint : "รอรูปใบนับเงินสด")
               : (RF.on && (RF.gate||cxProb))? (RF.gate||cxProb)+" — ต้องตรวจก่อน"
               : !sumOk? "บิลเงินสดรวม "+TH(cashSum)+(raSum>0?" (รวมมัดจำเงินสด "+TH(raSum)+")":"")+" ไม่ตรงกับเงินสดในฟอร์ม "+TH(D.cash)+" — ต้องตรวจก่อน"
                   +(depAmb? " · ส่วนที่เหลือของบิลมีมัดจำ"+(lateC.length?"/บิลเปิดย้อนหลัง":"")+" รวมได้หลายแบบเท่ากับ "+TH(depNeed)+" — ดูว่าใบไหนลูกค้าจ่ายแล้ว"
                     : (depCn.length && cand.length)? " · มีบิลมัดจำ+ใบลดหนี้คืนเงิน ("+depCn.map(function(b){ return b.no.slice(-4); }).join(", ")+") — ตรวจใบนั้นก่อน ระบบจึงไม่จับคู่บิลมัดจำ/บิลเปิดย้อนหลังใบอื่นให้"
                     : depMany? " · บิลมีมัดจำ"+(lateC.length?"/บิลเปิดย้อนหลัง":"")+" "+depMany+" รายการ มากเกินจับคู่อัตโนมัติ (ไม่เกิน "+CAND_MAX+") — ต้องตรวจเอง" : depOut.length? " · บิลมีมัดจำที่ยังไม่นับ: "+depOut.map(function(x){ return x.b.no.slice(-4)+" ค้าง "+TH(x.part); }).join(", ") : "")
               : null;
    cashC.forEach(function(x){
      var b=x.b;
      if(shopBad[b.no]){ R.h.push({b:b, cash:true, why:shopBad[b.no]}); return; }
      if(RF.on && RF.prob[b.no]){ R.h.push({b:b, cash:true, why:RF.prob[b.no]}); return; }
      if(R.cashGate) R.h.push({b:b, cash:true, gate:true, why:"รอด่านเงินสดของวัน (ดูบนสุด)"});
      else if(x.dep) R.c.push({b:b, method:"เงินสด", src:(x.rc? "มัดจำเงินสด "+TH(x.rc.amt)+" รับวันนี้ ("+x.rc.no+")" : "หักมัดจำแล้ว "+TH(b.dep))+" + เงินสดส่วนที่เหลือ "+TH(x.part)+" · เงินสดในฟอร์มตรง · ใบนับเงินสดตรงกับยอดที่ต้องมี"});
      else if(x.mixed) R.c.push({b:b, method:"เงินโอน + เงินสด", src:x.mixed+" + เงินสด "+TH(x.part)});
      else R.c.push({b:b, method:"เงินสด", src:"ใบนับเงินสดตรงกับยอดที่ต้องมี"+(x.cnb>0?" · รับ "+TH(x.part)+" คืนตามใบลดหนี้ "+TH(x.cnb):"")});
    });
    /* v0.7.0: บิลเงินโอนที่ผูกกับแถวคืนเงิน — มีปัญหารายบิล หรือด่านรวมของวันไม่ผ่าน → พักไว้ */
    if(RF.on){ R.t=R.t.filter(function(x){ var no=x.b.no, why=RF.prob[no] || (RF.gate && RF.by[no] ? RF.gate+" — ต้องตรวจก่อน" : null);
      if(why){ R.h.push({b:x.b, why:why}); return false; } return true; }); }
    /* v0.8.0: ด่านจากตาราง ④ เดิม — เลขบิลในชีตโอนที่ไม่มีในบิลของวันนี้ (พิมพ์ผิด หรือเป็นบิลวันอื่น) */
    var nextSet={}; (D.nextNos||[]).forEach(function(n){ nextSet[n]=1; });
    R.unk=(D.xfer||[]).filter(function(x){ var k=billKey(x.bill); return k && !x.ra && !billByNo[k] && !nextSet[k] && !(D.pre&&D.pre[k]); })
      .map(function(x){ return {bill:String(x.bill||""), amt:r2(num(x.knv)+num(x.ksk)), cust:x.cust||""}; });
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
      s.from("rev_audit").select("date,status").lt("date",date).gte("date",shiftISO(date,-7)),
      s.rpc("rev_cut_bills",{p_date:shiftISO(date,1)}), /* v0.8.0 บิลของวันถัดไป — หาเลขบิลแรก (จับบิลเปิดย้อนหลัง) */
      s.rpc("rev_cash_deposits",{p_date:date}), /* v0.8.1 มัดจำที่รับเป็นเงินสดวันนี้ */
      s.from("rev_form_check").select("declared_customer,acc_customer").eq("form_date",date).eq("section","account") /* v0.9.2 ชื่อในชีตลงบัญชีของฟอร์ม (ตาราง rev_form_declared หน้าเว็บอ่านตรงไม่ได้ ใช้ view ที่จับคู่ชื่อ ACC ให้แล้ว) */
    ]);
    var nxt=((q[11]&&!q[11].error&&Array.isArray(q[11].data))? q[11].data : []).map(function(b){ return String(b.no||""); }).filter(Boolean).sort();
    var nxtErr=false; /* v0.9.0 โหลดบิลวันถัดไปไม่ได้ → ตัวอนุมัติอัตโนมัติไม่บันทึกทั้งวัน (จับบิลเปิดย้อนหลังไม่ได้) */
    for(var ni=2; ni<=3 && !nxt.length; ni++){ try{ var nq=await s.rpc("rev_cut_bills",{p_date:shiftISO(date,ni)}); if(!nq.error && Array.isArray(nq.data)) nxt=nq.data.map(function(b){ return String(b.no||""); }).filter(Boolean).sort(); else nxtErr=true; }catch(e){ nxtErr=true; } } /* วันถัดไปร้านปิด → ดูวันถัดไปอีก */
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
      date:date, status:au?au.status:null, nextFirst:nxt[0]||null, nextNos:nxt,
      raCash:((q[12]&&!q[12].error&&Array.isArray(q[12].data))? q[12].data : []),
      bills:(q[0]&&q[0].data)||[],
      xfer:det.xfer||[], cash:(det.form_cash!=null?num(det.form_cash):null),
      otherSum:((q[6]&&q[6].data)||[]).reduce(function(s2,x){ return s2+num(x.amount); },0), oldCash:num(det.form_old_cash), refund:num(det.form_refund_cash!=null?det.form_refund_cash:(au&&au.form_refund)),
      /* v0.9.1 (23 ต.ค.69): ตั้งแต่ตรวจรายได้ v0.6.0 แถวลงบัญชีที่มีแต่ชื่อร้านไม่ถูกเก็บใน rev_credit_bills แล้ว (ลูกหนี้ดึงจาก ACC)
         → อ่านชื่อจากรายการที่แคชเชียร์แจ้ง (rev_form_declared ส่วนลงบัญชี) ด้วย · เคส 22/10 บิล 0941 ส่งเสริมบริการ 760 ถูกพักเป็นเงินสด */
      acct:((q[2]&&q[2].data)||[]).map(function(x){ return x.customer; }).concat(((q[13]&&q[13].data)||[]).reduce(function(a,x){ return a.concat([x.acc_customer, x.declared_customer]); },[]).filter(function(n){ return /^KM\d{4}-\d{4}/i.test(String(n||"").trim()) || norm(n).length>=3; })).filter(Boolean), /* ชื่อสั้นเกิน (เช่น "1") จับผิดร้าน */
      kp:(dd.kplus_rows||[]).map(function(x){ return num(x.amt); }).concat(kLate),
      bk:(dd.bank_rows||[]).filter(function(x){ return num(x.dep)>0; }).map(function(x){ return num(x.dep); }),
      loadErr:q.map(function(x,i){ return (!x||x.error||(i===11&&nxtErr))? i : -1; }).filter(function(i){ return i>=0; }), /* v0.9.0 ส่วนไหนโหลดไม่ได้ → ตัวอนุมัติอัตโนมัติไม่บันทึกทั้งวัน */
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
  /* v0.9.0 (22 ต.ค.69) ตัดบิลอัตโนมัติ ขั้นที่ 2 — คุณหลิงอนุมัติวิธี "ก. หน้าตรวจรายได้บันทึกให้เอง"
     คัดเฉพาะบิลของวัน (R.t + R.c) ที่ cutbill ขึ้น "พร้อมตัด" → แถวสำหรับ rev_cut_approvals (approved_role = auto-rule)
     ไม่คัด (รอคุณหลิงกดเหมือนเดิม): ทุกใบที่พักไว้ (อยู่ใน R.h อยู่แล้ว) · ลูกค้าปลีกโอนก้อนเดียวหลายบิล (grp + retail)
       · บิลที่มีแถวใน rev_cut_approvals แล้ว (รวมที่เคยยกเลิก — ไม่อนุมัติซ้ำให้เอง) · บิลเก่า (RevCut.old ไม่ผ่านฟังก์ชันนี้)
     ทั้งวัน: ยังไม่กดยืนยันผลตรวจ · ไม่มี K+ / สเตทเมนต์ · K+ วันก่อนยังไม่ครบ · โหลดข้อมูลส่วนไหนไม่ได้ · มีเลขบิลในชีตโอนที่หาไม่เจอ
       · บิลก่อนวันเริ่มใช้ (AUTO_FROM) หรือเก่าเกิน AUTO_MAX_DAYS วัน (เปิดดูวันเก่าที่ "ตรวจแล้ว" ต้องไม่อนุมัติบิลค้างของวันนั้นเอง) → ไม่คัดเลย */
  var AUTO_ROLE="auto-rule", AUTO_METHODS=["เงินสด","เงินโอน","เงินโอน + เงินสด"];
  var AUTO_FROM="2026-10-22", AUTO_MAX_DAYS=7;
  var LOAD_PART=["บิล ACC","ผลตรวจ","ลงบัญชี","K+/สเตทเมนต์","ใบนับเงินสด","รายการอนุมัติ","รายรับอื่น","คำขอแก้ยอดเงินสด","K+ วันก่อน","เงินสดร้านค้า","สถานะวันก่อน","บิลวันถัดไป","มัดจำเงินสด"];
  function bkkToday(nowMs){ return new Date((nowMs==null?Date.now():nowMs)+7*3600e3).toISOString().slice(0,10); }
  function autoPick(R, nowMs){
    var D=(R&&R.D)||{}, why=[], d0=String(D.date||"").slice(0,10);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(d0)) why.push("ไม่รู้วันที่");
    else {
      if(d0<AUTO_FROM) why.push("บิลก่อนวันเริ่มใช้ตัดอัตโนมัติ ("+dmy(AUTO_FROM)+")");
      else if(d0<shiftISO(bkkToday(nowMs),-AUTO_MAX_DAYS)) why.push("บิลเก่าเกิน "+AUTO_MAX_DAYS+" วัน");
      if(d0>=bkkToday(nowMs)) why.push("ยังไม่จบวัน");
    }
    if(D.status!=="ตรวจแล้ว") why.push("วันนี้ยังไม่ได้กดยืนยันผลตรวจ");
    if(!D.hasK) why.push("ยังไม่มีรายงาน K+");
    if(!D.hasB) why.push("ยังไม่มีสเตทเมนต์");
    if(D.kLateWarn) why.push(D.kLateWarn);
    if(!Array.isArray(D.loadErr)) why.push("โหลดข้อมูลบางส่วนไม่ได้");
    else if(D.loadErr.length) why.push("โหลดข้อมูลไม่ได้: "+D.loadErr.map(function(i){ return (LOAD_PART[i]||"ส่วนที่ "+i)+" (#"+i+")"; }).join(", "));
    if(D.refundErr) why.push("โหลดกล่องคืนเงินไม่ได้");
    if(R && Array.isArray(R.unk) && R.unk.length) why.push("มีเลขบิลในชีตโอนที่หาไม่เจอ "+R.unk.length+" รายการ");
    if(why.length) return {ok:false, why:why.join(" · "), rows:[], skip:[]};
    var seen={}; (D.appr||[]).forEach(function(a){ if(a && a.bill_no) seen[a.bill_no]=a; });
    var rows=[], skip=[], dup={};
    (R.t||[]).concat(R.c||[]).forEach(function(x){
      var b=(x&&x.b)||{}, no=String(b.no||"");
      if(!no || dup[no]) return; dup[no]=1;
      if(x.grp && b.retail){ skip.push({b:b, why:"ลูกค้าปลีกโอนก้อนเดียวจ่ายหลายบิล — รอคุณหลิงดูก่อน"}); return; }
      if(seen[no]){ skip.push({b:b, why: seen[no].status==="cancelled"? "เคยยกเลิกการอนุมัติ — รอคุณหลิงกดเอง" : "มีรายการอนุมัติอยู่แล้ว"}); return; }
      if(typeof b.out!=="number" || !isFinite(b.out) || !(r2(b.out)>0.01) || AUTO_METHODS.indexOf(x.method)<0){ skip.push({b:b, why:"ยอด/วิธีจ่ายไม่อยู่ในกฎ"}); return; }
      rows.push({bill_date:d0, bill_no:no, customer:b.name||null, amount:r2(b.out), method:x.method, evidence:x.src||null, status:"approved", approved_role:AUTO_ROLE});
    });
    return {ok:true, why:"", rows:rows, skip:skip};
  }
  window.RevCut={ autoPick:autoPick, AUTO_ROLE:AUTO_ROLE, AUTO_FROM:AUTO_FROM, classify:classify, load:load, refundXfer:refundXfer, refundData:refundData, REFUND_FROM:REFUND_FROM, compute:compute, old:old, TH:TH, num:num, r2:r2, RETAIL_CUS:RETAIL_CUS };
})();
