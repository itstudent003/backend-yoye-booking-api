# Spec 04 — ระบบจัดการมัดจำอัตโนมัติ

| | |
|--|--|
| **Source** | xlsx row #4 — Logic |
| **Category** | Business logic · Backend-heavy |
| **Dependencies** | 03 (ใช้ยอดบัตรที่กดได้คำนวณ) |
| **Blocks** | 05 (override), 06 (refund), 07 (breakdown) |

## เงื่อนไข

คำนวณการจัดการมัดจำตาม **outcome** ของการกด:
- กดได้ → ใช้เป็นค่ากด (DEPOSIT_USED)
- กดไม่ได้ → คืนมัดจำ (WAITING_REFUND)
- ลูกค้ายกเลิก → ยึดมัดจำ (DEPOSIT_FORFEITED)

## State machine

```
                          [BookedTicket รวม >= ค่ามัดจำ?]
                                    /          \
                                  yes           no
                                  /              \
        FULLY_BOOKED → DEPOSIT_USED            DEPOSIT_USED + ส่วนเกิน → WAITING_REFUND
        BOOKING_FAILED → WAITING_REFUND  (ทั้งหมด)
        CUSTOMER_CANCEL_BEFORE_PRESS → DEPOSIT_FORFEITED
        CUSTOMER_SELF_BOOKED + TEAM_NOT_RECEIVED → WAITING_REFUND
        ADMIN_ABORT (force) → DEPOSIT_FORFEITED  (ต้อง SUPER_ADMIN — ดู spec 05)
```

## Backend changes

### Prisma — DepositTransaction (เสริมจาก schema เดิม)

```prisma
model DepositTransaction {
  id          Int      @id @default(autoincrement())
  bookingId   Int      @unique
  amount      Decimal  @db.Decimal(10, 2)
  status      DepositStatus
  // breakdown
  usedAmount      Decimal?  @db.Decimal(10, 2)   // ส่วนที่ใช้เป็นค่ากด
  refundAmount    Decimal?  @db.Decimal(10, 2)   // ส่วนที่ต้องคืน
  forfeitedAmount Decimal?  @db.Decimal(10, 2)   // ส่วนที่ยึด
  // audit
  reason      DepositReason
  reasonNotes String?
  decidedById Int?           // null = system, มี value = admin override
  decidedAt   DateTime
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  booking     Booking @relation(fields: [bookingId], references: [id])
  decidedBy   User?   @relation(fields: [decidedById], references: [id])

  @@index([status])
}

enum DepositStatus {
  DEPOSIT_PENDING
  DEPOSIT_USED
  DEPOSIT_FORFEITED
  WAITING_REFUND
  REFUNDED
}

enum DepositReason {
  PRESS_SUCCESS         // กดได้ → ใช้เป็นค่ากด
  PRESS_FAILED          // กดไม่ได้ → คืน
  CUSTOMER_CANCEL       // ยกเลิก → ยึด
  CUSTOMER_SELF_BOOKED  // ลูกค้าได้เอง → คืน
  ADMIN_OVERRIDE        // override โดย super admin (ดู spec 05)
}
```

### Service / Trigger

สร้าง `DepositService.recompute(bookingId)`:

```ts
async function recompute(bookingId: number, actorId?: number, reason?: DepositReason) {
  const booking = await db.booking.findUnique({ where: { id }, include: { bookedTickets: true, depositTx: true } });
  const deposit = booking.depositPaid;
  const totalTicket = booking.bookedTickets.filter(t => !t.voidedAt).reduce((s, t) => s + t.price, 0);

  let next: { status: DepositStatus; usedAmount: number; refundAmount: number; forfeitedAmount: number; reason: DepositReason };

  switch (booking.status) {
    case "FULLY_BOOKED":
    case "PARTIALLY_BOOKED":
    case "TEAM_BOOKED":
      const used = Math.min(deposit, totalTicket);
      const refund = Math.max(0, deposit - totalTicket);
      next = { status: refund > 0 ? "WAITING_REFUND" : "DEPOSIT_USED", usedAmount: used, refundAmount: refund, forfeitedAmount: 0, reason: "PRESS_SUCCESS" };
      break;
    case "BOOKING_FAILED":
    case "TEAM_NOT_RECEIVED":
    case "CUSTOMER_SELF_BOOKED":
      next = { status: "WAITING_REFUND", usedAmount: 0, refundAmount: deposit, forfeitedAmount: 0, reason: booking.status === "CUSTOMER_SELF_BOOKED" ? "CUSTOMER_SELF_BOOKED" : "PRESS_FAILED" };
      break;
    case "CANCELLED":
      next = { status: "DEPOSIT_FORFEITED", usedAmount: 0, refundAmount: 0, forfeitedAmount: deposit, reason: "CUSTOMER_CANCEL" };
      break;
    default:
      return; // status อื่นยังไม่ trigger
  }

  await db.depositTransaction.upsert({
    where: { bookingId },
    create: { bookingId, amount: deposit, ...next, decidedById: actorId, decidedAt: new Date(), reasonNotes: reason ? `manual:${reason}` : null },
    update: { ...next, decidedById: actorId, decidedAt: new Date() },
  });

  // emit ActivityLog (ดู spec 11 สำหรับ humanize)
}
```

### Trigger points

เรียก `recompute` ตอน:
- POST/PATCH/DELETE `BookedTicket` (จาก spec 03)
- PATCH `Booking.status` ใน Phase 3/closure
- Admin ทำ override (spec 05)

## Frontend changes

### Booking detail (admin) — แสดง breakdown

ไฟล์: `app/(protect)/bookings/components/booking-detail-dialog.tsx` หรือเพิ่ม section ใหม่

```tsx
function DepositBreakdown({ deposit, used, refund, forfeited }: Props) {
  return (
    <Card>
      <CardHeader><CardTitle>มัดจำ</CardTitle></CardHeader>
      <CardContent className="space-y-1">
        <Row label="ยอดมัดจำ">{formatTHB(deposit)}</Row>
        {used > 0 && <Row label="ใช้เป็นค่ากด">{formatTHB(used)}</Row>}
        {refund > 0 && <Row label="ต้องคืน" className="text-yellow-700">{formatTHB(refund)}</Row>}
        {forfeited > 0 && <Row label="ยึด" className="text-red-700">{formatTHB(forfeited)}</Row>}
      </CardContent>
    </Card>
  );
}
```

### Finance summary

ไฟล์: `app/(protect)/finance/page.tsx` — มีอยู่แล้ว แค่ต้อง verify ว่า hook `useFinanceSummary` ใช้ `DepositTransaction` table ใหม่นี้ (เปลี่ยน source เดิมที่ทำงานบน `Booking.status`)

## Acceptance criteria

- [ ] กดได้ครบ + ราคาบัตร > มัดจำ → `DEPOSIT_USED` (used=deposit, refund=0)
- [ ] กดได้ + ราคาบัตร < มัดจำ → ใช้บางส่วน + WAITING_REFUND ส่วนที่เหลือ
- [ ] กดไม่ได้ → WAITING_REFUND ทั้งก้อน
- [ ] ลูกค้ายกเลิก → DEPOSIT_FORFEITED
- [ ] เปลี่ยน BookedTicket → recompute auto (test: เพิ่มแถว → ยอด used เปลี่ยนตาม)
- [ ] ทุกการ recompute → ActivityLog 1 entry
