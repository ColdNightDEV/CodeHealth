import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { stripe, createStripeCustomer } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { priceId, promotionCode } = await req.json();

    if (!priceId) {
      return NextResponse.json(
        { error: "Price ID is required" },
        { status: 400 }
      );
    }

    // Get or create user
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let customerId = user.customerId;

    // Create Stripe customer if doesn't exist
    if (!customerId) {
      const customer = await createStripeCustomer(
        user.email,
        user.name || undefined
      );
      customerId = customer.id;

      // Update user with customer ID
      await prisma.user.update({
        where: { id: user.id },
        data: { customerId },
      });
    }

    // Prepare checkout session data
    const checkoutSessionData: any = {
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${process.env.NEXTAUTH_URL}/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/billing?canceled=true`,
      allow_promotion_codes: true,
      billing_address_collection: "required",
      customer_update: {
        address: "auto",
        name: "auto",
      },
      metadata: {
        userId: user.id,
        userEmail: user.email,
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          userEmail: user.email,
        },
      },
    };

    // Add promotion code if provided
    if (promotionCode) {
      try {
        // Validate promotion code exists and is active
        const promotionCodes = await stripe.promotionCodes.list({
          code: promotionCode,
          active: true,
          limit: 1,
        });

        if (promotionCodes.data.length > 0) {
          checkoutSessionData.discounts = [
            {
              promotion_code: promotionCodes.data[0].id,
            },
          ];
          checkoutSessionData.metadata.promotion_code = promotionCode;
          console.log(`✅ Applied promotion code: ${promotionCode}`);
        } else {
          console.log(
            `⚠️ Invalid or inactive promotion code: ${promotionCode}`
          );
        }
      } catch (error) {
        console.error("Error applying promotion code:", error);
        // Continue without promotion code rather than failing
      }
    }

    // Create checkout session
    const checkoutSession = await stripe.checkout.sessions.create(
      checkoutSessionData
    );

    console.log(`✅ Created checkout session: ${checkoutSession.id}`, {
      customerId,
      userId: user.id,
      userEmail: user.email,
      promotionCode: promotionCode || "none",
      hasDiscount: !!checkoutSessionData.discounts,
    });

    return NextResponse.json({
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
    });
  } catch (error) {
    console.error("Stripe checkout session creation failed:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
