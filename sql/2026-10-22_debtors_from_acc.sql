-- ลูกหนี้ลงบัญชีเทียบ ACC (22 ต.ค.69) — ยังไม่รันบนระบบจริง ต้องให้เจ้าของกดอนุมัติก่อน (แยกเป็น 2 ขั้น)
-- กติกาที่เจ้าของเคาะ: รายการค้างเอาจาก ACC ตั้งแต่ มิ.ย.2569 · บิลที่มีใบเสร็จ RC ใน ACC แล้ว ตัดออก (ด้วยปุ่ม ไม่ปิดเอง)
--                     บิลเก่าที่ไม่มีเลขบิลลบได้ (สำรองก่อน) · รายการหลอกปิด + บันทึกเลข RC ไม่ลบ

-- ═════ ขั้น A: ฟังก์ชัน (ไม่แก้ข้อมูลเดิม) ═════
-- A1) เติมบิลค้างจาก ACC ที่ยังไม่อยู่ในหน้าลูกหนี้ (เรียกตอนเปิดหน้าลูกหนี้ · กดซ้ำได้ ไม่สร้างซ้ำ)
--     ไม่รวม Shopee (โปรแกรม Shopee ดูแลเอง) · บิลลูกค้าปลีก (คุณ 1) เอาเฉพาะที่ค้างเกิน 3 วัน (บิลเงินสดของวันล่าสุดยังรอรอบตัด RC ปกติ)
create or replace function public.rev_credit_sync_acc(p_from date default '2026-06-01')
returns integer language plpgsql security definer set search_path = public as $$
declare n integer := 0; bkk date := (now() at time zone 'Asia/Bangkok')::date;
begin
  if not is_owner() then return 0; end if;
  insert into rev_credit_bills (source_key, bill_no, customer, customer_code, bill_date, total_amount, paid_amount, status, source, note, created_by)
  select 'acc#'||v.doc_no, v.doc_no, trim(b.c_name), b.c_code, v.doc_date, v.grand_total,
         round(v.grand_total - v.outstanding, 2),
         case when v.grand_total - v.outstanding > 0.009 then 'partial' else 'open' end,
         'acc', 'ดึงจาก ACC (บิลค้าง ไม่มีใบเสร็จ RC ครบ)', 'acc-sync'
  from acc_bill_outstanding v join acc_bills b on b.doc_no = v.doc_no
  where v.doc_date >= p_from and v.outstanding > 0.009 and not coalesce(b.is_cancel,false)
    and b.c_name not ilike '%shopee%'
    and (b.c_code <> '66-00026' or v.doc_date <= bkk - 3)
    and not exists (select 1 from rev_credit_bills r where r.bill_no = v.doc_no)
  on conflict (source_key) do nothing;
  get diagnostics n = row_count;
  return n;
end $$;

-- A2) รายการในหน้าลูกหนี้ที่ ACC ตัดครบแล้ว (มีใบเสร็จ RC) แต่ในโปรแกรมยังค้าง → ขึ้นป้าย "ACC ตัดแล้ว"
create or replace function public.rev_credit_acc_paid()
returns jsonb language sql stable security definer set search_path = public as $$
  select case when not is_owner() then '[]'::jsonb else coalesce((
    select jsonb_agg(jsonb_build_object('id',r.id,'bill_no',r.bill_no,'customer',r.customer,'bill_date',r.bill_date,
             'remain', round(r.total_amount - coalesce(r.paid_amount,0),2),
             'rc', (select string_agg(distinct p.rc_doc_no, ',' order by p.rc_doc_no) from acc_bill_payments p where p.inv_no = r.bill_no),
             'rc_date', v.last_pay_date) order by r.bill_date, r.bill_no)
    from rev_credit_bills r join acc_bill_outstanding v on v.doc_no = r.bill_no
    where r.status in ('open','partial') and v.outstanding <= 0.009
      and exists (select 1 from acc_bill_payments p where p.inv_no = r.bill_no and nullif(trim(p.rc_doc_no),'') is not null)), '[]'::jsonb) end;
$$;

