/* ============================================================
   bell.js — กระดิ่งแจ้งเตือนกลาง (ชุดโปรแกรมตรวจรายได้ กิจมั่งมีโฮม)
   ใส่ต่อท้ายทุกหน้า: <script src="bell.js?v=..."></script>
   ใช้ตัวแปร global เดิม: sb (supabase client), localStorage "rev_role"

   เตือน 4 เรื่อง:
     1) รายจ่ายจากสเตทเมนต์ที่ยังไม่ได้บันทึก   (เจ้าของ/การเงิน)
     2) เงินโอนเข้ารอจับคู่                      (ทุกคน)
     3) วันที่ยังตรวจไม่ครบ (ย้อนหลัง 30 วัน)     (ทุกคน)
     4) เงินที่ลงฟอร์มแต่ไม่เข้าบัญชี/K+ ของร้าน ยังไม่ติดธง+แนบสลิป (ทุกคน)

   ตัวกรอง: rev_bell_ignore = รายการเงินออกที่ไม่ต้องเตือน (โอนเข้าบัญชีตัวเอง/เงินเดือนที่ลงทางอื่น)
     kind="exact"   → เทียบ exp_date|amount|ref แบบเป๊ะ (ซ่อนรายการเดียว)
     kind="keyword" → เทียบ pattern แบบ "มีคำนี้อยู่ในข้อความ" (ซ่อนทุกครั้งที่เจอ)
   ============================================================ */
