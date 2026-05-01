# Spec 01 — เพิ่ม Role "Presser"

| | |
|--|--|
| **Source** | xlsx row #1 — User Role |
| **Category** | User Role · Backend-heavy |
| **Dependencies** | — (เป็น foundation) |
| **Blocks** | 02, 03, 10 (บางส่วน) |

## เงื่อนไข

- เพิ่ม role ใหม่ชื่อ `PRESSER` (ทีมกดบัตร)
- 1 Booking สามารถ assign Presser ได้หลายคน
- Presser **เห็นเฉพาะ Booking ที่ Admin assign ให้** เท่านั้น

## Backend changes (guideline)

### Prisma schema

```prisma
enum AdminRole {
  ADMIN
  SUPER_ADMIN
  PRESSER          // ← ใหม่
}

model User {
  // ... existing fields
  pressedBookings BookingPresser[]   // ← ใหม่
  assignedByLogs  BookingPresser[]   @relation("AssignedBy")
}

model Booking {
  // ... existing fields
  pressers BookingPresser[]   // ← ใหม่
}

model BookingPresser {
  bookingId  Int
  presserId  Int
  assignedAt DateTime @default(now())
  assignedBy Int
  notes      String?

  booking      Booking @relation(fields: [bookingId], references: [id], onDelete: Cascade)
  presser      User    @relation(fields: [presserId],  references: [id])
  assignedByUser User  @relation("AssignedBy", fields: [assignedBy], references: [id])

  @@id([bookingId, presserId])
  @@index([presserId])
}
```

### API endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/auth/register` | ADMIN, SUPER_ADMIN | รองรับ `role: "PRESSER"` ใน body (เดิมรับเฉพาะ ADMIN) |
| `POST` | `/bookings/:id/pressers` | ADMIN, SUPER_ADMIN | assign array `presserIds: number[]` |
| `DELETE` | `/bookings/:id/pressers/:presserId` | ADMIN, SUPER_ADMIN | un-assign |
| `GET` | `/bookings/:id/pressers` | ADMIN, SUPER_ADMIN, assigned PRESSER | list pressers ของ booking นั้น |

### Auth/middleware

- เพิ่ม PRESSER ใน JWT role claim
- ทุก endpoint ที่ list/get bookings ต้อง check role:
  - PRESSER → `WHERE bookingId IN (SELECT bookingId FROM BookingPresser WHERE presserId = currentUser.id)`
  - กันการเข้า endpoint admin-only ด้วย role guard

## Frontend changes

### 1. อัปเดต type system

ไฟล์: `app/(protect)/users/types.ts`

```ts
export type AdminRole = "admin" | "superAdmin" | "presser";
export type AdminRoleAPI = "ADMIN" | "SUPER_ADMIN" | "PRESSER";

export const roleBadge: Record<AdminRole, string> = {
  admin: "bg-blue-100 text-blue-800",
  superAdmin: "bg-purple-100 text-purple-800",
  presser: "bg-emerald-100 text-emerald-800",  // ← ใหม่
};

export const roleLabel: Record<AdminRoleAPI, string> = {
  ADMIN: "แอดมิน",
  SUPER_ADMIN: "ซูเปอร์แอดมิน",
  PRESSER: "ทีมกดบัตร",
};
```

ไฟล์: `store/meStore.ts` และ `hooks/use-me.ts` — ขยาย `User.role` type ให้รวม `"PRESSER"`

### 2. แก้ฟอร์มเพิ่ม admin → รองรับ role selector

ไฟล์: `app/(protect)/users/validate/add-admin.validate.ts`

```ts
export const addAdminSchema = z.object({
  // ... existing
  role: z.enum(["ADMIN", "SUPER_ADMIN", "PRESSER"]).default("ADMIN"),
});
```

ไฟล์: `app/(protect)/users/components/AddAdminDialog.tsx` — เพิ่ม `<Select>` สำหรับ role (ปุ่ม PRESSER พร้อม helper text "เห็นเฉพาะ booking ที่ assign")

### 3. UserFilterBar เพิ่ม PRESSER

ไฟล์: `app/(protect)/users/components/UserFilterBar.tsx` — เพิ่ม `SelectItem value="PRESSER"`

### 4. Sidebar permission

ไฟล์: `components/sidebar.tsx` — filter `navigation` ตาม role:

```ts
const isPresser = user?.role === "PRESSER";
const visibleNavigation = isPresser
  ? [{ name: "งานที่ต้องกด", href: "/presser", icon: ListChecks }]
  : navigation;
```

### 5. Middleware route guard

ไฟล์: `middleware.ts` — หลัง verify token ให้เช็ค role:

```ts
// หลัง fetch /auth/me สำเร็จ
const me = await res.json();
const role = me?.data?.role;

if (role === "PRESSER" && !pathname.startsWith("/presser")) {
  return NextResponse.redirect(new URL("/presser", request.url));
}
if (role !== "PRESSER" && pathname.startsWith("/presser")) {
  return NextResponse.redirect(new URL("/dashboard", request.url));
}
```

> ต้องเปลี่ยน middleware ให้ส่ง response data ออกจาก `/auth/me` (ปัจจุบันเช็คแค่ status) — ระวัง performance, อาจ cache ใน edge

### 6. Login redirect

ไฟล์: `app/auth/signin/page.tsx` — หลัง login สำเร็จ:

```ts
const role = json.data.role;
router.push(role === "PRESSER" ? "/presser" : "/dashboard");
```

## Acceptance criteria

- [ ] DB migration เพิ่ม enum `PRESSER` + table `BookingPresser`
- [ ] สร้าง user role=PRESSER ผ่านหน้าเพิ่มแอดมินได้
- [ ] User filter list/role badge แสดง "ทีมกดบัตร" สีเขียว
- [ ] Login ด้วย PRESSER → redirect `/presser` ไม่ใช่ `/dashboard`
- [ ] PRESSER เข้า `/dashboard`, `/events`, `/users`, ฯลฯ → ถูก redirect กลับ `/presser`
- [ ] Sidebar ของ PRESSER เห็นแค่เมนูงานกดบัตร (ดู spec 02)
- [ ] API `GET /bookings` ที่เรียกโดย PRESSER → ได้เฉพาะที่ตัวเอง assign

## Test cases

1. SUPER_ADMIN เพิ่ม PRESSER สำเร็จ → ปรากฏใน user list
2. ADMIN พยายาม assign PRESSER ให้ booking ที่ไม่ใช่ event ของตัวเอง — pass (ADMIN เห็นทุก booking)
3. PRESSER ลอง GET `/bookings` ทั้งหมด — ได้ผลลัพธ์เฉพาะของตัวเอง (count ตรงกับ row ใน BookingPresser)
4. assign PRESSER ซ้ำในรายการเดียวกัน — DB constraint reject (composite PK)
