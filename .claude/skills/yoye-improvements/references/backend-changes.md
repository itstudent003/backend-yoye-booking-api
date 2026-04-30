# Backend Changes (รวมทุก spec)

ไฟล์นี้รวบรวม backend implementation จาก 11 spec ของ skill นี้ ส่งให้ทีม backend (`admin-api.yoyemuethong.com`) ใช้เป็น checklist

ลำดับการทำตาม dependency:
**01 → 02 → 03 → 04 → (05, 06) → 07 → 08 → (09, 10, 11)**

---

## 1. Prisma Schema Changes

### 1.1 ขยาย enum เดิม

```prisma
enum AdminRole {
  ADMIN
  SUPER_ADMIN
  PRESSER          // ← ใหม่ (spec 01)
}
```

### 1.2 New tables

#### `BookingPresser` (spec 01)
Junction table — 1 booking : N pressers

```prisma
model BookingPresser {
  bookingId      Int
  presserId      Int
  assignedAt     DateTime @default(now())
  assignedBy     Int
  notes          String?

  booking        Booking @relation(fields: [bookingId], references: [id], onDelete: Cascade)
  presser        User    @relation("Pressed", fields: [presserId], references: [id])
  assignedByUser User    @relation("AssignedBy", fields: [assignedBy], references: [id])

  @@id([bookingId, presserId])
  @@index([presserId])
}
```

#### `BookedTicket` (spec 03)
บัตรที่กดได้จริง — เก็บไว้ให้ลูกค้าเช็คได้

```prisma
model BookedTicket {
  id          Int      @id @default(autoincrement())
  bookingId   Int
  zoneId      Int?
  zoneNameRaw String
  seat        String
  price       Decimal  @db.Decimal(10, 2)
  pressedById Int
  pressedAt   DateTime @default(now())
  notes       String?
  voidedAt    DateTime?
  voidedById  Int?

  booking   Booking     @relation(fields: [bookingId], references: [id], onDelete: Cascade)
  zone      TicketZone? @relation(fields: [zoneId], references: [id])
  pressedBy User        @relation("Pressed", fields: [pressedById], references: [id])
  voidedBy  User?       @relation("Voided",  fields: [voidedById], references: [id])

  @@index([bookingId])
}
```

#### `Expense` (spec 10)

```prisma
model Expense {
  id             Int             @id @default(autoincrement())
  bookingId      Int?
  eventId        Int?
  category       ExpenseCategory
  description    String
  amount         Decimal         @db.Decimal(10, 2)
  paidBy         ExpensePaidBy
  receiptUrl     String?
  status         ExpenseStatus   @default(PENDING)
  submittedById  Int
  submittedAt    DateTime        @default(now())
  approvedById   Int?
  approvedAt     DateTime?
  rejectedNote   String?
  settledAt      DateTime?
  settlementNote String?

  booking     Booking? @relation(fields: [bookingId], references: [id])
  event       Event?   @relation(fields: [eventId], references: [id])
  submittedBy User     @relation("Submitted", fields: [submittedById], references: [id])
  approvedBy  User?    @relation("Approved",  fields: [approvedById], references: [id])

  @@index([status])
  @@index([submittedById])
}

enum ExpenseCategory  { TRANSPORT  EQUIPMENT  FOOD  SUBSCRIPTION  OTHER }
enum ExpensePaidBy    { COMPANY  TEAM }
enum ExpenseStatus    { PENDING  APPROVED  REJECTED  PAID }
```

#### `CustomerCredential` (spec 02)
เก็บ credentials เว็บกดบัตรของลูกค้า — encrypted

```prisma
model CustomerCredential {
  id                Int      @id @default(autoincrement())
  customerId        Int
  bookingId         Int?
  site              String                                // เช่น "thaiticketmajor"
  username          String
  passwordEncrypted String                                // KMS-encrypted (NOT bcrypt)
  notes             String?
  createdAt         DateTime @default(now())

  customer Customer @relation(fields: [customerId], references: [id])
  booking  Booking? @relation(fields: [bookingId],  references: [id])

  @@index([bookingId])
  @@index([customerId])
}
```

### 1.3 ขยาย model เดิม

#### `DepositTransaction` (spec 04, 05)
เพิ่ม breakdown + reason + audit

