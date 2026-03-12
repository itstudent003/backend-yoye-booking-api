# Event Booking API — Schema Documentation

## Overview

The Event Booking API is a NestJS + Prisma + PostgreSQL backend for managing event ticketing and bookings. It supports two event types (ticket-based and form-based), handles the full booking lifecycle from customer queue entry through payment verification and order fulfillment, and provides administrative tooling for managing users, events, customers, billing, refunds, and activity logging.

---

## Enums

### `AdminRole`
Defines the privilege level of admin users.

| Value        | Description                          |
|--------------|--------------------------------------|
| `ADMIN`      | Standard admin user                  |
| `SUPER_ADMIN`| Full system access and management    |

---

### `EventType`
Determines how an event collects attendee information.

| Value    | Description                                              |
|----------|----------------------------------------------------------|
| `TICKET` | Standard ticket purchase with seat/zone selection        |
| `FORM`   | Form-based registration (e.g., product pre-orders)       |

---

### `EventStatus`
Lifecycle status of an event.

| Value       | Description                                        |
|-------------|----------------------------------------------------|
| `DRAFT`     | Event is being configured, not yet visible         |
| `ACTIVE`    | Event is live and accepting bookings               |
| `PAUSED`    | Temporarily halted, not accepting new bookings     |
| `COMPLETED` | Event has concluded                                |
| `CANCELLED` | Event was cancelled                                |

---

### `EventCategory`
Categorises the type of event for filtering and display.

| Value             | Description                  |
|-------------------|------------------------------|
| `CONCERT`         | Live music or performance    |
| `PRODUCT_PREORDER`| Product pre-order campaign   |
| `FAN_MEETING`     | Fan meet-and-greet event     |
| `OTHER`           | Uncategorised event          |

---

### `BookingStatus`
Tracks the processing state of a booking.

| Value                   | Description                                          |
|-------------------------|------------------------------------------------------|
| `PENDING_APPROVAL`      | Newly submitted, awaiting admin review               |
| `IN_PROGRESS`           | Being processed by admin                             |
| `READY_FOR_FULFILLMENT` | Payment confirmed, ready to issue ticket/ship        |
| `COMPLETED`             | Fully processed and delivered                        |
| `CANCELLED`             | Booking was cancelled                                |
| `REFUNDED`              | Payment has been refunded                            |

---

### `PaymentStatus`
Tracks the payment state of a booking or billing record.

| Value            | Description                                   |
|------------------|-----------------------------------------------|
| `UNPAID`         | No payment received                           |
| `PARTIALLY_PAID` | Deposit or partial payment received           |
| `PAID`           | Full payment received                         |
| `REFUNDED`       | Payment has been returned to the customer     |

---

### `PaymentSlipType`
Classifies the purpose of a submitted payment slip.

| Value         | Description                     |
|---------------|---------------------------------|
| `DEPOSIT`     | Initial deposit payment         |
| `TICKET`      | Ticket purchase payment         |
| `PRODUCT`     | Product purchase payment        |
| `SERVICE_FEE` | Service fee payment             |
| `OTHER`       | Miscellaneous payment           |

---

### `PaymentSlipStatus`
Review status of a submitted payment slip image.

| Value      | Description                             |
|------------|-----------------------------------------|
| `PENDING`  | Uploaded, awaiting admin review         |
| `VERIFIED` | Confirmed as valid by an admin reviewer |
| `REJECTED` | Rejected as invalid or insufficient     |

---

### `FulfillmentType`
Specifies how a booking will be delivered or fulfilled.

| Value      | Description                                 |
|------------|---------------------------------------------|
| `ETICKET`  | Electronic ticket (QR code / digital)       |
| `PICKUP`   | Customer picks up at a physical location    |
| `DELIVERY` | Shipped to the customer's address           |

---

### `DeliveryStatus`
Tracks the shipping/pickup progress of a fulfillment.

