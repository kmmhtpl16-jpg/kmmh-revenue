-- ตรวจรายได้ v0.7.9 (29 ต.ค.69) — ให้ "แก้" แถวคืนเงิน / รายรับอื่นๆ ได้ (เดิมเพิ่ม/ลบได้อย่างเดียว)
-- งาน inbox 20261028-1640 ข้อ 4 (คุณหลิง 17:11): แถวคืนเงินมีปุ่มแก้ (ยอด / สด-โอน / เลขบิลที่ผูก) ทั้งในฟอร์มและกล่องเดิม
--
-- สิทธิ์ = เท่ากับ "ลบ" ที่มีอยู่แล้ว ไม่กว้างกว่าเดิม:
--   เจ้าของ/การเงิน (is_owner_or_finance) แก้ได้ทุกวัน
--   แคชเชียร์ (rev_is_cashier) แก้ได้เฉพาะแถวของวันนี้/เมื่อวาน (ทั้งค่าเดิมและค่าใหม่)
-- trigger เดิมทำงานกับ UPDATE อยู่แล้ว (ตรวจ 29 ต.ค.69 จาก pg_trigger):
--   rev_form_child_guard  — ฟอร์มส่งแล้ว = แคชเชียร์แก้ไม่ได้ · ยอดต้องเป็นตัวเลขไม่ติดลบ
--   rev_refund_appr_guard — เจ้าของอนุมัติตัดบิลของวัน/บิลนั้นแล้ว = แคชเชียร์แก้ไม่ได้ (ตรวจทั้งค่าเดิมและค่าใหม่)
-- ให้สิทธิ์ UPDATE เฉพาะช่องที่หน้าเว็บแก้ (ไม่รวม date / created_role / id):
--   คืนเงิน: เดิมไม่มีสิทธิ์ UPDATE → ให้เฉพาะช่อง
--   รายรับอื่นๆ: เดิม authenticated/anon มีสิทธิ์ UPDATE ทั้งตาราง (แต่ไม่มี policy จึงแก้ไม่ได้) → ถอนทั้งตาราง แล้วให้เฉพาะช่อง (กันแก้ created_role / date)

begin;

grant update (bill_no, cn_no, kind, amount, pay, cn_manual) on public.rev_cash_refund to authenticated;

revoke update on public.rev_cash_other from authenticated, anon;
grant update (item, amount, channel) on public.rev_cash_other to authenticated;

create policy rr_fin__rev_cash_refund__update on public.rev_cash_refund
  for update to authenticated
  using (public.is_owner_or_finance())
  with check (public.is_owner_or_finance());

create policy rr_cashier__rev_cash_refund__update on public.rev_cash_refund
  for update to authenticated
  using (public.rev_is_cashier() and date between public.rev_bkk_today() - 1 and public.rev_bkk_today())
  with check (public.rev_is_cashier() and date between public.rev_bkk_today() - 1 and public.rev_bkk_today());

create policy rev_cash_other_upd on public.rev_cash_other
  for update to authenticated
  using (public.is_owner_or_finance())
  with check (public.is_owner_or_finance());

create policy rr_cashier__rev_cash_other__update on public.rev_cash_other
  for update to authenticated
  using (public.rev_is_cashier() and date between public.rev_bkk_today() - 1 and public.rev_bkk_today())
  with check (public.rev_is_cashier() and date between public.rev_bkk_today() - 1 and public.rev_bkk_today());

commit;

-- ตรวจหลังรัน (ควรได้ 4 แถว):
-- select tablename, policyname, cmd from pg_policies where tablename in ('rev_cash_refund','rev_cash_other') and cmd='UPDATE';

-- ===== ย้อนกลับ (ถ้าต้องการ) =====
-- begin;
-- drop policy if exists rr_fin__rev_cash_refund__update on public.rev_cash_refund;
-- drop policy if exists rr_cashier__rev_cash_refund__update on public.rev_cash_refund;
-- drop policy if exists rev_cash_other_upd on public.rev_cash_other;
-- drop policy if exists rr_cashier__rev_cash_other__update on public.rev_cash_other;
-- revoke update (bill_no, cn_no, kind, amount, pay, cn_manual) on public.rev_cash_refund from authenticated;
-- revoke update (item, amount, channel) on public.rev_cash_other from authenticated;
-- grant update on public.rev_cash_other to authenticated, anon;   -- คืนสิทธิ์ระดับตารางแบบเดิม
-- commit;