```prisma
model DepositTransaction {
  id              Int           @id @default(autoincrement())
  bookingId       Int           @unique
  amount          Decimal       @db.Decimal(10, 2)
  status          DepositStatus
  // breakdown ใหม่
  usedAmount      Decimal?      @db.Decimal(10, 2)
  refundAmount    Decimal?      @db.Decimal(10, 2)
  forfeitedAmount Decimal?      @db.Decimal(10, 2)
  // audit ใหม่
  reason          DepositReason
  reasonNotes     String?
  decidedById     Int?
  decidedAt       DateTime
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  booking   Booking @relation(fields: [bookingId], references: [id])
  decidedBy User?   @relation(fields: [decidedById], references: [id])

  @@index([status])
}

enum DepositStatus  { DEPOSIT_PENDING  DEPOSIT_USED  DEPOSIT_FORFEITED  WAITING_REFUND  REFUNDED }
enum DepositReason  { PRESS_SUCCESS  PRESS_FAILED  CUSTOMER_CANCEL  CUSTOMER_SELF_BOOKED  ADMIN_OVERRIDE }
```

#### `RefundRequest` (spec 06, 07)
เพิ่ม category, breakdown, rejection/payout

```prisma
model RefundRequest {
  id             Int            @id @default(autoincrement())
  bookingId      Int
  paymentSlipId  Int?
  bookingRef     String
  bankName       String
  accountNumber  String
  accountHolder  String
  amount         Decimal        @db.Decimal(10, 2)
  reason         String
  status         RefundStatus   @default(REQUESTED)
  category       RefundCategory @default(MIXED)         // ← ใหม่
  breakdown      Json?                                  // ← ใหม่ { ticket?, deposit?, priceDiff?, shipping? }
  requestedById  Int?           // null = customer-self
  processedById  Int?
  processedAt    DateTime?
  rejectionNote  String?                                // ← ใหม่
  payoutSlipUrl  String?                                // ← ใหม่
  paidAt         DateTime?                              // ← ใหม่
  requestedAt    DateTime       @default(now())

  booking     Booking      @relation(fields: [bookingId], references: [id])
  paymentSlip PaymentSlip? @relation(fields: [paymentSlipId], references: [id])
  requestedBy User?        @relation("Requested", fields: [requestedById], references: [id])
  processedBy User?        @relation("Processed", fields: [processedById], references: [id])

  @@index([status])
  @@index([bookingId])
}

enum RefundCategory { TICKET  DEPOSIT  PRICE_DIFF  SHIPPING  MIXED }
```

#### `ActivityLog` (spec 11)
เปลี่ยนจาก message string → type+metadata structured

```prisma
model ActivityLog {
  id         Int      @id @default(autoincrement())
  entity     String
  entityId   Int?
  action     String                                      // เก่า — ค่อย ๆ deprecate
  type       ActivityType?                               // ← ใหม่ (enum)
  metadata   Json                                        // ← ใหม่ (structured payload)
  bookingId  Int?                                        // ← ใหม่ (เพื่อ index ได้)
  bookingCode String?                                    // ← ใหม่ (denormalized)
  actorId    Int?
  message    String?                                     // legacy
  createdAt  DateTime @default(now())

  actor   User?    @relation(fields: [actorId], references: [id])
  booking Booking? @relation(fields: [bookingId], references: [id])

  @@index([entity, entityId])
  @@index([bookingId])
  @@index([createdAt])
}

enum ActivityType {
  BOOKING_STATUS_CHANGED
  SLIP_VERIFIED  SLIP_REJECTED
  REFUND_REQUESTED  REFUND_APPROVED  REFUND_REJECTED  REFUND_PAID
  DEPOSIT_OVERRIDE
  EXPENSE_SUBMITTED  EXPENSE_APPROVED  EXPENSE_REJECTED
  PRESSER_ASSIGNED  PRESSER_VIEW_CREDENTIAL
  TICKET_RECORDED  TICKET_VOIDED
}
```

### 1.4 Relations ที่ต้องเพิ่มในโมเดลเดิม

```prisma
model Booking {
  // existing...
  pressers        BookingPresser[]
  bookedTickets   BookedTicket[]
  expenses        Expense[]
  credentials     CustomerCredential[]
  activityLogs    ActivityLog[]
}

model User {
  // existing...
  pressedBookings    BookingPresser[]   @relation("Pressed")
  assignedByLogs     BookingPresser[]   @relation("AssignedBy")
  pressedTickets     BookedTicket[]     @relation("Pressed")
  voidedTickets      BookedTicket[]     @relation("Voided")
  decidedDeposits    DepositTransaction[]
  submittedExpenses  Expense[]          @relation("Submitted")
  approvedExpenses   Expense[]          @relation("Approved")
  requestedRefunds   RefundRequest[]    @relation("Requested")
  processedRefunds   RefundRequest[]    @relation("Processed")
  activityLogs       ActivityLog[]
}

model Customer {
  credentials CustomerCredential[]
}

model Event {
  expenses Expense[]
}
```