| Value              | Description                                |
|--------------------|--------------------------------------------|
| `NOT_STARTED`      | Fulfillment has not begun                  |
| `WAITING_PICKUP`   | Waiting for carrier/customer to pick up    |
| `READY_FOR_PICKUP` | Item is at pickup point, awaiting customer |
| `PICKED_UP`        | Item has been picked up                    |
| `WAITING_DELIVERY` | Awaiting handover to shipping carrier      |
| `SHIPPED`          | Dispatched and in transit                  |
| `DELIVERED`        | Successfully delivered to the recipient    |
| `CANCELLED`        | Delivery was cancelled                     |

---

### `DepositTransactionType`
Categorises deposit money movement.

| Value       | Description                                    |
|-------------|------------------------------------------------|
| `HELD`      | Deposit is being held against the booking      |
| `USED`      | Deposit has been applied towards payment       |
| `FORFEITED` | Deposit is forfeited (e.g. cancellation)       |
| `REFUNDED`  | Deposit was returned to the customer           |

---

### `RefundStatus`
Tracks the lifecycle of a refund request.

| Value      | Description                                  |
|------------|----------------------------------------------|
| `REQUESTED`| Refund has been requested by the customer    |
| `APPROVED` | Approved by admin, pending payment           |
| `REJECTED` | Request was denied                           |
| `PAID`     | Refund has been transferred to the customer  |

---

### `InsightMode`
Determines whether a custom field applies to ticket or form events.

| Value    | Description                          |
|----------|--------------------------------------|
| `TICKET` | Field applies to ticket-type events  |
| `FORM`   | Field applies to form-type events    |

---

## Models

### `User`
Admin users who manage the system.

| Field       | Type       | Description                                      |
|-------------|------------|--------------------------------------------------|
| `id`        | String     | CUID primary key                                 |
| `email`     | String     | Unique login email address                       |
| `confirmPassword`  | String     | Bcrypt-hashed password                           |
| `firstName` | String     | First name                                       |
| `lastName`  | String     | Last name                                        |
| `line`      | String?    | LINE messenger ID (optional)                     |
| `phone`     | String?    | Phone number (optional)                          |
| `role`      | AdminRole  | Access level; defaults to `ADMIN`                |
| `lastLogin` | DateTime?  | Timestamp of most recent login                   |
| `createdAt` | DateTime   | Record creation timestamp                        |
| `updatedAt` | DateTime   | Record last updated timestamp                    |

**Relations:** `accounts`, `sessions`, `bookings` (assigned), `activities`, `paymentSlipsReviewed`, `statusLogsChanged`, `refundsProcessed`

---

### `Account`
OAuth provider accounts linked to an admin user (NextAuth-compatible).

| Field               | Type    | Description                          |
|---------------------|---------|--------------------------------------|
| `id`                | String  | CUID primary key                     |
| `userId`            | String  | Foreign key to `User`                |
| `type`              | String  | Account type (e.g. `oauth`)          |
| `provider`          | String  | Provider name (e.g. `google`)        |
| `providerAccountId` | String  | Provider-assigned account ID         |
| `refresh_token`     | String? | OAuth refresh token                  |
| `access_token`      | String? | OAuth access token                   |
| `expires_at`        | Int?    | Token expiry (Unix timestamp)        |
| `token_type`        | String? | Token type (e.g. `Bearer`)           |
| `scope`             | String? | OAuth scopes granted                 |
| `id_token`          | String? | OpenID Connect ID token              |
| `session_state`     | String? | Session state string                 |

**Unique constraint:** `[provider, providerAccountId]`

---

### `Session`
Active login sessions for admin users.

| Field          | Type     | Description                        |
|----------------|----------|------------------------------------|
| `id`           | String   | CUID primary key                   |
| `sessionToken` | String   | Unique session token               |
| `userId`       | String   | Foreign key to `User`              |
| `expires`      | DateTime | Session expiry timestamp           |

---

