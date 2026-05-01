# Spec 03 — บันทึกราคา/โซน/ที่นั่งที่กดได้

| | |
|--|--|
| **Source** | xlsx row #3 — Feature |
| **Category** | Feature · Data persistence |
| **Dependencies** | 01, 02 |
| **Blocks** | 04 (deposit calc ใช้ยอดที่บันทึก) |

## เงื่อนไข

- บันทึก **ราคา**, **โซน**, **ที่นั่ง** ของบัตรที่กดได้จริง
- เก็บเป็น Database เพื่อให้ลูกค้าเช็คได้ตลอด (transparency requirement)

## Backend changes

### Prisma model

```prisma
model BookedTicket {
  id          Int      @id @default(autoincrement())
  bookingId   Int
  zoneId      Int?         // อ้างอิง TicketZone (null ถ้าได้โซนสำรอง/นอกระบบ)
  zoneNameRaw String       // ชื่อโซนตามที่บันทึก (กันกรณี zone deleted)
  seat        String       // เช่น "A12", "Standing"
  price       Decimal      @db.Decimal(10, 2)
  pressedById Int          // Presser ที่กดได้
  pressedAt   DateTime     @default(now())
  notes       String?
  voidedAt    DateTime?    // soft-delete (ตอน edit/refund)
  voidedById  Int?

  booking     Booking      @relation(fields: [bookingId], references: [id], onDelete: Cascade)
  zone        TicketZone?  @relation(fields: [zoneId], references: [id])
  pressedBy   User         @relation("Pressed", fields: [pressedById], references: [id])
  voidedBy    User?        @relation("Voided", fields: [voidedById], references: [id])

  @@index([bookingId])
}

model Booking {
  // ... existing
  bookedTickets BookedTicket[]
}
```

### API endpoints

| Method | Path | Auth | Body | Use |
|--------|------|------|------|-----|
| `POST` | `/presser/bookings/:id/tickets` | PRESSER (assigned) / ADMIN | `{ zoneId?, zoneNameRaw, seat, price, notes? }` | บันทึกบัตรที่กดได้ |
| `PATCH` | `/presser/bookings/:id/tickets/:ticketId` | PRESSER เจ้าของ / ADMIN | partial | แก้ไข |
| `DELETE` | `/presser/bookings/:id/tickets/:ticketId` | ADMIN, SUPER_ADMIN | — | void (soft) |
| `GET` | `/customer/bookings/:code/tickets` | public/customer | — | ลูกค้าเช็คเอง (auth ผ่าน bookingCode + lastDigits ของเบอร์ หรือ token) |

### Auto-update booking status

หลัง POST tickets:
- ถ้า `count(tickets) >= sum(quantity ในทุก BookingItem)` → set `Booking.status = FULLY_BOOKED`
- ถ้า `0 < count < required` → `PARTIALLY_BOOKED`
- ทุกการเปลี่ยน → log ใน `BookingStatusLog`

## Frontend changes

### `BookedTicketsForm.tsx` (อยู่ใน `app/(protect)/presser/components/`)