---

## 2. New API Endpoints

### 2.1 Presser scope (spec 01, 02, 03)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/presser/bookings` | PRESSER | list งานที่ assign (paginated) |
| `GET` | `/presser/bookings/:id` | PRESSER (own) | detail + credentials + deepInfo |
| `PATCH` | `/presser/bookings/:id/status` | PRESSER (own) | เปลี่ยน BOOKING_IN_PROGRESS / FULLY_BOOKED / FAILED / PARTIALLY_BOOKED |
| `POST` | `/presser/bookings/:id/tickets` | PRESSER (own) / ADMIN | บันทึกบัตรที่กดได้ (รับ array หรือ single) |
| `POST` | `/presser/bookings/:id/tickets/bulk` | PRESSER (own) / ADMIN | bulk replace |
| `PATCH` | `/presser/bookings/:id/tickets/:tid` | PRESSER (own) / ADMIN | แก้ไขบัตร |
| `DELETE` | `/presser/bookings/:id/tickets/:tid` | ADMIN, SUPER_ADMIN | void (soft) |

### 2.2 Admin booking + presser assignment (spec 01)

| Method | Path | Auth |
|--------|------|------|
| `POST` | `/bookings/:id/pressers` body `{ presserIds: number[] }` | ADMIN, SUPER_ADMIN |
| `DELETE` | `/bookings/:id/pressers/:presserId` | ADMIN, SUPER_ADMIN |
| `GET` | `/bookings/:id/pressers` | ADMIN, SUPER_ADMIN, PRESSER (own) |

### 2.3 Customer-facing public (spec 03, 06)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/public/bookings/:code/tickets` | bookingCode + last4 phone | ลูกค้าเช็คบัตรที่กดได้ |
| `POST` | `/public/refund-requests` | bookingCode + last4 phone | ฟอร์ม refund |
| `GET` | `/public/refund-requests/:bookingCode` | bookingCode + last4 phone | ดูสถานะ refund |

> Public endpoints whitelist ใน middleware + rate-limit ต่อ IP

### 2.4 Refund (spec 06, 07)

| Method | Path | Auth |
|--------|------|------|
| `POST` | `/refund-requests` | ADMIN, SUPER_ADMIN |
| `GET` | `/refund-requests` | ADMIN, SUPER_ADMIN |
| `PATCH` | `/refund-requests/:id/status` | ADMIN, SUPER_ADMIN |
| `GET` | `/finance/refunds/breakdown?from&to&eventId` | ADMIN, SUPER_ADMIN |

### 2.5 Deposit (spec 04, 05)

| Method | Path | Auth |
|--------|------|------|
| `GET` | `/finance/deposits/:bookingId` | ADMIN, SUPER_ADMIN |
| `PATCH` | `/finance/deposits/:bookingId/override` | **SUPER_ADMIN เท่านั้น** |

### 2.6 Dashboard (spec 08)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/dashboard/actions` | ADMIN, SUPER_ADMIN | รวม action items ทั้งหมด |
| `GET` | `/dashboard/events` (SSE — optional) | ADMIN, SUPER_ADMIN | realtime push |

### 2.7 Expense (spec 10)

| Method | Path | Auth |
|--------|------|------|
| `POST` | `/expenses` | ADMIN, SUPER_ADMIN, PRESSER |
| `GET` | `/expenses` | ADMIN, SUPER_ADMIN |
| `GET` | `/expenses/mine` | ADMIN, SUPER_ADMIN, PRESSER |
| `PATCH` | `/expenses/:id/status` | ADMIN, SUPER_ADMIN |
| `GET` | `/expenses/settlement?from&to` | ADMIN, SUPER_ADMIN |

---

## 3. Modified Endpoints

### 3.1 `POST /auth/register` (spec 01)
- Accept `role: "ADMIN" | "SUPER_ADMIN" | "PRESSER"` (default ADMIN)
- Permission: SUPER_ADMIN เพิ่ม SUPER_ADMIN ได้, ADMIN เพิ่ม PRESSER + ADMIN ได้

### 3.2 `GET /auth/me` (spec 01)
- Return `role` ใน data เพื่อให้ middleware route ได้
- Schema: `{ id, email, firstName, lastName, role, phone, line, lastLogin, createdAt }`

