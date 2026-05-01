# Spec 06 — ระบบคำขอคืนเงิน (Refund Request)

| | |
|--|--|
| **Source** | xlsx row #6 — Feature |
| **Category** | Customer-facing + Admin workflow |
| **Dependencies** | 04 (deposit) — refund มาจาก WAITING_REFUND |
| **Blocks** | 07 (breakdown) |

## เงื่อนไข

ฟอร์มสำหรับ **ลูกค้า**กรอก:
- รหัสการจอง
- บัญชีธนาคาร / PromptPay / เลขบัตรประชาชน
- ชื่อบัญชี
- เหตุผล

มีสถานะ: รอตรวจสอบ → รอโอน → โอนแล้ว / ถูกปฏิเสธ

## Status (มีอยู่แล้ว)

```ts
enum RefundStatus { REQUESTED, APPROVED, REJECTED, PAID }
```

## Backend changes

### Prisma — RefundRequest (ขยายจาก schema เดิม)

เพิ่ม field ที่ยังไม่ครบ:

```prisma
model RefundRequest {
  id             Int           @id @default(autoincrement())
  bookingId      Int
  paymentSlipId  Int?          // optional ตอนนี้
  bookingRef     String        // = Booking.bookingCode
  bankName       String
  accountNumber  String
  accountHolder  String
  amount         Decimal       @db.Decimal(10, 2)
  reason         String
  status         RefundStatus  @default(REQUESTED)

  // รายละเอียดการคืน (ดู spec 07)
  category       RefundCategory @default(MIXED)   // ← ใหม่
  breakdown      Json?                           // ← ใหม่ (per-category)

  // workflow
  requestedById  Int?          // null = customer-self via public form
  processedById  Int?
  processedAt    DateTime?
  rejectionNote  String?       // ← ใหม่ (จำเป็นเมื่อ status = REJECTED)
  payoutSlipUrl  String?       // ← ใหม่ (สลิปการโอนตอน PAID)
  paidAt         DateTime?     // ← ใหม่
  requestedAt    DateTime      @default(now())

  booking      Booking        @relation(fields: [bookingId], references: [id])
  paymentSlip  PaymentSlip?   @relation(fields: [paymentSlipId], references: [id])
  requestedBy  User?          @relation("Requested", fields: [requestedById], references: [id])
  processedBy  User?          @relation("Processed", fields: [processedById], references: [id])

  @@index([status])
  @@index([bookingId])
}

enum RefundCategory {
  TICKET           // ค่าบัตร
  DEPOSIT          // มัดจำ
  PRICE_DIFF       // ส่วนต่าง
  SHIPPING         // ค่าส่ง
  MIXED
}
```

### API endpoints

| Method | Path | Auth | Body |
|--------|------|------|------|
| `POST` | `/refund-requests` | ADMIN, SUPER_ADMIN, customer-public | ดู `CreateRefundFormValues` ปัจจุบัน + `category`, `breakdown` |
| `POST` | `/public/refund-requests` | public + verify bookingCode + phone | ฟอร์มลูกค้ากรอกเอง |
| `PATCH` | `/refund-requests/:id/status` | ADMIN, SUPER_ADMIN | `{ status: APPROVED \| REJECTED \| PAID, note?, payoutSlipUrl? }` |
| `GET` | `/refund-requests` | ADMIN, SUPER_ADMIN | filter ดู `IRefundRequestQuery` |
| `GET` | `/public/refund-requests/:bookingCode` | public + verify | ลูกค้าเช็คสถานะ |

### Status transitions enforce

```
REQUESTED → APPROVED (note optional)
REQUESTED → REJECTED (note REQUIRED)
APPROVED  → PAID    (payoutSlipUrl REQUIRED + paidAt = now)
APPROVED  → REJECTED (note REQUIRED — ใช้กรณี approved แล้วเจอข้อมูลเท็จ)
PAID/REJECTED → ❌ terminal (return 409)
```

หลังจาก PAID:
- update `DepositTransaction.status` → `REFUNDED` (ถ้า category = DEPOSIT)
- update `Booking.status` → `CLOSED_REFUNDED` ถ้า booking active กับ refund อย่างเดียว
- create `ActivityLog`

## Frontend changes

