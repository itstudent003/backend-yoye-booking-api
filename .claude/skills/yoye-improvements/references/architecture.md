# Architecture Reference — yoye-admin

## Repo scope

Repo `yoye-admin` เป็น **frontend Next.js เท่านั้น** ไม่มี API route ของตัวเอง — เรียก API ผ่าน Next.js rewrite ไปที่ backend repo แยก.

| Layer | Location | Notes |
|-------|----------|-------|
| Frontend (this repo) | `app/`, `components/`, `hooks/`, `lib/`, `service/`, `store/` | Next.js 16 App Router |
| Backend API | `https://admin-api.yoyemuethong.com/api/v1` | repo แยก (Prisma + ?) |
| Rewrite | `next.config.ts` | `/api/v1/:path*` → backend |

## Tech stack (frontend)

- Next.js **16.1.6** (App Router) · React 19 · TypeScript 5
- Tailwind **v4** + tw-animate-css
- shadcn/ui (Radix primitives) — components ใน `components/ui/`
- `@tanstack/react-query` **v4** — wrapper ที่ `service/globalQuery.ts`
- `zustand` v5 — `store/meStore.ts` (เก็บ user ปัจจุบัน)
- `react-hook-form` + `zod` + `@hookform/resolvers/zod`
- `axios` — instance ที่ `lib/axios.ts` (`withCredentials: true`)
- `sonner` สำหรับ toast
- `lucide-react` สำหรับ icon
- `next-auth` + `@next-auth/prisma-adapter` — มีใน package.json (อาจเหลือจาก setup เดิม) แต่ runtime ใช้ cookie `access_token` ตรวจผ่าน middleware

## Auth flow

1. Login → backend ส่ง `Set-Cookie: access_token=...` (HttpOnly)
2. `middleware.ts` คุม route group `(protect)`:
   - มี token + อยู่ที่ `/auth` หรือ `/` → redirect `/dashboard`
   - ไม่มี token + เข้า protected → redirect `/auth/signin`
   - มี token + protected → fetch `/api/v1/auth/me` ถ้า 401 → ลบ cookie + redirect signin
3. ทุก hook/axios call ใช้ `withCredentials: true` cookie ติดไปอัตโนมัติ
4. `useMeStore` เก็บ user object (`fetchMe`) — เรียกครั้งเดียวใน layout

**Permission ฝั่ง frontend** = แค่ซ่อน UI; การบังคับสิทธิ์จริงต้องอยู่ที่ backend

## File / route conventions

```
app/
├── (protect)/                 ← route group ที่ต้อง login
│   ├── dashboard/
│   ├── events/
│   │   ├── page.tsx           ← list
│   │   ├── [id]/page.tsx      ← detail
│   │   ├── create/page.tsx
│   │   ├── components/        ← page-specific components
│   │   ├── hooks/             ← React Query hooks per feature
│   │   ├── types/{enum,interface}.ts
│   │   ├── validate/*.validate.ts ← zod schemas
│   │   └── utils/             ← page-specific helpers
│   ├── bookings/, payments/, tracking/, finance/, users/, profile/
│   └── layout.tsx             ← sidebar + topbar
├── auth/signin/page.tsx
├── api/                       ← (ยังไม่มี — ถ้าจะมี API ใน Next ต้องสร้างที่นี่)
├── layout.tsx
├── providers.tsx              ← React Query, Toaster
└── globals.css
```

ทุก feature module จัด folder แบบเดียวกัน: `page → hooks → components → types → validate → utils`. **เก็บ pattern นี้ตอนเพิ่ม feature ใหม่**.

## Hook pattern (must-follow)

```ts
// hooks/use-<thing>.ts
import { useQueryGet, useMutationPost } from "@/service/globalQuery";
import { IBaseResponseData, IResponseWithPaginate } from "@/types/globalType";

export function useThings(query: IThingsQuery) {
  return useQueryGet<IResponseWithPaginate<IThing[]>>(
    ["things", query],
    "/things",
    query,
  );
}

export function useCreateThing() {
  return useMutationPost<IBaseResponseData<IThing>, ICreateThingPayload>(
    "/things",
  );
}
```

- **Query key** = array `[domain, query]`
- **Path** = relative ต่อ `/api/v1` (เพราะ axios baseURL ตั้งไว้แล้ว)
- **Type wrapper** = `IBaseResponseData<T>` (single) หรือ `IResponseWithPaginate<T>` (list)

## Form pattern

```ts
// validate/<thing>.validate.ts
export const thingSchema = z.object({...});
export type ThingFormValues = z.infer<typeof thingSchema>;

// hooks/use-add-thing.ts
const form = useForm<ThingFormValues>({ resolver: zodResolver(thingSchema), defaultValues: {...} });
const mutation = useMutationPost<...>("/things", { onSuccess: ..., onError: ... });
const onSubmit = form.handleSubmit((v) => mutation.mutate(v));
return { form, onSubmit, isPending: mutation.isPending };
```

