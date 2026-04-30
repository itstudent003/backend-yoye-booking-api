# Status Lifecycle Reference

ไฟล์นี้รวบรวมสถานะทั้งหมดที่ระบบใช้ พร้อม transition matrix และเงื่อนไขที่ต้อง enforce ในทุก feature

## EBookingStatus (28 states)

จัดเป็น 5 phase ตาม `app/(protect)/bookings/types/enum.ts` และ `plan.md`

### Phase 1: Queue
| Code | Label (TH) |
|------|-----------|
| WAITING_QUEUE_APPROVAL | รอแอดมินอนุมัติคิว |
| WAITING_DEPOSIT_TRANSFER | รอโอนมัดจำ |
| WAITING_DEPOSIT_VERIFY | รอตรวจสลิปมัดจำ |
| QUEUE_BOOKED | จองคิวสำเร็จ |
| WAITING_BOOKING_INFO | รอกรอกข้อมูลจอง |

### Phase 2: Pre-press (proxy payment)
| Code | Label (TH) |
|------|-----------|
| TRANSFERRING_TICKET | โอนค่าบัตร (กรณีฝากร้าน) |
| CONFIRMING_TICKET | ยืนยันโอนค่าบัตร |
| WAITING_ADMIN_CONFIRM | รอแอดมินยืนยันข้อมูล |
| READY_TO_BOOK | พร้อมกดบัตร |

### Phase 3: Live booking (Presser action)
| Code | Label (TH) |
|------|-----------|
| BOOKING_IN_PROGRESS | กำลังกดบัตร |
| PARTIALLY_BOOKED | ได้บัตรบางส่วน |
| FULLY_BOOKED | กดได้ครบแล้ว |
| BOOKING_FAILED | กดไม่ได้ |

### Phase 4: Self-booked conflict
| Code | Label (TH) |
|------|-----------|
| CUSTOMER_SELF_BOOKED | ลูกค้าแจ้งว่าได้เอง (รอทีมตรวจ) |
| TEAM_NOT_RECEIVED | ทีมยังไม่ได้บัตร |
| TEAM_BOOKED | ทีมกดได้แล้ว |
| PARTIAL_SELF_TEAM_BOOKING | ลูกค้าได้เองบางส่วน / ทีมกดต่อ |

### Phase 5: Service-fee + Deposit + Closure
| Code | Label (TH) |
|------|-----------|
| WAITING_SERVICE_FEE | รอโอนค่ากด |
| WAITING_SERVICE_FEE_VERIFY | รอตรวจสลิปค่ากด |
| SERVICE_FEE_PAID | ชำระค่ากดแล้ว |
| DEPOSIT_PENDING | รอใช้มัดจำเป็นค่ากด |
| DEPOSIT_USED | ใช้เป็นค่ากด |
| DEPOSIT_FORFEITED | ยึดมัดจำ |
| WAITING_REFUND | รอคืนเงิน |
| REFUNDED | โอนคืนแล้ว |
| COMPLETED | เสร็จสมบูรณ์ |
| CANCELLED | ยกเลิก (ยึดมัดจำ) |
| CLOSED_REFUNDED | ปิดงาน (คืนเงินแล้ว) |

## DepositBookingStatus (lifecycle ของก้อนเงินมัดจำ)

| Code | Label | Trigger |
|------|-------|---------|
| DEPOSIT_PENDING | ถือมัดจำ | สลิป DEPOSIT_PAID ผ่านการ verify |
| DEPOSIT_USED | ใช้เป็นค่ากด | กดได้ + ยอด ≥ มัดจำ → หักเป็นค่ากด |
| DEPOSIT_FORFEITED | ยึดมัดจำ | ลูกค้ายกเลิกหลัง deadline หรือผิดเงื่อนไข |
| WAITING_REFUND | รอคืน | กดไม่ได้ / ลูกค้าได้เอง → ต้องคืน |
| REFUNDED | คืนแล้ว | RefundRequest = PAID |

## RefundStatus
| Code | Label | Action ที่อนุญาต |
|------|-------|----------------|
| REQUESTED | รอตรวจสอบ | Admin → APPROVED / REJECTED |
| APPROVED | รอโอน | Admin → PAID หลังโอนจริง |
| REJECTED | ปฏิเสธแล้ว | terminal (ต้องระบุ note) |
| PAID | โอนแล้ว | terminal |

## PaymentSlipStatus
| Code | Action |
|------|--------|
| PENDING | Admin → VERIFIED / REJECTED |
| VERIFIED | terminal (booking status เลื่อนตาม type) |
| REJECTED | terminal (ลูกค้าต้องอัปโหลดใหม่ / ติดต่อ admin) |

## Transition rules ที่ต้อง enforce

### Booking
- **เปลี่ยน status ได้เฉพาะตาม phase ถัดไป** ห้ามข้าม phase
  - ตัวอย่าง: `WAITING_DEPOSIT_VERIFY` → `QUEUE_BOOKED` หรือ `CANCELLED` เท่านั้น (ไป `READY_TO_BOOK` ตรง ๆ ไม่ได้)
- ทุกครั้งที่เปลี่ยน → INSERT `BookingStatusLog` พร้อม `changedBy` (admin id หรือ system)
- การ override ต้องผ่าน SUPER_ADMIN เท่านั้น (ดู spec 05-deposit-admin-override)

### Refund
- เริ่มจาก REQUESTED เสมอ
- REJECTED ต้องมี `notes` (validate ใน UI: spec 06)
- PAID ต้องมี `processedById` + `processedAt`
- ห้าม revert จาก PAID/REJECTED กลับไป REQUESTED

### Deposit (จาก booking → DepositTransaction)
- transition mapping (ดู spec 04 ด้วย):
  - กดได้ครบ + ยอดบัตร > มัดจำ → DEPOSIT_USED + booking status = SERVICE_FEE_PAID
  - กดได้ครบ + ยอดบัตร ≤ มัดจำ → DEPOSIT_USED + ส่วนเกินแยกเป็น WAITING_REFUND
  - กดไม่ได้ → WAITING_REFUND
  - ลูกค้ายกเลิก (active) → DEPOSIT_FORFEITED
  - ลูกค้าได้เอง / Team ไม่ได้ → WAITING_REFUND

## Color coding (ตาม plan.md)

| Phase | Color | Tailwind |
|-------|-------|----------|
| Queue | Blue | `bg-blue-100 text-blue-800` |
| Booking | Orange | `bg-orange-100 text-orange-800` |
| Success | Green | `bg-green-100 text-green-800` |
| Failed/Cancelled | Red | `bg-red-100 text-red-800` |
| Refund/Deposit | Purple/Yellow | `bg-yellow-100 text-yellow-800` |

ดู `app/(protect)/bookings/utils/booking-status.tsx` (ถ้ามี mapping ปัจจุบัน) ก่อนเพิ่มสถานะใหม่