### Existing audit (ของที่มีอยู่แล้ว)

`app/(protect)/payments/components/RefundManagement.tsx` มีฟังก์ชัน:
- list refund + filter status/event/search ✅
- create refund dialog (admin-driven) ✅
- update status dialog ✅ — แต่ **REJECTED ยังไม่บังคับ note** (มี touched check แล้ว)
- ยังไม่มี **payoutSlipUrl** field ตอน PAID ❌

### เพิ่ม payout slip ตอน PAID

ไฟล์: `app/(protect)/payments/components/RefundManagement.tsx`

ใน `Dialog` ตอน `targetStatus === RefundStatus.PAID` เพิ่ม:

```tsx
{targetStatus === RefundStatus.PAID && (
  <>
    <Label>สลิปการโอนคืน *</Label>
    <ImageUpload onChange={(url) => setPayoutSlipUrl(url)} />
    {!payoutSlipUrl && <p className="text-xs text-red-500">ต้องอัปโหลดสลิป</p>}
  </>
)}
```

อัปเดต `useUpdateRefundStatus` ให้รับ `payoutSlipUrl`:

```ts
useMutationPatchWithPath(
  ({ id }) => `/refund-requests/${id}/status`,
  ({ payload }) => payload,  // payload: { status, note?, payoutSlipUrl? }
);
```

### Public form (ลูกค้ากรอกเอง)

อยู่นอก repo นี้ (ใน customer-app) — แต่ถ้าจะทำใน admin repo ก็สร้าง:
- `app/refund/[bookingCode]/page.tsx` (route นอก `(protect)`)
- ตรวจ bookingCode + last 4 digits ของเบอร์ก่อนเปิดฟอร์ม
- ไม่ต้องล็อกอิน (แต่ middleware ต้อง whitelist `/refund` เป็น public)

### Validation update

ไฟล์: `app/(protect)/payments/validate/create-refund.validate.ts`

```ts
export const createRefundSchema = z.object({
  bookingCode: z.string().min(1, "กรุณากรอกรหัสการจอง"),
  bankName: z.string().min(1, "กรุณากรอกชื่อธนาคาร"),
  accountNumber: z.string().min(1, "กรุณากรอกเลขบัญชี / PromptPay / บัตรประชาชน"),
  accountHolder: z.string().min(1, "กรุณากรอกชื่อเจ้าของบัญชี"),
  amount: z.number({ required_error: "กรุณาระบุจำนวนเงิน" }).min(1, "จำนวนเงินต้องมากกว่า 0"),
  reason: z.string().min(5, "กรุณากรอกเหตุผล"),
  category: z.enum(["TICKET", "DEPOSIT", "PRICE_DIFF", "SHIPPING", "MIXED"]).default("MIXED"),
  breakdown: z.object({
    ticket: z.number().nonnegative().optional(),
    deposit: z.number().nonnegative().optional(),
    priceDiff: z.number().nonnegative().optional(),
    shipping: z.number().nonnegative().optional(),
  }).optional(),
});
```

> เปิดให้แอดมินกรอก breakdown ตอนสร้าง — ดู spec 07

### Status update validation

```ts
export const updateRefundStatusSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal(RefundStatus.APPROVED), note: z.string().optional() }),
  z.object({ status: z.literal(RefundStatus.REJECTED), note: z.string().min(5, "ระบุเหตุผลที่ปฏิเสธ") }),
  z.object({ status: z.literal(RefundStatus.PAID), payoutSlipUrl: z.string().url("อัปโหลดสลิป") }),
]);
```

## Acceptance criteria

- [ ] ลูกค้ากรอกฟอร์ม public → row ถูกสร้าง status = REQUESTED, requestedById = null
- [ ] Admin กรอกฟอร์มภายใน → row ถูกสร้าง requestedById = admin
- [ ] PAID ต้องมี payoutSlipUrl
- [ ] REJECTED ต้องมี rejectionNote >= 5 ตัวอักษร
- [ ] PAID/REJECTED → ไม่สามารถเปลี่ยน status ได้อีก (409)
- [ ] หลัง PAID category=DEPOSIT → DepositTransaction.status = REFUNDED
- [ ] dashboard alerts (spec 08) เห็น REQUESTED ขึ้นมา
