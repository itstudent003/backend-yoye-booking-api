# Spec 09 — Finance Card + Clickable Notification

| | |
|--|--|
| **Source** | xlsx row #9 — UI (Admin) |
| **Category** | UI |
| **Dependencies** | 04, 06 |
| **Blocks** | — |

## เงื่อนไข

- แสดงยอด **"ต้องโอนคืน"** และ **"ค้างจ่าย"** ที่ชัดเจน
- Notification ต้องคลิกได้ (Clickable) ไปหน้างานนั้นทันที

## Frontend changes

### 1. Finance Cards (Dashboard / Finance summary)

ไฟล์: `app/(protect)/finance/page.tsx` หรือ summary section ใน dashboard

ใช้ existing `IFinanceSummary` แต่ต้องเพิ่ม:
- `pendingRefundAmount` (= sum RefundRequest.amount where status APPROVED)
- `outstandingPaymentAmount` (= sum PaymentSlip.slipAmount where status PENDING)

```ts
interface IFinanceSummary {
  totalDeposit: number;
  usedAsFee: number;
  forfeited: number;
  refunded: number;
  pendingRefundAmount: number;       // ← ใหม่
  outstandingPaymentAmount: number;  // ← ใหม่
}
```

UI cards:

```tsx
<FinanceCard
  title="ต้องโอนคืน"
  amount={summary.pendingRefundAmount}
  hint={`${summary.pendingRefundCount} รายการ`}
  href="/payments?tab=refunds&status=APPROVED"
  tone="yellow"
  icon={<ArrowUpRight />}
/>
<FinanceCard
  title="ค้างจ่าย / รอตรวจสลิป"
  amount={summary.outstandingPaymentAmount}
  hint={`${summary.outstandingPaymentCount} ใบ`}
  href="/payments?status=PENDING"
  tone="orange"
  icon={<Clock />}
/>
```

### 2. Notification Bell (Topbar)

ไฟล์: `components/topbar.tsx`

เพิ่ม `NotificationBell` component:

```tsx
function NotificationBell() {
  const { data } = useDashboardActions();
  const unread = (data?.data ?? []).filter((a) => a.priority === "high");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unread.length > 0 && (
            <span className="absolute top-1 right-1 h-4 min-w-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center px-1">
              {unread.length > 9 ? "9+" : unread.length}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        {unread.length === 0 ? (
          <div className="p-4 text-sm text-gray-500 text-center">ไม่มีการแจ้งเตือน</div>
        ) : (
          unread.map((a) => (
            <Link key={a.id} href={a.href} className="block p-3 hover:bg-gray-50 border-b last:border-0">
              <div className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-red-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{a.title}</p>
                  <p className="text-xs text-gray-500">{a.count} รายการ {a.totalAmount && `· ${formatTHB(a.totalAmount)}`}</p>
                </div>
              </div>
            </Link>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

### 3. Toast notifications ก็คลิกได้

ใช้ `sonner.toast` พร้อม `action`:

```ts
toast.error("มีสลิปใหม่รอตรวจ", {
  action: { label: "ดู", onClick: () => router.push("/payments?status=PENDING") },
  position: "top-center",
});
```

### 4. Realtime push (optional, advanced)

ถ้า backend support WebSocket / SSE:

```ts
useEffect(() => {
  const sse = new EventSource("/api/v1/dashboard/events", { withCredentials: true });
  sse.addEventListener("notify", (e) => {
    const data = JSON.parse(e.data);
    queryClient.invalidateQueries({ queryKey: ["dashboard-actions"] });
    toast.info(data.title, { action: { label: "ดู", onClick: () => router.push(data.href) } });
  });
  return () => sse.close();
}, []);
```

## Backend changes

### Augment `IFinanceSummary` endpoint

```sql
SELECT
  (SELECT COALESCE(SUM(amount), 0) FROM "RefundRequest" WHERE status = 'APPROVED') AS pending_refund_amount,
  (SELECT COUNT(*) FROM "RefundRequest" WHERE status = 'APPROVED') AS pending_refund_count,
  (SELECT COALESCE(SUM(slip_amount), 0) FROM "PaymentSlip" WHERE status = 'PENDING') AS outstanding_payment_amount,
  (SELECT COUNT(*) FROM "PaymentSlip" WHERE status = 'PENDING') AS outstanding_payment_count;
```

## Acceptance criteria

- [ ] Finance card "ต้องโอนคืน" คลิก → `/payments?tab=refunds&status=APPROVED`
- [ ] Bell badge แสดงจำนวน high-priority actions
- [ ] Bell empty state เมื่อไม่มี action high
- [ ] Bell คลิก notification → redirect ตรงไปงานนั้น
- [ ] Toast มีปุ่ม "ดู" คลิกได้
- [ ] Mobile: Bell ยังคลิกได้ใน sheet
