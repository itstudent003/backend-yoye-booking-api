# Role & Permission Reference

ไฟล์นี้รวม **permission matrix** ที่ทุก feature ต้องเคารพ ทั้ง backend (enforce) และ frontend (hide UI)

## Roles

| Role | UI key | API key | Description |
|------|--------|---------|-------------|
| Admin | `admin` | `ADMIN` | แอดมินทั่วไป — จัดการคิว/บัตร/การเงินส่วนใหญ่ |
| Super Admin | `superAdmin` | `SUPER_ADMIN` | สิทธิ์เต็ม + Override พิเศษ + จัดการ admin/presser |
| Presser ⭐ ใหม่ | `presser` | `PRESSER` | ทีมกดบัตร — เห็นเฉพาะงานที่ assign |

> ค่า enum ใน UI ใช้ camelCase, ใน API ใช้ SCREAMING_SNAKE — มี mapping ใน `app/(protect)/users/types.ts`

## Permission matrix

✅ = อนุญาต · ❌ = ห้าม · 🟡 = อนุญาตเฉพาะของตัวเอง / ที่ assign

| Feature | ADMIN | SUPER_ADMIN | PRESSER |
|---------|:-----:|:-----------:|:-------:|
| **Dashboard** ทั่วไป | ✅ | ✅ | ❌ (มี dashboard ของ Presser แยก) |
| **Events** — list/view | ✅ | ✅ | 🟡 เฉพาะ event ที่มี booking ตัวเอง |
| **Events** — create/edit/delete | ✅ | ✅ | ❌ |
| **Bookings** — list ทั้งหมด | ✅ | ✅ | ❌ |
| **Bookings** — list ที่ assign ตัวเอง | — | — | ✅ |
| **Bookings** — view detail (incl. PII, login, deep info) | ✅ | ✅ | 🟡 เฉพาะที่ assign |
| **Bookings** — change status (Phase 1–2) | ✅ | ✅ | ❌ |
| **Bookings** — change status (Phase 3 booking-related) | ✅ | ✅ | 🟡 เฉพาะที่ assign |
| **Bookings** — assign Presser | ✅ | ✅ | ❌ |
| **Payments** — list slips ทั้งหมด | ✅ | ✅ | ❌ |
| **Payments** — verify slip | ✅ | ✅ | ❌ |
| **Refund** — list/view | ✅ | ✅ | ❌ |
| **Refund** — create/approve/reject/pay | ✅ | ✅ | ❌ |
| **Finance** — summary/deposits/fees/refunds | ✅ | ✅ | ❌ |
| **Tracking** (สรุปยอด+จัดส่ง) | ✅ | ✅ | ❌ |
| **Users** — view admin list | ✅ | ✅ | ❌ |
| **Users** — create admin/super_admin | ❌ | ✅ | ❌ |
| **Users** — create presser | ✅ | ✅ | ❌ |
| **Users** — delete | ❌ | ✅ | ❌ |
| **Expense** — submit (ทีม / ตัวเอง) | ✅ | ✅ | ✅ |
| **Expense** — approve | ✅ | ✅ | ❌ |
| **Deposit Override** (แก้ ใช้/คืน/ยึด) | ❌ | ✅ | ❌ |
| **Booked tickets** (ราคา/โซน/ที่นั่ง) — บันทึก | ❌ | ❌ | ✅ |
| **Booked tickets** — แก้ไข/ลบ | ✅ | ✅ | 🟡 เฉพาะของตัวเอง ภายใน X ชั่วโมง |

## Frontend enforcement pattern

```ts
// ใน sidebar (components/sidebar.tsx) ให้ filter ก่อน render
const { user } = useMeStore();
const visibleNav = navigation.filter((item) => isVisibleFor(user?.role, item.href));
```

```ts
// ใน hook ให้เช็ค role ก่อน fetch (เลี่ยง 403 noise)
const { user } = useMeStore();
const enabled = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
const { data } = useQueryGet([...], "/...", undefined, { enabled });
```

## Backend enforcement (must)

- ทุก endpoint ที่จำกัด role ต้อง check JWT claim `role` ใน middleware/guard
- API ของ Presser ทุกตัวต้อง filter `WHERE pressersOnBooking.userId = currentUser.id` ก่อน return
- Query ที่อาจ leak ข้อมูล (เช่น list bookings) ต้องใช้ scoped query แม้ frontend จะเรียก endpoint เดียวกัน — back-end เลือก data ตาม role อัตโนมัติ

## ห้ามรั่ว field

ตาม requirement "ความเป็นส่วนตัว" — ฝั่ง Presser **ห้ามคืน field เหล่านี้** จาก API:

- `Booking.netCardPrice`, `serviceFee`, `vatAmount`, `totalPaid` (ยอดเงินร้าน)
- `Booking.refundAmount`
- `BillingRecord.*`, `Fulfillment.shippingFee`
- `Customer.idCardNumber`, `Customer.email` (ถ้ามี)
- `User.*` (ของ admin ท่านอื่น)

Presser ต้องเห็น (ตาม xlsx detail page):
- ข้อมูลลูกค้าระดับ "เชิงลึก" — อีเมล, **password (ของระบบที่ใช้กด — ฝาก credentials)**, โซนสำรอง
- รายการบัตรที่ต้องกด, สถานะมัดจำ (qualitative: "มี/ไม่มี" ไม่ใช่ตัวเลข)

> **คำเตือน**: การเก็บ password ของลูกค้า (สำหรับ login เว็บกดบัตร) เป็นเรื่องอ่อนไหว — ดู spec 02 สำหรับ pattern การเข้ารหัสและ access log

## DB hint สำหรับ Backend

```prisma
enum AdminRole {
  ADMIN
  SUPER_ADMIN
  PRESSER
}

model BookingPresser {
  bookingId  Int
  pressersId Int
  assignedAt DateTime @default(now())
  assignedBy Int
  booking    Booking  @relation(fields: [bookingId], references: [id])
  presser    User     @relation(fields: [pressersId], references: [id])
  @@id([bookingId, pressersId])
}
```

> 1 Booking → Many Pressers (ตาม xlsx: "1 Booking assign ได้หลายคน")