### 3.3 `GET /bookings` (spec 01, 02)
- Scope by role อัตโนมัติ:
  - PRESSER → join `BookingPresser` ที่ presserId = currentUser.id
  - ADMIN, SUPER_ADMIN → ทั้งหมด
- Field-level filter: PRESSER ไม่ส่งกลับ field การเงิน (ดู spec 02)

### 3.4 `PATCH /bookings/:id/status` (spec 04)
- หลังเปลี่ยน status → trigger `DepositService.recompute(bookingId)`
- Insert `BookingStatusLog` + `ActivityLog` (BOOKING_STATUS_CHANGED)

### 3.5 `GET /finance/summary` (spec 09)
- เพิ่ม field response:
  - `pendingRefundAmount` = SUM RefundRequest.amount where status=APPROVED
  - `pendingRefundCount`
  - `outstandingPaymentAmount` = SUM PaymentSlip.slipAmount where status=PENDING
  - `outstandingPaymentCount`
- Source ของ deposit field ต้องย้ายจาก `Booking.depositPaid` ไป `DepositTransaction` table ใหม่

### 3.6 `PATCH /payment-slips/:id` (verify) (spec 04)
- หลัง verify slip type=DEPOSIT_PAID → trigger `DepositService.recompute`

---

## 4. Auth/Permission Layer

### 4.1 JWT claim
เพิ่ม `role` ใน access_token payload — middleware ต้อง decode ได้ ไม่ต้อง round-trip DB

### 4.2 Role guards (NestJS-style)

```ts
@UseGuards(RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
@Get('/bookings')
listBookings() { ... }
```

### 4.3 Resource ownership
สำหรับ PRESSER endpoint → ต้องตรวจ `BookingPresser` ก่อน return (ห้ามตรวจฝั่ง frontend อย่างเดียว)

```ts
async function assertPresserCanAccess(bookingId: number, userId: number) {
  const link = await db.bookingPresser.findUnique({
    where: { bookingId_presserId: { bookingId, presserId: userId } },
  });
  if (!link) throw new ForbiddenException();
}
```

### 4.4 Field-level filter (presser)
ห้าม return field เหล่านี้ให้ PRESSER:
- `Booking.netCardPrice, serviceFee, vatAmount, totalPaid, refundAmount`
- `BillingRecord.*`
- `Fulfillment.shippingFee`
- `Customer.idCardNumber, email` (ถ้ามี)

ใช้ select map ตาม role:

```ts
const fields = role === 'PRESSER' ? PRESSER_FIELDS : ADMIN_FIELDS;
return await db.booking.findUnique({ where: { id }, select: fields });
```

---

## 5. Business Logic / Services

### 5.1 `DepositService.recompute(bookingId)` (spec 04)
Trigger จาก:
- POST/PATCH/DELETE BookedTicket
- PATCH Booking.status (Phase 3 + closure)
- Slip verify (DEPOSIT_PAID)

State machine:

```
FULLY_BOOKED + ticket >= deposit  → DEPOSIT_USED
FULLY_BOOKED + ticket < deposit   → DEPOSIT_USED + WAITING_REFUND ส่วนที่เหลือ
BOOKING_FAILED / TEAM_NOT_RECEIVED→ WAITING_REFUND
CANCELLED                         → DEPOSIT_FORFEITED
ADMIN override (spec 05)          → ตามที่ admin ตั้ง
```

### 5.2 `RefundService.applyStatusTransition` (spec 06)
- Enforce: REQUESTED → APPROVED/REJECTED, APPROVED → PAID/REJECTED, PAID/REJECTED = terminal
- REJECTED ต้องมี `rejectionNote`
- PAID ต้องมี `payoutSlipUrl` + set `paidAt`
- หลัง PAID + category=DEPOSIT → update DepositTransaction.status = REFUNDED
- Update Booking.status → CLOSED_REFUNDED ถ้าครบเงื่อนไข

### 5.3 `BookingStatusService.changeStatus` (spec 04, 11)
- Validate transition ตาม phase
- Insert BookingStatusLog
- Call ActivityLogService (BOOKING_STATUS_CHANGED)
- Trigger DepositService.recompute

### 5.4 `ExpenseService` (spec 10)
- `submit()` → status PENDING (**ห้ามนับเข้า finance summary**)
- `approve()` → status APPROVED + ActivityLog
- `settle()` → status PAID
- `getSettlement(from, to)` — sum per user

