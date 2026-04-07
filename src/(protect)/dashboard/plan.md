# Dashboard API Plan for Frontend

เอกสารนี้อธิบาย endpoint ในโมดูล `dashboard` สำหรับให้ frontend เชื่อมหน้า dashboard ได้ตรงกับ implementation ปัจจุบันใน backend

## Base Config

- Base URL: `/api/v1`
- Module path: `/dashboard`
- ทุก endpoint ต้องส่ง `Authorization: Bearer <token>`
- ทุก response ถูกครอบด้วยรูปแบบกลางจาก `ResponseInterceptor`

```ts
type ApiResponse<T> = {
  statusCode: number;
  message: string; // ปกติเป็น "success"
  data: T;
};
```

---

## 1. Stats Cards

- Method: `GET`
- URL: `/api/v1/dashboard/stats`
- Query params: ไม่มี

ใช้สำหรับการ์ดสรุปทั้ง 3 ใบบนหน้า dashboard ดึงครั้งเดียวได้ครบ

### Response `data`

```ts
type DashboardStats = {
  ticket: {
    pendingApproval: number;  // รออนุมัติคิว
    inProgress: number;       // กำลังดำเนินการ
    totalCompleted: number;   // เสร็จสิ้นแล้ว
  };
  form: {
    newForms: number;         // ฟอร์มใหม่ใน 24 ชั่วโมงที่ผ่านมา
    pendingReview: number;    // รอตรวจสอบ (สลิป PENDING ของ FORM)
  };
  finance: {
    depositsHeld: number;        // มัดจำที่ถืออยู่ (บาท)
    refundsAccumulated: number;  // เงินคืนสะสม (บาท)
    outstandingPayments: number; // ค้างชำระจากสลิปรอตรวจ (บาท)
  };
};
```

### Logic แต่ละ field

**Ticket** (นับเฉพาะ event ประเภท `TICKET` และ booking ที่ยังไม่ถูกลบ):

| Field | เงื่อนไข BookingStatus |
|-------|----------------------|
| `pendingApproval` | `WAITING_QUEUE_APPROVAL` |
| `inProgress` | `WAITING_BOOKING_INFO`, `TRANSFERRING_TICKET`, `CONFIRMING_TICKET`, `WAITING_ADMIN_CONFIRM`, `READY_TO_BOOK`, `BOOKING_IN_PROGRESS`, `PARTIALLY_BOOKED` |
| `totalCompleted` | `FULLY_BOOKED`, `COMPLETED`, `CUSTOMER_SELF_BOOKED`, `TEAM_BOOKED`, `PARTIAL_SELF_TEAM_BOOKING` |

**Form** (นับเฉพาะ event ประเภท `FORM` และ booking ที่ยังไม่ถูกลบ):

| Field | เงื่อนไข |
|-------|---------|
| `newForms` | booking สร้างใน 24 ชั่วโมงที่ผ่านมา |
| `pendingReview` | payment slip สถานะ `PENDING` ของ FORM events |

**Finance**:

| Field | เงื่อนไข |
|-------|---------|
| `depositsHeld` | SUM `depositPaid` ของ booking ที่ status = `DEPOSIT_PENDING` |
| `refundsAccumulated` | SUM `amount` ของ `RefundRequest` ที่ status = `PAID` |
| `outstandingPayments` | SUM `slipAmount` ของ payment slip ที่ status = `PENDING` |

### Example Response

```json
{
  "statusCode": 200,
  "message": "success",
  "data": {
    "ticket": {
      "pendingApproval": 12,
      "inProgress": 8,
      "totalCompleted": 156
    },
    "form": {
      "newForms": 23,
      "pendingReview": 15
    },
    "finance": {
      "depositsHeld": 45000,
      "refundsAccumulated": 12000,
      "outstandingPayments": 8500
    }
  }
}
```

---

## 2. Recent Alerts

- Method: `GET`
- URL: `/api/v1/dashboard/alerts`

ใช้สำหรับ section การแจ้งเตือนล่าสุด รวมสลิปรอตรวจสอบ และคำขอคืนเงินที่รอดำเนินการ

### Query Params

```ts
type AlertsQuery = {
  limit?: number; // default 10
};
```

### Alert Types

| `type` | แหล่งข้อมูล | เงื่อนไข |
|--------|-----------|---------|
| `"slip"` | `PaymentSlip` | status = `PENDING` |
| `"refund"` | `RefundRequest` | status = `REQUESTED` |

### Priority Logic

คำนวณจากอายุของรายการ (เวลาตั้งแต่สร้างจนถึงปัจจุบัน):

| Priority | เงื่อนไข |
|----------|---------|
| `"high"` | > 24 ชั่วโมง |
| `"medium"` | 1–24 ชั่วโมง |
| `"low"` | < 1 ชั่วโมง |

### Response `data`

```ts
type AlertItem = {
  id: string;              // เช่น "slip-12", "refund-5"
  type: 'slip' | 'refund';
  message: string;         // ข้อความอธิบาย
  time: string;            // ISO datetime
  priority: 'high' | 'medium' | 'low';
};
```

### Example Response

