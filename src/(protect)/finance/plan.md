# Finance API Plan for Frontend

เอกสารนี้อธิบาย endpoint ในโมดูล `finance` สำหรับให้ frontend เชื่อมหน้า dashboard / table ได้ตรงกับ implementation ปัจจุบันใน backend

## Base Config

- Base URL: `/api/v1`
- Module path: `/finance`
- ทุก endpoint ต้องส่ง `Authorization: Bearer <token>`
- ทุก response ถูกครอบด้วยรูปแบบกลางจาก `ResponseInterceptor`

```ts
type ApiResponse<T> = {
  statusCode: number;
  message: string; // ปกติเป็น "success"
  data: T;
};
```

สำหรับ endpoint ที่มี pagination จะได้ field `pagination` เพิ่มเข้ามา:

```ts
type PaginatedApiResponse<T> = {
  statusCode: number;
  message: string;
  data: T;
  pagination: {
    totalCounts: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
};
```

ตัวอย่างจริง:

```json
{
  "statusCode": 200,
  "message": "success",
  "data": {}
}
```

## 1. Summary Cards

- Method: `GET`
- URL: `/api/v1/finance/summary`
- Query params: ไม่มี

ใช้สำหรับการ์ดสรุปด้านบนของหน้า finance

### Response `data`

```ts
type FinanceSummary = {
  totalDeposit: number;
  usedAsFee: number;
  forfeited: number;
  refunded: number;
};
```

### Example Response

```json
{
  "statusCode": 200,
  "message": "success",
  "data": {
    "totalDeposit": 120000,
    "usedAsFee": 40000,
    "forfeited": 15000,
    "refunded": 25000
  }
}
```

### Meaning

- `totalDeposit`: มูลค่ามัดจำรวมของ booking ที่อยู่ในสถานะเกี่ยวกับมัดจำ
- `usedAsFee`: มัดจำที่ถูกใช้เป็นค่ากดแล้ว
- `forfeited`: มัดจำที่ถูกยึด
- `refunded`: ยอด refund ที่จ่ายแล้วจริง โดยอิง `RefundRequest.status = PAID`

## 2. Deposit Transactions List

- Method: `GET`
- URL: `/api/v1/finance/deposits`

ใช้สำหรับ table ธุรกรรมมัดจำ

### Query Params

```ts
type DepositQuery = {
  page?: number; // default 1
  pageSize?: number; // default 10
  status?: string;
  search?: string;
};
```

### Important Note

ค่า `status` ที่ swagger บอกไว้ตอนนี้คือ `ALL | HELD | USED | FORFEITED | REFUNDED`
แต่ implementation ใน service เอาค่านี้ไปเทียบกับ `BookingStatus` ตรง ๆ

ดังนั้นค่าที่ backend ใช้งานได้จริงตอนนี้คือ:

- `ALL`
- `DEPOSIT_PENDING`
- `DEPOSIT_USED`
- `DEPOSIT_FORFEITED`
- `WAITING_REFUND`
- `REFUNDED`

ถ้า frontend ส่ง `HELD`, `USED`, `FORFEITED`, `REFUNDED` ตาม label ใน swagger มีโอกาสได้ข้อมูลไม่ตรงตามที่คาด

### Search Behavior

`search` ใช้ค้นจาก:

- `id` ถ้าเป็นตัวเลขล้วน
- `bookingCode`
- `nameCustomer`
- `event.name`

ค้นแบบ `contains` และไม่สนตัวพิมพ์เล็กใหญ่สำหรับ text

### Response `data`

```ts
type DepositItem = {
  id: number;
  bookingCode: string | null;
  customer: string | null;
  event: string | null;
  amount: number | null;
  date: string; // ISO date
  status: string;
};
```

### Response Shape

```ts
type DepositListResponse = PaginatedApiResponse<DepositItem[]>;
```

### Example Request

```http
GET /api/v1/finance/deposits?page=1&pageSize=10&status=DEPOSIT_USED&search=BNK-24001
Authorization: Bearer <token>
```

### Example Response

```json
{
  "statusCode": 200,
  "message": "success",
  "data": [
    {
      "id": 12,
      "bookingCode": "BNK-24001",
      "customer": "John Doe",
      "event": "Coldplay Live in Bangkok",
      "amount": 3000,
      "date": "2026-04-06T09:12:10.000Z",
      "status": "DEPOSIT_USED"
    }
  ],
  "pagination": {
    "totalCounts": 24,
    "page": 1,
    "pageSize": 10,
    "totalPages": 3
  }
}
```

### Suggested Frontend Mapping

ถ้าหน้าบ้านต้องใช้ tab/filter แบบ business wording แนะนำ map ดังนี้:

```ts
const depositStatusMap = {
  all: 'ALL',
  held: 'DEPOSIT_PENDING',
  used: 'DEPOSIT_USED',
  forfeited: 'DEPOSIT_FORFEITED',
  waitingRefund: 'WAITING_REFUND',
  refunded: 'REFUNDED',
} as const;
```

ถ้าต้องการใช้คำว่า `HELD`, `USED`, `FORFEITED`, `REFUNDED` ตรง ๆ ควรให้ backend ปรับ controller/service เพิ่ม mapping อีกชั้น

## 3. Verified Fee Payments

- Method: `GET`
- URL: `/api/v1/finance/fees`
- Query params:

```ts
type FeesQuery = {
  page?: number; // default 1
  pageSize?: number; // default 10
  search?: string;
};
```

ใช้สำหรับ list รายการชำระเงินที่ผ่านการตรวจแล้วจาก payment slip ประเภท:

- `CARD_PAID`
- `SERVICE_PAID`

