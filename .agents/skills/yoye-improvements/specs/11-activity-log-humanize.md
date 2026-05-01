# Spec 11 — Activity Log ภาษาคน

| | |
|--|--|
| **Source** | xlsx row #11 — System |
| **Category** | UX / i18n of system events |
| **Dependencies** | — (อิงทุก spec แต่ทำได้อิสระ) |
| **Blocks** | — |

## เงื่อนไข

เปลี่ยนจากการแสดง code ระบบ เช่น `WAITING_VERIFY` เป็นภาษาคน เช่น **"รอแอดมินตรวจค่ากด"**

## หลักคิด

Backend ส่ง code (machine-readable) — frontend หรือ backend layer แปลงเป็นข้อความเสมอ. **ห้ามแสดง enum raw บน UI ลูกค้า/แอดมิน** ยกเว้น dev tools

## Frontend changes

### 1. Centralize label maps

สร้างไฟล์: `app/(protect)/bookings/utils/activity-humanizer.ts`

```ts
import { EBookingStatus, BOOKING_STATUS_LABEL } from "../types/enum";
import { RefundStatus } from "@/app/(protect)/payments/types/enum";

export const REFUND_STATUS_LABEL: Record<RefundStatus, string> = {
  [RefundStatus.REQUESTED]: "รอตรวจคำขอคืนเงิน",
  [RefundStatus.APPROVED]:  "รอโอนคืน",
  [RefundStatus.PAID]:      "โอนคืนแล้ว",
  [RefundStatus.REJECTED]:  "ปฏิเสธคำขอคืนเงิน",
};

export const PAYMENT_SLIP_STATUS_LABEL = {
  PENDING: "รอตรวจสลิป",
  VERIFIED: "ยืนยันสลิปแล้ว",
  REJECTED: "สลิปไม่ผ่าน",
};

export const EXPENSE_STATUS_LABEL = {
  PENDING: "รออนุมัติ",
  APPROVED: "อนุมัติแล้ว",
  REJECTED: "ปฏิเสธแล้ว",
  PAID: "จ่ายชดเชยแล้ว",
};

// ─── ภาษาคน สำหรับ activity log ───
export type ActivityType =
  | "BOOKING_STATUS_CHANGED"
  | "SLIP_VERIFIED" | "SLIP_REJECTED"
  | "REFUND_REQUESTED" | "REFUND_APPROVED" | "REFUND_REJECTED" | "REFUND_PAID"
  | "DEPOSIT_OVERRIDE"
  | "EXPENSE_SUBMITTED" | "EXPENSE_APPROVED" | "EXPENSE_REJECTED"
  | "PRESSER_ASSIGNED" | "PRESSER_VIEW_CREDENTIAL"
  | "TICKET_RECORDED" | "TICKET_VOIDED";

interface ActivityPayload {
  type: ActivityType;
  metadata: Record<string, any>;
  actor: string;
  bookingCode?: string;
}

export function humanizeActivity(a: ActivityPayload): string {
  const code = a.bookingCode ? ` (${a.bookingCode})` : "";
  const m = a.metadata;

  switch (a.type) {
    case "BOOKING_STATUS_CHANGED":
      return `${a.actor} เปลี่ยนสถานะ${code} → ${BOOKING_STATUS_LABEL[m.to as EBookingStatus] ?? m.to}`;

    case "SLIP_VERIFIED":
      return `${a.actor} ยืนยันสลิป${code} (${m.type === "DEPOSIT_PAID" ? "มัดจำ" : m.type === "CARD_PAID" ? "ค่าบัตร" : "ค่ากด"}) จำนวน ${formatTHB(m.amount)}`;

    case "SLIP_REJECTED":
      return `${a.actor} ปฏิเสธสลิป${code} — ${m.note ?? "ไม่ระบุเหตุผล"}`;

    case "REFUND_REQUESTED":
      return `ลูกค้าขอคืนเงิน${code} ${formatTHB(m.amount)} — ${m.reason}`;

    case "REFUND_APPROVED":
      return `${a.actor} อนุมัติคำขอคืนเงิน${code} ${formatTHB(m.amount)}`;

    case "REFUND_REJECTED":
      return `${a.actor} ปฏิเสธคำขอคืนเงิน${code} — ${m.note}`;

    case "REFUND_PAID":
      return `${a.actor} โอนคืนเงิน${code} ${formatTHB(m.amount)} แล้ว`;

    case "DEPOSIT_OVERRIDE":
      return `${a.actor} ปรับยอดมัดจำ${code} (ใช้ ${formatTHB(m.usedAmount)} / คืน ${formatTHB(m.refundAmount)} / ยึด ${formatTHB(m.forfeitedAmount)}) — ${m.reason}`;

    case "EXPENSE_SUBMITTED":
      return `${a.actor} บันทึกค่าใช้จ่าย${m.eventName ? ` ${m.eventName}` : ""} (${EXPENSE_CATEGORY_LABEL[m.category]}) ${formatTHB(m.amount)}`;

    case "EXPENSE_APPROVED":
      return `${a.actor} อนุมัติค่าใช้จ่าย ${EXPENSE_CATEGORY_LABEL[m.category]} ${formatTHB(m.amount)}`;

    case "EXPENSE_REJECTED":
      return `${a.actor} ปฏิเสธค่าใช้จ่าย — ${m.note}`;

    case "PRESSER_ASSIGNED":
      return `${a.actor} มอบหมาย${code} ให้ ${m.presserNames.join(", ")}`;

    case "PRESSER_VIEW_CREDENTIAL":
      return `${a.actor} เปิดดูข้อมูลเข้าระบบของลูกค้า${code}`;

    case "TICKET_RECORDED":
      return `${a.actor} บันทึกบัตร${code} ${m.zoneNameRaw} ที่นั่ง ${m.seat} ราคา ${formatTHB(m.price)}`;

    case "TICKET_VOIDED":
      return `${a.actor} ยกเลิกบัตร${code} ${m.zoneNameRaw} ที่นั่ง ${m.seat}`;

    default:
      return `${a.actor} ทำรายการ ${a.type}`;
  }
}

const EXPENSE_CATEGORY_LABEL: Record<string, string> = {
  TRANSPORT: "ค่าเดินทาง",
  EQUIPMENT: "อุปกรณ์",
  FOOD: "ค่าอาหารทีม",
  SUBSCRIPTION: "ค่าระบบ",
  OTHER: "อื่น ๆ",
};

function formatTHB(amount: number): string {
  return `${Number(amount).toLocaleString("th-TH")} บาท`;
}
```

