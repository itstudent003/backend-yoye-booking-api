# Spec 07 — Refund Breakdown แยกตามประเภท

| | |
|--|--|
| **Source** | xlsx row #7 — Feature |
| **Category** | Reporting · UI |
| **Dependencies** | 06 |
| **Blocks** | — |

## เงื่อนไข

รวมยอดคืนอัตโนมัติแยกตามประเภท: ค่าบัตร / มัดจำ / ส่วนต่าง / ค่าส่ง

## Backend changes

### ใช้ field `category` + `breakdown` ที่เพิ่มใน spec 06

#### Aggregation endpoint

| Method | Path | Returns |
|--------|------|---------|
| `GET` | `/finance/refunds/breakdown` | sum per category over period |

```ts
type RefundBreakdownResponse = {
  total: number;
  byCategory: {
    ticket: number;
    deposit: number;
    priceDiff: number;
    shipping: number;
  };
  byStatus: Record<RefundStatus, number>;
  series?: Array<{ date: string; total: number }>; // รายวัน
};
```

Query params: `from`, `to`, `eventId?`, `status?`

### SQL idea

```sql
SELECT
  SUM(COALESCE((breakdown->>'ticket')::numeric, 0))    AS ticket,
  SUM(COALESCE((breakdown->>'deposit')::numeric, 0))   AS deposit,
  SUM(COALESCE((breakdown->>'priceDiff')::numeric, 0)) AS price_diff,
  SUM(COALESCE((breakdown->>'shipping')::numeric, 0))  AS shipping,
  SUM(amount) AS total
FROM "RefundRequest"
WHERE status = 'PAID'
  AND processed_at BETWEEN $1 AND $2;
```

> ถ้า refund ไม่มี breakdown → ตกอยู่ใน `category = MIXED` ไม่นับ per-category (รายงานต้องบอกให้ user รู้)

## Frontend changes

### Tab ใหม่ใน Finance — "การคืนเงิน"

ไฟล์: `app/(protect)/finance/page.tsx` (มี `useFinanceRefunds` อยู่แล้ว)

เพิ่ม:
- การ์ด 4 ใบ: ค่าบัตร / มัดจำ / ส่วนต่าง / ค่าส่ง — ดึงจาก `/finance/refunds/breakdown`
- กราฟ stacked bar (ใช้ `recharts` ซึ่งอยู่ใน artifact lib แต่ต้อง install ใน repo) **หรือ** ทำเป็น horizontal progress bar แบบ pure Tailwind (แนะนำ — ไม่ต้องเพิ่ม dep)

```tsx
function RefundCategoryBars({ breakdown, total }: Props) {
  const items = [
    { key: "ticket",    label: "ค่าบัตร",     color: "bg-blue-500"    },
    { key: "deposit",   label: "มัดจำ",       color: "bg-purple-500"  },
    { key: "priceDiff", label: "ส่วนต่าง",    color: "bg-amber-500"   },
    { key: "shipping",  label: "ค่าส่ง",      color: "bg-emerald-500" },
  ];
  return (
    <div className="space-y-3">
      {items.map((it) => {
        const value = breakdown[it.key] ?? 0;
        const pct = total > 0 ? (value / total) * 100 : 0;
        return (
          <div key={it.key}>
            <div className="flex justify-between text-sm">
              <span>{it.label}</span>
              <span className="font-medium">{formatTHB(value)} ({pct.toFixed(1)}%)</span>
            </div>
            <div className="h-2 rounded bg-gray-100 overflow-hidden">
              <div className={cn(it.color, "h-full transition-all")} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

### Filter

วันที่ (ใช้ `DateRangePicker` หรือ default 30 วันล่าสุด) + event filter (combobox)

### Hook

```ts
export function useRefundsBreakdown(query: { from: string; to: string; eventId?: number }) {
  return useQueryGet<IBaseResponseData<RefundBreakdownResponse>>(
    ["refunds-breakdown", query],
    "/finance/refunds/breakdown",
    query,
  );
}
```

### Refund detail panel

ตอนเปิด refund detail (จาก spec 06) แสดง breakdown ของรายการนั้นด้วย — ถ้า admin สร้างใหม่ + กรอก breakdown ครบ ก็เห็นเป็น 4 บรรทัด

## Acceptance criteria

- [ ] สร้าง refund มี breakdown ครบ → reflect ใน aggregation
- [ ] Total per-category sum ตรงกับ `total` (sum row level)
- [ ] Filter date range → ตัวเลขเปลี่ยนตาม
- [ ] MIXED category — ไม่นับใน 4 ก้อน แต่ยังนับใน total + แสดงเป็น "ไม่ได้แยกประเภท" line
- [ ] Refund detail แสดง breakdown ถ้ามี / "ไม่ได้แยกประเภท" ถ้าไม่มี