### `VerificationToken`
Email verification tokens (NextAuth-compatible).

| Field        | Type     | Description                        |
|--------------|----------|------------------------------------|
| `identifier` | String   | Email address or identifier        |
| `token`      | String   | Unique token string                |
| `expires`    | DateTime | Token expiry timestamp             |

**Unique constraints:** `token`, `[identifier, token]`

---

### `Customer`
End-users who place bookings.

| Field      | Type     | Description                          |
|------------|----------|--------------------------------------|
| `id`       | String   | CUID primary key                     |
| `fullName` | String   | Customer's full name                 |
| `nickname` | String?  | Preferred name or alias              |
| `email`    | String?  | Email address (optional)             |
| `phone`    | String?  | Phone number (optional)              |
| `lineId`   | String?  | LINE messenger ID (optional)         |
| `createdAt`| DateTime | Record creation timestamp            |
| `updatedAt`| DateTime | Record last updated timestamp        |

**Relations:** `bookings`

---

### `Event`
An event that customers can book tickets or register for.

| Field            | Type          | Description                                       |
|------------------|---------------|---------------------------------------------------|
| `id`             | String        | CUID primary key                                  |
| `name`           | String        | Display name of the event                         |
| `type`           | EventType     | `TICKET` or `FORM`                                |
| `category`       | EventCategory | Event category; defaults to `OTHER`               |
| `description`    | String?       | Full description text                             |
| `posterUrl`      | String?       | URL to the event poster image                     |
| `remarks`        | String?       | Internal admin notes                              |
| `status`         | EventStatus   | Lifecycle status; defaults to `DRAFT`             |
| `startDate`      | DateTime      | Event start date/time                             |
| `endDate`        | DateTime      | Event end date/time                               |
| `isActive`       | Boolean       | Whether the event is active; defaults to `true`   |
| `createdBy`      | String        | ID of the admin who created the event             |
| `createdAt`      | DateTime      | Record creation timestamp                         |
| `updatedAt`      | DateTime      | Record last updated timestamp                     |
| `serviceFee`     | Float?        | Percentage-based service fee                      |
| `depositRate`    | Float?        | Deposit rate as a percentage                      |
| `serviceFeeFixed`| Float?        | Fixed service fee amount                          |

**Relations:** `showtimes`, `customFields`, `bookings`, `insights`, `ticketZones`, `deposits`

---

### `EventShowtime`
A specific date/time/venue slot for an event.

| Field      | Type     | Description                                |
|------------|----------|--------------------------------------------|
| `id`       | String   | CUID primary key                           |
| `eventId`  | String   | Foreign key to `Event`                     |
| `startsAt` | DateTime | Showtime start date and time               |
| `endsAt`   | DateTime | Showtime end date and time                 |
| `venue`    | String?  | Venue name or address                      |
| `capacity` | Int      | Total capacity for this showtime           |
| `notes`    | String?  | Additional notes                           |
| `createdAt`| DateTime | Record creation timestamp                  |
| `updatedAt`| DateTime | Record last updated timestamp              |

**Relations:** `event`, `ticketZones`

---

### `TicketZone`
A seating zone or ticket tier within a showtime.

| Field         | Type   | Description                                     |
|---------------|--------|-------------------------------------------------|
| `id`          | String | CUID primary key                                |
| `eventId`     | String | Foreign key to `Event`                          |
| `showtimeId`  | String | Foreign key to `EventShowtime`                  |
| `name`        | String | Zone name (e.g., "VIP", "General Admission")    |
| `price`       | Float  | Base ticket price                               |
| `serviceFee`  | Float  | Per-ticket service fee                          |
| `capacity`    | Int    | Total tickets available in this zone            |
| `remainingCap`| Int    | Remaining available tickets; defaults to `0`    |

**Relations:** `event`, `showtime`

---

### `EventCustomField`
Admin-defined custom data fields for an event's booking form.

