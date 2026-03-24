import { PrismaClient, RequestStatus, PaymentStatus } from '@prisma/client';
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
        where: { stripePaymentId: intent.id },
        data: { status: PaymentStatus.CONFIRMED, confirmedAt: new Date() },
      });
    }

    if (event.type === 'payment_intent.payment_failed') {
      const intent = event.data.object as Stripe.PaymentIntent;
      await this.prisma.payment.updateMany({
        where: { stripePaymentId: intent.id },
        data: { status: PaymentStatus.FAILED },
      });
    }

    return { received: true };
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
}
