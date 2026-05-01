# Spec 10 — ระบบบันทึกค่าใช้จ่ายร้าน (Expense)

| | |
|--|--|
| **Source** | xlsx row #10 — Feature |
| **Category** | New module |
| **Dependencies** | 01 (Presser), 08 (action dashboard mention) |
| **Blocks** | — |

## เงื่อนไข

- ทีม (Presser/Admin) **กรอก** → Admin **อนุมัติ**
- คำนวณยอดเงินระหว่าง "บริษัท" กับ "ทีมกด" อัตโนมัติ (ใครต้องโอนคืนใคร)
- หลักการสำคัญ: Expense **ไม่ถูกนับเข้าระบบจนกว่า admin จะกด "อนุมัติ"** (ป้องกันกำไรสุทธิผิดพลาด)

## Backend changes

### Prisma — Expense

```prisma
model Expense {
  id            Int             @id @default(autoincrement())
  bookingId     Int?            // ผูกกับ booking (เพื่อ allocate cost)
  eventId       Int?            // ผูกกับ event (กรณีไม่ผูก booking)
  category      ExpenseCategory
  description   String
  amount        Decimal         @db.Decimal(10, 2)
  paidBy        ExpensePaidBy   // COMPANY | TEAM
  receiptUrl    String?         // รูปสลิป
  status        ExpenseStatus   @default(PENDING)
  // workflow
  submittedById Int
  submittedAt   DateTime        @default(now())
  approvedById  Int?
  approvedAt    DateTime?
  rejectedNote  String?
  // settlement
  settledAt     DateTime?       // เมื่อจ่ายชดเชยกันแล้ว
  settlementNote String?

  booking     Booking? @relation(fields: [bookingId], references: [id])
  event       Event?   @relation(fields: [eventId], references: [id])
  submittedBy User     @relation("Submitted", fields: [submittedById], references: [id])
  approvedBy  User?    @relation("Approved",  fields: [approvedById], references: [id])

  @@index([status])
  @@index([submittedById])
}

enum ExpenseCategory {
  TRANSPORT       // ค่าเดินทาง
  EQUIPMENT       // อุปกรณ์
  FOOD            // ค่าอาหารทีม
  SUBSCRIPTION    // ค่าระบบ/สมาชิก
  OTHER
}

enum ExpensePaidBy {
  COMPANY         // บริษัทเป็นคนจ่าย → ไม่ต้องชดเชย
  TEAM            // ทีมจ่ายไปก่อน → บริษัทต้องโอนคืน
}

enum ExpenseStatus {
  PENDING
  APPROVED
  REJECTED
  PAID            // ชดเชยแล้ว
}
```

### API endpoints

| Method | Path | Auth | Body |
|--------|------|------|------|
| `POST` | `/expenses` | ADMIN, SUPER_ADMIN, PRESSER | `{ bookingId?, eventId?, category, description, amount, paidBy, receiptUrl? }` |
| `GET` | `/expenses` | ADMIN, SUPER_ADMIN | filter: `status, submittedById, eventId, from, to` |
| `GET` | `/expenses/mine` | PRESSER | ของตัวเอง |
| `PATCH` | `/expenses/:id/status` | ADMIN, SUPER_ADMIN | `{ status, note?, settlementNote? }` |
| `GET` | `/expenses/settlement` | ADMIN, SUPER_ADMIN | สรุประหว่าง company ↔ team |

### Settlement calc

```ts
type SettlementResult = {
  perPerson: Array<{
    userId: number;
    name: string;
    teamPaid: number;       // sum where paidBy=TEAM, status approved/paid
    companyPaid: number;    // sum where paidBy=COMPANY, status approved/paid (allocated to user)
    netToReceive: number;   // = teamPaid (เงินที่ทีมต้องได้คืนจากบริษัท)
  }>;
  companyTotal: number;
  teamTotal: number;
};
```

> Approved = นับ, PENDING/REJECTED = ไม่นับ

## Frontend changes

### Module folder

