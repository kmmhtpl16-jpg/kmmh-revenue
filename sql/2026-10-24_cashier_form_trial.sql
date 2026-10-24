-- ฟอร์มรายรับ "โหมดทดลอง" (24 ต.ค.69) — ยังไม่รันบนระบบจริง ต้องให้เจ้าของกดอนุมัติก่อน
-- ที่เก็บข้อมูลที่ลองกรอกในโหมดทดลอง แยกจากของจริงทั้งหมด (วันละ 1 แถว เหมือน rev_cashier_form)
-- ไม่มีอะไรอ่านตารางนี้ไปคิดเงิน/ตัดบิล/แจ้งเตือน — มีแค่หน้าฟอร์มรายรับตอนเปิดโหมดทดลอง
-- สิทธิ์: พนักงานโปรแกรมตรวจรายได้ทุกบทบาท (เจ้าของ/การเงิน/แคชเชียร์ ที่ session ยังไม่หมด = rev_is_staff()) อ่าน/เพิ่ม/แก้ได้
--        ลบได้เฉพาะเจ้าของ/การเงิน · คนไม่ล็อกอิน (anon) ทำอะไรไม่ได้
begin;

create table if not exists public.rev_cashier_form_trial (
  date          date primary key,
  entries       jsonb not null default '{}'::jsonb,   -- เหมือนฟอร์มจริง + other/refund/count (โหมดทดลองกรอกในฟอร์มเลย ไม่ไปลงกล่องจริง)
  updated_by    uuid,
  updated_role  text,
  updated_at    timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  constraint rev_cashier_form_trial_entries_obj check (jsonb_typeof(entries) = 'object'),
  constraint rev_cashier_form_trial_entries_size check (pg_column_size(entries) <= 262144),
  -- ช่องรายการต้องเป็น array (ถ้ามี) — กันข้อมูลรูปแบบเพี้ยนทำให้หน้าฟอร์มเปิดไม่ได้
  constraint rev_cashier_form_trial_entries_shape check (
    coalesce(jsonb_typeof(entries->'rcash'), 'array') = 'array' and coalesce(jsonb_typeof(entries->'scash'), 'array') = 'array'
    and coalesce(jsonb_typeof(entries->'xfer'), 'array') = 'array' and coalesce(jsonb_typeof(entries->'credit'), 'array') = 'array'
    and coalesce(jsonb_typeof(entries->'oldc'), 'array') = 'array' and coalesce(jsonb_typeof(entries->'oldx'), 'array') = 'array'
    and coalesce(jsonb_typeof(entries->'upk'), 'array') = 'array' and coalesce(jsonb_typeof(entries->'other'), 'array') = 'array'
    and coalesce(jsonb_typeof(entries->'refund'), 'array') = 'array'
    and coalesce(jsonb_typeof(entries->'count'), 'number') in ('number', 'string', 'null'))
);

-- ผู้แก้ล่าสุด/เวลา ตั้งจากฝั่งฐานเสมอ (หน้าเว็บส่งมาเองไม่ได้) · ห้ามย้ายวันที่ของแถว · ห้ามลงวันในอนาคต (ทดลองย้อนหลังเท่านั้น วันนี้ได้)
create or replace function public.rev_cashier_form_trial_stamp()
returns trigger language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
begin
  if tg_op = 'UPDATE' and new.date is distinct from old.date then
    raise exception 'เปลี่ยนวันที่ของฟอร์มทดลองไม่ได้' using errcode = '42501';
  end if;
  if new.date > public.rev_bkk_today() then
    raise exception 'โหมดทดลองใช้ได้กับวันนี้หรือวันที่ผ่านมาแล้วเท่านั้น' using errcode = '22023';
  end if;
  new.updated_by := auth.uid();
  new.updated_role := coalesce(public.rev_my_role(), case when coalesce(public.rev_is_restricted(), true) then null else 'system' end);
  new.updated_at := now();
  if tg_op = 'INSERT' then new.created_at := now(); else new.created_at := old.created_at; end if;
  return new;
end $$;
revoke all on function public.rev_cashier_form_trial_stamp() from public, anon, authenticated;

drop trigger if exists rev_cashier_form_trial_stamp on public.rev_cashier_form_trial;
create trigger rev_cashier_form_trial_stamp before insert or update on public.rev_cashier_form_trial
  for each row execute function public.rev_cashier_form_trial_stamp();

alter table public.rev_cashier_form_trial enable row level security;
drop policy if exists rev_cashier_form_trial_sel on public.rev_cashier_form_trial;
drop policy if exists rev_cashier_form_trial_ins on public.rev_cashier_form_trial;
drop policy if exists rev_cashier_form_trial_upd on public.rev_cashier_form_trial;
drop policy if exists rev_cashier_form_trial_del on public.rev_cashier_form_trial;
create policy rev_cashier_form_trial_sel on public.rev_cashier_form_trial for select to authenticated using (public.rev_is_staff());
create policy rev_cashier_form_trial_ins on public.rev_cashier_form_trial for insert to authenticated with check (public.rev_is_staff());
create policy rev_cashier_form_trial_upd on public.rev_cashier_form_trial for update to authenticated using (public.rev_is_staff()) with check (public.rev_is_staff());
create policy rev_cashier_form_trial_del on public.rev_cashier_form_trial for delete to authenticated using (public.is_owner_or_finance());

revoke all on public.rev_cashier_form_trial from public, anon, authenticated;
grant select, insert, update, delete on public.rev_cashier_form_trial to authenticated;
grant all on public.rev_cashier_form_trial to service_role;

commit;

-- ตรวจหลังรัน (ควรได้ rls=true · anon ไม่มีสิทธิ์ · 4 policy):
--   select relrowsecurity from pg_class where oid = 'public.rev_cashier_form_trial'::regclass;
--   select grantee, string_agg(privilege_type, ',') from information_schema.role_table_grants where table_name = 'rev_cashier_form_trial' group by 1;
--   select polname from pg_policy where polrelid = 'public.rev_cashier_form_trial'::regclass;
-- ย้อนกลับ (ลบเฉพาะของโหมดทดลอง ไม่แตะฟอร์มจริง):
--   drop table if exists public.rev_cashier_form_trial;   -- ⚠ ข้อมูลที่ลองกรอกไว้หายหมด
--   drop function if exists public.rev_cashier_form_trial_stamp();
