import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createBillingPortalSession } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user with customer ID
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user || !user.customerId) {
      return NextResponse.json(
        { error: "No subscription found" },
        { status: 404 }
      );
    }

    // Create billing portal session
    const portalSession = await createBillingPortalSession(
      user.customerId,
      `${process.env.NEXTAUTH_URL}/billing`
    );

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error("Stripe portal session creation failed:", error);
    return NextResponse.json(
      { error: "Failed to create portal session" },
      { status: 500 }
    );
  }
}