### 2. Backend ส่ง type + metadata (ไม่ใช่ message string)

ไฟล์: `app/(protect)/dashboard/types/interface.ts` — ขยาย `ActivityItem`:

```ts
export type ActivityItem = {
  id: number;
  type: ActivityType;
  metadata: Record<string, any>;
  actor: string;
  actorId: number | null;
  bookingCode?: string;
  createdAt: string;
};
```

Backend `ActivityLog.metadata` (Json) เก็บ field ที่ humanizer ต้องการ:
- BOOKING_STATUS_CHANGED → `{ from, to }`
- SLIP_VERIFIED → `{ type, amount }`
- REFUND_REQUESTED → `{ amount, reason }`
- ฯลฯ

### 3. ใช้ใน Dashboard activity feed

ไฟล์: `app/(protect)/dashboard/page.tsx`

```tsx
// เดิม:
<p className="text-sm">{activity.message}</p>

// ใหม่:
<p className="text-sm">{humanizeActivity(activity)}</p>
```

### 4. Booking detail timeline

ไฟล์: `app/(protect)/bookings/components/booking-detail-dialog.tsx` — มี `IStatusLog[]` อยู่แล้ว

```tsx
{statusLogs.map((log) => (
  <TimelineItem key={log.id}>
    {humanizeActivity({
      type: "BOOKING_STATUS_CHANGED",
      metadata: { to: log.status },
      actor: `${log.admin.firstName} ${log.admin.lastName}`,
      bookingCode: booking.bookingCode,
    })}
    {log.notes && <p className="text-xs text-gray-500">{log.notes}</p>}
  </TimelineItem>
))}
```

### 5. Search/Filter ก็ใช้ label

`app/(protect)/bookings/components/bookings-filter.tsx` — เปลี่ยน `<SelectItem value={status}>{status}</SelectItem>` เป็น `{BOOKING_STATUS_LABEL[status]}`

## Backend changes

### Migrate existing logs

ปัจจุบัน ActivityLog.message อาจเป็น string `"BNK-0042 → FULLY_BOOKED"` — ต้อง migrate:

```ts
// migration script (one-shot)
for (const log of await db.activityLog.findMany({ where: { metadata: null } })) {
  const parsed = parseLegacyMessage(log.message);  // regex
  if (parsed) {
    await db.activityLog.update({
      where: { id: log.id },
      data: { type: parsed.type, metadata: parsed.metadata },
    });
  }
}
```

### Wrap activity creation

```ts
// service/activity-log.service.ts
export async function logActivity({
  actorId, type, metadata, bookingId, entityId, entity,
}: {
  actorId: number | null;
  type: ActivityType;
  metadata: Record<string, any>;
  bookingId?: number;
  entityId?: number;
  entity: string;
}) {
  return db.activityLog.create({
    data: { actorId, type, metadata, entityId, entity, bookingId, createdAt: new Date() },
  });
}
```

ทุก mutation ของระบบเรียก `logActivity` แทนการต่อ string เอง

## Acceptance criteria

- [ ] Dashboard activity feed ไม่มี "WAITING_VERIFY", "FULLY_BOOKED" raw — ทุกเส้นเป็นภาษาไทย
- [ ] Booking timeline ใช้ humanizer
- [ ] Notification dropdown ใช้ label ภาษาคน
- [ ] Search/filter dropdown ใช้ label ภาษาคน (value ยังเป็น code)
- [ ] Test: log type ที่ไม่รู้จัก → fallback เป็น "{actor} ทำรายการ {type}" (ไม่ throw)
- [ ] Migrate existing logs สำเร็จ — query SELECT จาก ActivityLog table มี type/metadata != null ทุก row