-- A3) ปิดตาม ACC (กดจากปุ่ม) — บันทึกรับชำระส่วนที่เหลือ อ้างเลข RC แล้วเปลี่ยนเป็นจ่ายแล้ว · ปิดเฉพาะใบที่ ACC ตัดครบจริงตอนกด
create or replace function public.rev_credit_close_by_acc(p_ids uuid[], p_by text default null)
returns integer language plpgsql security definer set search_path = public as $$
declare r record; c2 record; n integer := 0; rc text; rcd date;
begin
  if not is_owner() then return 0; end if;
  for r in select c.id from rev_credit_bills c join acc_bill_outstanding v on v.doc_no = c.bill_no
           where c.id = any(p_ids) and c.status in ('open','partial') and v.outstanding <= 0.009 loop
    -- ล็อกแถวแล้วอ่านสถานะ/ยอดใหม่ กันกดปิดพร้อมกัน 2 ครั้งแล้วบันทึกรับชำระซ้ำ
    select * into c2 from rev_credit_bills where id = r.id and status in ('open','partial') for update;
    if not found then continue; end if;
    r := c2;
    -- เช็ก ACC ซ้ำหลังได้ล็อก: ยังตัดครบ และมีใบเสร็จ RC จริง (กติกาเจ้าของ: ปิดเฉพาะบิลที่มี RC ใน ACC)
    if not exists (select 1 from acc_bill_outstanding v where v.doc_no = r.bill_no and v.outstanding <= 0.009) then continue; end if;
    select string_agg(distinct p.rc_doc_no, ',' order by p.rc_doc_no), max(p.rc_date) into rc, rcd
      from acc_bill_payments p where p.inv_no = r.bill_no and nullif(trim(p.rc_doc_no),'') is not null;
    if rc is null then continue; end if;
    if round(r.total_amount - coalesce(r.paid_amount,0),2) > 0 then
      insert into rev_credit_payments (bill_id, pay_date, amount, method, ref, confirmed_by, batch_ref)
      values (r.id, coalesce(rcd,(now() at time zone 'Asia/Bangkok')::date), round(r.total_amount - coalesce(r.paid_amount,0),2),
              'ACC', 'ปิดตาม ACC '||coalesce(rc,''), coalesce(p_by,'owner'), 'ACC-CLOSE');
    end if;
    update rev_credit_bills set paid_amount = total_amount, status = 'paid',
           note = trim(both ' ' from coalesce(note,'')||' · ปิดตาม ACC '||coalesce(rc,'')) where id = r.id;
    n := n + 1;
  end loop;
  return n;
end $$;

revoke all on function public.rev_credit_sync_acc(date), public.rev_credit_acc_paid(), public.rev_credit_close_by_acc(uuid[], text) from public, anon;
grant execute on function public.rev_credit_sync_acc(date), public.rev_credit_acc_paid(), public.rev_credit_close_by_acc(uuid[], text) to authenticated;

-- ═════ ขั้น B: แก้ข้อมูล (ขออนุมัติแยก) — ลบบิลเก่า 67 ใบที่ไม่มีเลขบิล (ค้างอยู่) หลังสำรอง ═════
-- ตรวจแล้ว 22 ต.ค.69: 67 ใบนี้ไม่มีการรับชำระ (rev_credit_payments) และไม่มีใบวางบิลผูกอยู่
-- รันทั้งก้อนพร้อมกัน (begin…commit) · จำนวนไม่ใช่ 67 หรือลบไม่ครบ = ยกเลิกทั้งหมด ไม่มีอะไรเปลี่ยน
-- begin;
-- -- ล็อกกันการเขียนพร้อมกัน (รับชำระ/ผูกใบวางบิล) ระหว่างสำรองกับลบ · อ่านได้ตามปกติ ก้อนนี้ใช้ไม่ถึงวินาที
-- lock table public.rev_credit_bills, public.rev_credit_payments in share row exclusive mode;
-- create table public.rev_credit_bills_bak_20261022 as
--   select * from public.rev_credit_bills r where r.bill_no is null and r.status in ('open','partial')
--     and r.billing_note_id is null
--     and not exists (select 1 from public.rev_credit_payments p where p.bill_id = r.id);
-- alter table public.rev_credit_bills_bak_20261022 enable row level security;   -- ไม่มี policy = อ่านจากหน้าเว็บไม่ได้
-- revoke all on public.rev_credit_bills_bak_20261022 from public, anon, authenticated;
-- do $$ declare n int; begin
--   select count(*) into n from public.rev_credit_bills_bak_20261022;
--   if n <> 67 then raise exception 'สำรองได้ % ใบ ไม่ใช่ 67 — ยกเลิก', n; end if; end $$;
-- delete from public.rev_credit_bills r using public.rev_credit_bills_bak_20261022 b where r.id = b.id
--   and r.bill_no is null and r.status in ('open','partial') and r.billing_note_id is null
--   and not exists (select 1 from public.rev_credit_payments p where p.bill_id = r.id);
-- do $$ declare n int; begin
--   select count(*) into n from public.rev_credit_bills r join public.rev_credit_bills_bak_20261022 b on b.id = r.id;
--   if n <> 0 then raise exception 'ยังเหลือ % ใบ — ยกเลิก', n; end if; end $$;
-- commit;
-- ย้อนกลับ: insert into public.rev_credit_bills select * from public.rev_credit_bills_bak_20261022;