- เปิด `Dialog` แล้วใช้ `register`, `formState.errors` เหมือน `AddAdminDialog.tsx`
- Toast ใช้ `toast.success("...")` / `toast.error(...)` จาก `sonner`, `position: "top-center"`

## Naming conventions

| Item | Convention | Example |
|------|-----------|---------|
| Enum | `E` prefix หรือชื่อเต็ม | `EBookingStatus`, `RefundStatus`, `PaymentSlipType` |
| Interface | `I` prefix | `IBooking`, `IRefundRequest` |
| Type | ไม่มี prefix | `AdminUser`, `DashboardStats`, `AlertItem` |
| API path | snake-less, kebab ตามภาษา REST | `/refund-requests`, `/auth/me`, `/users/me` |
| Query key | snake-case array | `["refund-requests", query]` |
| Files | kebab-case | `use-refund-requests.ts`, `booking-status-badge.tsx` |
| Components | PascalCase ใน file kebab-case | `RefundManagement.tsx` (existing inconsistency — ทั้งสองรูปแบบมีอยู่ในโค้ด) |

## Key utilities

- `cn()` ใน `lib/utils.ts` — twMerge + clsx
- `formatThaiDateTime()` ใน `lib/utils.ts` — date → "31 ธันวาคม 2569 14:35"
- `formatRelativeTime()` (อยู่ใน dashboard/page.tsx) — "5 นาทีที่แล้ว"
- `axiosInstance` paramsSerializer รองรับ array → `?status=A&status=B`

## Sidebar (มาจาก components/sidebar.tsx)

```ts
const navigation = [
  { name: "แดชบอร์ด", href: "/dashboard", icon: LayoutDashboard },
  { name: "จัดการอีเวนต์", href: "/events", icon: Calendar },
  { name: "รายการจอง", href: "/bookings", icon: ClipboardList },
  { name: "สลิปและการเงิน", href: "/payments", icon: CreditCard },
  { name: "สรุปยอดชำระและการจัดส่ง", href: "/tracking", icon: Package },
  { name: "ภาพรวมการเงิน", href: "/finance", icon: FileText },
  { name: "แอดมินทั้งหมด", href: "/users", icon: Users },
];
```

> ตอนเพิ่มหน้าใหม่ (เช่น `/expenses`, `/presser`) อย่าลืมแก้ array นี้และอาจ filter ตาม role.

## Status enums (ปัจจุบัน)

ดูรายละเอียดทั้งหมดใน [`status-lifecycle.md`](./status-lifecycle.md). ที่ใช้ในโค้ดตอนนี้:

- `EBookingStatus` (28 ค่า) — `app/(protect)/bookings/types/enum.ts`
- `PaymentSlipStatus` = PENDING | VERIFIED | REJECTED — `app/(protect)/payments/types/enum.ts`
- `PaymentSlipType` = DEPOSIT_PAID | CARD_PAID | SERVICE_PAID
- `RefundStatus` = REQUESTED | APPROVED | REJECTED | PAID
- `DepositBookingStatus` = DEPOSIT_PENDING | DEPOSIT_USED | DEPOSIT_FORFEITED | WAITING_REFUND | REFUNDED — `app/(protect)/finance/types/enum.ts`
- `FeeType` = TICKET | HANDLING
- `EEventType` = TICKET | FORM
- `AdminRole` = admin | superAdmin (UI), `AdminRoleAPI` = ADMIN | SUPER_ADMIN

## VAT logic (จาก plan.md)

- ค่ากดบัตร = ราคาบัตร + service fee (รวมในตัวเดียว ไม่แยก)
- On-site Pickup / Grab → **ไม่คิด VAT**
- Shipping → **VAT 7%** บน (ค่าบัตรรวม fee + ค่าส่ง)

## Database models (จาก schema.md)

- `User` (admin), `Account/Session/VerificationToken`
- `ActivityLog` — entity, action, metadata, actor
- `Event`, `EventShowtime`, `TicketZone`, `EventCustomField`, `EventInsight`
- `Customer`, `Booking`, `BookingStatusLog`, `FormSubmission`
- `PaymentSlip`, `RefundRequest`
- `BillingRecord`, `Fulfillment`
- `DepositTransaction`

## ต้องระวัง

- `app/types/globalType.ts` (`ApiResponse`) **ไม่ตรง** กับ `types/globalType.ts` (`IBaseResponse`/`IBaseResponseData`) — โค้ด ส่วนใหญ่ใช้แบบหลัง ให้ยึดแบบหลังเป็นมาตรฐาน
- `users/types.ts` มี mock array `adminUsers` — ห้ามใช้ใน production
- `useUser` (hooks/use-me.ts) กับ `useMeStore` ทำงานคล้ายกัน — ค่อย ๆ รวมเป็นอันเดียว (`useMeStore`)