| Field      | Type       | Description                                        |
|------------|------------|----------------------------------------------------|
| `id`       | String     | CUID primary key                                   |
| `eventId`  | String     | Foreign key to `Event`                             |
| `label`    | String     | Field label shown to the customer                  |
| `mode`     | InsightMode| Whether this applies to `TICKET` or `FORM` events  |
| `required` | Boolean    | Whether the field is required; defaults to `false` |
| `options`  | Json?      | Dropdown/checkbox options (if applicable)          |
| `deleted`  | Boolean    | Soft-delete flag; defaults to `false`              |
| `createdAt`| DateTime   | Record creation timestamp                          |

**Relations:** `event`

---

### `EventInsight`
Insight/analytics fields attached to an event.

| Field       | Type     | Description                                   |
|-------------|----------|-----------------------------------------------|
| `id`        | String   | CUID primary key                              |
| `eventId`   | String   | Foreign key to `Event`                        |
| `title`     | String   | Insight field title                           |
| `valueType` | String   | Data type (e.g., `text`, `number`, `boolean`) |
| `isRequired`| Boolean  | Whether the field is required                 |
| `createdAt` | DateTime | Record creation timestamp                     |

**Relations:** `event`

---

### `Booking`
A customer's booking record for an event.

| Field             | Type          | Description                                            |
|-------------------|---------------|--------------------------------------------------------|
| `id`              | String        | CUID primary key                                       |
| `queueCode`       | String        | Unique human-readable queue reference code             |
| `bookingCode`     | String        | Unique booking code in format `YY-XXXXXX` (auto-generated) |
| `eventId`         | String        | Foreign key to `Event`                                 |
| `customerId`      | String        | Foreign key to `Customer`                              |
| `assignedAdminId` | String?       | Admin user assigned to this booking                    |
| `status`          | BookingStatus | Processing status; defaults to `PENDING_APPROVAL`      |
| `paymentStatus`   | PaymentStatus | Payment status; defaults to `UNPAID`                   |
| `amount`          | Float         | Base booking amount; defaults to `0`                   |
| `serviceFee`      | Float         | Service fee charged; defaults to `0`                   |
| `shippingFee`     | Float         | Shipping fee charged; defaults to `0`                  |
| `vatAmount`       | Float         | VAT amount; defaults to `0`                            |
| `depositPaid`     | Float         | Deposit amount paid; defaults to `0`                   |
| `totalPaid`       | Float         | Total amount paid so far; defaults to `0`              |
| `refundAmount`    | Float         | Total refunded amount; defaults to `0`                 |
| `notes`           | String?       | Admin notes on the booking                             |
| `createdAt`       | DateTime      | Record creation timestamp                              |
| `updatedAt`       | DateTime      | Record last updated timestamp                          |

**Relations:** `event`, `customer`, `user` (assigned admin), `paymentSlips`, `fulfillment`, `statusLogs`, `billingRecord`, `refunds`, `deposits`, `formSubmission`

---

### `PaymentSlip`
A payment proof image submitted by the customer for a booking.

| Field          | Type              | Description                                       |
|----------------|-------------------|---------------------------------------------------|
| `id`           | String            | CUID primary key                                  |
| `bookingId`    | String            | Foreign key to `Booking`                          |
| `reviewerId`   | String?           | Admin who reviewed this slip                      |
| `type`         | PaymentSlipType   | Type of payment being proved                      |
| `status`       | PaymentSlipStatus | Review status; defaults to `PENDING`              |
| `systemAmount` | Float             | Amount the system expects                         |
| `slipAmount`   | Float             | Amount shown on the uploaded slip                 |
| `imageUrl`     | String            | URL to the slip image                             |
| `reviewedAt`   | DateTime?         | Timestamp when the slip was reviewed              |
| `notes`        | String?           | Admin notes on the review                         |
| `createdAt`    | DateTime          | Record creation timestamp                         |