```json
{
  "statusCode": 200,
  "message": "success",
  "data": [
    {
      "id": "slip-42",
      "type": "slip",
      "message": "สลิปรอตรวจสอบ (DEPOSIT_PAID) — BNK-0042 (สมชาย ใจดี)",
      "time": "2026-04-07T08:30:00.000Z",
      "priority": "high"
    },
    {
      "id": "refund-8",
      "type": "refund",
      "message": "คำขอคืนเงิน 2,500 บาท — BNK-0038 (สมหญิง รักดี)",
      "time": "2026-04-07T10:15:00.000Z",
      "priority": "medium"
    }
  ]
}
```

### Suggested Color Mapping (Frontend)

```ts
const priorityColor = {
  high: 'red',
  medium: 'yellow',
  low: 'blue',
} as const;

const alertTypeIcon = {
  slip: 'receipt',
  refund: 'arrow-uturn-left',
} as const;
```

---

## 3. Recent Activity

- Method: `GET`
- URL: `/api/v1/dashboard/activity`

ใช้สำหรับ section "Recent Activity" แสดง timeline การเปลี่ยนสถานะ booking ล่าสุดโดย admin

### Query Params

```ts
type ActivityQuery = {
  limit?: number; // default 10
};
```

### Response `data`

```ts
type ActivityItem = {
  id: number;
  type: 'status_changed';
  message: string;        // เช่น "BNK-0042 → FULLY_BOOKED"
  actor: string;          // ชื่อ admin ที่ทำรายการ หรือ "System"
  actorId: number | null;
  createdAt: string;      // ISO datetime
};
```

### Example Response

```json
{
  "statusCode": 200,
  "message": "success",
  "data": [
    {
      "id": 201,
      "type": "status_changed",
      "message": "BNK-0042 → FULLY_BOOKED",
      "actor": "สมศักดิ์ แอดมิน",
      "actorId": 3,
      "createdAt": "2026-04-07T11:00:00.000Z"
    },
    {
      "id": 200,
      "type": "status_changed",
      "message": "BNK-0041 → WAITING_REFUND (ลูกค้าขอยกเลิก)",
      "actor": "สมศักดิ์ แอดมิน",
      "actorId": 3,
      "createdAt": "2026-04-07T10:45:00.000Z"
    }
  ]
}
```

---

## สรุป Endpoints ทั้งหมด

| # | Method | Endpoint | ใช้กับ | Params |
|---|--------|----------|--------|--------|
| 1 | GET | `/api/v1/dashboard/stats` | ทุก stat card | — |
| 2 | GET | `/api/v1/dashboard/alerts` | Recent Alerts section | `limit` |
| 3 | GET | `/api/v1/dashboard/activity` | Recent Activity section | `limit` |

---

## Frontend Integration Flow

### Dashboard Page

โหลดข้อมูลพร้อมกันได้ 3 ชุด:

```ts
const [stats, alerts, activity] = await Promise.all([
  api.get('/dashboard/stats'),
  api.get('/dashboard/alerts?limit=10'),
  api.get('/dashboard/activity?limit=10'),
]);
```

แนะนำให้ polling ทุก 30–60 วินาทีสำหรับ `alerts` และ `stats`

---

## Frontend Types

```ts
export type DashboardStats = {
  ticket: {
    pendingApproval: number;
    inProgress: number;
    totalCompleted: number;
  };
  form: {
    newForms: number;
    pendingReview: number;
  };
  finance: {
    depositsHeld: number;
    refundsAccumulated: number;
    outstandingPayments: number;
  };
};

export type AlertItem = {
  id: string;
  type: 'slip' | 'refund';
  message: string;
  time: string;
  priority: 'high' | 'medium' | 'low';
};

export type ActivityItem = {
  id: number;
  type: 'status_changed';
  message: string;
  actor: string;
  actorId: number | null;
  createdAt: string;
};
```

## Recommended Frontend API Layer

```ts
export const dashboardApi = {
  getStats: () =>
    api.get<ApiResponse<DashboardStats>>('/dashboard/stats'),
  getAlerts: (limit = 10) =>
    api.get<ApiResponse<AlertItem[]>>(`/dashboard/alerts?limit=${limit}`),
  getActivity: (limit = 10) =>
    api.get<ApiResponse<ActivityItem[]>>(`/dashboard/activity?limit=${limit}`),
};
```

## Risks / Things Frontend Should Know

- `stats` นับจาก booking ที่ยัง active (`deletedAt = null`) ทั้งหมด ไม่กรองตาม event วันที่
- `finance.depositsHeld` นับเฉพาะ status `DEPOSIT_PENDING` (ยังไม่ใช้หรือคืน) ไม่รวม `DEPOSIT_USED`, `DEPOSIT_FORFEITED`, หรือ `REFUNDED`
- `finance.outstandingPayments` มาจาก `slipAmount` ของสลิปที่ยังรอตรวจ ไม่ใช่ยอดหนี้จริงของ booking
- `alerts.id` เป็น string เพราะรวมจาก 2 แหล่ง (`slip-N` และ `refund-N`) ห้ามใช้เป็น numeric key
- `activity.actor` อาจเป็น `"System"` ถ้า log ไม่มี admin ผูกอยู่
- field `time` และ `createdAt` เป็น ISO datetime ควร format ฝั่ง frontend เอง