### 5.5 `ActivityLogService.log()` (spec 11)

```ts
export async function log({
  actorId, type, metadata, bookingId, entity, entityId,
}: LogParams) {
  return db.activityLog.create({
    data: {
      actorId, type, metadata,
      bookingId,
      bookingCode: bookingId ? (await getCode(bookingId)) : null,
      entity, entityId,
      createdAt: new Date(),
    },
  });
}
```

### 5.6 `DashboardService.getActions()` (spec 08)
รวม count จากหลายตาราง — ใช้ Promise.all + raw SQL หรือ COUNT queries แยก

### 5.7 `CredentialService` (spec 02)
- `encrypt(plaintext)` ใช้ AES-256-GCM ผ่าน KMS
- `decrypt(ciphertext, requesterId)` → ลง ActivityLog (PRESSER_VIEW_CREDENTIAL) ทุกครั้ง
- ห้าม log plaintext เข้า application log

---

## 6. Migration Plan

### 6.1 Schema migrations (ลำดับ)

```bash
# 1. Foundation (ไม่กระทบโค้ดเดิม)
npx prisma migrate dev --name add_presser_role_and_booking_pressers
npx prisma migrate dev --name add_booked_tickets
npx prisma migrate dev --name add_customer_credentials

# 2. ขยาย deposit + refund
npx prisma migrate dev --name extend_deposit_transaction_breakdown
npx prisma migrate dev --name extend_refund_request_breakdown_payout

# 3. Expense (ใหม่ทั้งหมด)
npx prisma migrate dev --name add_expense_module

# 4. Activity log (ขยาย, ค่อย ๆ deprecate column เดิม)
npx prisma migrate dev --name extend_activity_log_type_metadata
```

### 6.2 Data migrations

- **DepositTransaction** — backfill จาก `Booking.depositPaid + Booking.status` (1 row ต่อ booking)
- **ActivityLog legacy** — script regex parse `message` → fill `type` + `metadata`
- **Backfill `bookingCode`** ใน ActivityLog ที่มี `bookingId`

### 6.3 Strategy การ deploy

1. Deploy schema (additive only — ห้าม drop column ที่ frontend เก่ายังใช้)
2. Deploy backend code (รองรับทั้ง legacy + ใหม่)
3. Deploy frontend ใหม่
4. รอ 1 sprint แล้ว clean legacy column (เช่น `ActivityLog.message`)

---

## 7. Security Checklist

- [ ] JWT มี `role` claim — verify signature ทุก request (ใช้ secret rotation ถ้ามี)
- [ ] PRESSER endpoint ใช้ `assertPresserCanAccess` ทุกครั้ง — gray-box test ด้วย bookingId อื่น
- [ ] Field filter (presser) — ทดสอบ snapshot response ห้ามมี field เงิน
- [ ] Customer credential — encrypted at rest, decrypt log ทุกครั้ง, plaintext ห้ามเข้า log
- [ ] Public endpoint (`/public/*`) — rate-limit + verify bookingCode + last4 phone
- [ ] Override deposit — เฉพาะ SUPER_ADMIN, log previous + new + reason
- [ ] Refund payout — payoutSlipUrl ต้องเป็น signed URL จาก storage ของเรา ไม่ใช่ external
- [ ] Expense — PENDING ห้ามนับเข้า finance summary (test: query summary ก่อน-หลัง approve)

---

## 8. Test Coverage (recommended)

### Unit
- DepositService.recompute สำหรับทุก booking status × ticket amount combination
- RefundService transition validity (8 cases)
- ExpenseService settlement calc (mixed paidBy)
- ActivityLog humanize fallback

### Integration
- Presser assigned booking → GET /presser/bookings → exact count
- Override deposit ผิด total → 400, ถูก total → 200
- Public refund POST + GET status loop
- Settlement endpoint หลัง approve/reject expense

### Security
- PRESSER call /bookings → 403 (admin endpoint)
- PRESSER call /presser/bookings/:id ของคนอื่น → 403
- ADMIN call /finance/deposits/:id/override → 403 (เฉพาะ SUPER_ADMIN)

---

## 9. Documentation deliverables

- [ ] OpenAPI spec อัปเดต — เพิ่ม schema `BookedTicket`, `Expense`, `CustomerCredential`, etc.
- [ ] Postman collection — section Presser, Expense, Refund (with public)
- [ ] ER diagram update
- [ ] Deployment runbook — migration order + rollback plan
