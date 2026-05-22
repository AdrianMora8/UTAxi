import { PrismaClient, RequestStatus, PaymentStatus, TransactionType, TransactionConcept, Prisma } from '@prisma/client';
import Stripe from 'stripe';
import { AppError } from '../middleware/errorHandler';

export class PaymentsService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly stripe: Stripe,
  ) {}

  async createIntent(tripRequestId: string, payerId: string) {
    const tripRequest = await this.prisma.tripRequest.findUnique({
      where: { id: tripRequestId },
      include: { trip: true },
    });

    if (!tripRequest) throw new AppError(404, 'Solicitud no encontrada');
    if (tripRequest.passengerId !== payerId) throw new AppError(403, 'Solo el pasajero puede pagar su solicitud');
    if (tripRequest.status !== RequestStatus.ACCEPTED) throw new AppError(400, 'Solo se puede pagar una solicitud aceptada');

    const existing = await this.prisma.payment.findUnique({ where: { tripRequestId } });
    if (existing && existing.status === PaymentStatus.CONFIRMED) {
      throw new AppError(409, 'Este viaje ya fue pagado');
    }

    const amountCents = Math.round(Number(tripRequest.trip.pricePerSeat) * 100);

    const intent = await this.stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      metadata: {
        tripRequestId,
        tripId: tripRequest.tripId,
        payerId,
      },
    });

    const payment = await this.prisma.payment.upsert({
      where: { tripRequestId },
      create: {
        tripRequestId,
        tripId: tripRequest.tripId,
        payerId,
        amount: tripRequest.trip.pricePerSeat,
        stripePaymentId: intent.id,
        status: PaymentStatus.PENDING,
      },
      update: {
        stripePaymentId: intent.id,
        status: PaymentStatus.PENDING,
      },
    });

    return {
      clientSecret: intent.client_secret,
      paymentId: payment.id,
      amount: Number(tripRequest.trip.pricePerSeat),
    };
  }

  async handleWebhook(payload: Buffer, signature: string, webhookSecret: string) {
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch {
      throw new AppError(400, 'Firma del webhook inválida');
    }

    if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object as Stripe.PaymentIntent;
      await this.prisma.payment.updateMany({
        where: { stripePaymentId: intent.id, status: { not: PaymentStatus.CONFIRMED } },
        data: { status: PaymentStatus.CONFIRMED, confirmedAt: new Date() },
      });
    }

    if (event.type === 'payment_intent.payment_failed') {
      const intent = event.data.object as Stripe.PaymentIntent;
      await this.prisma.payment.updateMany({
        where: { stripePaymentId: intent.id, status: PaymentStatus.PENDING },
        data: { status: PaymentStatus.FAILED },
      });
    }

    return { received: true };
  }

  async simulateConfirm(tripRequestId: string, payerId: string) {
    const tripRequest = await this.prisma.tripRequest.findUnique({
      where: { id: tripRequestId },
      include: { trip: true },
    });

    if (!tripRequest) throw new AppError(404, 'Solicitud no encontrada');
    if (tripRequest.passengerId !== payerId) throw new AppError(403, 'Solo el pasajero puede pagar su solicitud');
    if (tripRequest.status !== RequestStatus.ACCEPTED) throw new AppError(400, 'Solo se puede pagar una solicitud aceptada');

    const existing = await this.prisma.payment.findUnique({ where: { tripRequestId } });
    if (existing && existing.status === PaymentStatus.CONFIRMED) {
      throw new AppError(409, 'Este viaje ya fue pagado');
    }

    const payment = await this.prisma.payment.upsert({
      where: { tripRequestId },
      create: {
        tripRequestId,
        tripId: tripRequest.tripId,
        payerId,
        amount: tripRequest.trip.pricePerSeat,
        stripePaymentId: `sim_${Date.now()}`,
        status: PaymentStatus.CONFIRMED,
        confirmedAt: new Date(),
      },
      update: {
        status: PaymentStatus.CONFIRMED,
        confirmedAt: new Date(),
      },
    });

    return { payment, amount: Number(tripRequest.trip.pricePerSeat) };
  }

  async getByTripRequest(tripRequestId: string, userId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { tripRequestId },
      include: {
        trip: { select: { originZone: true, destinationZone: true, departureTime: true } },
      },
    });

    if (!payment) throw new AppError(404, 'Pago no encontrado');
    if (payment.payerId !== userId) throw new AppError(403, 'No tienes acceso a este pago');

    return payment;
  }

  async payWithWallet(tripRequestId: string, payerId: string) {
    const tripRequest = await this.prisma.tripRequest.findUnique({
      where: { id: tripRequestId },
      include: { trip: true, payment: true },
    });

    if (!tripRequest) throw new AppError(404, 'Solicitud no encontrada');
    if (tripRequest.passengerId !== payerId) throw new AppError(403, 'Solo el pasajero puede pagar su solicitud');
    if (tripRequest.status !== RequestStatus.ACCEPTED) throw new AppError(400, 'Solo se puede pagar una solicitud aceptada');
    if (tripRequest.payment?.status === PaymentStatus.CONFIRMED) throw new AppError(409, 'Esta solicitud ya fue pagada');

    const amount = tripRequest.trip.pricePerSeat;
    const driverId = tripRequest.trip.driverId;

    await this.prisma.$transaction(async (tx) => {
      // Re-verificar saldo y estado de pago dentro de la transacción para evitar race conditions
      const [payer, existingPayment] = await Promise.all([
        tx.user.findUnique({ where: { id: payerId }, select: { walletBalance: true } }),
        tx.payment.findUnique({ where: { tripRequestId } }),
      ]);

      if (!payer) throw new AppError(404, 'Usuario no encontrado');
      if (existingPayment?.status === PaymentStatus.CONFIRMED) throw new AppError(409, 'Esta solicitud ya fue pagada');
      if (Number(payer.walletBalance) < Number(amount)) throw new AppError(400, 'Saldo insuficiente en U-Wallet');

      await Promise.all([
        tx.user.update({ where: { id: payerId }, data: { walletBalance: { decrement: amount } } }),
        tx.user.update({ where: { id: driverId }, data: { pendingBalance: { increment: amount } } }),
        tx.walletTransaction.create({
          data: {
            userId: payerId,
            amount,
            type: TransactionType.DEBIT,
            concept: TransactionConcept.PAYMENT,
            description: `${tripRequest.trip.originZone} → ${tripRequest.trip.destinationZone}`,
            relatedRequestId: tripRequestId,
          },
        }),
        tx.payment.upsert({
          where: { tripRequestId },
          create: {
            tripRequestId,
            tripId: tripRequest.tripId,
            payerId,
            amount,
            status: PaymentStatus.CONFIRMED,
            confirmedAt: new Date(),
          },
          update: {
            status: PaymentStatus.CONFIRMED,
            confirmedAt: new Date(),
            stripePaymentId: null,
          },
        }),
      ]);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    return { amount: Number(amount) };
  }

  async getWallet(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { walletBalance: true, pendingBalance: true },
    });
    if (!user) throw new AppError(404, 'Usuario no encontrado');

    const transactions = await this.prisma.walletTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return {
      walletBalance: Number(user.walletBalance),
      pendingBalance: Number(user.pendingBalance),
      transactions: transactions.map(t => ({ ...t, amount: Number(t.amount) })),
    };
  }

  async topUpWallet(userId: string, amount: number) {
    if (amount <= 0 || amount > 500) throw new AppError(400, 'El monto debe estar entre $0.01 y $500');

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { walletBalance: { increment: amount } },
      }),
      this.prisma.walletTransaction.create({
        data: {
          userId,
          amount,
          type: TransactionType.CREDIT,
          concept: TransactionConcept.TOPUP,
          description: 'Recarga manual',
        },
      }),
    ]);

    const updated = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { walletBalance: true },
    });

    return { walletBalance: Number(updated!.walletBalance) };
  }
}