```
app/(protect)/expenses/
├── page.tsx                 ← list ของ admin (รวมทั้งหมด)
├── mine/page.tsx            ← list ของ presser/admin (เฉพาะของตัวเอง)
├── components/
│   ├── ExpenseTable.tsx
│   ├── ExpenseFilterBar.tsx
│   ├── AddExpenseDialog.tsx
│   ├── ExpenseDetailDialog.tsx
│   ├── ApproveExpenseDialog.tsx
│   └── SettlementCard.tsx
├── hooks/
│   ├── use-expenses.ts
│   ├── use-add-expense.ts
│   ├── use-update-expense-status.ts
│   ├── use-settlement.ts
│   └── use-mine-expenses.ts
├── types/{enum,interface}.ts
└── validate/expense.validate.ts
```

### Sidebar

ไฟล์: `components/sidebar.tsx`

```ts
{ name: "ค่าใช้จ่าย", href: "/expenses", icon: Receipt },  // สำหรับ ADMIN/SUPER_ADMIN
```

PRESSER จะเห็นเมนูแยก "ค่าใช้จ่ายของฉัน" → `/expenses/mine`

### Validation

```ts
// validate/expense.validate.ts
export const expenseSchema = z.object({
  bookingId: z.number().int().positive().optional(),
  eventId: z.number().int().positive().optional(),
  category: z.enum(["TRANSPORT", "EQUIPMENT", "FOOD", "SUBSCRIPTION", "OTHER"]),
  description: z.string().min(3, "อธิบายอย่างน้อย 3 ตัวอักษร"),
  amount: z.number().positive("จำนวนเงินต้องมากกว่า 0"),
  paidBy: z.enum(["COMPANY", "TEAM"]),
  receiptUrl: z.string().url().optional(),
}).refine((v) => v.bookingId || v.eventId, { message: "ต้องระบุ booking หรือ event อย่างน้อย 1" });
```

### `AddExpenseDialog.tsx`

ฟอร์มมาตรฐาน react-hook-form + zod:
- Select category
- Combobox event (เลือก event หรือพิมพ์ค้น)
- Input amount + paidBy (RadioGroup: บริษัท / ทีมจ่าย)
- File upload (receipt)
- Toast success → invalidate `["expenses"]`

### `ExpenseTable.tsx`

Columns: วันที่ · หมวด · รายละเอียด · ผู้จ่าย (Badge: บริษัท/ทีม) · ยอด · สถานะ · ผู้ส่ง · Actions

Actions:
- ADMIN เห็น: ดู, อนุมัติ, ปฏิเสธ
- เจ้าของรายการ + status PENDING: แก้ไข, ลบ

### `ApproveExpenseDialog.tsx`

```tsx
<RadioGroup value={action} onValueChange={setAction}>
  <RadioGroupItem value="APPROVE" /> อนุมัติ
  <RadioGroupItem value="REJECT" />  ปฏิเสธ
</RadioGroup>
{action === "REJECT" && (
  <Textarea {...form.register("rejectedNote")} placeholder="เหตุผลที่ปฏิเสธ" required />
)}
```

### `SettlementCard.tsx`

แสดงตาราง:

```
ผู้ใช้      ทีมจ่ายไป     บริษัทจ่ายให้     ต้องโอนคืน
นาย ก       2,500          0                +2,500
นาย ข       1,200          800              +400
```

พร้อมปุ่ม "ทำเครื่องหมายว่าโอนแล้ว" → mark `settledAt`

## Acceptance criteria

- [ ] PRESSER กรอก expense → status PENDING, submittedById = self
- [ ] PRESSER ไม่เห็น list expense ของคนอื่น (ยกเว้นของตัวเองใน /mine)
- [ ] PENDING expense **ไม่ถูกนับ** ใน `/finance/summary` (ทดสอบ: ก่อน-หลัง approve ตัวเลขเปลี่ยน)
- [ ] APPROVED → settlement card อัปเดต netToReceive
- [ ] REJECTED ต้องมี rejectedNote
- [ ] Audit: ทุก approve/reject → ActivityLog ภาษาคน "อนุมัติค่าใช้จ่าย {หมวด} {ยอด} ให้ {ชื่อ}"
- [ ] Settlement หลังโอนคืน → status PAID, settledAt set
