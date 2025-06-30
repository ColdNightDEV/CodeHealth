import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { trackRevenueEvent } from "@/lib/subscription";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    console.error("Webhook error: No signature provided");
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
    console.log("✅ Webhook signature verified:", event.type);
  } catch (error) {
    console.error("❌ Webhook signature verification failed:", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    console.log(`🔄 Processing webhook event: ${event.type}`);

    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session
        );
        break;

      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionChange(
          event.data.object as Stripe.Subscription
        );
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription
        );
        break;

      case "invoice.payment_succeeded":
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case "charge.dispute.created":
        await handleChargeDispute(event.data.object as Stripe.Dispute);
        break;

      case "customer.subscription.trial_will_end":
        await handleTrialWillEnd(event.data.object as Stripe.Subscription);
        break;

      default:
        console.log(`⚠️ Unhandled event type: ${event.type}`);
    }

    console.log(`✅ Successfully processed webhook: ${event.type}`);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("❌ Webhook handler failed:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
) {
  console.log("🛒 Processing checkout session completed:", session.id);

  const userId = session.metadata?.userId;

  if (!userId) {
    console.error("❌ No userId in checkout session metadata");
    return;
  }

  console.log(`👤 Found userId in metadata: ${userId}`);

  // Track revenue event
  await trackRevenueEvent({
    type: "checkout_completed",
    amount: session.amount_total || 0,
    currency: session.currency || "usd",
    userId,
    stripeEventId: session.id,
    stripeCustomerId: session.customer as string,
    description: "Checkout session completed",
    metadata: {
      sessionId: session.id,
      paymentStatus: session.payment_status,
    },
  });

  // Get the subscription details
  if (session.subscription) {
    console.log(`🔄 Retrieving subscription: ${session.subscription}`);
    const subscription = await stripe.subscriptions.retrieve(
      session.subscription as string
    );

    console.log(`📊 Subscription details:`, {
      id: subscription.id,
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000),
      current_period_end: new Date(subscription.current_period_end * 1000),
      customer: subscription.customer,
    });

    // Update user with subscription info
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionId: subscription.id,
        subscriptionStatus: "premium",
        subscriptionStart: new Date(subscription.current_period_start * 1000),
        subscriptionEnd: new Date(subscription.current_period_end * 1000),
      },
    });

    // Track subscription creation revenue event
    await trackRevenueEvent({
      type: "subscription_created",
      amount: subscription.items.data[0]?.price.unit_amount || 0,
      currency: subscription.currency,
      userId,
      stripeEventId: subscription.id,
      stripeCustomerId: subscription.customer as string,
      stripeSubscriptionId: subscription.id,
      description: "New subscription created",
      metadata: {
        subscriptionId: subscription.id,
        priceId: subscription.items.data[0]?.price.id,
        status: subscription.status,
      },
    });

    console.log(`✅ Updated user subscription status:`, {
      userId: updatedUser.id,
      email: updatedUser.email,
      subscriptionStatus: updatedUser.subscriptionStatus,
      subscriptionId: updatedUser.subscriptionId,
      subscriptionStart: updatedUser.subscriptionStart,
      subscriptionEnd: updatedUser.subscriptionEnd,
    });
  } else {
    console.log("⚠️ No subscription found in checkout session");
  }
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  console.log("🔄 Processing subscription change:", subscription.id);

  const customer = await stripe.customers.retrieve(
    subscription.customer as string
  );

  if (customer.deleted) {
    console.error("❌ Customer was deleted");
    return;
  }

  console.log(`👤 Found customer: ${customer.id}`);

  const user = await prisma.user.findFirst({
    where: { customerId: customer.id },
  });

  if (!user) {
    console.error(`❌ User not found for customer: ${customer.id}`);
    return;
  }

  console.log(`👤 Found user: ${user.id} (${user.email})`);

  const isActive =
    subscription.status === "active" || subscription.status === "trialing";
  const subscriptionStatus = isActive ? "premium" : subscription.status;

  console.log(`📊 Subscription update details:`, {
    subscriptionId: subscription.id,
    status: subscription.status,
    isActive,
    subscriptionStatus,
    current_period_start: new Date(subscription.current_period_start * 1000),
    current_period_end: new Date(subscription.current_period_end * 1000),
  });

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      subscriptionId: subscription.id,
      subscriptionStatus,
      subscriptionStart: new Date(subscription.current_period_start * 1000),
      subscriptionEnd: new Date(subscription.current_period_end * 1000),
    },
  });

  // Track subscription update revenue event
  await trackRevenueEvent({
    type: "subscription_updated",
    amount: subscription.items.data[0]?.price.unit_amount || 0,
    currency: subscription.currency,
    userId: user.id,
    stripeEventId: subscription.id,
    stripeCustomerId: customer.id,
    stripeSubscriptionId: subscription.id,
    description: `Subscription ${subscription.status}`,
    metadata: {
      subscriptionId: subscription.id,
      status: subscription.status,
      previousStatus: user.subscriptionStatus,
    },
  });

  console.log(`✅ Updated user subscription:`, {
    userId: updatedUser.id,
    email: updatedUser.email,
    subscriptionStatus: updatedUser.subscriptionStatus,
    subscriptionStart: updatedUser.subscriptionStart,
    subscriptionEnd: updatedUser.subscriptionEnd,
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log("🗑️ Processing subscription deletion:", subscription.id);

  const customer = await stripe.customers.retrieve(
    subscription.customer as string
  );

  if (customer.deleted) {
    console.error("❌ Customer was deleted");
    return;
  }

  const user = await prisma.user.findFirst({
    where: { customerId: customer.id },
  });

  if (!user) {
    console.error(`❌ User not found for customer: ${customer.id}`);
    return;
  }

  console.log(
    `👤 Cancelling subscription for user: ${user.id} (${user.email})`
  );

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      subscriptionStatus: "cancelled",
      subscriptionEnd: new Date(subscription.current_period_end * 1000),
    },
  });

  // Track subscription cancellation
  await trackRevenueEvent({
    type: "subscription_cancelled",
    amount: 0,
    currency: subscription.currency,
    userId: user.id,
    stripeEventId: subscription.id,
    stripeCustomerId: customer.id,
    stripeSubscriptionId: subscription.id,
    description: "Subscription cancelled",
    metadata: {
      subscriptionId: subscription.id,
      cancelledAt: new Date().toISOString(),
      periodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
    },
  });

  console.log(`✅ Cancelled subscription for user: ${updatedUser.email}`);
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log("💳 Payment succeeded for invoice:", invoice.id);

  if (invoice.subscription) {
    // Find user by subscription
    const user = await prisma.user.findFirst({
      where: { subscriptionId: invoice.subscription as string },
    });

    if (user) {
      // Track payment success
      await trackRevenueEvent({
        type: "payment_succeeded",
        amount: invoice.amount_paid,
        currency: invoice.currency,
        userId: user.id,
        stripeEventId: invoice.id,
        stripeCustomerId: invoice.customer as string,
        stripeSubscriptionId: invoice.subscription as string,
        stripeInvoiceId: invoice.id,
        description: "Payment succeeded",
        metadata: {
          invoiceId: invoice.id,
          amountPaid: invoice.amount_paid,
          billingReason: invoice.billing_reason,
        },
      });
    }

    // Refresh subscription data when payment succeeds
    const subscription = await stripe.subscriptions.retrieve(
      invoice.subscription as string
    );
    await handleSubscriptionChange(subscription);
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  console.log("❌ Payment failed for invoice:", invoice.id);

  const customer = await stripe.customers.retrieve(invoice.customer as string);

  if (customer.deleted) {
    console.error("❌ Customer was deleted");
    return;
  }

  const user = await prisma.user.findFirst({
    where: { customerId: customer.id },
  });

  if (user) {
    console.log(`⚠️ Payment failed for user: ${user.email}`);

    // Track payment failure
    await trackRevenueEvent({
      type: "payment_failed",
      amount: invoice.amount_due,
      currency: invoice.currency,
      userId: user.id,
      stripeEventId: invoice.id,
      stripeCustomerId: customer.id,
      stripeInvoiceId: invoice.id,
      description: "Payment failed",
      metadata: {
        invoiceId: invoice.id,
        amountDue: invoice.amount_due,
        attemptCount: invoice.attempt_count,
        nextPaymentAttempt: invoice.next_payment_attempt,
      },
    });
  }
}

