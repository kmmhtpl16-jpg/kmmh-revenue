/* ============================================================
   credit.js — ส่วนเสริมโปรแกรมตรวจรายได้ กิจมั่งมีโฮม
   1) ปุ่มเลือกเดือน/ปี ในกล่องสถานะการส่งรายงาน (ดูย้อนหลังได้)
   2) การ์ด "บิลลงบัญชี (ลูกหนี้)" หน้าหลัก — อ่านอย่างเดียว:
      โชว์เฉพาะบิลลงบัญชีของวันที่เลือก + ยอดลูกหนี้ค้างรวม
      + ปุ่มเปิดทะเบียนลูกหนี้เต็ม (ลูกหนี้ลงบัญชี.html) จัดกลุ่มลูกค้า/รับชำระ
      + ดูดอัตโนมัติจากชีต "ลงบัญชี" ในไฟล์ฟอร์มที่อัป
   โหลดต่อท้าย index.html: <script src="credit.js"></script>
   ใช้ตัวแปร global เดิม: sb, XLSX, showDayDetail
   ============================================================ */
(function(){
  "use strict";

  /* ---------- helpers ---------- */
  function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];}); }
  function num(v){ if(v==null) return 0; var n=parseFloat(String(v).replace(/[, ]/g,"")); return isNaN(n)?0:n; }
  function fmt(n){ return (Math.round(num(n)*100)/100).toLocaleString("th-TH",{minimumFractionDigits:2,maximumFractionDigits:2}); }
  function beDate(s){ if(!s) return "—"; var p=String(s).slice(0,10).split("-"); if(p.length<3) return s; return p[2]+"/"+p[1]+"/"+(parseInt(p[0],10)+543); }
  function pad2(n){ return String(n).padStart(2,"0"); }
  function todayISO(){ var d=new Date(); return d.getFullYear()+"-"+pad2(d.getMonth()+1)+"-"+pad2(d.getDate()); }
  function normName(s){ return String(s||"").replace(/นางสาว|น\.ส\.|นาย|นาง|บริษัท|บจก\.|หจก\.|ร้าน|คุณ|จำกัด|\s|\+/g,""); }
  // Shopee ใช้ข้อมูลจากโปรแกรม Shopee (acc-billing) เป็นหลัก — ชีตลงบัญชีจึงเป็นแค่บันทึกช่วยจำ ไม่ดูดมาสร้างบิลลูกหนี้
  function isShopeeName(s){ var t=String(s||"").toLowerCase().replace(/\s/g,""); return t.indexOf("shop")>=0 || t.indexOf("ช้อป")>=0 || t.indexOf("ชอป")>=0 || t.indexOf("ช็อป")>=0; }
  var REGISTER_URL="ลูกหนี้ลงบัญชี.html";
  var OB_CACHE={};

  function sbReady(){ return (typeof sb!=="undefined" && sb); }

  /* แปลงค่าวันที่จาก cell เป็น ISO (รองรับ Date / serial Excel / string พ.ศ.-ค.ศ.) */
  function cellToISO(v){
    if(v==null||v==="") return null;
    if(v instanceof Date && !isNaN(v)){ var y=v.getFullYear(); if(y>2400)y-=543; return y+"-"+pad2(v.getMonth()+1)+"-"+pad2(v.getDate()); }
    if(typeof v==="number" && window.XLSX && XLSX.SSF){ var dc=XLSX.SSF.parse_date_code(v); if(dc){ var yy=dc.y; if(yy>2400)yy-=543; return yy+"-"+pad2(dc.m)+"-"+pad2(dc.d); } }
    var m=String(v).match(/(\d{1,4})[-\/](\d{1,2})[-\/](\d{1,4})/);
    if(m){
      var a=parseInt(m[1],10), b=parseInt(m[2],10), c=parseInt(m[3],10);
      if(a>31){ if(a>2400)a-=543; return a+"-"+pad2(b)+"-"+pad2(c); }
      var yr=c; if(yr<100) yr+= (yr>50?2400:2500);
      if(yr>2400) yr-=543;
      return yr+"-"+pad2(b)+"-"+pad2(a);
    }
    return null;
  }

  /* ============================================================
     ฟีเจอร์ 1 — ปุ่มเลือกเดือน/ปี + override loadMonthStatus
     ============================================================ */
  function injectMonthSel(){
    var card=document.getElementById("statusCard"); if(!card) return;
    if(document.getElementById("monthSel")) return;
    var h2=card.querySelector("h2"); if(!h2) return;
    var wrap=document.createElement("span");
    wrap.style.cssText="margin-left:10px;font-weight:400;font-size:13px";
    wrap.innerHTML=' <label style="color:#64748b">ดูเดือน:</label> <select id="monthSel" style="font-size:13px;padding:3px 8px;border-radius:6px;border:1px solid #cbd5e1;cursor:pointer"></select>';
    h2.appendChild(wrap);
    var sel=document.getElementById("monthSel");
    sel.addEventListener("change", function(){ window._selMonth=this.value; loadMonthStatus(); });
  }

  window.loadMonthStatus = async function(){
    injectMonthSel();
    var el=document.getElementById("monthStatus"), bd=document.getElementById("statusBadge");
    if(!el) return;
    if(!sbReady()){ el.innerHTML='<span style="color:#b91c1c">เชื่อม Supabase ไม่ได้</span>'; return; }
    var res=await Promise.all([
      sb.from("rev_audit").select("date,status,kplus_today,bank_dep_today"),
      sb.from("rev_daily").select("date,kplus_total,bank_dep_total")
    ]);
    var audit=res[0].data||[], daily=res[1].data||[];
    var months=[].concat(audit,daily).map(function(x){return String(x.date).slice(0,7);});
    months=months.filter(function(v,i,a){return a.indexOf(v)===i;});
    var cm=todayISO().slice(0,7); if(months.indexOf(cm)<0) months.push(cm);
    months.sort();
    var month=(window._selMonth && months.indexOf(window._selMonth)>=0)? window._selMonth : months[months.length-1];
    var sel=document.getElementById("monthSel");
    if(sel){
      sel.innerHTML=months.slice().reverse().map(function(m){
        var y=parseInt(m.slice(0,4),10)+543, mm=m.slice(5,7);
        return '<option value="'+m+'"'+(m===month?" selected":"")+'>'+mm+"/"+y+"</option>";
      }).join("");
    }
    var inM=function(s){ return String(s).slice(0,7)===month; };
    var aMap={}; audit.forEach(function(x){ if(inM(x.date)) aMap[x.date]=x; });
    var dMap={}; daily.forEach(function(x){ dMap[x.date]=x; });
    var days=[].concat(audit,daily).filter(function(x){return inM(x.date);}).map(function(x){return x.date;});
    days=days.filter(function(v,i,a){return a.indexOf(v)===i;}).sort();
    var done=0, holiday=0;
    var chips=days.map(function(dt){
      var a=aMap[dt]; var dl=dMap[dt]||{}; var bg,col,ic;
      if(a && a.status==="วันหยุด"){ bg="#dbeafe";col="#1d4ed8";ic="🏖️";holiday++; }
      else if(a){
        var full=(a.kplus_today!=null||dl.kplus_total!=null)&&(a.bank_dep_today!=null||dl.bank_dep_total!=null);
        if(full){ bg="#dcfce7";col="#15803d";ic="✓";done++; } else { bg="#fef3c7";col="#b45309";ic="⚠"; }
      }
      else { bg="#f1f5f9";col="#64748b";ic="⏳"; }
      return '<span style="display:inline-block;margin:3px 5px 0 0;padding:3px 9px;border-radius:6px;font-size:12.5px;cursor:pointer;background:'+bg+';color:'+col+'" onclick="showDayDetail(\''+dt+'\')">'+ic+" "+beDate(dt)+"</span>";
    }).join("");
    if(bd) bd.textContent=month.split("-")[1]+"/"+(parseInt(month.split("-")[0],10)+543)+" · ยืนยันแล้ว "+done+"/"+(days.length-holiday)+(holiday?" · วันหยุด "+holiday:"");
    el.innerHTML=days.length? chips : '<div class="muted">ยังไม่มีข้อมูลเดือนนี้</div>';
  };

  /* ============================================================
     ฟีเจอร์ 2 — การ์ดบิลลงบัญชี (อ่านอย่างเดียว) + ลิงก์ไปทะเบียนเต็ม
     ============================================================ */
  function injectCreditCard(){
    if(document.getElementById("creditcard")) return;
    var card=document.createElement("div");
    card.className="card"; card.id="creditcard";
    card.innerHTML=[
      '<h2>📒 บิลลงบัญชี (ลูกหนี้ค้างชำระ) <span class="badge info" id="creditcount">…</span></h2>',
      '<div class="rowflex" style="align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap">',
        '<span class="muted" style="font-size:13px" id="cb_daylabel">📅 บิลลงบัญชีของวันที่เปิดดู</span>',
        '<a class="btn" href="'+REGISTER_URL+'" style="margin-left:auto;text-decoration:none">📒 ทะเบียนลูกหนี้ / ใบวางบิล →</a>',
      '</div>',
      '<div class="muted" style="margin-bottom:8px;font-size:12px">แสดงเฉพาะบิลลงบัญชีของ<b>วันที่กำลังเปิดดูด้านบน</b> (อ่านอย่างเดียว) · เลือกวันอื่น/จัดการ/รับชำระ ที่ทะเบียนลูกหนี้เต็ม · ดูดอัตโนมัติจากชีต “ลงบัญชี” เมื่ออัปไฟล์ฟอร์ม</div>',
      '<div id="creditmsg" class="muted" style="margin-bottom:8px"></div>',
      '<div id="creditlist" class="muted">กำลังโหลด…</div>'
    ].join("");
    var dep=document.getElementById("depcard");
    if(dep && dep.parentNode){ dep.parentNode.insertBefore(card, dep); }
    else { var out=document.getElementById("out"); (out&&out.parentNode?out.parentNode:document.body).appendChild(card); }
    // การ์ดนี้ตามวันที่เปิดดู (window._openDay/_creditDay) อัตโนมัติ — ไม่มีช่องเลือกวันแล้ว
  }

  window.loadCreditBills = async function(){
    injectCreditCard();
    var list=document.getElementById("creditlist"), cnt=document.getElementById("creditcount");
    if(!list) return;
    if(!sbReady()){ list.innerHTML='<span style="color:#b91c1c">เชื่อม Supabase ไม่ได้</span>'; return; }
    list.textContent="กำลังโหลด…";
    var viewDate=(window._creditDay||window._openDay||todayISO());
    var lbl=document.getElementById("cb_daylabel"); if(lbl) lbl.innerHTML='📅 บิลลงบัญชี/จ่ายหนี้ ของวันที่ <b>'+beDate(viewDate)+'</b>';
    // badge: ยอดลูกหนี้ค้างรวม (ปัจจุบัน)
    var allR=await sb.from("rev_credit_bills").select("total_amount,paid_amount,status").neq("status","paid");
    if(cnt){ if(allR.error){ cnt.textContent="—"; } else{ var out=(allR.data||[]); var totRemain=out.reduce(function(s,b){return s+(num(b.total_amount)-num(b.paid_amount));},0); cnt.textContent=out.length+" บิลค้าง · เหลือ "+fmt(totRemain)+" บาท"; } }
    // A) บิลลงบัญชีใหม่ของวัน (หนี้ที่เกิดวันนี้) — จ่ายแล้ว/คงเหลือ คิด "ณ วันนั้น" (เฉพาะจ่ายที่ pay_date <= วันนั้น)
    var r=await sb.from("rev_credit_bills").select("*,rev_credit_payments(pay_date,amount)").eq("bill_date",viewDate).order("bill_no",{ascending:true});
    if(r.error){ list.innerHTML='<span style="color:#b91c1c">โหลดไม่ได้: '+esc(r.error.message)+"</span>"; return; }
    var data=r.data||[];
    var htmlA="";
    if(data.length){
      var dayTot=0, dayRem=0;
      var rows=data.map(function(b){
        var tot=num(b.total_amount);
        var paidAsOf=(b.rev_credit_payments||[]).reduce(function(s,p){ return s+((String(p.pay_date).slice(0,10)<=viewDate)?num(p.amount):0); },0);
        paidAsOf=Math.round(paidAsOf*100)/100;
        var rem=Math.round((tot-paidAsOf)*100)/100;
        dayTot+=tot; dayRem+=rem;
        var stColor= rem<=0.01?"#15803d":(paidAsOf>0.01?"#b45309":"#64748b");
        var stText= rem<=0.01?"✓ ครบแล้ว":(paidAsOf>0.01?"◑ จ่ายบางส่วน":"● ยังไม่จ่าย");
        return '<tr>'+
          '<td>'+esc(b.bill_no||"—")+'</td>'+
          '<td>'+esc(b.customer)+(b.customer_code?' <span class="badge info" style="font-size:10px">'+esc(b.customer_code)+'</span>':"")+'</td>'+
          '<td style="text-align:right">'+fmt(tot)+'</td>'+
          '<td style="text-align:right;color:#15803d">'+fmt(paidAsOf)+'</td>'+
          '<td style="text-align:right;font-weight:600;color:'+(rem>0.01?"#b91c1c":"#15803d")+'">'+fmt(rem)+'</td>'+
          '<td style="text-align:center;color:'+stColor+';font-size:12px">'+stText+'</td>'+
        '</tr>';
      }).join("");
      htmlA='<div style="font-weight:700;font-size:13px;margin-bottom:4px">🧾 บิลลงบัญชีใหม่วันนี้ (หนี้ที่เกิดวันนี้)</div>'+
        '<table><thead><tr><th>เลขบิล</th><th>ลูกค้า</th><th>ยอดบิล</th><th>จ่ายแล้ว(ถึงวันนี้)</th><th>คงเหลือ</th><th>สถานะ</th></tr></thead><tbody>'+rows+
        '<tr class="tot"><td colspan="2">รวมบิลใหม่ '+data.length+' บิล</td><td style="text-align:right">'+fmt(dayTot)+'</td><td></td><td style="text-align:right;color:#b91c1c">'+fmt(dayRem)+'</td><td></td></tr>'+
        '</tbody></table>';
    }
    if(!data.length){
      list.innerHTML='<div class="muted">ไม่มีบิลลงบัญชีของวันที่ '+beDate(viewDate)+' · <a href="'+REGISTER_URL+'" style="color:#15803d">เปิดทะเบียนเต็มเพื่อดูลูกหนี้ทั้งหมด →</a></div>';
      return;
    }
    list.innerHTML=htmlA;
  };

  /* ---------- จับคู่เลขบิลจากไฟล์เครื่อง (credit.js อ่านเอง _creditPos, สำรอง DATA.pos ของ index) ---------- */
  var _lastFormDate=null;
  // อ่านไฟล์เครื่อง (รายลูกค้า แบบมี "วันที่ขาย") เป็น billCust/billTotal เอง — ไม่ต้องพึ่งจังหวะ index.html
  function parsePosCredit(wb){
    try{
      var X=window.XLSX; if(!X) return null;
      var ws=wb.Sheets[wb.SheetNames[0]]; if(!ws) return null;
      var R=X.utils.sheet_to_json(ws,{header:1,raw:true,defval:null});
      var isB=R.some(function(r){ return r && r.some(function(c){ return String(c==null?"":c).trim()==="วันที่ขาย"; }); });
      if(!isB) return null;
      var billCust={}, billTotal={}, last=null, dateISO=null, custRe=/^\d{2,4}-\d{5}$/;
      for(var i=0;i<R.length;i++){ var r=R[i]||[];
        var c0=String(r[0]==null?"":r[0]).trim(), c1=String(r[1]==null?"":r[1]).trim(), c2=String(r[2]==null?"":r[2]).trim();
        if(custRe.test(c1) && !c0){ last=c2; }
        else if(/^KM/i.test(c0)){ billTotal[c0]=(billTotal[c0]||0)+num(r[4]); billCust[c0]=last||""; if(!dateISO) dateISO=cellToISO(r[1]); }
      }
      return {billCust:billCust, billTotal:billTotal, date:dateISO};
    }catch(e){ return null; }
  }
  function _machinePos(){
    if(window._creditPos && window._creditPos.billTotal) return window._creditPos;
    if(window.DATA && window.DATA.pos && window.DATA.pos.billTotal) return window.DATA.pos;
    return null;
  }
  function matchBillNo(cust, amt){
    try{
      var P=_machinePos(); if(!P) return null;
      var bc=P.billCust, bt=P.billTotal, nn=normName(cust); if(!nn) return null;
      // 1) ชื่อใกล้กัน + ยอดตรง(±1)
      var cand=[]; for(var b in bt){ if(Math.abs(num(bt[b])-num(amt))<=1){ var bn=normName(bc[b]||""); if(bn && (nn.indexOf(bn)>=0 || bn.indexOf(nn)>=0)) cand.push(b); } }
      if(cand.length){ cand.sort(); return cand[0]; }
      // 2) ยอดตรงและมีบิลเดียวในไฟล์เครื่องที่ยอดนี้
      var only=[]; for(var b2 in bt){ if(Math.abs(num(bt[b2])-num(amt))<=1) only.push(b2); }
      if(only.length===1) return only[0];
      // 3) ชื่อลูกค้ามีบิลเดียวในไฟล์เครื่อง (ยอดต่างได้ เช่น หักมัดจำ) → ใช้บิลนั้น
      var byName=[]; for(var b3 in bt){ var bn3=normName(bc[b3]||""); if(bn3 && (nn.indexOf(bn3)>=0 || bn3.indexOf(nn)>=0)) byName.push(b3); }
      if(byName.length===1) return byName[0];
      return null;
    }catch(e){ return null; }
  }
  // เติมเลขบิลให้บิลลงบัญชี (สมาชิก) ที่ยังว่างของวันนั้น โดยจับคู่กับไฟล์เครื่องที่โหลดอยู่
  window.__creditFillBills=async function(dateISO){
    try{
      if(!sbReady() || !dateISO || !_machinePos()) return 0;
      var r=await sb.from("rev_credit_bills").select("id,customer,total_amount").eq("bill_date",dateISO).is("bill_no",null).eq("source","auto-form");
      var rows=(r.data||[]), n=0;
      for(var i=0;i<rows.length;i++){
        var bn=matchBillNo(rows[i].customer, rows[i].total_amount);
        if(bn){ var u=await sb.from("rev_credit_bills").update({bill_no:bn}).eq("id",rows[i].id); if(!u.error) n++; }
      }
      if(n>0) loadCreditBills();
      return n;
    }catch(e){ return 0; }
  };

  function parseOldBills(wb){
    var X=window.XLSX; if(!X) return [];
    var sn=wb.SheetNames.filter(function(n){return String(n).replace(/\s/g,"")==="บิลเก่า";})[0];
    if(!sn) return [];
    var rows=X.utils.sheet_to_json(wb.Sheets[sn],{header:1,raw:true,defval:null});
    var entries=[], method=null;
    for(var i=0;i<rows.length;i++){
      var r=rows[i]||[];
      var c0=(r[0]!=null?String(r[0]).trim():""), c1=(r[1]!=null?String(r[1]).trim():""), c4=(r[4]!=null?String(r[4]).trim():"");
      if(c0==="เงินสด"){ method="เงินสด"; continue; }
      if(c0==="โอนเข้าบัญชี"){ method="โอนกสิกร"; continue; }
      if(c0==="ลำดับ"||c0==="บิลเก่า"){ continue; }
      if(!method) continue;
      if(c1 && c1!=="ยอดรวม" && /^KM/i.test(c1) && num(r[2])>0) entries.push({bill_no:c1, amount:num(r[2]), method:method});
      if(c4 && c4!=="ยอดรวม" && num(r[5])>0) entries.push({customer:c4, amount:num(r[5]), method:method});
    }
    return entries;
  }
  async function recomputeBillCredit(id){
    var r=await sb.from("rev_credit_payments").select("amount").eq("bill_id",id);
    var paid=(r.data||[]).reduce(function(s,p){return s+num(p.amount);},0);
    var b=await sb.from("rev_credit_bills").select("total_amount").eq("id",id).single();
    var tot=num(b.data&&b.data.total_amount);
    var status= paid>=tot-0.01?"paid":(paid>0.01?"partial":"open");
    await sb.from("rev_credit_bills").update({paid_amount:Math.round(paid*100)/100, status:status}).eq("id",id);
  }
  /* ---------- ตัดหนี้เก่า: ชีต "บิลเก่า" = "ข้อเสนอ" เท่านั้น — ไม่ตัดเอง ต้องมีคนกดยืนยัน ----------
     เหตุผล: ถ้าตัดบิลโดยไม่มีเงินจริงผูกอยู่ จะเกิดสภาพ "บิลจ่ายแล้ว แต่เงินยังรอจับคู่"
     ซึ่งขัดกันเอง และทำให้เกิดการตัดซ้ำ/ตัดผิดบิลตามมา (เคส 15 ก.ค.69)                         */
  function obKey(formDate, e, i){
    return String(formDate||"")+"#"+String(e.method||"")+"#"+normName(e.customer||e.bill_no||"")+"#"+num(e.amount)+"#"+i;
  }
  /* หาบิลที่เงินก้อนนี้น่าจะปิด — คิดสดทุกครั้ง ไม่ใช้ของเก่าที่เก็บไว้ (บิลอาจถูกจ่าย/แก้ชื่อไปแล้ว) */
  async function obPlan(pr){
    var r=await sb.from("rev_credit_bills").select("id,bill_no,customer,total_amount,paid_amount,bill_date").neq("status","paid").order("bill_date",{ascending:true});
    var bills=(r.data||[]).map(function(b){ b._paid=num(b.paid_amount); return b; });
    var cand;
    if(pr.bill_no){ cand=bills.filter(function(b){ return String(b.bill_no||"").trim()===String(pr.bill_no).trim(); }); }
    else { var nn=normName(pr.customer); cand=bills.filter(function(b){ var bn=normName(b.customer); return nn && bn && (nn.indexOf(bn)>=0||bn.indexOf(nn)>=0); }); }
    var left=num(pr.amount), allocs=[];
    for(var i=0;i<cand.length && left>0.005;i++){
      var rem=Math.round((num(cand[i].total_amount)-cand[i]._paid)*100)/100;
      if(rem<=0.005) continue;
      var give=Math.round(Math.min(rem,left)*100)/100;
      allocs.push({bill_id:cand[i].id, bill_no:cand[i].bill_no, customer:cand[i].customer, bill_date:cand[i].bill_date, give:give});
      cand[i]._paid+=give; left=Math.round((left-give)*100)/100;
    }
    return {allocs:allocs, leftover:Math.round(left*100)/100};
  }
  /* หาเงินจริงในสเตทเมนต์ที่ตรงกับข้อเสนอนี้ (ยอด+ช่องทาง ตรง และยังไม่ถูกจับคู่) */
  async function obMoney(pr){
    if(pr.method==="เงินสด") return {kind:"cash"};
    var r=await sb.from("rev_pending").select("id,date,amount,source,from_name,status").eq("status","open");
    var c=(r.data||[]).filter(function(x){ return Math.abs(num(x.amount)-num(pr.amount))<0.01 && String(x.source||"")===String(pr.method||""); });
    if(c.length>1){ var same=c.filter(function(x){ return String(x.date).slice(0,10)===String(pr.form_date).slice(0,10); }); if(same.length) c=same; }
    if(!c.length) return {kind:"none"};
    if(c.length>1) return {kind:"many", list:c};
    return {kind:"one", p:c[0]};
  }

  window.__creditOldBills=async function(wb, formDate){
    try{
      if(!sbReady()) return;
      var entries=parseOldBills(wb); if(!entries.length) return;
      var rows=entries.map(function(e,i){
        return { source_key:obKey(formDate,e,i), form_date:formDate||todayISO(),
                 customer:e.customer||null, bill_no:e.bill_no||null,
                 amount:num(e.amount), method:e.method, plan:[], leftover:0, status:"pending" };
      });
      /* upsert กันซ้ำ: อัปฟอร์มไฟล์เดิมซ้ำ จะไม่เกิดข้อเสนอซ้ำ */
      var ins=await sb.from("rev_oldbill_proposals").upsert(rows,{onConflict:"source_key",ignoreDuplicates:true});
      var msg=document.getElementById("creditmsg");
      if(ins.error){ if(msg) msg.innerHTML+='<div style="color:#b91c1c">บันทึกข้อเสนอตัดยอดไม่สำเร็จ: '+esc(ins.error.message)+'</div>'; return; }
      if(msg) msg.innerHTML+='<div style="color:#92400e">📋 พบจ่ายหนี้เก่าในชีต “บิลเก่า” '+entries.length+' รายการ — บันทึกเป็น<b>ข้อเสนอรอยืนยัน</b>แล้ว (ยังไม่ตัดยอด) ดูที่การ์ด “รอยืนยันตัดยอด” ด้านล่าง</div>';
      loadOldBillProposals();
      loadCreditBills();
    }catch(err){ console.warn("oldbills",err); }
  };

  /* ============================================================
     การ์ด "รอยืนยันตัดยอด (จากชีตบิลเก่า)"
     ============================================================ */
  function injectObCard(){
    if(document.getElementById("obcard")) return;
    var card=document.createElement("div");
    card.className="card"; card.id="obcard"; card.style.display="none";
    card.innerHTML=[
      '<h2>📋 รอยืนยันตัดยอด (จากชีตบิลเก่า) <span class="badge" id="obcount" style="background:#fef3c7;color:#92400e">…</span></h2>',
      '<div class="muted" style="margin-bottom:8px;font-size:12px">ชีต “บิลเก่า” จะ<b>ไม่ตัดยอดเอง</b> — เสนอมาให้ตรวจก่อน แล้วคนกดยืนยัน · ฝั่ง<b>โอน</b>ต้องเจอเงินเข้าจริงในสเตทเมนต์ก่อนถึงจะยืนยันได้ (กันบิลปิดโดยไม่มีเงิน) · <b>เงินสด</b>ยืนยันได้เลย</div>',
      '<div id="oblist" class="muted">กำลังโหลด…</div>'
    ].join("");
    var cc=document.getElementById("creditcard");
    if(cc && cc.parentNode){ cc.parentNode.insertBefore(card, cc); }
    else { var out=document.getElementById("out"); (out&&out.parentNode?out.parentNode:document.body).appendChild(card); }
  }

  window.loadOldBillProposals=async function(){
    injectObCard();
    var box=document.getElementById("oblist"), cnt=document.getElementById("obcount"), card=document.getElementById("obcard");
    if(!box||!sbReady()) return;
    var r=await sb.from("rev_oldbill_proposals").select("*").eq("status","pending").order("form_date",{ascending:true});
    if(r.error){ box.innerHTML='<span style="color:#b91c1c">โหลดไม่ได้: '+esc(r.error.message)+'</span>'; card.style.display=""; return; }
    var P=(r.data||[]);
    if(!P.length){ card.style.display="none"; return; }
    card.style.display=""; if(cnt) cnt.textContent=P.length+" รายการ";
    OB_CACHE={};
    var out=[];
    for(var i=0;i<P.length;i++){
      var pr=P[i];
      var pl=await obPlan(pr), mo=await obMoney(pr);
      OB_CACHE[pr.id]={pr:pr, pl:pl, mo:mo};
      var who=esc(pr.customer||pr.bill_no||"—");
      var billTxt=pl.allocs.length? pl.allocs.map(function(a){ return esc(a.bill_no||("บิล "+beDate(a.bill_date)))+" "+fmt(a.give); }).join(" + ")
                                  : '<span style="color:#b91c1c">ไม่พบบิลค้างของลูกค้ารายนี้</span>';
      var st, ok=false;
      if(mo.kind==="cash"){ st='<span style="color:#166534">💵 เงินสด — ไม่ต้องรอสเตทเมนต์</span>'; ok=true; }
      else if(mo.kind==="one"){ st='<span style="color:#166534">🟢 พบเงินเข้า '+beDate(mo.p.date)+' '+fmt(mo.p.amount)+' ('+esc(mo.p.source||"")+')<br><span class="muted" style="font-size:11px">'+esc(mo.p.from_name||"")+'</span></span>'; ok=true; }
      else if(mo.kind==="many"){ st='<span style="color:#92400e">🟡 พบเงินเข้ายอดตรงกัน '+mo.list.length+' รายการ — ระบบเลือกให้ไม่ได้<br><span class="muted" style="font-size:11px">จับคู่เองที่กล่อง “ยอดเงินรอจับคู่”</span></span>'; }
      else { st='<span style="color:#b91c1c">🔴 ยังไม่พบเงินเข้าในสเตทเมนต์<br><span class="muted" style="font-size:11px">อัปสเตทเมนต์ของวันนั้นก่อน หรือเงินอาจเข้าบัญชีอื่น</span></span>'; }
      if(!pl.allocs.length) ok=false;
      out.push('<tr><td>'+beDate(pr.form_date)+'</td><td><b>'+who+'</b></td><td class="num" style="font-weight:600">'+fmt(pr.amount)+'</td><td>'+esc(pr.method)+'</td>'+
        '<td>'+billTxt+(pl.leftover>0.005?'<br><span style="color:#b91c1c;font-size:11px">เหลือ '+fmt(pl.leftover)+' ไม่พบบิล</span>':"")+'</td>'+
        '<td>'+st+'</td>'+
        '<td style="white-space:nowrap">'+
          (ok?'<button class="btn" style="padding:3px 9px" onclick="__obConfirm(\''+pr.id+'\')">✓ ยืนยันตัดยอด</button>'
             :'<button class="btn sec" style="padding:3px 9px" disabled title="ยืนยันไม่ได้จนกว่าจะเจอเงินเข้าจริง + มีบิลค้างให้ตัด">✓ ยืนยันตัดยอด</button>')+
          ' <button class="btn sec" style="padding:3px 7px;color:#b91c1c" onclick="__obReject(\''+pr.id+'\')">ไม่ใช่</button>'+
        '</td></tr>');
    }
    box.innerHTML='<table><thead><tr><th>วันที่รับ</th><th>ลูกค้า</th><th class="num">ยอดจ่าย</th><th>วิธี</th><th>จะตัดบิล</th><th>เงินจริง</th><th></th></tr></thead><tbody>'+out.join("")+'</tbody></table>';
  };

  window.__obConfirm=async function(id){
    var C=OB_CACHE[id]; if(!C){ alert("ไม่พบข้อเสนอ"); return; }
    var pr=C.pr;
    /* คิดใหม่สดๆ ตอนกดยืนยัน — กันกรณีมีคนตัดบิลไปแล้วระหว่างนี้ */
    var pl=await obPlan(pr), mo=await obMoney(pr);
    if(!pl.allocs.length){ alert("ตอนนี้ไม่พบบิลค้างของลูกค้ารายนี้แล้ว (อาจถูกตัดไปแล้ว) — กด “ไม่ใช่” ทิ้งได้ค่ะ"); loadOldBillProposals(); return; }
    if(mo.kind==="none"||mo.kind==="many"){ alert("ยังยืนยันไม่ได้ — ต้องเจอเงินเข้าจริงในสเตทเมนต์ 1 รายการที่ตรงกันก่อน"); loadOldBillProposals(); return; }
    var bl=pl.allocs.map(function(a){ return "• "+(a.bill_no||beDate(a.bill_date))+" ("+(a.customer||"")+") ตัด "+fmt(a.give); }).join("\n");
    var moTxt=(mo.kind==="cash")?"เงินสด (ไม่มีในสเตทเมนต์)":("เงินเข้า "+beDate(mo.p.date)+" "+fmt(mo.p.amount)+" · "+(mo.p.from_name||""));
    if(!confirm("ยืนยันตัดยอดจากชีตบิลเก่า?\n\nลูกค้า: "+(pr.customer||pr.bill_no||"")+"\nยอดจ่าย: "+fmt(pr.amount)+" ("+pr.method+")\nเงินจริง: "+moTxt+"\n\nจะตัดบิล:\n"+bl+(pl.leftover>0.005?("\n\n⚠️ เหลือ "+fmt(pl.leftover)+" ไม่พบบิลให้ตัด"):"")+"\n\nกดตกลง = ตัดยอดบิล + ปิดรายการเงินรอจับคู่ พร้อมกัน")) return;
    var by=prompt("ผู้ยืนยัน (ชื่อคุณ):",""); if(by===null) return; by=(by||"").trim();
    var batch="OB"+String(new Date().getFullYear()+543).slice(2)+pad2(new Date().getMonth()+1)+pad2(new Date().getDate())+"-"+Math.random().toString(36).slice(2,6).toUpperCase();
    var payments=pl.allocs.map(function(a){
      return {bill_id:a.bill_id, pay_date:pr.form_date, amount:a.give, method:pr.method,
              ref:"จ่ายหนี้เก่า (ชีตบิลเก่า · ยืนยันโดยคน)", batch_ref:batch, confirmed_by:by||null};
    });
    var ins=await sb.from("rev_credit_payments").insert(payments);
    if(ins.error){ alert("ตัดยอดไม่สำเร็จ: "+ins.error.message); return; }
    var ids={}; payments.forEach(function(p){ ids[p.bill_id]=1; });
    for(var k in ids){ await recomputeBillCredit(k); }
    /* ปิดเงินรอจับคู่ก้อนเดียวกัน — ผูก batch เดียวกับการตัดยอด */
    var pid=null;
    if(mo.kind==="one"){
      pid=mo.p.id;
      var upd=await sb.from("rev_pending").update({
        status:"matched",
        matched_bill_no:pl.allocs.map(function(a){return a.bill_no;}).filter(Boolean).join(", ")||null,
        matched_date:todayISO(), confirmed_by:by||null, match_batch:batch
      }).eq("id",pid).eq("status","open");
      if(upd.error) console.warn("close pending",upd.error);
    }
    await sb.from("rev_oldbill_proposals").update({
      status:"confirmed", batch_ref:batch, pending_id:pid, confirmed_by:by||null,
      confirmed_at:new Date().toISOString(), plan:pl.allocs, leftover:pl.leftover
    }).eq("id",id);
    alert("ตัดยอดแล้ว "+payments.length+" บิล ("+fmt(payments.reduce(function(s,p){return s+p.amount;},0))+" บาท)"+(pid?"\n✓ ปิดรายการเงินรอจับคู่ให้ด้วยแล้ว":""));
    loadOldBillProposals(); loadCreditBills();
    if(window.loadPending) loadPending();
    if(window._openDay && window.renderDay) renderDay(window._openDay,false);
  };
  window.__obReject=async function(id){
    var C=OB_CACHE[id]; if(!C) return;
    var pr=C.pr;
    if(!confirm("ทิ้งข้อเสนอนี้?\n\n"+(pr.customer||pr.bill_no||"")+" "+fmt(pr.amount)+" ("+pr.method+")\n\nจะไม่ตัดยอดบิลใดๆ และข้อเสนอนี้จะหายจากรายการ")) return;
    var why=prompt("เหตุผล (เว้นว่างได้):","")||"";
    var by=prompt("ผู้ทิ้ง (ชื่อคุณ):","")||"";
    var u=await sb.from("rev_oldbill_proposals").update({status:"rejected", reject_reason:why.trim()||null, confirmed_by:by.trim()||null, confirmed_at:new Date().toISOString()}).eq("id",id);
    if(u.error){ alert("ทิ้งไม่สำเร็จ: "+u.error.message); return; }
    loadOldBillProposals();
  };

  /* ---------- ดูดบิลลงบัญชีอัตโนมัติจากไฟล์ฟอร์ม ---------- */
  function parseCreditSheet(wb, overrideDate){
    var X=window.XLSX; if(!X) return {date:null, entries:[]};
    var sn=wb.SheetNames.filter(function(n){return String(n).replace(/\s/g,"")==="ลงบัญชี";})[0];
    if(!sn) return {date:null, entries:[]};
    var ws=wb.Sheets[sn];
    var rows=X.utils.sheet_to_json(ws,{header:1,raw:true,defval:null});
    var dateISO=overrideDate||null;   // ปกติส่ง null มา → อ่านวันที่จาก serial ในไฟล์ผ่าน SSF (ไม่เพี้ยน timezone)
    if(!dateISO && rows[0]) dateISO=cellToISO(rows[0][5]);
    if(!dateISO){
      var ssn=wb.SheetNames.filter(function(n){return String(n).indexOf("สรุปรายรับ")>=0;})[0];
      if(ssn){ var sr=X.utils.sheet_to_json(wb.Sheets[ssn],{header:1,raw:true,defval:null}); if(sr[0]) dateISO=cellToISO(sr[0][3])||cellToISO(sr[0][1]); }
    }
    var entries=[], seq={};
    for(var i=2;i<rows.length;i++){
      var r=rows[i]||[];
      var billno=r[1], amtL=r[2], name=r[4], amtR=r[5];
      if((billno!=null && String(billno).trim()!=="" && String(billno).trim()!=="ยอดรวม") && num(amtL)>0){
        var k1=(dateISO||"")+"#B#"+String(billno).trim()+"#"+num(amtL);
        entries.push({source_key:k1, bill_no:String(billno).trim(), customer:String(billno).trim(), amount:num(amtL)});
      }
      if(name!=null && String(name).trim()!=="" && String(name).trim()!=="ยอดรวม" && num(amtR)>0){
        var nm=String(name).trim();
        if(isShopeeName(nm)) continue;   // ⛔ ข้าม SHOPEE — สร้าง/ตัดหนี้จากโปรแกรม Shopee แทน
        var base=(dateISO||"")+"#"+normName(nm)+"#"+num(amtR);
        seq[base]=(seq[base]||0)+1;
        entries.push({source_key:base+"#"+seq[base], bill_no:null, customer:nm, amount:num(amtR)});
      }
    }
    return {date:dateISO, entries:entries};
  }

  window.__creditAutoPull=async function(file){
    try{
      if(!sbReady() || !window.XLSX) return;
      var buf=await file.arrayBuffer();
      // อ่านแบบ serial (ไม่ใช้ cellDates) เพื่อให้ cellToISO ใช้ SSF อ่านวันที่ตรงตามหน้า Excel ไม่เพี้ยน timezone
      var wb=XLSX.read(new Uint8Array(buf),{type:"array"});
      // ให้ parseCreditSheet อ่านวันที่จาก serial ในไฟล์เอง (แม่นกว่า DATA.form.date ที่แปลงผ่าน Date แล้วเพี้ยน)
      var parsed=parseCreditSheet(wb, null);
      var msg=document.getElementById("creditmsg");
      if(!parsed.entries.length){ if(msg) msg.textContent=""; return; }
      var payload=parsed.entries.map(function(e){
        return {source_key:e.source_key, bill_no:e.bill_no, customer:e.customer, bill_date:parsed.date||todayISO(),
                total_amount:e.amount, source:"auto-form", note:"ดูดจากชีตลงบัญชี"};
      });
      var r=await sb.from("rev_credit_bills").upsert(payload,{onConflict:"source_key",ignoreDuplicates:true});
      if(r.error){ if(msg){ msg.innerHTML='<span style="color:#b91c1c">ดูดบิลลงบัญชีไม่สำเร็จ: '+esc(r.error.message)+"</span>"; } return; }
      // เลื่อนวันที่การ์ดไปยังวันของฟอร์มที่เพิ่งอัป เพื่อให้เห็นบิลที่ดูดเข้ามา
      if(parsed.date){ window._creditDay=parsed.date; _lastFormDate=parsed.date; }
      var nfill=await window.__creditFillBills(parsed.date);
      if(msg) msg.innerHTML='<span style="color:#15803d">✓ ดูดบิลลงบัญชีจากฟอร์ม '+parsed.entries.length+' รายการ ('+beDate(parsed.date)+') เข้าทะเบียนแล้ว'+(nfill>0?' · จับคู่เลขบิลจากไฟล์เครื่อง '+nfill+' รายการ':(window.DATA&&window.DATA.pos?'':' · (อัปไฟล์เครื่องด้วยเพื่อจับเลขบิล)'))+' · <a href="'+REGISTER_URL+'" style="color:#15803d">เปิดทะเบียนเต็ม →</a></span>';
      loadCreditBills();
      try{ await window.__creditOldBills(wb, parsed.date); }catch(e){}
    }catch(err){ var m=document.getElementById("creditmsg"); if(m) m.innerHTML='<span style="color:#b91c1c">อ่านไฟล์ฟอร์มไม่ได้: '+esc(err.message)+"</span>"; }
  };

  function hookFormInput(){
    var fi=document.getElementById("f_form");
    if(fi && !fi.__creditHooked){
      fi.__creditHooked=true;
      fi.addEventListener("change", function(e){
        var f=e.target.files && e.target.files[0];
        if(f) setTimeout(function(){ window.__creditAutoPull(f); }, 300);
      });
    }
  }
  function hookPosInput(){
    var fp=document.getElementById("f_pos");
    if(fp && !fp.__creditPosHooked){
      fp.__creditPosHooked=true;
      fp.addEventListener("change", function(e){
        var f=e.target.files && e.target.files[0]; if(!f) return;
        setTimeout(async function(){
          try{ if(window.XLSX){ var buf=await f.arrayBuffer(); var wb=XLSX.read(new Uint8Array(buf),{type:"array"}); var pp=parsePosCredit(wb); if(pp) window._creditPos=pp; } }catch(err){ console.warn("creditPos parse",err); }
          var d=_lastFormDate||window._creditDay||(window._creditPos&&window._creditPos.date);
          if(d) window.__creditFillBills(d);
        }, 200);
      });
    }
  }

  /* ---------- init ---------- */
  function wrapShowDay(){
    if(typeof window.showDayDetail==="function" && !window.showDayDetail.__creditWrapped){
      var _orig=window.showDayDetail;
      window.showDayDetail=function(d){ if(d) window._creditDay=d; var res=_orig.apply(this,arguments); try{ if(window.loadCreditBills) loadCreditBills(); }catch(e){} return res; };
      window.showDayDetail.__creditWrapped=true;
    }
  }
  function init(){
    injectMonthSel();
    injectObCard();
    injectCreditCard();
    hookFormInput();
    hookPosInput();
    wrapShowDay();
    if(typeof loadMonthStatus==="function") loadMonthStatus();
    loadCreditBills();
    loadOldBillProposals();
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
