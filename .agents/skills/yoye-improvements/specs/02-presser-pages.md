# Spec 02 — หน้า List & Detail สำหรับ Presser

| | |
|--|--|
| **Source** | xlsx row #2 — UX/UI (Presser) |
| **Category** | Frontend page |
| **Dependencies** | 01 (Role Presser ต้องมีก่อน) |
| **Blocks** | 03 (form บันทึกที่นั่งใช้บนหน้า detail นี้) |

## เงื่อนไข (จาก xlsx)

- **หน้า List**: เห็นเฉพาะสรุปงานที่ต้องกด + สถานะมัดจำ
- **หน้า Detail**: เห็นข้อมูลเชิงลึกของลูกค้าทั้งหมด (อีเมล, password, โซนสำรอง ฯลฯ)
- ห้ามเห็นข้อมูลการเงินของร้าน

## File structure

```
app/(protect)/presser/
├── page.tsx                           ← List
├── [bookingId]/page.tsx               ← Detail
├── components/
│   ├── PresserHeader.tsx              ← greeting + filter
│   ├── PresserBookingCard.tsx         ← การ์ดงาน 1 ใบ
│   ├── PresserFilterBar.tsx
│   ├── BookingCustomerCredentials.tsx ← การแสดง email/password (มี toggle "แสดง")
│   ├── BookingZonesPlanned.tsx        ← โซน + โซนสำรอง
│   └── BookedTicketsForm.tsx          ← (อยู่ใน spec 03)
├── hooks/
│   ├── use-my-bookings.ts             ← list งานที่ assign
│   ├── use-my-booking-detail.ts       ← detail
│   └── use-update-press-status.ts     ← BOOKING_IN_PROGRESS / FULLY_BOOKED / FAILED
├── types/
│   └── interface.ts
└── utils/
    └── deposit-display.tsx            ← แปลง enum → "มัดจำพร้อมใช้" / "ยังไม่ได้รับ"
```

## Backend endpoints

| Method | Path | Body / Query | Returns |
|--------|------|--------------|---------|
| `GET` | `/presser/bookings` | `status?, search?, page?, pageSize?` | List งานที่ตัวเอง assign |
| `GET` | `/presser/bookings/:id` | — | Detail (รวม credentials, zones, deepInfo) |
| `PATCH` | `/presser/bookings/:id/status` | `{ status, notes?, bookedSeats? }` | เปลี่ยนเป็น `BOOKING_IN_PROGRESS`, `PARTIALLY_BOOKED`, `FULLY_BOOKED`, `BOOKING_FAILED` |

> Backend filter ต้อง strict — แม้ frontend ส่ง bookingId อื่น API ต้องตรวจ `BookingPresser` ก่อน

### Response shape (presser-safe)

```ts
interface IPresserBooking {
  id: number;
  bookingCode: string;
  status: EBookingStatus;
  customer: { fullName: string; nickname?: string };
  event: { id: number; name: string };
  round: { name: string; date: string; time: string };
  zones: Array<{ id: number; name: string; quantity: number; backupRank: number }>;
  depositReceived: boolean;          // ← qualitative ไม่ใช่ตัวเลข
  pressDeadline: string;             // ISO
  notes: string | null;
}

interface IPresserBookingDetail extends IPresserBooking {
  credentials: {                     // ← เฉพาะ Presser, ห้ามแสดงในหน้า Admin booking detail
    site: string;                    // เช่น "thaiticketmajor"
    username: string;
    passwordEncrypted: string;       // หรือ password decrypted (ถ้าระบบเลือกแสดงตรง — ดู note ด้านล่าง)
  };
  zonesBackup: Array<{ name: string; rank: number; price: number }>;
  deepInfo: Array<{ label: string; value: string }>;
  bookedTickets: Array<{ zone: string; price: number; seat: string; notes?: string }>;
}
```

> **Security note**: password ของลูกค้าควรเก็บแบบ symmetric-encrypted (KMS) ไม่ใช่ bcrypt — เพราะต้อง decrypt ให้ Presser เห็น. การเรียกหน้า detail ทุกครั้งต้องเขียน `ActivityLog` (action=`PRESSER_VIEW_CREDENTIAL`)

## Frontend implementation

### `presser/page.tsx` (List)

