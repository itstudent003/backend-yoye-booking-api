# Spec 08 — ปรับ Dashboard เป็น Action-Based

| | |
|--|--|
| **Source** | xlsx row #8 — UI (Admin) |
| **Category** | UI/UX restructure |
| **Dependencies** | 06 (refund), 09 (notification) — ทำไปด้วยกันได้ |
| **Blocks** | — |

## เงื่อนไข

แสดงรายการที่ "ต้องทำทันที" (เช่น "ต้องตรวจ 1 สลิป", "ต้องโอนคืน 2 รายการ")

## ความต่างจาก dashboard เดิม

| เดิม | ใหม่ |
|------|------|
| สรุปตัวเลข + recent activity | "Action Items" ขึ้นบนสุด — ทุกการ์ดเป็น CTA |
| Alert section | รวมเข้า Action Items |
| Stats Cards เป็นตัวเลขเฉย ๆ | Stats Cards คลิกได้ → filter ปลายทาง |

## Action Item types

| Action | Source | Counter | Click → |
|--------|--------|---------|---------|
| ต้องอนุมัติคิว | Booking status = WAITING_QUEUE_APPROVAL | count | `/bookings?status=WAITING_QUEUE_APPROVAL` |
| ต้องตรวจสลิปมัดจำ | PaymentSlip status=PENDING, type=DEPOSIT_PAID | count | `/payments?type=DEPOSIT_PAID&status=PENDING` |
| ต้องตรวจสลิปบัตร | PaymentSlip status=PENDING, type=CARD_PAID | count | `/payments?type=CARD_PAID&status=PENDING` |
| ต้องตรวจสลิปค่ากด | PaymentSlip status=PENDING, type=SERVICE_PAID | count | `/payments?type=SERVICE_PAID&status=PENDING` |
| ต้องอนุมัติคืนเงิน | RefundRequest status=REQUESTED | count + sum | `/payments?tab=refunds&status=REQUESTED` |
| ต้องโอนคืน | RefundRequest status=APPROVED | count + sum | `/payments?tab=refunds&status=APPROVED` |
| ต้องอนุมัติ Expense (spec 10) | Expense status=PENDING | count + sum | `/expenses?status=PENDING` |
| ต้อง assign Presser | Booking status=READY_TO_BOOK + no presser | count | `/bookings?missingPresser=1` |

## Backend changes

### Endpoint รวม

| Method | Path | Returns |
|--------|------|---------|
| `GET` | `/dashboard/actions` | `ActionItem[]` |

```ts
type ActionItem = {
  id: string;                                            // "approve-queue", "verify-slip-deposit", ...
  title: string;                                         // ภาษาคน
  count: number;
  totalAmount?: number;
  priority: "high" | "medium" | "low";
  href: string;                                          // /bookings?status=...
  ctaLabel: string;                                      // "ตรวจเลย", "โอนคืน"
};
```

> รวมทั้งหมดในเรียกเดียว — frontend แสดงเฉพาะที่ count > 0

### Priority

- count >= 5 หรืองานค้าง > 24 ชม → "high"
- มีงานอย่างเดียว → "medium"
- ไม่มี → ไม่ส่ง entry

## Frontend changes

### `app/(protect)/dashboard/page.tsx` — restructure

```tsx
export default function DashboardOverview() {
  const { data: actions, isLoading } = useDashboardActions();
  const { data: statsData } = useDashboardStats();          // เก็บไว้ — แสดงด้านล่าง
  const { data: activityData } = useDashboardActivity(5);

  return (
    <div className="space-y-6">
      <Header />

      {/* Section 1: สิ่งที่ต้องทำ — ขึ้นบนสุด */}
      <section>
        <h2 className="text-lg font-semibold mb-3">สิ่งที่ต้องทำ</h2>
        {isLoading ? (
          <ActionGridSkeleton />
        ) : actions?.data?.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {actions.data.map((a) => <ActionCard key={a.id} action={a} />)}
          </div>
        ) : (
          <EmptyState message="ไม่มีงานค้าง" />
        )}
      </section>

      {/* Section 2: สถิติสรุป */}
      <section>
        <h2 className="text-lg font-semibold mb-3">ภาพรวม</h2>
        <StatsCards stats={statsData?.data} />
      </section>

      {/* Section 3: Recent Activity */}
      <section>
        <RecentActivity items={activityData?.data ?? []} />
      </section>
    </div>
  );
}
```

### `ActionCard.tsx`

```tsx
const priorityClass = {
  high:   "border-red-200 bg-red-50",
  medium: "border-yellow-200 bg-yellow-50",
  low:    "border-blue-200 bg-blue-50",
};

export function ActionCard({ action }: { action: ActionItem }) {
  return (
    <Link href={action.href} className={cn("block rounded-2xl border p-4 hover:shadow-md transition", priorityClass[action.priority])}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-700">{action.title}</p>
          <p className="text-3xl font-bold mt-2">{action.count}</p>
          {action.totalAmount != null && (
            <p className="text-xs text-gray-500 mt-1">{formatTHB(action.totalAmount)}</p>
          )}
        </div>
        <ArrowUpRight className="h-4 w-4 text-gray-400" />
      </div>
      <div className="mt-3 text-xs font-medium text-gray-700">{action.ctaLabel} →</div>
    </Link>
  );
}
```

### Hook

```ts
// app/(protect)/dashboard/hooks/use-dashboard-actions.ts
export function useDashboardActions() {
  return useQueryGet<IBaseResponseData<ActionItem[]>>(
    ["dashboard-actions"],
    "/dashboard/actions",
    undefined,
    {
      refetchInterval: 30_000,    // poll ทุก 30 วิ
    },
  );
}
```

### Stats Cards เป็น link

แก้ `StatCard` (ใน `dashboard/page.tsx`) ให้รับ `href` optional:

```tsx
function StatCard({ title, items, href }: Props) {
  const card = <div className="...">{...}</div>;
  return href ? <Link href={href}>{card}</Link> : card;
}
```

## Acceptance criteria

- [ ] ไม่มีสลิปค้าง / refund ค้าง → "Action Items" section แสดง empty state
- [ ] มีสลิป 3 ใบ → action card "ต้องตรวจสลิป" count=3 → คลิก redirect `/payments`
- [ ] Polling ทุก 30 วินาที — ตอน admin คนอื่นตรวจสลิป count ลดลง
- [ ] Mobile responsive (1 column) — card readable
- [ ] action.totalAmount แสดงเฉพาะ refund/expense ไม่ใช่ slip
