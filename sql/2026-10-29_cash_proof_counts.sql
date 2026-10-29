-- ตรวจรายได้ v0.7.9 (29 ต.ค.69) — ตารางนับเงินสดในฟอร์มรายรับ (งาน inbox 20261029-0900 · คุณหลิงอนุมัติแบบหน้าตา 09:03)
-- เก็บ "จำนวน" แบงค์/เหรียญแต่ละชนิดไว้กับใบนับ (ปริ้น/ดูย้อนหลัง) · ยอดนับยังอยู่ที่ rev_cash_proof.amount ที่เดียวเหมือนเดิม
-- counts = {"1000":4,"500":3,"100":12,"50":5,"20":4,"10":3,"5":1,"2":0,"1":6,"st":0.5}  (st = เศษสตางค์ บาท 0–0.99 · ไม่มี = 0)
-- กันข้อมูลขัดกัน: ถ้ามี counts ยอดรวมจากจำนวนต้องเท่ากับ amount เป๊ะ · จำนวนต้องเป็นจำนวนเต็ม 0–100000 · ใส่ได้เฉพาะชนิดที่รู้จัก
-- วันเก่า / กล่องเดิมในหน้าตรวจรายได้ (พิมพ์ยอดรวมอย่างเดียว) = counts ว่าง (null) ได้ตามเดิม
-- ไม่แตะสิทธิ์/RLS · trigger เดิม (rev_form_child_guard / rev_cash_proof_req_guard / rev_stamp_role) ทำงานเหมือนเดิม
-- ต้องรันก่อนขึ้นเว็บชุดนี้ (หน้าเว็บส่งช่อง counts — ไม่มีช่อง = บันทึกใบนับไม่ได้)

begin;

create or replace function public.rev_cash_counts_ok(c jsonb, amt numeric)
returns boolean language sql immutable set search_path = pg_catalog, public as $$
  select c is null or (
    jsonb_typeof(c) = 'object'
    and not exists (select 1 from jsonb_object_keys(c) k where k not in ('1000','500','100','50','20','10','5','2','1','st'))
    and not exists (select 1 from jsonb_each(c) e where jsonb_typeof(e.value) <> 'number')
    and not exists (select 1 from jsonb_each(c) e where e.key <> 'st' and ((e.value)::numeric < 0 or (e.value)::numeric > 100000 or (e.value)::numeric <> trunc((e.value)::numeric)))
    and coalesce((c->>'st')::numeric, 0) >= 0 and coalesce((c->>'st')::numeric, 0) < 1
    and round(coalesce((c->>'st')::numeric, 0), 2) = coalesce((c->>'st')::numeric, 0)
    and amt is not null
    and (select coalesce(sum(case when e.key = 'st' then (e.value)::numeric else e.key::numeric * (e.value)::numeric end), 0) from jsonb_each(c) e) = amt
  );
$$;

-- ฐานจริงให้ anon ใช้ฟังก์ชันใหม่ได้อัตโนมัติ (default privileges) → ถอนออก · authenticated ต้องใช้ได้ (CHECK รันด้วยสิทธิ์ผู้บันทึก)
revoke execute on function public.rev_cash_counts_ok(jsonb, numeric) from public, anon;
grant execute on function public.rev_cash_counts_ok(jsonb, numeric) to authenticated;

alter table public.rev_cash_proof     add column if not exists counts jsonb;
alter table public.rev_cash_proof_req add column if not exists counts jsonb;

alter table public.rev_cash_proof     add constraint rev_cash_proof_counts_ok     check (public.rev_cash_counts_ok(counts, amount));
alter table public.rev_cash_proof_req add constraint rev_cash_proof_req_counts_ok check (public.rev_cash_counts_ok(counts, amount));

commit;

-- ตรวจหลังรัน: select column_name from information_schema.columns where table_name in ('rev_cash_proof','rev_cash_proof_req') and column_name='counts';  -- ได้ 2 แถว
-- ทดสอบตัวกัน (ไม่เขียนข้อมูล): select public.rev_cash_counts_ok('{"1000":4,"500":3,"100":12,"50":5,"20":4,"10":3,"5":1,"1":6}'::jsonb, 7071);  -- true
--                               select public.rev_cash_counts_ok('{"1000":4}'::jsonb, 7071);  -- false

-- ===== ย้อนกลับ =====
-- begin;
-- alter table public.rev_cash_proof     drop constraint if exists rev_cash_proof_counts_ok;
-- alter table public.rev_cash_proof_req drop constraint if exists rev_cash_proof_req_counts_ok;
-- alter table public.rev_cash_proof     drop column if exists counts;
-- alter table public.rev_cash_proof_req drop column if exists counts;
-- drop function if exists public.rev_cash_counts_ok(jsonb, numeric);
-- commit;
