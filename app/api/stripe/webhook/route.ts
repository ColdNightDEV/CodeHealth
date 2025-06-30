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
    console.log(`📋 Event ID: ${event.id}`);

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

async function findUserByMultipleStrategies(
  customerId?: string,
  email?: string,
  sessionId?: string,
  metadata?: any
): Promise<any> {
  console.log(`🔍 Looking up user with multiple strategies:`, {
    customerId,
    email,
    sessionId,
    metadata,
  });

  let user = null;

  // Strategy 1: By customer ID
  if (customerId) {
    user = await prisma.user.findFirst({
      where: { customerId },
    });
    if (user) {
      console.log(`✅ Found user by customer ID: ${user.email}`);
      return user;
    }
  }

  // Strategy 2: By email
  if (email) {
    user = await prisma.user.findFirst({
      where: { email },
    });
    if (user) {
      console.log(`✅ Found user by email: ${user.email}`);
      // Update customer ID if missing
      if (customerId && !user.customerId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { customerId },
        });
        console.log(`✅ Updated user with customer ID: ${customerId}`);
      }
      return user;
    }
  }

  // Strategy 3: By metadata user ID
  if (metadata?.userId) {
    user = await prisma.user.findUnique({
      where: { id: metadata.userId },
    });
    if (user) {
      console.log(`✅ Found user by metadata ID: ${user.email}`);
      // Update customer ID and email if missing
      const updateData: any = {};
      if (customerId && !user.customerId) {
        updateData.customerId = customerId;
      }
      if (email && user.email !== email) {
        updateData.email = email;
      }

      if (Object.keys(updateData).length > 0) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: updateData,
        });
        console.log(`✅ Updated user with missing data:`, updateData);
      }
      return user;
    }
  }

  // Strategy 4: By metadata userEmail
  if (metadata?.userEmail) {
    user = await prisma.user.findFirst({
      where: { email: metadata.userEmail },
    });
    if (user) {
      console.log(`✅ Found user by metadata email: ${user.email}`);
      // Update customer ID if missing
      if (customerId && !user.customerId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { customerId },
        });
        console.log(`✅ Updated user with customer ID: ${customerId}`);
      }
      return user;
    }
  }

  // Strategy 5: If we have a session ID, try to get it from Stripe and extract more info
  if (sessionId) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["customer"],
      });

      const customer = session.customer as Stripe.Customer;
      if (customer && !customer.deleted && customer.email) {
        user = await prisma.user.findFirst({
          where: { email: customer.email },
        });
        if (user) {
          console.log(`✅ Found user by session customer email: ${user.email}`);
          // Update customer ID if missing
          if (!user.customerId) {
            user = await prisma.user.update({
              where: { id: user.id },
              data: { customerId: customer.id },
            });
            console.log(
              `✅ Updated user with customer ID from session: ${customer.id}`
            );
          }
          return user;
        }
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Error retrieving customer:", error.message);
      } else {
        console.error("Error retrieving customer:", String(error));
      }
    }
  }

  console.log(`❌ User not found with any strategy`);
  return null;
}

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
) {
  console.log("🛒 Processing checkout session completed:", session.id);
  console.log("📋 Session details:", {
    id: session.id,
    customer: session.customer,
    customer_email: session.customer_email,
    customer_details: session.customer_details,
    subscription: session.subscription,
    metadata: session.metadata,
    payment_status: session.payment_status,
    amount_total: session.amount_total,
  });

  // Get customer email from multiple sources
  const customerEmail =
    session.customer_email ||
    session.customer_details?.email ||
    session.metadata?.userEmail;

  const customerId = session.customer as string;

  console.log(`📧 Customer email: ${customerEmail}`);
  console.log(`👤 Customer ID: ${customerId}`);

  // Use enhanced user lookup
  const user = await findUserByMultipleStrategies(
    customerId,
    customerEmail,
    session.id,
    session.metadata
  );

  if (!user) {
    console.error("❌ No user found for checkout session after all strategies");
    console.log("🔍 Session debug info:", {
      id: session.id,
      customer: customerId,
      email: customerEmail,
      metadata: session.metadata,
      customer_details: session.customer_details,
    });

    // Try one more time with expanded customer data
    if (customerId) {
      try {
        const customer = await stripe.customers.retrieve(customerId);
        if (!customer.deleted && customer.email) {
          console.log(
            `🔄 Trying with expanded customer email: ${customer.email}`
          );
          const userByCustomerEmail = await prisma.user.findFirst({
            where: { email: customer.email },
          });

          if (userByCustomerEmail) {
            console.log(
              `✅ Found user with expanded customer data: ${userByCustomerEmail.email}`
            );
            // Update with customer ID
            const updatedUser = await prisma.user.update({
              where: { id: userByCustomerEmail.id },
              data: { customerId },
            });
            console.log(`✅ Updated user with customer ID: ${customerId}`);
            await processSubscriptionForUser(updatedUser, session);
            return;
          }
        }
      } catch (error) {
        console.error("Error retrieving customer:", error);
      }
    }

    return;
  }

  await processSubscriptionForUser(user, session);
}