async function handleChargeDispute(dispute: Stripe.Dispute) {
  console.log("⚠️ Charge dispute created:", dispute.id);

  const charge = await stripe.charges.retrieve(dispute.charge as string);
  const customer = await stripe.customers.retrieve(charge.customer as string);

  if (customer.deleted) {
    console.error("❌ Customer was deleted");
    return;
  }

  const user = await prisma.user.findFirst({
    where: { customerId: customer.id },
  });

  if (user) {
    // Track dispute
    await trackRevenueEvent({
      type: "dispute_created",
      amount: -dispute.amount, // Negative amount for dispute
      currency: dispute.currency,
      userId: user.id,
      stripeEventId: dispute.id,
      stripeCustomerId: customer.id,
      description: `Dispute: ${dispute.reason}`,
      metadata: {
        disputeId: dispute.id,
        chargeId: dispute.charge,
        reason: dispute.reason,
        status: dispute.status,
      },
    });
  }
}

async function handleTrialWillEnd(subscription: Stripe.Subscription) {
  console.log("⏰ Trial will end for subscription:", subscription.id);

  const customer = await stripe.customers.retrieve(
    subscription.customer as string
  );

  if (customer.deleted) {
    console.error("❌ Customer was deleted");
    return;
  }

  const user = await prisma.user.findFirst({
    where: { customerId: customer.id },
  });

  if (user) {
    console.log(`⏰ Trial ending soon for user: ${user.email}`);

    // Track trial ending event
    await trackRevenueEvent({
      type: "trial_will_end",
      amount: 0,
      currency: subscription.currency,
      userId: user.id,
      stripeEventId: subscription.id,
      stripeCustomerId: customer.id,
      stripeSubscriptionId: subscription.id,
      description: "Trial will end soon",
      metadata: {
        subscriptionId: subscription.id,
        trialEnd: new Date(subscription.trial_end! * 1000).toISOString(),
        daysLeft: Math.ceil(
          (subscription.trial_end! * 1000 - Date.now()) / (1000 * 60 * 60 * 24)
        ),
      },
    });

    // Here you could send an email notification about trial ending
  }
}
