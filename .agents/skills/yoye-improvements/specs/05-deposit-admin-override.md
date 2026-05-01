# Spec 05 — Admin Override (ส่วนงานมัดจำ)

| | |
|--|--|
| **Source** | xlsx row #5 — Logic |
| **Category** | Edge case / governance |
| **Dependencies** | 04 |
| **Blocks** | — |

## เงื่อนไข

อนุญาตให้ Admin (จริง ๆ ควร SUPER_ADMIN เท่านั้น) แก้ไขยอด **ใช้ / คืน / ยึด** มัดจำได้เองในกรณีพิเศษ — ต้องระบุเหตุผลและถูกบันทึก audit

## Backend changes

### API endpoint

| Method | Path | Auth | Body |
|--------|------|------|------|
| `PATCH` | `/finance/deposits/:bookingId/override` | SUPER_ADMIN | `{ usedAmount, refundAmount, forfeitedAmount, reason: string, force?: boolean }` |

### Validation rule

```
usedAmount + refundAmount + forfeitedAmount === booking.depositPaid
```

ถ้าไม่ตรง → 400 (ยกเว้น `force: true` + reason)

### Logic

```ts
async function override({ bookingId, payload, actorId }) {
  if (!isSuperAdmin(actorId)) throw new Forbidden();

  const tx = await db.depositTransaction.findUnique({ where: { bookingId } });
  if (!tx) throw new NotFound();

  // sum check (ยกเว้น force)
  const sum = payload.usedAmount + payload.refundAmount + payload.forfeitedAmount;
  if (sum !== Number(tx.amount) && !payload.force)
    throw new BadRequest("ยอดรวมไม่ตรงกับยอดมัดจำ");

  // determine next status
  const status = pickStatus(payload);

  await db.depositTransaction.update({
    where: { bookingId },
    data: { ...payload, status, reason: "ADMIN_OVERRIDE", decidedById: actorId, decidedAt: new Date() },
  });
  await db.activityLog.create({
    data: {
      entity: "DepositTransaction",
      entityId: tx.id,
      action: "OVERRIDE",
      actorId,
      metadata: { previous: tx, payload, reason: payload.reason },
    },
  });
}

function pickStatus(p) {
  if (p.refundAmount > 0 && p.forfeitedAmount === 0) return "WAITING_REFUND";
  if (p.forfeitedAmount > 0 && p.refundAmount === 0) return "DEPOSIT_FORFEITED";
  if (p.refundAmount > 0 && p.forfeitedAmount > 0) return "WAITING_REFUND"; // mixed - default
  return "DEPOSIT_USED";
}
```

## Frontend changes

### `OverrideDepositDialog.tsx`

ไฟล์: `app/(protect)/finance/components/OverrideDepositDialog.tsx`

```tsx
export function OverrideDepositDialog({ bookingId, current, open, onOpenChange }: Props) {
  const { user } = useMeStore();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const { form, onSubmit, isPending } = useOverrideDeposit(bookingId, current, () => onOpenChange(false));

  const used = form.watch("usedAmount") || 0;
  const refund = form.watch("refundAmount") || 0;
  const forfeit = form.watch("forfeitedAmount") || 0;
  const total = used + refund + forfeit;
  const expected = current.amount;
  const balanced = total === expected;

  if (!isSuperAdmin) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>ปรับยอดมัดจำ (Override)</DialogTitle>
          <DialogDescription>
            ใช้สำหรับกรณีพิเศษเท่านั้น ทุกการแก้ไขจะถูกบันทึก
          </DialogDescription>
        </DialogHeader>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>การ override จะทับการคำนวณอัตโนมัติของระบบ</AlertDescription>
        </Alert>

        <form onSubmit={onSubmit} className="space-y-3">
          <FieldRow label="ยอดมัดจำเดิม">{formatTHB(expected)}</FieldRow>
          <Input type="number" step="0.01" {...form.register("usedAmount", { valueAsNumber: true })} placeholder="ใช้เป็นค่ากด" />
          <Input type="number" step="0.01" {...form.register("refundAmount", { valueAsNumber: true })} placeholder="ต้องคืน" />
          <Input type="number" step="0.01" {...form.register("forfeitedAmount", { valueAsNumber: true })} placeholder="ยึด" />

          <div className={cn("text-sm", balanced ? "text-emerald-600" : "text-red-600")}>
            รวม: {formatTHB(total)} / {formatTHB(expected)} {balanced ? "✓" : `(ต่าง ${formatTHB(total - expected)})`}
          </div>

          <Textarea {...form.register("reason")} placeholder="เหตุผล (จำเป็น)" required />
          <Checkbox {...form.register("force")} /> บังคับบันทึกแม้ยอดไม่ตรง

          <Button type="submit" disabled={isPending || (!balanced && !form.watch("force"))}>
            ยืนยันการ override
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

### Validation

```ts
export const overrideDepositSchema = z.object({
  usedAmount: z.number().nonnegative(),
  refundAmount: z.number().nonnegative(),
  forfeitedAmount: z.number().nonnegative(),
  reason: z.string().min(10, "ระบุเหตุผลอย่างน้อย 10 ตัวอักษร"),
  force: z.boolean().default(false),
});
```

### Trigger จาก Booking detail

เพิ่มปุ่ม "ปรับยอดมัดจำ" ใน `DepositBreakdown` component (จาก spec 04) — แสดงเฉพาะ SUPER_ADMIN

## Acceptance criteria

- [ ] ADMIN ปกติเรียก endpoint → 403
- [ ] SUPER_ADMIN override ยอดผิด total → 400 (ยกเว้น force)
- [ ] override สำเร็จ → DepositTransaction.reason = ADMIN_OVERRIDE, decidedById = currentUser
- [ ] ActivityLog บันทึก previous + new + reason ครบ
- [ ] UI แสดงปุ่ม override เฉพาะ SUPER_ADMIN
