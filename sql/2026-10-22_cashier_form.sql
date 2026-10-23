-- ฟอร์มรายรับแคชเชียร์ในโปรแกรม (22 ต.ค.69) — ยังไม่รันบนระบบจริง ต้องให้เจ้าของกดอนุมัติก่อน
-- 1) ตารางเก็บรายการที่แคชเชียร์กรอก (วันละ 1 แถว)
create table if not exists public.rev_cashier_form (
  date            date primary key,
  entries         jsonb not null default '{}'::jsonb,   -- {rcash:[{amt,ra}], scash:[{bill,amt}], xfer:[{bill,kp,ks}], credit:[{bill,amt}], oldc:[], oldx:[], upk:[]}
  status          text  not null default 'draft' check (status in ('draft','submitted')),
  updated_role    text,
  updated_at      timestamptz not null default now(),
  submitted_role  text,
  submitted_at    timestamptz
);
alter table public.rev_cashier_form enable row level security;
-- สิทธิ์เหมือนตาราง rev_* อื่น: ต้องมี session เจ้าของ (หน้าเว็บเรียก ensureOwnerSession) · ไม่มีสิทธิ์ลบ
create policy rev_cashier_form_sel on public.rev_cashier_form for select to authenticated using (is_owner());
create policy rev_cashier_form_ins on public.rev_cashier_form for insert to authenticated with check (is_owner());
create policy rev_cashier_form_upd on public.rev_cashier_form for update to authenticated using (is_owner()) with check (is_owner());
revoke all on public.rev_cashier_form from anon;

-- 2) ข้อมูล ACC ที่หน้าฟอร์มต้องใช้ (ตาราง acc_* อ่านตรงจากหน้าเว็บไม่ได้ จึงเปิดผ่านฟังก์ชันแบบเดียวกับ rev_cut_bills)
--    คืน: เวลาซิงก์ล่าสุด · บิลขายของวันนั้น + บิลที่ขอเพิ่ม (บิลเก่า) · ใบรับมัดจำของวันนั้น + ที่ขอเพิ่ม · มัดจำที่หักในบิล · ใบลดหนี้ที่ใช้เป็นเครดิต
create or replace function public.rev_cashier_form_acc(p_date date, p_extra text[] default '{}')
returns jsonb language sql stable security definer set search_path = public as $$
  select case when not is_owner() then null else jsonb_build_object(
    'synced_at', (select max(finished_at) from acc_sync_log where status = 'ok'),
    'bills', coalesce((select jsonb_agg(jsonb_build_array(b.doc_no, b.doc_date, b.c_code, trim(b.c_name), b.grand_total) order by b.doc_no)
               from acc_bills b where not coalesce(b.is_cancel,false) and (b.doc_date = p_date or b.doc_no = any(p_extra))), '[]'::jsonb),
    'deps',  coalesce((select jsonb_agg(jsonb_build_array(d.doc_no, d.doc_date, d.c_code, trim(d.c_name), d.grand_total, d.pay_method) order by d.doc_no)
               from acc_deposits d where not coalesce(d.is_cancel,false) and (d.doc_date = p_date or d.doc_no = any(p_extra))), '[]'::jsonb),
    'uses',  coalesce((select jsonb_agg(jsonb_build_array(u.dept_no, u.inv_no, u.dept_amt))
               from acc_deposit_uses u join acc_bills b on b.doc_no = u.inv_no where b.doc_date = p_date or b.doc_no = any(p_extra)), '[]'::jsonb),
    'cns',   coalesce((select jsonb_agg(jsonb_build_array(c.doc_no, c.inv_no, nullif(trim(c.inv_no2),''), c.grand_total))
               from acc_credit_notes c where not coalesce(c.is_cancel,false)
                 and nullif(trim(c.inv_no2),'') is not null and trim(c.inv_no2) <> trim(coalesce(c.inv_no,''))
                 and trim(c.inv_no2) in (select doc_no from acc_bills where doc_date = p_date or doc_no = any(p_extra))), '[]'::jsonb)
  ) end;
$$;
revoke all on function public.rev_cashier_form_acc(date, text[]) from public, anon;
grant execute on function public.rev_cashier_form_acc(date, text[]) to authenticated;

-- ย้อนกลับ (ถ้าต้องการ):
--   drop function if exists public.rev_cashier_form_acc(date, text[]);
--   drop table if exists public.rev_cashier_form;   -- ⚠ ลบรายการที่แคชเชียร์กรอกไว้ทั้งหมด