```tsx
"use client";
import { useState } from "react";
import { useMyBookings } from "./hooks/use-my-bookings";
import { PresserBookingCard } from "./components/PresserBookingCard";
import { PresserFilterBar } from "./components/PresserFilterBar";

export default function PresserHomePage() {
  const [filter, setFilter] = useState({ status: "all", search: "", page: 1, pageSize: 20 });
  const { data, isLoading } = useMyBookings(filter);
  const items = data?.data ?? [];

  return (
    <div className="space-y-4">
      <PresserHeader />
      <PresserFilterBar filter={filter} onChange={setFilter} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40" />)
          : items.map((b) => <PresserBookingCard key={b.id} booking={b} />)}
      </div>
    </div>
  );
}
```

### `PresserBookingCard.tsx`

แสดง: bookingCode, ชื่อ event, รอบ + เวลา, โซนหลัก (เช่น "VIP × 2"), badge `depositReceived`, deadline countdown, ปุ่ม "เปิดงาน" → `router.push(/presser/${id})`

### `presser/[bookingId]/page.tsx` (Detail)

```tsx
"use client";
import { use } from "react";
import { useMyBookingDetail } from "../hooks/use-my-booking-detail";
import { BookingCustomerCredentials } from "../components/BookingCustomerCredentials";
import { BookingZonesPlanned } from "../components/BookingZonesPlanned";
import { BookedTicketsForm } from "../components/BookedTicketsForm";

export default function PresserDetailPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = use(params);
  const { data, isLoading } = useMyBookingDetail(Number(bookingId));
  if (isLoading || !data) return <Skeleton className="h-screen" />;
  const b = data.data;

  return (
    <div className="space-y-6">
      <BackButton />
      <header>
        <h1 className="text-2xl font-bold">{b.event.name}</h1>
        <p className="text-gray-500">{b.bookingCode} · {b.customer.fullName}</p>
      </header>

      {/* ส่วนที่ Presser เห็น (เน้นข้อมูลเชิงลึก) */}
      <BookingCustomerCredentials credentials={b.credentials} />
      <BookingZonesPlanned zones={b.zones} backup={b.zonesBackup} />
      <DeepInfoTable items={b.deepInfo} />

      {/* บันทึกที่กดได้ — spec 03 */}
      <BookedTicketsForm bookingId={b.id} existingTickets={b.bookedTickets} />

      <PressActionBar booking={b} />
    </div>
  );
}
```

### `BookingCustomerCredentials.tsx`

```tsx
const [show, setShow] = useState(false);

return (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Lock className="h-4 w-4" /> ข้อมูลเข้าระบบ
      </CardTitle>
      <CardDescription>เปิดเผยเฉพาะเวลาที่ใช้กด ระบบจะบันทึก log ทุกครั้ง</CardDescription>
    </CardHeader>
    <CardContent className="space-y-2">
      <FieldRow label="เว็บ">{credentials.site}</FieldRow>
      <FieldRow label="Username">{credentials.username}</FieldRow>
      <FieldRow label="Password">
        <span className="font-mono">{show ? credentials.password : "••••••••"}</span>
        <Button variant="ghost" size="sm" onClick={() => setShow((s) => !s)}>
          {show ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
        </Button>
      </FieldRow>
    </CardContent>
  </Card>
);
```

### `PressActionBar.tsx` — เปลี่ยนสถานะการกด

ปุ่ม conditional ตาม status ปัจจุบัน:
- `READY_TO_BOOK` → "เริ่มกด" → `BOOKING_IN_PROGRESS`
- `BOOKING_IN_PROGRESS` → "กดได้ครบ" / "กดได้บางส่วน" / "กดไม่ได้"

ใช้ `ConfirmDialog` (component อยู่แล้วใน `components/ui/confirm-dialog.tsx`)

## Acceptance criteria

- [ ] Presser login → ลง `/presser` อัตโนมัติ
- [ ] List แสดงเฉพาะ booking ที่ assign — ทดสอบโดย assign 2 จาก 5 booking → เห็น 2
- [ ] Detail แสดง credentials ได้ พร้อม toggle eye + log ที่ backend
- [ ] ห้ามเห็นยอดเงินใด ๆ (`netCardPrice`, `totalPaid` ฯลฯ) — gray-box test เปิด Network ตรวจ payload
- [ ] เปลี่ยนสถานะจากปุ่มได้ — booking move ไป `BOOKING_IN_PROGRESS` → `FULLY_BOOKED`
- [ ] Direct visit `/presser/9999` ที่ไม่ใช่ของตัวเอง → 403 หรือ redirect

## Edge cases

- Presser ถูก un-assign ระหว่างเปิดหน้า detail → page refresh ครั้งถัดไปเห็น 403, แสดง toast "งานนี้ถูกยกเลิกการมอบหมาย"
- Booking status ไป CANCELLED → ปุ่ม action ทั้งหมด disable