**Relations:** `booking`, `reviewer` (User), `refunds`

---

### `BillingRecord`
A formal billing document generated for a booking.

| Field          | Type          | Description                                        |
|----------------|---------------|----------------------------------------------------|
| `id`           | String        | CUID primary key                                   |
| `bookingId`    | String        | Unique foreign key to `Booking`                    |
| `billNumber`   | String        | Unique human-readable bill number                  |
| `subtotal`     | Float         | Pre-fee/tax subtotal; defaults to `0`              |
| `serviceFee`   | Float         | Service fee amount; defaults to `0`                |
| `shippingFee`  | Float         | Shipping fee amount; defaults to `0`               |
| `vatRate`      | Float         | VAT rate applied; defaults to `0.07` (7%)          |
| `vatAmount`    | Float         | Calculated VAT amount; defaults to `0`             |
| `totalDue`     | Float         | Total amount due; defaults to `0`                  |
| `paymentStatus`| PaymentStatus | Payment status; defaults to `UNPAID`               |
| `notes`        | String?       | Admin billing notes                                |
| `createdAt`    | DateTime      | Record creation timestamp                          |
| `updatedAt`    | DateTime      | Record last updated timestamp                      |

**Relations:** `booking`

---

### `DepositTransaction`
Records movements of deposit money against a booking or event.

| Field       | Type                   | Description                                |
|-------------|------------------------|--------------------------------------------|
| `id`        | String                 | CUID primary key                           |
| `bookingId` | String?                | Optional foreign key to `Booking`          |
| `eventId`   | String?                | Optional foreign key to `Event`            |
| `type`      | DepositTransactionType | Type of deposit movement                   |
| `amount`    | Float                  | Monetary amount of the transaction         |
| `notes`     | String?                | Notes on this transaction                  |
| `createdAt` | DateTime               | Record creation timestamp                  |

**Relations:** `booking`, `event`

---

### `RefundRequest`
A customer's request for a refund on a booking.

| Field           | Type        | Description                                       |
|-----------------|-------------|---------------------------------------------------|
| `id`            | String      | CUID primary key                                  |
| `bookingId`     | String      | Foreign key to `Booking`                          |
| `paymentSlipId` | String?     | Optional reference to the original payment slip   |
| `processedById` | String?     | Admin who processed this refund                   |
| `nickname`      | String?     | Customer nickname for reference                   |
| `bookingRef`    | String?     | Booking reference string                          |
| `bankName`      | String      | Bank where the refund will be sent                |
| `accountNumber` | String      | Bank account number                               |
| `accountType`   | String?     | Account type (e.g., savings, current)             |
| `accountHolder` | String      | Name of the account holder                        |
| `amount`        | Float       | Amount requested for refund                       |
| `status`        | RefundStatus| Request status; defaults to `REQUESTED`           |
| `reason`        | String?     | Customer's stated reason for the refund           |
| `requestedAt`   | DateTime    | When the refund was requested                     |
| `processedAt`   | DateTime?   | When the refund was processed                     |

**Relations:** `booking`, `paymentSlip`, `processedBy` (User)

---

### `Fulfillment`
Delivery or pickup information for a completed booking.