async function processSubscriptionForUser(
  user: any,
  session: Stripe.Checkout.Session
) {
  console.log(
    `👤 Processing subscription for user: ${user.email} (${user.id})`
  );

  // Track revenue event
  await trackRevenueEvent({
    type: "checkout_completed",
    amount: session.amount_total || 0,
    currency: session.currency || "usd",
    userId: user.id,
    stripeEventId: session.id,
    stripeCustomerId: session.customer as string,
    description: "Checkout session completed",
    metadata: {
      sessionId: session.id,
      paymentStatus: session.payment_status,
      discountAmount: session.total_details?.amount_discount || 0,
      promotionCode: session.metadata?.promotion_code || null,
    },
  });

  // Get the subscription details
  if (session.subscription) {
    console.log(`🔄 Retrieving subscription: ${session.subscription}`);
    const subscription = await stripe.subscriptions.retrieve(
      session.subscription as string,
      {
        expand: ["discount.coupon", "items.data.price"],
      }
    );

    console.log(`📊 Subscription details:`, {
      id: subscription.id,
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000),
      current_period_end: new Date(subscription.current_period_end * 1000),
      customer: subscription.customer,
      discount: subscription.discount
        ? {
            coupon: subscription.discount.coupon.name,
            percent_off: subscription.discount.coupon.percent_off,
            duration: subscription.discount.coupon.duration,
            duration_in_months: subscription.discount.coupon.duration_in_months,
          }
        : null,
    });

    // Update user with subscription info
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionId: subscription.id,
        subscriptionStatus: "premium",
        subscriptionStart: new Date(subscription.current_period_start * 1000),
        subscriptionEnd: new Date(subscription.current_period_end * 1000),
        customerId: session.customer as string, // Ensure customer ID is set
      },
    });

    // Track subscription creation revenue event
    await trackRevenueEvent({
      type: "subscription_created",
      amount: subscription.items.data[0]?.price.unit_amount || 0,
      currency: subscription.currency,
      userId: user.id,
      stripeEventId: subscription.id,
      stripeCustomerId: session.customer as string,
      stripeSubscriptionId: subscription.id,
      description: "New subscription created",
      metadata: {
        subscriptionId: subscription.id,
        priceId: subscription.items.data[0]?.price.id,
        status: subscription.status,
        hasDiscount: !!subscription.discount,
        discountPercent: subscription.discount?.coupon.percent_off || 0,
        promotionCode: session.metadata?.promotion_code || null,
      },
    });

    console.log(`✅ Updated user subscription status:`, {
      userId: updatedUser.id,
      email: updatedUser.email,
      subscriptionStatus: updatedUser.subscriptionStatus,
      subscriptionId: updatedUser.subscriptionId,
      subscriptionStart: updatedUser.subscriptionStart,
      subscriptionEnd: updatedUser.subscriptionEnd,
      customerId: updatedUser.customerId,
    });
  } else {
    console.log("⚠️ No subscription found in checkout session");
  }
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  console.log("🔄 Processing subscription change:", subscription.id);

  const customerId = subscription.customer as string;

  // Expand subscription to get discount info
  const expandedSubscription = await stripe.subscriptions.retrieve(
    subscription.id,
    {
      expand: ["discount.coupon", "customer"],
    }
  );

  const customer = expandedSubscription.customer as Stripe.Customer;

  if (
    !expandedSubscription.created ||
    customer.deleted ||
    customer.id !== customerId
  ) {
    console.error("❌ Customer was deleted or not found");
    return;
  }

  console.log(`👤 Found customer: ${customer.id} (${customer.email})`);

  // Use enhanced user lookup
  const user = await findUserByMultipleStrategies(
    customer.id,
    customer.email || undefined,
    undefined,
    undefined
  );

  if (!user) {
    console.error(
      `❌ User not found for customer: ${customer.id} (${customer.email})`
    );
    return;
  }

  console.log(`👤 Found user: ${user.id} (${user.email})`);

  const isActive =
    expandedSubscription.status === "active" ||
    expandedSubscription.status === "trialing";
  const subscriptionStatus = isActive ? "premium" : expandedSubscription.status;

  console.log(`📊 Subscription update details:`, {
    subscriptionId: expandedSubscription.id,
    status: expandedSubscription.status,
    isActive,
    subscriptionStatus,
    current_period_start: new Date(
      expandedSubscription.current_period_start * 1000
    ),
    current_period_end: new Date(
      expandedSubscription.current_period_end * 1000
    ),
    discount: expandedSubscription.discount
      ? {
          coupon: expandedSubscription.discount.coupon.name,
          percent_off: expandedSubscription.discount.coupon.percent_off,
        }
      : null,
  });

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      subscriptionId: expandedSubscription.id,
      subscriptionStatus,
      subscriptionStart: new Date(
        expandedSubscription.current_period_start * 1000
      ),
      subscriptionEnd: new Date(expandedSubscription.current_period_end * 1000),
      customerId: customer.id, // Ensure customer ID is always set
    },
  });

  // Track subscription update revenue event
  await trackRevenueEvent({
    type: "subscription_updated",
    amount: expandedSubscription.items.data[0]?.price.unit_amount || 0,
    currency: expandedSubscription.currency,
    userId: user.id,
    stripeEventId: expandedSubscription.id,
    stripeCustomerId: customer.id,
    stripeSubscriptionId: expandedSubscription.id,
    description: `Subscription ${expandedSubscription.status}`,
    metadata: {
      subscriptionId: expandedSubscription.id,
      status: expandedSubscription.status,
      previousStatus: user.subscriptionStatus,
      hasDiscount: !!expandedSubscription.discount,
      discountPercent: expandedSubscription.discount?.coupon.percent_off || 0,
    },
  });

  console.log(`✅ Updated user subscription:`, {
    userId: updatedUser.id,
    email: updatedUser.email,
    subscriptionStatus: updatedUser.subscriptionStatus,
    subscriptionStart: updatedUser.subscriptionStart,
    subscriptionEnd: updatedUser.subscriptionEnd,
    customerId: updatedUser.customerId,
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

  const user = await findUserByMultipleStrategies(
    customer.id,
    customer.email || undefined,
    undefined,
    undefined
  );

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
          discountAmount:
            invoice.total_discount_amounts?.reduce(
              (sum, discount) => sum + discount.amount,
              0
            ) || 0,
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

  const user = await findUserByMultipleStrategies(
    customer.id,
    customer.email || undefined,
    undefined,
    undefined
  );

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

  const user = await findUserByMultipleStrategies(
    customer.id,
    customer.email || undefined,
    undefined,
    undefined
  );

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

  const user = await findUserByMultipleStrategies(
    customer.id,
    customer.email || undefined,
    undefined,
    undefined
  );

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