และต้องมีสถานะ `VERIFIED`

### Search Behavior

`search` ใช้ค้นจาก:

- `booking.bookingCode`
- `booking.nameCustomer`
- `booking.event.name`

ค้นแบบ `contains` และไม่สนตัวพิมพ์เล็กใหญ่

### Response `data`

```ts
type FeeItem = {
  id: number;
  description: string;
  amount: number | null;
  date: string; // ISO date
  type: 'TICKET' | 'HANDLING';
};
```

### Response Shape

```ts
type FeeListResponse = PaginatedApiResponse<FeeItem[]>;
```

### Type Meaning

- `TICKET`: มาจาก `CARD_PAID`
- `HANDLING`: มาจาก `SERVICE_PAID`

### Example Response

```json
{
  "statusCode": 200,
  "message": "success",
  "data": [
    {
      "id": 44,
      "description": "ค่าบัตร Coldplay Live in Bangkok",
      "amount": 5600,
      "date": "2026-04-05T11:00:00.000Z",
      "type": "TICKET"
    },
    {
      "id": 45,
      "description": "ค่ากด Coldplay Live in Bangkok",
      "amount": 300,
      "date": "2026-04-05T11:05:00.000Z",
      "type": "HANDLING"
    }
  ],
  "pagination": {
    "totalCounts": 42,
    "page": 1,
    "pageSize": 10,
    "totalPages": 5
  }
}
```

## 4. Paid Refund List

- Method: `GET`
- URL: `/api/v1/finance/refunds`
- Query params:

```ts
type RefundsQuery = {
  page?: number; // default 1
  pageSize?: number; // default 10
};
```

ใช้สำหรับรายการ refund ที่จ่ายแล้วเท่านั้น (`RefundStatus.PAID`)

### Response `data`

```ts
type RefundItem = {
  id: number;
  customer: string | null;
  amount: number;
  reason: string | null;
  date: string; // ISO date
};
```

### Response Shape

```ts
type RefundListResponse = PaginatedApiResponse<RefundItem[]>;
```

### Example Response

```json
{
  "statusCode": 200,
  "message": "success",
  "data": [
    {
      "id": 8,
      "customer": "Jane Smith",
      "amount": 2500,
      "reason": "ยกเลิกการจอง",
      "date": "2026-04-04T14:30:00.000Z"
    }
  ],
  "pagination": {
    "totalCounts": 8,
    "page": 1,
    "pageSize": 10,
    "totalPages": 1
  }
}
```

## Frontend Integration Flow

### Finance Dashboard Page

โหลดข้อมูลพร้อมกันได้ 4 ชุด:

1. `GET /finance/summary`
2. `GET /finance/deposits?page=1&pageSize=10`
3. `GET /finance/fees?page=1&pageSize=10`
4. `GET /finance/refunds?page=1&pageSize=10`

ถ้าหน้ามี tab, search, หรือเปลี่ยนหน้าในส่วน list ให้ยิงซ้ำ endpoint ส่วนนั้นพร้อม `page/pageSize`

### Suggested UI Sections

- Summary cards: ใช้ข้อมูลจาก `/finance/summary`
- Deposit table: ใช้ข้อมูลจาก `/finance/deposits`
- Fee table: ใช้ข้อมูลจาก `/finance/fees`
- Refund table: ใช้ข้อมูลจาก `/finance/refunds`

## Frontend Types

```ts
export type ApiResponse<T> = {
  statusCode: number;
  message: string;
  data: T;
};

export type PaginatedApiResponse<T> = ApiResponse<T> & {
  pagination: {
    totalCounts: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
};

export type FinanceSummary = {
  totalDeposit: number;
  usedAsFee: number;
  forfeited: number;
  refunded: number;
};

export type DepositItem = {
  id: number;
  bookingCode: string | null;
  customer: string | null;
  event: string | null;
  amount: number | null;
  date: string;
  status: string;
};

export type FeeItem = {
  id: number;
  description: string;
  amount: number | null;
  date: string;
  type: 'TICKET' | 'HANDLING';
};

export type RefundItem = {
  id: number;
  customer: string | null;
  amount: number;
  reason: string | null;
  date: string;
};
```

## Risks / Things Frontend Should Know

- endpoint list ของ finance ตอนนี้มี pagination แล้ว โดย default คือ `page=1` และ `pageSize=10`
- field `date` ของทุก endpoint เป็นค่า datetime จาก backend ควร format ฝั่ง frontend เอง
- `amount` บาง endpoint อาจเป็น `null` ได้จากข้อมูลในฐานข้อมูล
- `/finance/deposits` มี mismatch ระหว่าง swagger enum กับค่าที่ service รองรับจริง
- ถ้าจะทำ dashboard ให้ตรง business มากขึ้น อาจต้องคุยต่อว่าจะให้ backend คืน label ภาษาไทยหรือ summary เพิ่มเติมหรือไม่

## Recommended Frontend API Layer

```ts
export const financeApi = {
  getSummary: () => api.get<ApiResponse<FinanceSummary>>('/finance/summary'),
  getDeposits: (params?: { page?: number; pageSize?: number; status?: string; search?: string }) =>
    api.get<PaginatedApiResponse<DepositItem[]>>('/finance/deposits', { params }),
  getFees: (params?: { page?: number; pageSize?: number; search?: string }) =>
    api.get<PaginatedApiResponse<FeeItem[]>>('/finance/fees', { params }),
  getRefunds: (params?: { page?: number; pageSize?: number }) =>
    api.get<PaginatedApiResponse<RefundItem[]>>('/finance/refunds', { params }),
};
```
