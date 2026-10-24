/* revauth.js — เข้าสู่ระบบหน้ารายได้ด้วย PIN ที่ผู้ใช้พิมพ์เอง (SEC-APPPIN P0)
   - ไม่มี PIN ในโค้ด: ส่ง PIN ที่พิมพ์ไปตรวจที่ Edge Function login แล้วใช้ session + role ที่ระบบตอบกลับ
   - ไม่มีการล็อกอินอัตโนมัติ: currentRole() ใช้ได้เฉพาะ session เดิมที่ยังใช้ได้ (supabase-js persistSession)
     และอ่าน role จากฐาน (ไม่เชื่อ localStorage / ค่าใน token)
   role ที่ระบบตอบ: owner | hr | finance | cashier | employee
   REV-ROLE-SPLIT ขั้น 6: แคชเชียร์มีบัญชีของตัวเอง (cashier@) · employee/hr ไม่ใช่ผู้ใช้หน้ารายได้อีกต่อไป */
(function(){
  "use strict";
  var PIN_RE=/^[0-9]{4,6}$/;   /* ช่วงเปลี่ยนผ่าน: รับ 4–6 หลัก */
  var DENY_MSG="สิทธิ์ไม่พอสำหรับหน้านี้";

  async function currentRole(sb){
    if(!sb) return null;
    try{
      var s=(await sb.auth.getSession()).data.session;
      if(!s || !s.user || !s.user.id) return null;
      watch(sb, s.user.id);
      /* ขั้น 6: บทบาทหน้ารายได้จากฐาน (rev_my_role = owner/finance/cashier · เช็กว่า session ยังไม่ถูกตัด)
         เรียกไม่สำเร็จ = ไม่ให้เข้า (ไม่หาทางสำรอง · Codex web6 r1 #1) */
      var m=await sb.rpc("rev_my_role");
      if(m.error) return null;
      if(m.data) return String(m.data);
      /* ไม่ใช่ผู้ใช้หน้ารายได้ — คืนได้แค่ hr/employee (ให้หน้า Shopee เปิดมุมมองพนักงาน) และ session ต้องยังไม่ถูกตัด
         ห้ามคืน owner/finance/cashier จากทางนี้ (ถ้า rev_my_role ตอบว่าง แปลว่า session ถูกตัดหรือบัญชีถูกปิด) */
      var a=await sb.rpc("app_session_alive");
      if(a.error || a.data!==true) return null;
      var r=await sb.from("users").select("role,is_active").eq("id",s.user.id).maybeSingle();
      if(r.error || !r.data || r.data.is_active!==true) return null;
      var role=r.data.role ? String(r.data.role) : null;
      return (role==="hr"||role==="employee") ? role : null;
    }catch(e){ console.warn("RevAuth.currentRole",e); return null; }
  }

  /* แท็บอื่นออกจากระบบ / สลับบัญชี → แท็บนี้โหลดใหม่ (ไม่ค้างหน้าจอ/สิทธิ์ของคนเดิม · Codex web6 r1 #2)
     ดูจาก localStorage "sb-rev-kmmh" ที่ทุกหน้าในโดเมนใช้ร่วมกัน · ต่ออายุ token (บัญชีเดิม) ไม่โหลดใหม่ */
  var WATCH_UID=null, LISTENING=false;
  function watch(sb, uid){
    if(!uid) return;
    WATCH_UID=uid;
    if(LISTENING) return;
    LISTENING=true;
    try{
      window.addEventListener("storage", function(e){
        if(e.key!==null && e.key!=="sb-rev-kmmh") return;
        var now=null; try{ var v=JSON.parse(localStorage.getItem("sb-rev-kmmh")||"null"); now=v&&v.user&&v.user.id||null; }catch(_e){}
        if(now!==WATCH_UID){ try{ location.reload(); }catch(_e){} }
      });
      if(sb && sb.auth && sb.auth.onAuthStateChange) sb.auth.onAuthStateChange(function(ev, ss){
        var now=ss&&ss.user&&ss.user.id||null;
        if(ev==="SIGNED_OUT" || (now && now!==WATCH_UID)){ try{ location.reload(); }catch(_e){} }
      });
    }catch(e){ console.warn("RevAuth.watch",e); }
  }

  async function login(sb,sbUrl,sbKey,pin){
    pin=String(pin==null?"":pin).trim();
    if(!sb) return {ok:false,error:"no_client",msg:"เชื่อมต่อฐานข้อมูลไม่ได้ ลองรีเฟรชหน้า"};
    if(!PIN_RE.test(pin)) return {ok:false,error:"bad_format",msg:"PIN ต้องเป็นตัวเลข 4–6 หลัก"};
    try{
      var resp=await fetch(sbUrl+"/functions/v1/login",{method:"POST",headers:{"apikey":sbKey,"Content-Type":"application/json"},body:JSON.stringify({pin:pin})});
      var j={}; try{ j=(await resp.json())||{}; }catch(_e){}
      if(resp.status===429 || j.error==="too_many_attempts"){
        var m=(j.retry_after_minutes!=null)?(" "+j.retry_after_minutes+" นาที"):"สักครู่";
        return {ok:false,error:"too_many_attempts",msg:"ใส่ PIN ผิดหลายครั้ง — กรุณารอ"+m+" แล้วลองใหม่"};
      }
      if(resp.status===401 || j.error==="invalid_pin"){
        return {ok:false,error:"invalid_pin",msg:"PIN ไม่ถูกต้อง"+((j.attempts_left!=null)?(" (ลองได้อีก "+j.attempts_left+" ครั้ง)"):"")};
      }
      if(!resp.ok || !j.access_token || !j.refresh_token) return {ok:false,error:"login_failed",msg:"เข้าสู่ระบบไม่สำเร็จ ลองใหม่"};
      var st=await sb.auth.setSession({access_token:j.access_token,refresh_token:j.refresh_token});
      if(st && st.error) return {ok:false,error:"session_failed",msg:"เข้าสู่ระบบไม่สำเร็จ ลองใหม่"};
      try{ var ns=(await sb.auth.getSession()).data.session; if(ns&&ns.user) watch(sb, ns.user.id); }catch(_e){}
      return {ok:true,role:j.role?String(j.role):null,scope:j.scope||null};
    }catch(e){ console.warn("RevAuth.login",e); return {ok:false,error:"network",msg:"เชื่อมต่อไม่ได้ ลองใหม่"}; }
  }

  async function logout(sb){
    /* scope local: บัญชีการเงินใช้ร่วมกันหลายเครื่อง — ออกเฉพาะเครื่องนี้ */
    try{ if(sb) await sb.auth.signOut({scope:"local"}); }catch(e){}
    /* signOut อาจล้มเหลว (เน็ตหลุด) แล้วไม่ลบ session — ลบ session ที่เก็บในเครื่องนี้เองด้วย */
    try{ localStorage.removeItem("sb-rev-kmmh"); }catch(e){}
    try{ localStorage.removeItem("rev_role"); }catch(e){}
  }

  window.RevAuth={login:login,currentRole:currentRole,logout:logout,DENY_MSG:DENY_MSG};
})();
