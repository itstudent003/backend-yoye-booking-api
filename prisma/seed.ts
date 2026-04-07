import { PrismaClient, BookingStatus, DeliveryStatus, EventType, FulfillmentType, PaymentStatus, PaymentSlipType, PaymentSlipStatus, RefundStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // ========== 0. Cleanup ==========
  await prisma.refundRequest.deleteMany();
  await prisma.paymentSlip.deleteMany();
  await prisma.bookingStatusLog.deleteMany();
  await prisma.formSubmission.deleteMany();
  await prisma.deepInfoResponse.deleteMany();
  await prisma.bookingItem.deleteMany();
  await prisma.depositTransaction.deleteMany();
  await prisma.billingRecord.deleteMany();
  await prisma.fulfillment.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.deepInfoField.deleteMany();
  await prisma.showRound.deleteMany();
  await prisma.event.deleteMany();
  await prisma.customer.deleteMany();
  console.log('Cleanup done.');

  // ========== 1. Admin Users ==========
  const hashedPassword = await bcrypt.hash('password123', 10);

  const admin1 = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: hashedPassword,
      firstName: 'สมชาย',
      lastName: 'แอดมิน',
      phone: '081-111-1111',
      role: 'ADMIN',
    },
  });

  const admin2 = await prisma.user.upsert({
    where: { email: 'superadmin@example.com' },
    update: {},
    create: {
      email: 'superadmin@example.com',
      password: hashedPassword,
      firstName: 'สมหญิง',
      lastName: 'ซุปเปอร์',
      phone: '081-222-2222',
      role: 'ADMIN',
    },
  });

  // ========== 2. Customers ==========
  const customerNames = [
    { fullName: 'นายธนา วงศ์สว่าง', nickname: 'ธนา', phone: '089-001-0001', lineId: 'thana01' },
    { fullName: 'นางสาวพิมพ์ใจ รักดี', nickname: 'พิมพ์', phone: '089-002-0002', lineId: 'pim02' },
    { fullName: 'นายกิตติ สุขสันต์', nickname: 'กิต', phone: '089-003-0003', lineId: 'kit03' },
    { fullName: 'นางสาวอรุณี แสงทอง', nickname: 'อร', phone: '089-004-0004', lineId: 'arun04' },
    { fullName: 'นายปรีชา มั่นคง', nickname: 'ชา', phone: '089-005-0005', lineId: 'pree05' },
    { fullName: 'นางสาวจันทร์เพ็ญ ดวงดี', nickname: 'เพ็ญ', phone: '089-006-0006', lineId: 'pen06' },
    { fullName: 'นายวิทยา ก้าวหน้า', nickname: 'วิท', phone: '089-007-0007', lineId: 'wit07' },
    { fullName: 'นางสาวสุดา ใจงาม', nickname: 'ดา', phone: '089-008-0008', lineId: 'suda08' },
    { fullName: 'นายอภิชาติ เจริญรุ่ง', nickname: 'อภิ', phone: '089-009-0009', lineId: 'api09' },
    { fullName: 'นางสาวรัตนา ภูมิใจ', nickname: 'รัตน์', phone: '089-010-0010', lineId: 'rat10' },
    { fullName: 'นายสุรศักดิ์ พลังดี', nickname: 'เอก', phone: '089-011-0011', lineId: 'ek11' },
    { fullName: 'นางสาวนภา ท้องฟ้า', nickname: 'นภา', phone: '089-012-0012', lineId: 'napa12' },
    { fullName: 'นายชัยวัฒน์ สำเร็จ', nickname: 'ชัย', phone: '089-013-0013', lineId: 'chai13' },
    { fullName: 'นางสาวดวงใจ สดใส', nickname: 'ใจ', phone: '089-014-0014', lineId: 'jai14' },
    { fullName: 'นายภาณุ แสงสุข', nickname: 'ภาณุ', phone: '089-015-0015', lineId: 'panu15' },
    { fullName: 'นางสาวกัญญา สวยงาม', nickname: 'กัญ', phone: '089-016-0016', lineId: 'kan16' },
    { fullName: 'นายเอกชัย อดทน', nickname: 'เอก', phone: '089-017-0017', lineId: 'ekchai17' },
    { fullName: 'นางสาวศิริ มงคล', nickname: 'ศิริ', phone: '089-018-0018', lineId: 'siri18' },
    { fullName: 'นายมานพ รุ่งเรือง', nickname: 'มาน', phone: '089-019-0019', lineId: 'man19' },
    { fullName: 'นางสาวพัชรา สุขใจ', nickname: 'พัช', phone: '089-020-0020', lineId: 'pat20' },
    { fullName: 'นายธีรเดช กล้าหาญ', nickname: 'ธีร์', phone: '089-021-0021', lineId: 'tee21' },
    { fullName: 'นางสาวลลิตา ดอกไม้', nickname: 'ลลิ', phone: '089-022-0022', lineId: 'lali22' },
    { fullName: 'นายสมบูรณ์ พร้อมดี', nickname: 'บูรณ์', phone: '089-023-0023', lineId: 'boon23' },
    { fullName: 'นางสาวอัญชลี น้ำใจ', nickname: 'อัญ', phone: '089-024-0024', lineId: 'an24' },
    { fullName: 'นายพิพัฒน์ ก้าวไกล', nickname: 'พิพัฒน์', phone: '089-025-0025', lineId: 'pip25' },
    { fullName: 'นางสาวณัฐ กันตัง', nickname: 'ณัฐ', phone: '089-026-0026', lineId: 'nat26' },
    { fullName: 'นายวรพจน์ สำเร็จดี', nickname: 'พจน์', phone: '089-027-0027', lineId: 'pot27' },
    { fullName: 'นางสาวบุษบา สีชมพู', nickname: 'บุษ', phone: '089-028-0028', lineId: 'bus28' },
  ];

  const customers = [];
  for (const c of customerNames) {
    const customer = await prisma.customer.create({ data: c });
    customers.push(customer);
  }

  // ========== 3. Events ==========

  // TICKET event — คอนเสิร์ต
  const ticketEvent = await prisma.event.create({
    data: {
      name: 'BKK Music Festival 2026',
      type: EventType.TICKET,
      notes: 'เทศกาลดนตรีประจำปี',
      isActive: true,
      status: true,
      createdBy: String(admin1.id),
      showRounds: {
        create: [
          {
            name: 'รอบเช้า',
            date: new Date('2026-05-10'),
            time: '10:00',
            zones: {
              create: [
                { name: 'VIP', price: 5000, fee: 500, capacity: 100 },
                { name: 'Standard', price: 2500, fee: 250, capacity: 300 },
                { name: 'Economy', price: 1500, fee: 150, capacity: 500 },
              ],
            },
          },
          {
            name: 'รอบค่ำ',
            date: new Date('2026-05-10'),
            time: '18:00',
            zones: {
              create: [
                { name: 'VIP', price: 6000, fee: 600, capacity: 100 },
                { name: 'Standard', price: 3000, fee: 300, capacity: 300 },
              ],
            },
          },
        ],
      },
      deepInfoFields: {
        create: [
          { otherCode: 'other1', label: 'ชื่อผู้เข้าร่วม', isRequired: true },
          { otherCode: 'other2', label: 'เบอร์โทรติดต่อฉุกเฉิน', isRequired: true },
          { otherCode: 'other3', label: 'อาหารที่แพ้', isRequired: false },
        ],
      },
    },
    include: {
      showRounds: { include: { zones: true } },
      deepInfoFields: true,
    },
  });

  // FORM event — พรีออเดอร์สินค้า
  const formEvent = await prisma.event.create({
    data: {
      name: 'Exclusive Merch Pre-order',
      type: EventType.FORM,
      notes: 'พรีออเดอร์สินค้าลิมิเต็ด',
      eventDate: new Date('2026-06-01'),
      feePerEntry: 100,
      capacity: 200,
      isActive: true,
      status: true,
      createdBy: String(admin1.id),
      deepInfoFields: {
        create: [
          { otherCode: 'other1', label: 'ไซส์เสื้อ', isRequired: true },
          { otherCode: 'other2', label: 'ที่อยู่จัดส่ง', isRequired: true },
        ],
      },
    },
    include: { deepInfoFields: true },
  });

  // Grab zone/round IDs
  const round1 = ticketEvent.showRounds[0];
  const round2 = ticketEvent.showRounds[1];
  const vipZone = round1.zones.find((z) => z.name === 'VIP')!;
  const stdZone = round1.zones.find((z) => z.name === 'Standard')!;
  const ecoZone = round1.zones.find((z) => z.name === 'Economy')!;
  const vipZone2 = round2.zones.find((z) => z.name === 'VIP')!;
  const stdZone2 = round2.zones.find((z) => z.name === 'Standard')!;

  const ticketDeepFields = ticketEvent.deepInfoFields;
  const formDeepFields = formEvent.deepInfoFields;

  // ========== 4. Bookings — ครบทุกสถานะ 28 สถานะ ==========

  const allStatuses: {
    status: BookingStatus;
    paymentStatus: PaymentStatus;
    netCardPrice: number;
    useForm: boolean;
  }[] = [
    // --- คิว ---
    { status: 'WAITING_QUEUE_APPROVAL', paymentStatus: 'UNPAID', netCardPrice: 2500, useForm: false },
    { status: 'WAITING_DEPOSIT_TRANSFER', paymentStatus: 'UNPAID', netCardPrice: 5000, useForm: false },
    { status: 'WAITING_DEPOSIT_VERIFY', paymentStatus: 'UNPAID', netCardPrice: 1500, useForm: true },
    { status: 'QUEUE_BOOKED', paymentStatus: 'PARTIALLY_PAID', netCardPrice: 2500, useForm: false },
    { status: 'WAITING_BOOKING_INFO', paymentStatus: 'PARTIALLY_PAID', netCardPrice: 6000, useForm: false },
    { status: 'TRANSFERRING_TICKET', paymentStatus: 'PARTIALLY_PAID', netCardPrice: 3000, useForm: true },
    { status: 'CONFIRMING_TICKET', paymentStatus: 'PARTIALLY_PAID', netCardPrice: 5000, useForm: false },
    { status: 'WAITING_ADMIN_CONFIRM', paymentStatus: 'PARTIALLY_PAID', netCardPrice: 2500, useForm: false },
    { status: 'READY_TO_BOOK', paymentStatus: 'PARTIALLY_PAID', netCardPrice: 1500, useForm: true },

    // --- ระหว่างกด ---
    { status: 'BOOKING_IN_PROGRESS', paymentStatus: 'PARTIALLY_PAID', netCardPrice: 5000, useForm: false },
    { status: 'PARTIALLY_BOOKED', paymentStatus: 'PARTIALLY_PAID', netCardPrice: 7500, useForm: false },
    { status: 'FULLY_BOOKED', paymentStatus: 'PARTIALLY_PAID', netCardPrice: 2500, useForm: false },
    { status: 'BOOKING_FAILED', paymentStatus: 'PARTIALLY_PAID', netCardPrice: 3000, useForm: true },

    // --- ลูกค้าได้เอง ---
    { status: 'CUSTOMER_SELF_BOOKED', paymentStatus: 'PARTIALLY_PAID', netCardPrice: 5000, useForm: false },
    { status: 'TEAM_NOT_RECEIVED', paymentStatus: 'PARTIALLY_PAID', netCardPrice: 2500, useForm: false },
    { status: 'TEAM_BOOKED', paymentStatus: 'PARTIALLY_PAID', netCardPrice: 6000, useForm: true },
    { status: 'PARTIAL_SELF_TEAM_BOOKING', paymentStatus: 'PARTIALLY_PAID', netCardPrice: 4000, useForm: false },

    // --- การเงิน ---
    { status: 'WAITING_SERVICE_FEE', paymentStatus: 'PARTIALLY_PAID', netCardPrice: 5000, useForm: false },
    { status: 'WAITING_SERVICE_FEE_VERIFY', paymentStatus: 'PARTIALLY_PAID', netCardPrice: 3000, useForm: true },
    { status: 'SERVICE_FEE_PAID', paymentStatus: 'PAID', netCardPrice: 2500, useForm: false },

    // --- มัดจำ ---
    { status: 'DEPOSIT_PENDING', paymentStatus: 'PARTIALLY_PAID', netCardPrice: 5000, useForm: false },
    { status: 'DEPOSIT_USED', paymentStatus: 'PAID', netCardPrice: 1500, useForm: true },
    { status: 'DEPOSIT_FORFEITED', paymentStatus: 'PARTIALLY_PAID', netCardPrice: 2500, useForm: false },
    { status: 'WAITING_REFUND', paymentStatus: 'PAID', netCardPrice: 3000, useForm: false },
    { status: 'REFUNDED', paymentStatus: 'REFUNDED', netCardPrice: 5000, useForm: true },

    // --- ปิดงาน ---
    { status: 'COMPLETED', paymentStatus: 'PAID', netCardPrice: 6000, useForm: false },
    { status: 'CANCELLED', paymentStatus: 'PARTIALLY_PAID', netCardPrice: 2500, useForm: false },
    { status: 'CLOSED_REFUNDED', paymentStatus: 'REFUNDED', netCardPrice: 3000, useForm: true },
  ];

  console.log(`Seeding ${allStatuses.length} bookings...`);

  for (let i = 0; i < allStatuses.length; i++) {
    const { status, paymentStatus, netCardPrice, useForm } = allStatuses[i];
    const customer = customers[i];
    const isFormEvent = useForm;
    const event = isFormEvent ? formEvent : ticketEvent;
    const idx = String(i + 1).padStart(3, '0');
    const bookingCode = `26-SEED${idx.slice(-2)}`;

    // Pick zone for ticket bookings
    const zones = [vipZone, stdZone, ecoZone, vipZone2, stdZone2];
    const selectedZone = zones[i % zones.length];
    const selectedRound = selectedZone === vipZone2 || selectedZone === stdZone2 ? round2 : round1;

    const depositPaid = paymentStatus !== 'UNPAID' ? netCardPrice * 0.2 : 0;
    const serviceFee = isFormEvent ? 100 : Number(selectedZone.fee);
    const totalPaid =
      paymentStatus === 'PAID' ? netCardPrice + serviceFee :
      paymentStatus === 'REFUNDED' ? 0 :
      depositPaid;

    const booking = await prisma.booking.create({
      data: {
        bookingCode,
        eventId: event.id,
        customerId: customer.id,
        nameCustomer: customer.fullName,
        status,
        paymentStatus,
        netCardPrice,
        serviceFee,
        depositPaid,
        totalPaid,
        createdBy: customer.fullName,
        // updatedBy — สถานะที่ผ่านการอัพเดทแล้ว
        ...(status !== 'WAITING_QUEUE_APPROVAL' && status !== 'WAITING_DEPOSIT_TRANSFER' && status !== 'WAITING_DEPOSIT_VERIFY'
          ? { updatedBy: `${admin1.firstName} ${admin1.lastName}` }
          : {}),
        // deletedAt/deletedBy — สถานะยกเลิก
        ...(status === 'CANCELLED' || status === 'CLOSED_REFUNDED'
          ? { deletedAt: new Date(), deletedBy: `${admin2.firstName} ${admin2.lastName}` }
          : {}),
        notes: `Mock booking #${i + 1} — ${status}`,
        // Booking items
        bookingItems: isFormEvent
          ? {
              create: {
                quantity: i % 3 === 0 ? 2 : 1,
              },
            }
          : {
              create: {
                roundId: selectedRound.id,
                zoneId: selectedZone.id,
                quantity: i % 4 === 0 ? 2 : 1,
              },
            },
        // Deep info responses
        deepInfoResponses: {
          create: isFormEvent
            ? formDeepFields.map((f) => ({
                fieldId: f.id,
                value:
                  f.otherCode === 'other1' ? ['S', 'M', 'L', 'XL'][i % 4] :
                  `${customer.fullName} — 123/45 ถ.สุขุมวิท กทม. 10110`,
              }))
            : ticketDeepFields.map((f) => ({
                fieldId: f.id,
                value:
                  f.otherCode === 'other1' ? customer.fullName :
                  f.otherCode === 'other2' ? customer.phone || '089-000-0000' :
                  'ไม่มี',
              })),
        },
        // Form submission (FORM events only)
        ...(isFormEvent && {
          formSubmission: {
            create: {
              formData: {
                size: ['S', 'M', 'L', 'XL'][i % 4],
                address: `123/45 ถ.สุขุมวิท กทม. 10110`,
                note: `สั่งโดย ${customer.nickname}`,
              },
            },
          },
        }),
      },
    });

    // Status log
    await prisma.bookingStatusLog.create({
      data: {
        bookingId: booking.id,
        changedBy: i % 2 === 0 ? admin1.id : admin2.id,
        status,
        notes: `Seed: set to ${status}`,
      },
    });

    // Payment slips — สร้างตามสถานะที่ควรมีสลิป
    const slipsToCreate: {
      type: PaymentSlipType;
      slipStatus: PaymentSlipStatus;
      slipAmount: number;
    }[] = [];

    // มัดจำ — สถานะที่ผ่านขั้นตอนมัดจำแล้ว
    const depositPaidStatuses: BookingStatus[] = [
      'QUEUE_BOOKED', 'WAITING_BOOKING_INFO', 'TRANSFERRING_TICKET', 'CONFIRMING_TICKET',
      'WAITING_ADMIN_CONFIRM', 'READY_TO_BOOK', 'BOOKING_IN_PROGRESS', 'PARTIALLY_BOOKED',
      'FULLY_BOOKED', 'BOOKING_FAILED', 'CUSTOMER_SELF_BOOKED', 'TEAM_NOT_RECEIVED',
      'TEAM_BOOKED', 'PARTIAL_SELF_TEAM_BOOKING', 'WAITING_SERVICE_FEE',
      'WAITING_SERVICE_FEE_VERIFY', 'SERVICE_FEE_PAID', 'DEPOSIT_PENDING', 'DEPOSIT_USED',
      'DEPOSIT_FORFEITED', 'WAITING_REFUND', 'REFUNDED', 'COMPLETED', 'CANCELLED', 'CLOSED_REFUNDED',
    ];
    if (depositPaidStatuses.includes(status)) {
      slipsToCreate.push({
        type: 'DEPOSIT_PAID',
        slipStatus: 'VERIFIED',
        slipAmount: depositPaid,
      });
    }

    // รอตรวจสลิปมัดจำ
    if (status === 'WAITING_DEPOSIT_VERIFY') {
      slipsToCreate.push({
        type: 'DEPOSIT_PAID',
        slipStatus: 'PENDING',
        slipAmount: netCardPrice * 0.2,
      });
    }

    // ค่าบัตร — สถานะที่ผ่านขั้นตอนโอนค่าบัตร
    const cardPaidStatuses: BookingStatus[] = [
      'CONFIRMING_TICKET', 'WAITING_ADMIN_CONFIRM', 'READY_TO_BOOK',
      'BOOKING_IN_PROGRESS', 'PARTIALLY_BOOKED', 'FULLY_BOOKED',
      'WAITING_SERVICE_FEE', 'WAITING_SERVICE_FEE_VERIFY', 'SERVICE_FEE_PAID',
      'COMPLETED',
    ];
    if (cardPaidStatuses.includes(status)) {
      slipsToCreate.push({
        type: 'CARD_PAID',
        slipStatus: 'VERIFIED',
        slipAmount: netCardPrice,
      });
    }

    // ค่ากด — สถานะที่ชำระค่ากดแล้ว
    const serviceFeePaidStatuses: BookingStatus[] = [
      'WAITING_SERVICE_FEE_VERIFY', 'SERVICE_FEE_PAID', 'COMPLETED',
    ];
    if (serviceFeePaidStatuses.includes(status)) {
      slipsToCreate.push({
        type: 'SERVICE_PAID',
        slipStatus: status === 'WAITING_SERVICE_FEE_VERIFY' ? 'PENDING' : 'VERIFIED',
        slipAmount: serviceFee,
      });
    }

    for (const slip of slipsToCreate) {
      await prisma.paymentSlip.create({
        data: {
          bookingId: booking.id,
          type: slip.type,
          status: slip.slipStatus,
          systemAmount: slip.slipAmount,
          slipAmount: slip.slipAmount,
          imageUrl: `https://placeholder.co/slip-${booking.bookingCode}-${slip.type.toLowerCase()}.jpg`,
          reviewerId: slip.slipStatus === 'VERIFIED' ? (i % 2 === 0 ? admin1.id : admin2.id) : null,
          reviewedAt: slip.slipStatus === 'VERIFIED' ? new Date() : null,
          notes: slip.slipStatus === 'PENDING' ? 'รอตรวจสอบ' : 'ตรวจสอบแล้ว',
        },
      });
    }

    console.log(`  [${i + 1}/28] ${bookingCode} — ${status} (${isFormEvent ? 'FORM' : 'TICKET'}) [${slipsToCreate.length} slips]`);
  }

  // ========== 6. Fulfillments (mock shipping data) ==========
  const trackingBookings = await prisma.booking.findMany({
    where: { status: { in: ['WAITING_SERVICE_FEE', 'WAITING_SERVICE_FEE_VERIFY', 'SERVICE_FEE_PAID'] } },
  });

  const mockShipping = [
    {
      recipientName: 'นายธนวัฒน์ สุขสมบูรณ์',
      recipientPhone: '0812345678',
      shippingAddress: '99/1 ถ.พระราม 9 แขวงห้วยขวาง เขตห้วยขวาง กรุงเทพฯ 10310',
      type: FulfillmentType.DELIVERY,
      deliveryStatus: DeliveryStatus.NOT_STARTED,
    },
    {
      recipientName: 'นางสาวพิมพ์ชนก มีสุข',
      recipientPhone: '0898765432',
      shippingAddress: '45/2 ถ.สุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพฯ 10110',
      type: FulfillmentType.DELIVERY,
      deliveryStatus: DeliveryStatus.WAITING_DELIVERY,
    },
    {
      recipientName: 'นายกิตติพงษ์ รุ่งเรือง',
      recipientPhone: '0915557777',
      shippingAddress: '12 ถ.นิมมานเหมินท์ ต.สุเทพ อ.เมือง จ.เชียงใหม่ 50200',
      type: FulfillmentType.DELIVERY,
      deliveryStatus: DeliveryStatus.DELIVERED,
    },
  ];

  for (let i = 0; i < trackingBookings.length && i < mockShipping.length; i++) {
    const booking = trackingBookings[i];
    const mock = mockShipping[i];
    await prisma.fulfillment.upsert({
      where: { bookingId: booking.id },
      create: {
        bookingId: booking.id,
        type: mock.type,
        deliveryStatus: mock.deliveryStatus,
        recipientName: mock.recipientName,
        recipientPhone: mock.recipientPhone,
        shippingAddress: mock.shippingAddress,
      },
      update: {
        deliveryStatus: mock.deliveryStatus,
        recipientName: mock.recipientName,
        recipientPhone: mock.recipientPhone,
        shippingAddress: mock.shippingAddress,
      },
    });

    console.log(`  [Fulfillment ${i + 1}] ${booking.bookingCode} — ${mock.recipientName}`);
  }

  // ========== 7. Refund Requests ==========
  const refundBookings = await prisma.booking.findMany({
    where: { status: { in: ['WAITING_REFUND', 'REFUNDED', 'CLOSED_REFUNDED', 'CANCELLED'] } },
    include: { paymentSlips: true },
  });

  const refundMockData: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
    status: RefundStatus;
    reason: string;
  }[] = [
    { bankName: 'ธนาคารกสิกรไทย', accountNumber: '123-4-56789-0', accountHolder: 'นายธนา วงศ์สว่าง', status: 'REQUESTED', reason: 'ติดธุระไม่สามารถเข้าร่วมได้' },
    { bankName: 'ธนาคารไทยพาณิชย์', accountNumber: '456-7-89012-3', accountHolder: 'นางสาวพิมพ์ใจ รักดี', status: 'APPROVED', reason: 'อีเวนต์ถูกยกเลิก' },
    { bankName: 'ธนาคารกรุงไทย', accountNumber: '789-0-12345-6', accountHolder: 'นายกิตติ สุขสันต์', status: 'PAID', reason: 'ป่วยไม่สามารถเดินทางได้' },
    { bankName: 'ธนาคารกรุงเทพ', accountNumber: '321-0-98765-4', accountHolder: 'นางสาวอรุณี แสงทอง', status: 'REJECTED', reason: 'เปลี่ยนใจไม่ต้องการเข้าร่วม' },
  ];

  for (let i = 0; i < refundBookings.length && i < refundMockData.length; i++) {
    const booking = refundBookings[i];
    const mock = refundMockData[i];

    await prisma.refundRequest.create({
      data: {
        bookingId: booking.id,
        processedById: mock.status === 'REQUESTED' ? null : [admin1.id, admin2.id][i % 2],
        bookingRef: booking.bookingCode,
        bankName: mock.bankName,
        accountNumber: mock.accountNumber,
        accountHolder: mock.accountHolder,
        amount: booking.netCardPrice,
        status: mock.status,
        reason: mock.reason,
        processedAt: mock.status === 'REQUESTED' ? null : new Date(),
      },
    });

    console.log(`  [Refund ${i + 1}] ${booking.bookingCode} — ${mock.status}`);
  }

  console.log('\nSeed completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