| Field            | Type           | Description                                      |
|------------------|----------------|--------------------------------------------------|
| `id`             | String         | CUID primary key                                 |
| `bookingId`      | String         | Unique foreign key to `Booking`                  |
| `type`           | FulfillmentType| How the booking is fulfilled                     |
| `deliveryStatus` | DeliveryStatus | Delivery progress; defaults to `NOT_STARTED`     |
| `pickupDateTime` | DateTime?      | Scheduled pickup date/time (for `PICKUP` type)   |
| `pickupLocation` | String?        | Pickup point address or name                     |
| `qrCode`         | String?        | QR code string or URL for e-ticket               |
| `shippingAddress`| String?        | Delivery street address                          |
| `shippingCity`   | String?        | Delivery city                                    |
| `shippingPostal` | String?        | Delivery postal code                             |
| `recipientName`  | String?        | Name of the delivery recipient                   |
| `recipientPhone` | String?        | Recipient contact phone number                   |
| `trackingNumber` | String?        | Shipping carrier tracking number                 |
| `shippingFee`    | Float?         | Shipping cost charged; defaults to `0`           |
| `serviceFee`     | Float?         | Service fee for fulfillment; defaults to `0`     |
| `vatAmount`      | Float?         | VAT on fulfillment fees; defaults to `0`         |
| `totalCharge`    | Float?         | Total fulfillment charge; defaults to `0`        |
| `notes`          | String?        | Admin notes on fulfillment                       |
| `createdAt`      | DateTime       | Record creation timestamp                        |
| `updatedAt`      | DateTime       | Record last updated timestamp                    |

**Relations:** `booking`

---

### `BookingStatusLog`
An immutable audit trail of all booking status changes.

| Field       | Type          | Description                               |
|-------------|---------------|-------------------------------------------|
| `id`        | String        | CUID primary key                          |
| `bookingId` | String        | Foreign key to `Booking`                  |
| `changedBy` | String        | Foreign key to `User` who made the change |
| `status`    | BookingStatus | The new status set                        |
| `notes`     | String?       | Reason or notes for the status change     |
| `createdAt` | DateTime      | Timestamp of the status change            |

**Relations:** `booking`, `admin` (User)

---

### `ActivityLog`
System-wide audit log of all significant admin actions.

| Field        | Type     | Description                                      |
|--------------|----------|--------------------------------------------------|
| `id`         | String   | CUID primary key                                 |
| `userId`     | String   | Foreign key to `User` who performed the action   |
| `entityType` | String   | Type of entity affected (e.g., `booking`, `user`)|
| `entityId`   | String?  | ID of the affected entity                        |
| `action`     | String   | Action description (e.g., `CREATE`, `UPDATE`)    |
| `metadata`   | Json?    | Additional context or payload for the action     |
| `createdAt`  | DateTime | Timestamp of the action                          |

**Relations:** `user`

---

### `FormSubmission`
Data submitted via the form-type event booking flow.

| Field        | Type     | Description                                  |
|--------------|----------|----------------------------------------------|
| `id`         | String   | CUID primary key                             |
| `bookingId`  | String   | Unique foreign key to `Booking`              |
| `formData`   | Json     | JSON object containing all submitted answers |
| `submittedAt`| DateTime | Timestamp when the form was submitted        |

**Relations:** `booking`

---

## Entity Relationships

```
User
 ├── Account[]           (OAuth accounts)
 ├── Session[]           (active sessions)
 ├── Booking[]           (assigned bookings)
 ├── ActivityLog[]       (actions performed)
 ├── PaymentSlip[]       (slips reviewed, "reviewer" relation)
 ├── BookingStatusLog[]  (status changes made)
 └── RefundRequest[]     (refunds processed)

Customer
 └── Booking[]

Event
 ├── EventShowtime[]
 │    └── TicketZone[]
 ├── TicketZone[]
 ├── EventCustomField[]
 ├── EventInsight[]
 ├── Booking[]
 └── DepositTransaction[]

Booking
 ├── Event
 ├── Customer
 ├── User? (assignedAdmin)
 ├── PaymentSlip[]
 │    └── RefundRequest[]
 ├── Fulfillment?
 ├── BookingStatusLog[]
 ├── BillingRecord?
 ├── RefundRequest[]
 ├── DepositTransaction[]
 └── FormSubmission?
```

### Cascade Deletes
The following child records are automatically deleted when their parent is deleted:

| Parent           | Child                   |
|------------------|-------------------------|
| User             | Account, Session, ActivityLog |
| Event            | EventShowtime, TicketZone, EventCustomField, EventInsight |
| EventShowtime    | TicketZone              |
| Booking          | PaymentSlip, Fulfillment, BookingStatusLog, BillingRecord, RefundRequest, FormSubmission |
| PaymentSlip      | (cascade from Booking)  |

