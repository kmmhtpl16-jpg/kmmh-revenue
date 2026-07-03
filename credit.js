/* ============================================================
   credit.js — ส่วนเสริมโปรแกรมตรวจรายได้ กิจมั่งมีโฮม
   1) ปุ่มเลือกเดือน/ปี ในกล่องสถานะการส่งรายงาน (ดูย้อนหลังได้)
   2) ทะเบียนบิลลงบัญชี (ลูกหนี้) — ลูกค้าเอาของไปก่อน จ่ายทีหลัง/หลายครั้ง
      - ดูดอัตโนมัติจากชีต "ลงบัญชี" ในไฟล์ฟอร์มที่อัป
      - บันทึกการจ่ายได้หลายครั้งต่อบิล จนครบ
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
  function daysBetween(iso){ if(!iso) return 0; var a=new Date(iso+"T00:00:00"), b=new Date(); return Math.max(0, Math.floor((b-a)/86400000)); }
  var METHODS=["เงินสด","โอน K+","โอนกสิกร","อื่นๆ/เช็ค"];

  function sbReady(){ return (typeof sb!=="undefined" && sb); }

  /* แปลงค่าวันที่จาก cell เป็น ISO (รองรับ Date / serial Excel / string พ.ศ.-ค.ศ.) */
  function cellToISO(v){
    if(v==null||v==="") return null;
    if(v instanceof Date && !isNaN(v)){ var y=v.getFullYear(); if(y>2400)y-=543; return y+"-"+pad2(v.getMonth()+1)+"-"+pad2(v.getDate()); }
    if(typeof v==="number" && window.XLSX && XLSX.SSF){ var dc=XLSX.SSF.parse_date_code(v); if(dc){ var yy=dc.y; if(yy>2400)yy-=543; return yy+"-"+pad2(dc.m)+"-"+pad2(dc.d); } }
    var m=String(v).match(/(\d{1,4})[-\/](\d{1,2})[-\/](\d{1,4})/);
    if(m){
      var a=parseInt(m[1],10), b=parseInt(m[2],10), c=parseInt(m[3],10);
      // เดา: ถ้า a>31 = ปีนำหน้า (YYYY-MM-DD) ; ไม่งั้น DD-MM-YY
      if(a>31){ if(a>2400)a-=543; return a+"-"+pad2(b)+"-"+pad2(c); }
      var yr=c; if(yr<100) yr+= (yr>50?2400:2500); // 69 -> 2569
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
    // เติมตัวเลือกใน dropdown (ใหม่สุดอยู่บน)
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
     ฟีเจอร์ 2 — ทะเบียนบิลลงบัญชี (ลูกหนี้)
     ============================================================ */
  function injectCreditCard(){
    if(document.getElementById("creditcard")) return;
    var card=document.createElement("div");
    card.className="card"; card.id="creditcard";
    card.innerHTML=[
      '<h2>📒 ทะเบียนบิลลงบัญชี (ลูกหนี้ค้างชำระ) <span class="badge info" id="creditcount">…</span></h2>',
      '<div class="muted" style="margin-bottom:10px">ลูกค้าเอาของไปก่อน/จ่ายบางส่วน แล้วทยอยจ่าย — บันทึกการจ่ายได้หลายครั้งต่อบิล จนครบ · ดูดอัตโนมัติจากชีต “ลงบัญชี” เมื่ออัปไฟล์ฟอร์ม</div>',
      '<div id="creditmsg" class="muted" style="margin-bottom:8px"></div>',
      '<div id="creditlist" class="muted">กำลังโหลด…</div>',
      '<div id="billselbar" style="display:none;margin-top:10px;padding:8px 12px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;align-items:center;gap:10px;flex-wrap:wrap"></div>',
      '<div class="rowflex" style="margin-top:12px;border-top:1px dashed #e7e5e4;padding-top:12px;align-items:center;flex-wrap:wrap;gap:6px">',
        '<span class="muted" style="font-size:12.5px">➕ เพิ่มบิลเอง:</span>',
        '<input class="rsn" id="cb_bill" placeholder="เลขบิล (ถ้ามี)" style="max-width:130px">',
        '<input class="rsn" id="cb_cust" placeholder="ลูกค้า" style="max-width:170px">',
        '<input class="cell" id="cb_amt" type="number" placeholder="ยอดบิล" style="max-width:110px">',
        '<input class="rsn" id="cb_date" type="date" style="max-width:150px">',
        '<button class="btn" id="cb_add">+ บันทึกบิล</button>',
        '<label class="muted" style="margin-left:auto;font-size:12.5px;cursor:pointer"><input type="checkbox" id="cb_showpaid"> แสดงที่จ่ายครบแล้ว</label>',
      '</div>'
    ].join("");
    var dep=document.getElementById("depcard");
    if(dep && dep.parentNode){ dep.parentNode.insertBefore(card, dep); }
    else { var out=document.getElementById("out"); (out&&out.parentNode?out.parentNode:document.body).appendChild(card); }
    document.getElementById("cb_date").value=todayISO();
    document.getElementById("cb_add").addEventListener("click", addCreditBillManual);
    document.getElementById("cb_showpaid").addEventListener("change", loadCreditBills);
  }

  window.loadCreditBills = async function(){
    injectCreditCard();
    var list=document.getElementById("creditlist"), cnt=document.getElementById("creditcount");
    if(!list) return;
    if(!sbReady()){ list.innerHTML='<span style="color:#b91c1c">เชื่อม Supabase ไม่ได้</span>'; return; }
    list.textContent="กำลังโหลด…";
    window.__billSel={}; var _bar=document.getElementById("billselbar"); if(_bar){ _bar.style.display="none"; _bar.innerHTML=""; }
    var showPaid=document.getElementById("cb_showpaid") && document.getElementById("cb_showpaid").checked;
    var q=sb.from("rev_credit_bills").select("*,rev_credit_payments(*)").order("bill_date",{ascending:true});
    if(!showPaid) q=q.neq("status","paid");
    var r=await q;
    if(r.error){ list.innerHTML='<span style="color:#b91c1c">โหลดไม่ได้: '+esc(r.error.message)+"</span>"; return; }
    var data=r.data||[];
    var outstanding=data.filter(function(b){return b.status!=="paid";});
    var totRemain=outstanding.reduce(function(s,b){return s+(num(b.total_amount)-num(b.paid_amount));},0);
    if(cnt) cnt.textContent=outstanding.length+" บิลค้าง · เหลือ "+fmt(totRemain)+" บาท";
    if(!data.length){ list.innerHTML='<div class="muted">ยังไม่มีบิลลงบัญชี 👍</div>'; return; }
    var rows=data.map(function(b){
      var tot=num(b.total_amount), paid=num(b.paid_amount), rem=tot-paid;
      var pays=(b.rev_credit_payments||[]).slice().sort(function(x,y){return String(x.pay_date).localeCompare(String(y.pay_date));});
      var stColor= b.status==="paid"?"#15803d":(b.status==="partial"?"#b45309":"#64748b");
      var stText= b.status==="paid"?"✓ ครบแล้ว":(b.status==="partial"?"◑ จ่ายบางส่วน":"● ยังไม่จ่าย");
      var od=daysBetween(b.bill_date);
      var payHtml=pays.length? pays.map(function(p){
        return '<div style="font-size:12px;color:#475569;padding:2px 0">• '+beDate(p.pay_date)+' — '+fmt(p.amount)+' ('+esc(p.method||"")+")"+(p.ref?" · "+esc(p.ref):"")+(p.confirmed_by?" · "+esc(p.confirmed_by):"")+
          ' <a href="#" onclick="return delCreditPayment(\''+p.id+'\')" style="color:#b91c1c;text-decoration:none">✕</a></div>';
      }).join(""):'<div style="font-size:12px;color:#94a3b8">ยังไม่มีการจ่าย</div>';
      return '<tr>'+
        '<td style="text-align:center">'+(rem>0.01?'<input type="checkbox" class="billchk" onclick="toggleBillSel(this)" data-id="'+b.id+'" data-code="'+esc(b.customer_code||"")+'" data-cust="'+esc(b.customer||"")+'" data-rem="'+rem+'" data-date="'+esc(b.bill_date||"")+'" data-no="'+esc(b.bill_no||"")+'">':"")+'</td>'+
        '<td>'+beDate(b.bill_date)+'</td>'+
        '<td>'+esc(b.bill_no||"—")+'</td>'+
        '<td>'+esc(b.customer)+(b.source==="auto-form"?' <span class="badge info" style="font-size:10px">ดูดจากฟอร์ม</span>':"")+'</td>'+
        '<td style="text-align:right">'+fmt(tot)+'</td>'+
        '<td style="text-align:right;color:#15803d">'+fmt(paid)+'</td>'+
        '<td style="text-align:right;font-weight:600;color:'+(rem>0.01?"#b91c1c":"#15803d")+'">'+fmt(rem)+'</td>'+
        '<td style="text-align:center;color:'+stColor+';font-size:12px">'+stText+(rem>0.01?'<br><span style="color:#94a3b8;font-size:11px">ค้าง '+od+' วัน</span>':"")+'</td>'+
        '<td style="white-space:nowrap">'+
          (rem>0.01?'<button class="btn" style="padding:3px 8px;font-size:12px" onclick="payCreditBill(\''+b.id+'\')">+ จ่าย</button> ':"")+
          '<button class="btn" style="padding:3px 8px;font-size:12px;background:#f1f5f9;color:#334155" onclick="toggleCreditPays(\''+b.id+'\')">การจ่าย ▾</button>'+
          '<div id="cp_'+b.id+'" style="display:none;margin-top:6px">'+payHtml+'</div>'+
        '</td>'+
      '</tr>';
    }).join("");
    list.innerHTML='<table><thead><tr><th style="width:26px"></th><th>วันที่บิล</th><th>เลขบิล</th><th>ลูกค้า</th><th>ยอดบิล</th><th>จ่ายแล้ว</th><th>คงเหลือ</th><th>สถานะ</th><th></th></tr></thead><tbody>'+rows+"</tbody></table>";
  };

  window.toggleCreditPays=function(id){ var d=document.getElementById("cp_"+id); if(d) d.style.display=(d.style.display==="none"?"block":"none"); };

  window.addCreditBillManual=async function(){
    var bill=document.getElementById("cb_bill").value.trim();
    var cust=document.getElementById("cb_cust").value.trim();
    var amt=num(document.getElementById("cb_amt").value);
    var date=document.getElementById("cb_date").value||todayISO();
    if(!cust){ alert("ใส่ชื่อลูกค้า"); return; }
    if(amt<=0){ alert("ใส่ยอดบิล"); return; }
    var by=prompt("บันทึกบิลลงบัญชี — ผู้บันทึก:","");
    if(by===null) return;
    var r=await sb.from("rev_credit_bills").insert({
      source_key:null, bill_no:bill||null, customer:cust, bill_date:date,
      total_amount:amt, paid_amount:0, status:"open", source:"manual", created_by:(by||"").trim()
    });
    if(r.error){ alert("บันทึกไม่ได้: "+r.error.message); return; }
    document.getElementById("cb_bill").value=""; document.getElementById("cb_cust").value=""; document.getElementById("cb_amt").value="";
    loadCreditBills();
  };

  window.payCreditBill=async function(id){
    var r=await sb.from("rev_credit_bills").select("*,rev_credit_payments(*)").eq("id",id).single();
    if(r.error){ alert("โหลดบิลไม่ได้"); return; }
    var b=r.data, rem=num(b.total_amount)-num(b.paid_amount);
    var amtS=prompt("บันทึกการจ่าย — บิล "+(b.bill_no||b.customer)+"\nคงเหลือ "+fmt(rem)+" บาท\nใส่ยอดที่จ่ายครั้งนี้:", String(Math.round(rem*100)/100));
    if(amtS===null) return;
    var amt=num(amtS); if(amt<=0){ alert("ยอดไม่ถูกต้อง"); return; }
    var mList=METHODS.map(function(m,i){return (i+1)+"="+m;}).join("  ");
    var mS=prompt("ช่องทางจ่าย ("+mList+"):","1");
    if(mS===null) return;
    var method=METHODS[parseInt(mS,10)-1]||METHODS[0];
    var pdate=prompt("วันที่จ่าย (YYYY-MM-DD):", todayISO());
    if(pdate===null) return;
    var ref=prompt("อ้างอิง/หมายเหตุ (เช่น เลขที่โอน — เว้นว่างได้):","")||"";
    var by=prompt("ผู้รับเงิน/ยืนยัน:","")||"";
    var pi=await sb.from("rev_credit_payments").insert({
      bill_id:id, pay_date:pdate||todayISO(), amount:amt, method:method, ref:ref.trim()||null, confirmed_by:by.trim()||null
    });
    if(pi.error){ alert("บันทึกการจ่ายไม่ได้: "+pi.error.message); return; }
    await recomputeBill(id);
    loadCreditBills();
  };

  window.delCreditPayment=async function(pid){
    if(!confirm("ลบรายการจ่ายนี้?")) return false;
    var p=await sb.from("rev_credit_payments").select("bill_id").eq("id",pid).single();
    var bid=p.data && p.data.bill_id;
    var d=await sb.from("rev_credit_payments").delete().eq("id",pid);
    if(d.error){ alert("ลบไม่ได้: "+d.error.message); return false; }
    if(bid) await recomputeBill(bid);
    loadCreditBills();
    return false;
  };

  async function recomputeBill(id){
    var r=await sb.from("rev_credit_payments").select("amount").eq("bill_id",id);
    var paid=(r.data||[]).reduce(function(s,p){return s+num(p.amount);},0);
    var b=await sb.from("rev_credit_bills").select("total_amount").eq("id",id).single();
    var tot=num(b.data&&b.data.total_amount);
    var status= paid>=tot-0.01 ? "paid" : (paid>0.01?"partial":"open");
    await sb.from("rev_credit_bills").update({paid_amount:Math.round(paid*100)/100, status:status}).eq("id",id);
  }

  /* ---------- ใบวางบิล: เลือกหลายบิล (ลูกค้าเดียวกัน) แล้วรับชำระรวม ---------- */
  window.__billSel={};
  function selKeyOf(o){ return (o.code && String(o.code).trim()) ? ("C:"+String(o.code).trim()) : ("N:"+normName(o.cust)); }
  function updateBillSelBar(){
    var bar=document.getElementById("billselbar"); if(!bar) return;
    var ids=Object.keys(window.__billSel);
    if(!ids.length){ bar.style.display="none"; bar.innerHTML=""; return; }
    var tot=ids.reduce(function(s,id){ return s+num(window.__billSel[id].rem); },0);
    var cust=window.__billSel[ids[0]].cust;
    bar.style.display="flex";
    bar.innerHTML='<span style="font-weight:600">🧾 เลือก '+ids.length+' บิล · '+esc(cust)+' · รวมคงเหลือ '+fmt(tot)+' บาท</span>'+
      '<button class="btn" style="margin-left:auto" onclick="paySelectedBills()">💰 รับชำระรวม</button>'+
      '<button class="btn" style="background:#f1f5f9;color:#334155" onclick="clearBillSel()">ล้างการเลือก</button>';
  }
  window.toggleBillSel=function(cb){
    var id=cb.getAttribute("data-id");
    var o={ id:id, code:cb.getAttribute("data-code")||"", cust:cb.getAttribute("data-cust")||"", rem:num(cb.getAttribute("data-rem")), date:cb.getAttribute("data-date")||"", no:cb.getAttribute("data-no")||"" };
    if(cb.checked){
      var keys=Object.keys(window.__billSel);
      if(keys.length && selKeyOf(o)!==selKeyOf(window.__billSel[keys[0]])){
        alert("ใบวางบิลเลือกได้เฉพาะลูกค้าเดียวกัน\nถ้าจะเปลี่ยนลูกค้า ให้กด “ล้างการเลือก” ก่อน");
        cb.checked=false; return;
      }
      window.__billSel[id]=o;
    } else { delete window.__billSel[id]; }
    updateBillSelBar();
  };
  window.clearBillSel=function(){
    window.__billSel={};
    var chks=document.querySelectorAll(".billchk"); for(var i=0;i<chks.length;i++) chks[i].checked=false;
    updateBillSelBar();
  };
  window.paySelectedBills=async function(){
    var ids=Object.keys(window.__billSel); if(!ids.length) return;
    var items=ids.map(function(id){ return window.__billSel[id]; });
    items.sort(function(a,b){ return String(a.date).localeCompare(String(b.date)) || String(a.no).localeCompare(String(b.no)); }); // เก่าก่อน
    var totRem=Math.round(items.reduce(function(s,o){ return s+num(o.rem); },0)*100)/100;
    var cust=items[0].cust;
    var amtS=prompt("รับชำระรวม — "+cust+"\n"+items.length+" บิล · คงเหลือรวม "+fmt(totRem)+" บาท\nใส่ยอดที่รับครั้งนี้ (จัดสรรบิลเก่าก่อน):", String(totRem));
    if(amtS===null) return;
    var pay=num(amtS); if(pay<=0){ alert("ยอดไม่ถูกต้อง"); return; }
    if(pay>totRem+0.01){
      if(!confirm("ยอดที่รับ ("+fmt(pay)+") มากกว่าคงเหลือรวม ("+fmt(totRem)+")\nจะบันทึกเท่าคงเหลือรวมแทน ต่อไหม?")) return;
      pay=totRem;
    }
    var mList=METHODS.map(function(m,i){ return (i+1)+"="+m; }).join("  ");
    var mS=prompt("ช่องทางจ่าย ("+mList+"):","1"); if(mS===null) return;
    var method=METHODS[parseInt(mS,10)-1]||METHODS[0];
    var pdate=prompt("วันที่จ่าย (YYYY-MM-DD):", todayISO()); if(pdate===null) return;
    var ref=prompt("อ้างอิง/หมายเหตุ (เช่น เลขที่โอน — เว้นว่างได้):","")||"";
    var by=prompt("ผู้รับเงิน/ยืนยัน:","")||"";
    var leftover=pay, payments=[];
    for(var i=0;i<items.length;i++){
      if(leftover<=0.005) break;
      var give=Math.round(Math.min(num(items[i].rem), leftover)*100)/100;
      if(give>0.005){ payments.push({ bill_id:items[i].id, pay_date:pdate||todayISO(), amount:give, method:method, ref:(ref.trim()||null), confirmed_by:(by.trim()||null) }); leftover=Math.round((leftover-give)*100)/100; }
    }
    if(!payments.length){ alert("ไม่มีบิลให้ลงชำระ"); return; }
    var ins=await sb.from("rev_credit_payments").insert(payments);
    if(ins.error){ alert("บันทึกรับชำระไม่สำเร็จ: "+ins.error.message); return; }
    for(var j=0;j<payments.length;j++){ await recomputeBill(payments[j].bill_id); }
    window.__billSel={};
    alert("รับชำระรวม "+payments.length+" บิล · "+fmt(pay)+" บาท เรียบร้อย"+(leftover>0.005?"\n(เหลือเงินทอน/ยังไม่จัดสรร "+fmt(leftover)+")":""));
    loadCreditBills();
  };

  /* ---------- ดูดบิลลงบัญชีอัตโนมัติจากไฟล์ฟอร์ม ---------- */
  function parseCreditSheet(wb){
    var X=window.XLSX; if(!X) return {date:null, entries:[]};
    var sn=wb.SheetNames.filter(function(n){return String(n).replace(/\s/g,"")==="ลงบัญชี";})[0];
    if(!sn) return {date:null, entries:[]};
    var ws=wb.Sheets[sn];
    var rows=X.utils.sheet_to_json(ws,{header:1,raw:true,defval:null});
    // วันที่: cell มุมขวาแถวหัว (col F / index5) หรือหาในชีตสรุป
    var dateISO=null;
    if(rows[0]) dateISO=cellToISO(rows[0][5]);
    if(!dateISO){
      var ssn=wb.SheetNames.filter(function(n){return String(n).indexOf("สรุปรายรับ")>=0;})[0];
      if(ssn){ var sr=X.utils.sheet_to_json(wb.Sheets[ssn],{header:1,raw:true,defval:null}); if(sr[0]) dateISO=cellToISO(sr[0][3])||cellToISO(sr[0][1]); }
    }
    var entries=[], seq={};
    for(var i=2;i<rows.length;i++){
      var r=rows[i]||[];
      var billno=r[1], amtL=r[2], name=r[4], amtR=r[5];
      // บล็อกซ้าย: เลขบิล + ยอด
      if((billno!=null && String(billno).trim()!=="" && String(billno).trim()!=="ยอดรวม") && num(amtL)>0){
        var k1=(dateISO||"")+"#B#"+String(billno).trim()+"#"+num(amtL);
        entries.push({source_key:k1, bill_no:String(billno).trim(), customer:String(billno).trim(), amount:num(amtL)});
      }
      // บล็อกขวา: ชื่อสมาชิก/ร้าน + ยอด
      if(name!=null && String(name).trim()!=="" && String(name).trim()!=="ยอดรวม" && num(amtR)>0){
        var nm=String(name).trim();
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
      var wb=XLSX.read(new Uint8Array(buf),{type:"array",cellDates:true});
      var parsed=parseCreditSheet(wb);
      var msg=document.getElementById("creditmsg");
      if(!parsed.entries.length){ if(msg) msg.textContent=""; return; }
      var payload=parsed.entries.map(function(e){
        return {source_key:e.source_key, bill_no:e.bill_no, customer:e.customer, bill_date:parsed.date||todayISO(),
                total_amount:e.amount, source:"auto-form", note:"ดูดจากชีตลงบัญชี"};
      });
      // upsert แบบ insert-only (ไม่ทับของเดิม/ไม่รีเซ็ตยอดจ่าย)
      var r=await sb.from("rev_credit_bills").upsert(payload,{onConflict:"source_key",ignoreDuplicates:true});
      if(r.error){ if(msg){ msg.innerHTML='<span style="color:#b91c1c">ดูดบิลลงบัญชีไม่สำเร็จ: '+esc(r.error.message)+"</span>"; } return; }
      if(msg) msg.innerHTML='<span style="color:#15803d">✓ ดูดบิลลงบัญชีจากฟอร์ม '+parsed.entries.length+' รายการ ('+beDate(parsed.date)+') เข้าทะเบียนแล้ว</span>';
      loadCreditBills();
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

  /* ---------- init ---------- */
  function init(){
    injectMonthSel();
    injectCreditCard();
    hookFormInput();
    if(typeof loadMonthStatus==="function") loadMonthStatus();
    loadCreditBills();
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
