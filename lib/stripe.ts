import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
  typescript: true,
});

export const createStripeCustomer = async (email: string, name?: string) => {
  const customer = await stripe.customers.create({
    email,
    name,
  });

  return customer;
};

export const getStripeCustomer = async (customerId: string) => {
  const customer = await stripe.customers.retrieve(customerId);
  return customer;
};

export const createBillingPortalSession = async (
  customerId: string,
  returnUrl: string
) => {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session;
};

export const getSubscription = async (subscriptionId: string) => {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  return subscription;
};

export const cancelSubscription = async (subscriptionId: string) => {
  const subscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
  return subscription;
};

export const reactivateSubscription = async (subscriptionId: string) => {
  const subscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });
  return subscription;
};

export const isSubscriptionActive = (
  subscription: Stripe.Subscription
): boolean => {
  return subscription.status === "active" || subscription.status === "trialing";
};

export const getSubscriptionStatus = (subscription: Stripe.Subscription) => {
  const isActive = isSubscriptionActive(subscription);
  const isPremium = isActive;
  const currentPeriodEnd = new Date(subscription.current_period_end * 1000);
  const cancelAtPeriodEnd = subscription.cancel_at_period_end;

  return {
    isActive,
    isPremium,
    status: subscription.status,
    currentPeriodEnd,
    cancelAtPeriodEnd,
    priceId: subscription.items.data[0]?.price.id,
  };
};