---

## API Endpoints Overview

All endpoints are prefixed with `/api/v1`. All endpoints except `POST /auth/login` require a Bearer JWT token in the `Authorization` header.

### Authentication — `/auth`

| Method | Path            | Description                            |
|--------|-----------------|----------------------------------------|
| POST   | `/auth/register`| Register a new admin user              |
| POST   | `/auth/login`   | Login with email/password, returns JWT |
| POST   | `/auth/logout`  | Logout and clear access token cookie   |
| GET    | `/auth/profile` | Get the current authenticated user 🔒  |

---

### Users — `/users`

| Method | Path          | Description              |
|--------|---------------|--------------------------|
| POST   | `/users`      | Create a new admin user  |
| GET    | `/users`      | List all admin users     |
| GET    | `/users/:id`  | Get a single admin user  |
| PATCH  | `/users/:id`  | Update an admin user     |
| DELETE | `/users/:id`  | Delete an admin user     |

---

### Customers — `/customers`

| Method | Path               | Description                             |
|--------|--------------------|-----------------------------------------|
| POST   | `/customers`       | Create a new customer                   |
| GET    | `/customers`       | List all customers                      |
| GET    | `/customers/:id`   | Get a customer with their booking history |
| PATCH  | `/customers/:id`   | Update customer details                 |
| DELETE | `/customers/:id`   | Delete a customer                       |

---

### Events — `/events`

| Method | Path           | Description                                          |
|--------|----------------|------------------------------------------------------|
| POST   | `/events`      | Create a new event                                   |
| GET    | `/events`      | List all events with showtimes and booking counts    |
| GET    | `/events/:id`  | Get event with showtimes, ticket zones, custom fields|
| PATCH  | `/events/:id`  | Update event details                                 |
| DELETE | `/events/:id`  | Delete an event                                      |

---

### Bookings — `/bookings`

| Method | Path              | Description                                         |
|--------|-------------------|-----------------------------------------------------|
| POST   | `/bookings`       | Create a new booking                                |
| GET    | `/bookings`       | List all bookings with event and customer info      |
| GET    | `/bookings/:id`   | Get full booking details including all related data |
| PATCH  | `/bookings/:id`   | Update booking status, payment, assignment, etc.    |
| DELETE | `/bookings/:id`   | Delete a booking                                    |

---

### Payment Slips — `/payment-slips`

| Method | Path                              | Description                              |
|--------|-----------------------------------|------------------------------------------|
| POST   | `/payment-slips`                  | Upload a new payment slip                |
| GET    | `/payment-slips/booking/:bookingId` | Get all slips for a booking             |
| GET    | `/payment-slips/:id`              | Get a single payment slip                |
| PATCH  | `/payment-slips/:id/verify`       | Verify a payment slip (sets VERIFIED)    |
| PATCH  | `/payment-slips/:id/reject`       | Reject a payment slip (sets REJECTED)    |

---

### Fulfillments — `/fulfillments`

| Method | Path                                 | Description                                      |
|--------|--------------------------------------|--------------------------------------------------|
| POST   | `/fulfillments/booking/:bookingId`   | Create or update fulfillment for a booking       |
| GET    | `/fulfillments/booking/:bookingId`   | Get the fulfillment record for a booking         |
| PATCH  | `/fulfillments/booking/:bookingId`   | Update fulfillment details (status, tracking...) |

---

## Getting Started

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env with your PostgreSQL connection string and JWT secret
```

### 3. Run database migration
```bash
npx prisma migrate dev --name init
# or push schema directly:
npx prisma db push
```

### 4. Generate Prisma client
```bash
npx prisma generate
```

### 5. Start the development server
```bash
npm run start:dev
```

The API will be available at `http://localhost:3000/api/v1`.