(function(){
  "use strict";

  var EXP_DAYS   = 90;   /* ย้อนหลังที่ไล่หาเงินออกยังไม่ลงรายจ่าย */
  var AUDIT_DAYS = 30;   /* ย้อนหลังที่เช็ควันตรวจไม่ครบ */
  var PEND_DAYS  = 120;
  var GAP_DAYS   = 30;   /* ย้อนหลังที่ไล่หาเงินลงฟอร์มแต่ไม่เข้าบัญชี/K+ ร้าน */  /* ย้อนหลังที่นับเงินรอจับคู่ */
  var REFRESH_MS = 5*60*1000;

  function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];}); }
  function num(v){ if(v==null) return 0; var n=parseFloat(String(v).replace(/[, ]/g,"")); return isNaN(n)?0:n; }
  function r2(n){ return Math.round(num(n)*100)/100; }
  function TH(n){ return r2(n).toLocaleString("th-TH",{minimumFractionDigits:2,maximumFractionDigits:2}); }
  function pad2(n){ return String(n).padStart(2,"0"); }
  function beDate(s){ if(!s) return "—"; var p=String(s).slice(0,10).split("-"); if(p.length<3) return s; return p[2]+"/"+p[1]+"/"+(parseInt(p[0],10)+543); }
  function todayISO(){ return new Date(Date.now()+7*3600*1000).toISOString().slice(0,10); }
  function shiftISO(iso,n){ var p=String(iso).slice(0,10).split("-"); var d=new Date(Date.UTC(+p[0],+p[1]-1,+p[2])); d.setUTCDate(d.getUTCDate()+n); return d.toISOString().slice(0,10); }
  function role(){ try{ return localStorage.getItem("rev_role")||sessionStorage.getItem("rev_role")||null; }catch(e){ return null; } }
  /* แต่ละหน้าประกาศ sb ด้วย let/const → ไม่ขึ้นเป็น window.sb ต้องอ่านจาก global lexical scope */
  function SB(){ try{ if(typeof sb!=="undefined" && sb) return sb; }catch(e){} return window.sb||null; }
  function onPage(name){ var p=location.pathname||""; try{ p=decodeURIComponent(p); }catch(e){}
    return p.indexOf(name)>=0; }

  /* ---------- UI ---------- */
  function inject(){
    if(document.getElementById("bellBtn")) return;
    var css=document.createElement("style");
    css.textContent=[
      "#bellBtn{position:fixed;right:12px;z-index:9998;width:42px;height:42px;border-radius:50%;border:1px solid #e7e5e4;",
      "background:#fff;box-shadow:0 2px 10px rgba(0,0,0,.14);cursor:pointer;font-size:20px;line-height:40px;text-align:center;display:none}",
      "#bellBtn:hover{background:#fafaf9}",
      "#bellDot{position:absolute;top:-5px;right:-5px;min-width:19px;height:19px;border-radius:10px;background:#dc2626;color:#fff;",
      "font-size:11px;font-weight:700;line-height:19px;padding:0 5px;display:none}",
      "#bellPanel{position:fixed;right:12px;z-index:9999;width:355px;max-width:calc(100vw - 24px);max-height:72vh;overflow:auto;",
      "background:#fff;border:1px solid #e7e5e4;border-radius:14px;box-shadow:0 10px 34px rgba(0,0,0,.2);display:none;font-size:13px}",
      "#bellPanel h3{margin:0;padding:11px 14px;font-size:14px;border-bottom:1px solid #f5f5f4;background:#fafaf9;border-radius:14px 14px 0 0}",
      ".bgrp{padding:11px 14px;border-bottom:1px solid #f5f5f4}",
      ".bgrp:last-child{border-bottom:0}",
      ".bgrp b{display:block;margin-bottom:3px}",
      ".bitem{color:#57534e;font-size:12px;padding:1px 0}",
      ".bbtn{margin-top:7px;display:inline-block;padding:4px 11px;border-radius:8px;border:1px solid #d6d3d1;background:#fff;cursor:pointer;font-size:12px}",
      ".bbtn:hover{background:#f5f5f4}",
      ".bok{padding:26px 14px;text-align:center;color:#15803d}"
    ].join("");
    document.head.appendChild(css);

    var top = (function(){ var rb=document.getElementById("roleBar"); return (rb && rb.style.display!=="none")?54:10; })();
    var b=document.createElement("div");
    b.id="bellBtn"; b.style.top=top+"px"; b.title="แจ้งเตือน";
    b.innerHTML='🔔<span id="bellDot">0</span>';
    b.onclick=function(){ var p=document.getElementById("bellPanel"); p.style.display=(p.style.display==="block")?"none":"block"; };
    document.body.appendChild(b);

    var p=document.createElement("div");
    p.id="bellPanel"; p.style.top=(top+48)+"px";
    p.innerHTML='<h3>🔔 แจ้งเตือน</h3><div id="bellBody" class="bgrp">กำลังตรวจ…</div>';
    document.body.appendChild(p);

    document.addEventListener("click",function(e){
      var pn=document.getElementById("bellPanel"), bt=document.getElementById("bellBtn");
      if(!pn||!bt) return;
      if(pn.style.display==="block" && !pn.contains(e.target) && !bt.contains(e.target)) pn.style.display="none";
    });
  }

  /* ---------- ไปยังจุดที่ต้องทำ ---------- */
  /* เปิดแท็บรายจ่าย + ขยายช่วงวันให้ครอบรายการค้างทั้งหมด แล้วโหลดใหม่ */
  function openExpenseTab(){
    var pn=document.getElementById("bellPanel"); if(pn) pn.style.display="none";
    try{ if(window.tab) window.tab("expense"); }catch(e){}
    /* ตั้งช่วงวันให้ครอบ 90 วันย้อนหลัง ไม่งั้นรายการเก่าไม่โผล่ (ตารางอ่านเฉพาะช่วงที่โหลด) */
    try{
      var f=document.getElementById("from"), t=document.getElementById("to");
      if(f&&t){
        var today=todayISO(), want=shiftISO(today,-EXP_DAYS);
        if(!f.value || f.value>want){ f.value=want; t.value=today; if(window.reloadAll) window.reloadAll(); }
      }
    }catch(e){}
    setTimeout(function(){ var el=document.getElementById("p_expense"); if(el&&el.scrollIntoView) el.scrollIntoView({behavior:"smooth",block:"start"}); }, 300);
  }
  window.__bellGoExp=function(){
    if(onPage("การเงินบริษัท")){ openExpenseTab(); return; }
    location.href="การเงินบริษัท.html#bell-expense";
  };
  window.__bellGoPend=function(){
    if(onPage("index")||location.pathname.replace(/\/$/,"").split("/").pop()===""||onPage("kmmh-revenue/")){
      var c=document.getElementById("pendcard");
      if(c&&c.scrollIntoView){ c.scrollIntoView({behavior:"smooth",block:"start"}); document.getElementById("bellPanel").style.display="none"; return; }
    }
    location.href="index.html#pendcard";
  };
  window.__bellGoDay=function(d){
    var p=document.getElementById("bellPanel"); if(p) p.style.display="none";
    if(window.showDayDetail){ try{ window.showDayDetail(d); var b=document.getElementById("dayDetail"); if(b&&b.scrollIntoView) b.scrollIntoView({behavior:"smooth",block:"start"}); return; }catch(e){} }
    location.href="index.html";
  };

  /* ---------- เงินที่ลงฟอร์มแต่ไม่เข้าบัญชี/K+ ของร้าน ----------
     ใช้เกณฑ์เดียวกับหน้ารายละเอียดวันในโปรแกรมตรวจรายได้เป๊ะ:
       ช่องว่าง = (K+ ในฟอร์ม − รายงาน K+) + K+หลัง15:30ที่ยังไม่ออกบิลวันนั้น − ยอดยกมาจากเมื่อวาน
     ⚠️ ห้ามลืมข้อ "ที่ยังไม่ออกบิลวันนั้น" ไม่งั้นเตือนหลอกเกือบทุกวัน  */
  function isLateT(t){ var m=String(t||"").match(/(\d{2}):(\d{2})/); return !!m && (+m[1]>15 || (+m[1]===15 && +m[2]>=30)); }
  function lateItemsOf(au, rows){
    if(au && au.lti && au.lti.length) return au.lti;
    return (rows||[]).filter(function(r){ return isLateT(r.t); }).map(function(r){ return {amt:(+r.amt||0)}; });
  }
  function billedIn(xf, amt){ for(var i=0;i<(xf||[]).length;i++){ if((+xf[i].knv||0)>0 && Math.abs((+xf[i].knv||0)-amt)<=1) return xf[i].bill||true; } return null; }
  function unbilled(items, xf){ return (items||[]).filter(function(x){ return !billedIn(xf,(+x.amt||0)); }); }
  function sumAmt(a){ return r2(a.reduce(function(s,x){ return s+(+x.amt||0); },0)); }
  function gapDays(audits, dailies, flagged, fromISO, cutBills){
    cutBills=cutBills||{};
    var A={}, D={};
    audits.forEach(function(a){ A[String(a.date).slice(0,10)]=a; });
    dailies.forEach(function(d){ D[String(d.date).slice(0,10)]=d; });
    var out=[];
    Object.keys(A).sort().forEach(function(dt){
      if(dt<fromISO) return;
      var a=A[dt], d=D[dt]; if(!a||!d) return;
      if(a.status==="วันหยุด") return;
      var fk=(a.fk==null||a.fk==="")?null:num(a.fk);
      var xf=a.xfer||[];
      var gapK=0;
      if(fk!=null && d.kplus_total!=null){
        var lateU=unbilled(lateItemsOf(a, d.kplus_rows), xf);
        var carry=0, seen={};
        /* ยอดยกมา (ก): บิลของวันนี้ที่เคยถูกจับคู่เป็น "K+ ตัดรอบ" ของวันก่อนหน้าไปแล้ว
           ⚠️ ต้องมีข้อนี้ ไม่งั้นวันที่บิลข้ามวันเกิน 1 วันจะถูกเตือนหลอก (เกณฑ์เดียวกับหน้ารายละเอียดวัน) */
        xf.forEach(function(x){
          var b=x.bill; if(!b || seen[b]) return;
          var pdt=cutBills[b];
          if(pdt && pdt<dt){ seen[b]=1; carry+=(+x.knv||0); }
        });
        /* ยอดยกมา (ข): รายการหลัง 15:30 ของเมื่อวานที่เมื่อวานยังไม่ออกบิล แล้ววันนี้มีบิลยอดตรงกัน */
        var pv=shiftISO(dt,-1);
        var pa=A[pv], pd=D[pv];
        if(pa||pd){
          unbilled(lateItemsOf(pa, pd&&pd.kplus_rows), (pa&&pa.xfer)||[]).forEach(function(it){
            var b=billedIn(xf,(+it.amt||0));
            if(b && !seen[b]){ seen[b]=1; carry+=(+it.amt||0); }
          });
        }
        gapK=r2((fk-num(d.kplus_total))+sumAmt(lateU)-carry);
      }
      var fks=(a.fks==null||a.fks==="")?null:num(a.fks);
      var gapB=0;
      if(fks!=null && d.bank_dep_total!=null) gapB=r2(fks-(num(d.bank_dep_total)-num(d.bank_kplus_settle)));
      /* ยอดยกมาข้ามวันฝั่งบัญชี — ลูกค้าโอนตอนเย็น/หลังปิดฟอร์ม เงินเข้าเมื่อวาน แต่แคชเชียร์ลงฟอร์มวันนี้
         (ฝั่ง K+ มีตัวหักนี้อยู่แล้ว ฝั่งบัญชีไม่มี เลยเตือนหลอกมาตลอด — 2 ก.ย.69)
         กันหักมั่ว 2 ชั้น: (ก) ต้องมีเงินเข้า "ยอดตรงกันเป๊ะ" ในสเตทเมนต์เมื่อวาน 1 รายการ (ไม่ใช่ K+ settle)
                          (ข) เมื่อวานต้องมีเงินเข้าเกินฟอร์มอย่างน้อยเท่ายอดนั้น = ยังไม่ถูกนับไปในวันเมื่อวาน */
      if(gapB>1){
        var pvb=shiftISO(dt,-1), pab=A[pvb], pdb=D[pvb];
        if(pab && pdb && pab.status!=="วันหยุด" && pdb.bank_dep_total!=null){
          var pfks=(pab.fks==null||pab.fks==="")?null:num(pab.fks);
          var psur=(pfks==null)?0:r2((num(pdb.bank_dep_total)-num(pdb.bank_kplus_settle))-pfks);
          if(psur>1){
            var brs=pdb.bank_rows||[];
            for(var bi=0;bi<brs.length;bi++){
              var br=brs[bi]; if(!br||br.kp) continue;
              var bdp=+br.dep||0;
              if(bdp>1 && Math.abs(bdp-gapB)<=1 && bdp<=r2(psur+1)){ gapB=0; break; }
            }
          }
        }
      }
      var gap=r2((gapK>1?gapK:0)+(gapB>1?gapB:0));
      if(gap<=1) return;
      var left=r2(gap-(flagged[dt]||0));
      if(left<=1) return;
      out.push({date:dt, left:left, k:(gapK>1?gapK:0), b:(gapB>1?gapB:0), ov:!!a.ov});
    });
    return out;
  }

  /* ---------- ตรวจข้อมูล ---------- */
  async function collect(){
    var R=role();
    var sees = { exp:(R==="owner"||R==="finance"), pend:true, audit:true };
    var today=todayISO();
    var out=[];

    var fromExp=shiftISO(today,-EXP_DAYS), fromAud=shiftISO(today,-AUDIT_DAYS), fromPend=shiftISO(today,-PEND_DAYS);
    var fromAll = fromExp<fromPend?fromExp:fromPend;

    var S=SB();
    var q=await Promise.all([
      S.from("rev_daily").select("date,bank_rows,kplus_total,bank_dep_total").gte("date",fromAll).lte("date",today),
      sees.exp ? S.from("rev_expenses").select("exp_date,amount,ref,source").gte("exp_date",fromExp).in("source",["statement","settlement"]) : Promise.resolve({data:[]}),
      S.from("rev_pending").select("date,amount,source,from_name,status").eq("status","open").gte("date",fromPend),
      S.from("rev_audit").select("date,status,kplus_today,bank_dep_today").gte("date",fromAud).lte("date",today),
      sees.exp ? S.from("rev_bell_ignore").select("kind,exp_date,amount,ref,pattern") : Promise.resolve({data:[]}),
      /* เฉพาะช่องเล็กๆ ที่ต้องใช้ ไม่ดึง detail ทั้งก้อน (กัน egress บาน) */
      S.from("rev_audit").select("date,status,fk:detail->>form_knv,fks:detail->>form_ksk,xfer:detail->xfer,lti:detail->kplus_late_items,ov:detail->gap_override").gte("date",shiftISO(today,-(GAP_DAYS+1))).lte("date",today),
      S.from("rev_daily").select("date,kplus_total,kplus_rows,bank_dep_total,bank_kplus_settle,bank_rows").gte("date",shiftISO(today,-(GAP_DAYS+1))).lte("date",today),
      S.from("rev_pending").select("date,amount,source,ref,matched_bill_no").gte("date",shiftISO(today,-(GAP_DAYS+31)))
    ]);
    var dailies=(q[0]&&q[0].data)||[], exps=(q[1]&&q[1].data)||[], pends=(q[2]&&q[2].data)||[], audits=(q[3]&&q[3].data)||[], igns=(q[4]&&q[4].data)||[];
    var gAud=(q[5]&&q[5].data)||[], gDay=(q[6]&&q[6].data)||[], gPend=(q[7]&&q[7].data)||[];

    /* 1) เงินออกจากสเตทเมนต์ที่ยังไม่ได้ลงรายจ่าย — คีย์เดียวกับหน้าการเงินบริษัท */
    if(sees.exp){
      var recorded={};
      exps.forEach(function(x){ recorded[String(x.exp_date).slice(0,10)+"|"+r2(x.amount)+"|"+(x.ref||"")]=1; });
      /* ตัวกรอง "ไม่ต้องเตือน" — ตั้งจากหน้าการเงินบริษัท (ปุ่ม 🙈) */
      var igExact={}, igKey=[];
      igns.forEach(function(g){
        if(g.kind==="keyword"){ var pt=String(g.pattern||"").trim().toLowerCase(); if(pt) igKey.push(pt); }
        else igExact[String(g.exp_date).slice(0,10)+"|"+r2(g.amount)+"|"+(g.ref||"")]=1;
      });
      function isIgnored(date,amt,ref){
        if(igExact[String(date).slice(0,10)+"|"+amt+"|"+ref]) return true;
        var t=String(ref||"").toLowerCase();
        for(var i=0;i<igKey.length;i++){ if(t.indexOf(igKey[i])>=0) return true; }
        return false;
      }
      var wd=[], hid=0;
      dailies.forEach(function(d){
        if(String(d.date)<fromExp) return;
        (d.bank_rows||[]).forEach(function(r){
          var amt=r2(r.wd); if(amt<=0) return;
          var ref=String(r.detail||"");
          if(recorded[String(d.date).slice(0,10)+"|"+amt+"|"+ref]) return;
          if(isIgnored(d.date,amt,ref)){ hid++; return; }
          wd.push({date:d.date, amt:amt, ref:ref});
        });
      });
      if(wd.length){
        wd.sort(function(a,b){ return a.date<b.date?1:-1; });
        var cut=shiftISO(today,-7);
        var fresh=wd.filter(function(x){ return String(x.date)>=cut; });
        var oldn=wd.length-fresh.length;
        out.push({ key:"exp", icon:"💸",
          title:"มีรายจ่ายต้องบันทึก "+wd.length+" รายการ",
          sub:"ใหม่ 7 วันล่าสุด "+fresh.length+" รายการ"+(oldn?(" · ค้างเก่า "+oldn+" รายการ"):"")+
              " · รวม "+TH(wd.reduce(function(s,x){return s+x.amt;},0))+" บาท"+
              (hid?(" · ตั้งไม่เตือนไว้ "+hid+" รายการ"):""),
          items:wd.slice(0,5).map(function(x){ return beDate(x.date)+" · "+TH(x.amt)+" · "+(x.ref||"—"); }),
          more:Math.max(0,wd.length-5), btn:"ไปลงรายจ่าย", act:"__bellGoExp()" });
      }
    }

    /* 2) เงินโอนเข้ารอจับคู่ */
    if(sees.pend && pends.length){
      pends.sort(function(a,b){ return a.date<b.date?1:-1; });
      out.push({ key:"pend", icon:"💎",
        title:"เงินรอจับคู่ "+pends.length+" รายการ",
        sub:"รวม "+TH(pends.reduce(function(s,x){return s+num(x.amount);},0))+" บาท · ยังไม่รู้ว่าตรงบิลไหน",
        items:pends.slice(0,5).map(function(x){ return beDate(x.date)+" · "+TH(x.amount)+" · "+(x.from_name||x.source||"—"); }),
        more:Math.max(0,pends.length-5), btn:"ไปจับคู่", act:"__bellGoPend()" });
    }

    /* 3) วันที่ยังตรวจไม่ครบ (ใช้เกณฑ์เดียวกับป้าย "⏳ รออัป" ในหน้าตรวจรายได้) */
    if(sees.audit){
      var dMap={}; dailies.forEach(function(d){ dMap[String(d.date).slice(0,10)]=d; });
      var bad=[];
      audits.forEach(function(a){
        if(a.status==="วันหยุด") return;
        var d=dMap[String(a.date).slice(0,10)]||{};
        var need=[];
        if(a.kplus_today==null && d.kplus_total==null) need.push("K+");
        if(a.bank_dep_today==null && d.bank_dep_total==null) need.push("สเตทเมนต์");
        if(a.status!=="ตรวจแล้ว") need.push("ยังไม่ยืนยัน");
        if(need.length) bad.push({date:a.date, need:need.join("/")});
      });
      if(bad.length){
        bad.sort(function(a,b){ return a.date<b.date?1:-1; });
        out.push({ key:"audit", icon:"⏳",
          title:"วันที่ยังตรวจไม่ครบ "+bad.length+" วัน",
          sub:"ย้อนหลัง "+AUDIT_DAYS+" วัน",
          items:bad.slice(0,5).map(function(x){ return '<a href="javascript:void(0)" onclick="__bellGoDay(\''+x.date+'\')" style="color:#1d4ed8">'+beDate(x.date)+'</a> · รอ '+esc(x.need); }),
          raw:true, more:Math.max(0,bad.length-5), btn:null, act:null });
      }
    }
    /* 4) เงินที่ลงฟอร์มแต่ไม่เข้าบัญชี/K+ ของร้าน ยังไม่ติดธง+แนบสลิป */
    try{
      var flg={};
      gPend.forEach(function(x){
        if(x.source==="รับเข้าบัญชีอื่น" || /บัญชีอื่น|เกินรายงาน|เกินสเตทเมนต์/.test(x.ref||"")){
          var k=String(x.date).slice(0,10); flg[k]=(flg[k]||0)+num(x.amount);
        }
      });
      var cutB={};
      gPend.forEach(function(x){
        if(!/ตัดรอบ/.test(x.source||"")) return;
        var b=String(x.matched_bill_no||"").trim(); if(!b) return;
        var k=String(x.date).slice(0,10);
        if(!cutB[b] || k<cutB[b]) cutB[b]=k;
      });
      var gaps=gapDays(gAud, gDay, flg, shiftISO(today,-GAP_DAYS), cutB);
      if(gaps.length){
        gaps.sort(function(a,b){ return a.date<b.date?1:-1; });
        var gsum=r2(gaps.reduce(function(s,x){ return s+x.left; },0));
        var nOv=gaps.filter(function(x){ return x.ov; }).length;
        out.push({ key:"gap", icon:"🚩",
          title:"เงินไม่เข้าบัญชี/K+ ร้าน ยังไม่ติดธง "+gaps.length+" วัน",
          sub:"รวม "+TH(gsum)+" บาท · ลงฟอร์มไว้แต่ไม่พบเงินเข้า — ต้องติดธง + แนบสลิป"+(nOv?(" · ข้ามด้วยเหตุผลไว้ "+nOv+" วัน"):""),
          items:gaps.slice(0,5).map(function(x){
            return '<a href="javascript:void(0)" onclick="__bellGoDay(\''+x.date+'\')" style="color:#b91c1c;font-weight:700">'+beDate(x.date)+'</a> · '+TH(x.left)+
                   (x.k>1&&x.b>1?" (K+ "+TH(x.k)+" · บัญชี "+TH(x.b)+")":(x.b>1?" (ฝั่งบัญชี)":""))+(x.ov?' <span style="color:#b45309">· ข้ามด้วยเหตุผล</span>':'');
          }),
          raw:true, more:Math.max(0,gaps.length-5), btn:null, act:null });
      }
    }catch(e){ console.warn("bell gap", e); }

    return out;
  }

  function render(groups){
    var body=document.getElementById("bellBody"), dot=document.getElementById("bellDot"), btn=document.getElementById("bellBtn");
    if(!body) return;
    btn.style.display="block";
    var total=groups.reduce(function(s,g){ return s+1; },0);
    if(!groups.length){
      body.outerHTML='<div id="bellBody" class="bok">✓ ไม่มีอะไรค้าง<div style="color:#a8a29e;font-size:12px;margin-top:4px">เคลียร์หมดแล้ว</div></div>';
      dot.style.display="none"; return;
    }
    dot.textContent=total; dot.style.display="block";
    var html=groups.map(function(g){
      return '<div class="bgrp"><b>'+g.icon+' '+esc(g.title)+'</b>'+
        (g.sub?'<div class="bitem" style="margin-bottom:4px">'+esc(g.sub)+'</div>':'')+
        g.items.map(function(t){ return '<div class="bitem">• '+(g.raw?t:esc(t))+'</div>'; }).join("")+
        (g.more?'<div class="bitem" style="color:#a8a29e">…และอีก '+g.more+' รายการ</div>':'')+
        (g.btn?'<button class="bbtn" onclick="'+g.act+'">'+esc(g.btn)+' →</button>':'')+
      '</div>';
    }).join("");
    body.outerHTML='<div id="bellBody">'+html+'</div>';
  }

  async function run(){
    try{
      if(!SB() || !role()) return;
      try{ if(window.ensureOwnerSession) await window.ensureOwnerSession(); else if(window.ensureRevSession) await window.ensureRevSession("0402"); }catch(e){}
      inject();
      if(location.hash==="#bell-expense" && onPage("การเงินบริษัท")){ try{ history.replaceState(null,"",location.pathname); }catch(e){} openExpenseTab(); }
      render(await collect());
    }catch(e){ console.warn("bell", e); }
  }
  window.__bellRefresh=run;

  /* รอ sb พร้อมก่อน (แต่ละหน้าสร้าง client คนละจังหวะ) */
  var tries=0;
  var t=setInterval(function(){
    tries++;
    if(SB() || tries>40){ clearInterval(t); setTimeout(run, 600); }
  }, 250);
  setInterval(run, REFRESH_MS);
})();
