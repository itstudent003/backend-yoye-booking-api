---
name: yoye-improvements
description: Implementation specs สำหรับ 11 รายการปรับปรุงระบบ yoye-admin (จาก improvment/yoye improvment.xlsx). ใช้เมื่อจะ implement หรือ plan งานเหล่านี้ — เพิ่ม Role "Presser", หน้า List/Detail สำหรับ Presser, ระบบบันทึกที่นั่งที่กดได้, ระบบจัดการมัดจำอัตโนมัติ, Admin Override มัดจำ, ระบบ Refund Request, Refund Breakdown, Action-Based Dashboard, Finance Card + Notification, ระบบ Expense, Activity Log ภาษาคน. โหลด spec แต่ละไฟล์ใน `specs/` ก่อนเริ่มแก้ codebase ในส่วนที่เกี่ยวข้อง.
---

# yoye-improvements

Skill นี้รวม implementation spec สำหรับ **11 task ปรับปรุงระบบ yoye-admin** ตามที่ระบุไว้ใน `improvment/yoye improvment.xlsx` โดยอ้างอิง schema ปัจจุบัน (`schema.md`), enum/status lifecycle (`plan.md`) และ pattern ของ frontend ปัจจุบัน (Next.js App Router + React Query + Zustand + Zod + shadcn/ui).

## เมื่อไรควรใช้ skill นี้

- ผู้ใช้ขอ implement task ใด task หนึ่งใน 11 รายการนี้
- ผู้ใช้ถามถึง "ทีมกด / Presser", "ระบบมัดจำ", "ระบบคืนเงิน", "Refund Request", "Expense", "Activity Log ภาษาคน", "Action-Based Dashboard"
- ผู้ใช้แก้ไข schema/route/UI ที่กระทบกับ status lifecycle หรือ permission ของ role ใหม่

## โครงสร้าง

```
.claude/skills/yoye-improvements/
├── SKILL.md                          ← (ไฟล์นี้)
├── references/
│   ├── architecture.md               ← stack, file conventions, frontend ↔ backend
│   ├── status-lifecycle.md           ← สถานะ booking/deposit/refund + matrix การโอน
│   ├── role-permissions.md           ← Permission matrix: ADMIN / SUPER_ADMIN / PRESSER
│   └── backend-changes.md            ← Backend implementation checklist (consolidated)
└── specs/
    ├── 01-presser-role.md            ← เพิ่ม Role "Presser"
    ├── 02-presser-pages.md           ← หน้า List/Detail สำหรับ Presser
    ├── 03-booked-tickets-record.md   ← บันทึกราคา/โซน/ที่นั่งที่กดได้
    ├── 04-deposit-automation.md      ← จัดการมัดจำอัตโนมัติ
    ├── 05-deposit-admin-override.md  ← Admin Override มัดจำ
    ├── 06-refund-request.md          ← Refund Request flow
    ├── 07-refund-breakdown.md        ← Refund breakdown by category
    ├── 08-action-dashboard.md        ← Action-Based Dashboard
    ├── 09-finance-card-notification.md ← Finance card + Notification clickable
    ├── 10-expense-system.md          ← บันทึก/อนุมัติค่าใช้จ่ายร้าน
    └── 11-activity-log-humanize.md   ← Activity Log ภาษาคน
```

## การใช้งาน

1. **อ่าน reference ก่อน** — เริ่มจาก `references/architecture.md` เพื่อรู้ pattern ของโปรเจกต์ ก่อนแตะ feature ใด ๆ
2. **เลือก spec** — เปิดไฟล์ใน `specs/NN-*.md` ที่ตรงกับ task ที่จะทำ
3. **เช็ค dependency** — แต่ละ spec มี section "Dependencies" บอกว่ามี task อื่นต้องทำก่อนไหม (เช่น 02-presser-pages ต้องเสร็จ 01-presser-role ก่อน)
4. **ทำตาม checklist** — แต่ละ spec มี:
   - **Backend changes** (Prisma + API endpoints — เป็น guideline เพราะ backend อยู่อีก repo `admin-api.yoyemuethong.com`)
   - **Frontend changes** (file paths ใน `app/(protect)/...`, hooks, components, validation)
   - **Acceptance criteria**

## หลักการสำคัญที่ต้องเคารพ

ตาม requirement ใน xlsx:

1. **Privacy** — Presser เห็นได้เฉพาะ booking ที่ assign ให้ตนเอง และห้ามเห็นข้อมูลการเงินของร้านที่ไม่เกี่ยวข้อง
2. **Transparency** — สรุปค่ากดต้องตรงกันทั้งฝั่งลูกค้าและร้าน รวม VAT 7% (เฉพาะ delivery)
3. **Accuracy of Profit** — Expense ต้องไม่ถูกนับเข้าระบบจนกว่า admin จะกด "อนุมัติ"

## Stack ที่ใช้ (frontend)

- Next.js 16 App Router · TypeScript · Tailwind v4 · shadcn/ui
- Auth: cookie `access_token` ตรวจผ่าน `middleware.ts` → `/api/v1/auth/me`
- API: `lib/axios.ts` (`baseURL: /api/v1`, `withCredentials: true`)
- Server state: `@tanstack/react-query` v4 ผ่าน `service/globalQuery.ts`
- Client state: Zustand (`store/meStore.ts`)
- Forms: react-hook-form + zod
- File pattern: `app/(protect)/<feature>/{page.tsx, hooks/, components/, types/, validate/, utils/}`

## Backend mapping

Backend จริงอยู่ที่ `https://admin-api.yoyemuethong.com/api/v1` (Next.js rewrite via `next.config.ts`) — เป็น repo แยก ดังนั้น backend section ใน spec เป็น **guideline สำหรับทีม backend** ไม่ใช่ code ที่ต้องแก้ใน repo นี้