```tsx
"use client";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { bookedTicketsSchema, BookedTicketsValues } from "../validate/booked-tickets.validate";

export function BookedTicketsForm({ bookingId, existingTickets }: Props) {
  const { form, onSubmit, isPending, fieldArray } = useBookedTickets(bookingId, existingTickets);
  const { fields, append, remove } = fieldArray;

  return (
    <Card>
      <CardHeader>
        <CardTitle>บันทึกบัตรที่กดได้</CardTitle>
        <CardDescription>ระบุโซน · ที่นั่ง · ราคา ของบัตรแต่ละใบ</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-3">
          {fields.map((f, i) => (
            <div key={f.id} className="grid grid-cols-12 gap-2">
              <div className="col-span-3">
                <Label>โซน</Label>
                <Input {...form.register(`tickets.${i}.zoneNameRaw`)} placeholder="VIP" />
              </div>
              <div className="col-span-3">
                <Label>ที่นั่ง</Label>
                <Input {...form.register(`tickets.${i}.seat`)} placeholder="A12" />
              </div>
              <div className="col-span-3">
                <Label>ราคา</Label>
                <Input type="number" {...form.register(`tickets.${i}.price`, { valueAsNumber: true })} />
              </div>
              <div className="col-span-2">
                <Label>หมายเหตุ</Label>
                <Input {...form.register(`tickets.${i}.notes`)} />
              </div>
              <div className="col-span-1 flex items-end">
                <Button type="button" variant="ghost" onClick={() => remove(i)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={() => append({ zoneNameRaw: "", seat: "", price: 0 })}>
            <Plus className="h-4 w-4" /> เพิ่มแถว
          </Button>
          <SummaryFooter values={form.watch("tickets")} />
          <Button type="submit" disabled={isPending}>บันทึก</Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

### `validate/booked-tickets.validate.ts`

```ts
export const bookedTicketSchema = z.object({
  zoneId: z.number().int().positive().optional(),
  zoneNameRaw: z.string().min(1, "ระบุโซน"),
  seat: z.string().min(1, "ระบุที่นั่ง"),
  price: z.number().nonnegative("ราคาต้องไม่ติดลบ"),
  notes: z.string().optional(),
});

export const bookedTicketsSchema = z.object({
  tickets: z.array(bookedTicketSchema).min(1, "ต้องมีอย่างน้อย 1 รายการ"),
});

export type BookedTicketsValues = z.infer<typeof bookedTicketsSchema>;
```

### `hooks/use-booked-tickets.ts`

```ts
export function useBookedTickets(bookingId: number, existing: IBookedTicket[]) {
  const queryClient = useQueryClient();
  const form = useForm<BookedTicketsValues>({
    resolver: zodResolver(bookedTicketsSchema),
    defaultValues: { tickets: existing.length ? existing : [{ zoneNameRaw: "", seat: "", price: 0 }] },
  });
  const fieldArray = useFieldArray({ control: form.control, name: "tickets" });

  const mutation = useMutationPost<IBaseResponseData<IBookedTicket[]>, BookedTicketsValues>(
    `/presser/bookings/${bookingId}/tickets/bulk`,
    {
      onSuccess: () => {
        toast.success("บันทึกสำเร็จ", { position: "top-center" });
        queryClient.invalidateQueries({ queryKey: ["my-booking-detail", bookingId] });
      },
      onError: () => toast.error("บันทึกไม่สำเร็จ"),
    }
  );

  return { form, fieldArray, isPending: mutation.isPending, onSubmit: form.handleSubmit((v) => mutation.mutate(v)) };
}
```

### Customer-facing read endpoint (เผื่อทำหน้า public)

ตามเงื่อนไข "ให้ลูกค้าเช็คได้ตลอด" — ทำได้ 2 ทาง:
1. ลูกค้าใช้ link `/track/<bookingCode>` ใน app ลูกค้า (อยู่นอก repo นี้) → backend expose `GET /customer/bookings/:code/tickets`
2. หรือเปิด page `/tracking/[code]/public` ใน admin (สำหรับให้ admin ดูสรุป)

## Acceptance criteria

- [ ] Presser ใส่บัตร 3 แถว → POST → ได้ row ใน `BookedTicket` 3 row
- [ ] Booking status auto-update เป็น `FULLY_BOOKED` เมื่อยอดครบ
- [ ] Admin/SuperAdmin void บัตร 1 ใบ → `voidedAt` ถูก set, ลูกค้าไม่เห็นใน public endpoint
- [ ] Summary ในฟอร์ม: รวมจำนวนใบ + ยอดรวม (ราคา) — match กับ DB
- [ ] Presser คนอื่นที่ assign booking เดียวกันเห็น list ที่อีกคนกดไว้แล้ว
