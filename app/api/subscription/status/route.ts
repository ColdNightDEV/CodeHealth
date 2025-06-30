import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserSubscriptionStatus } from "@/lib/subscription";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log(`🔍 Fetching subscription status for user: ${session.user.id}`);

    const subscriptionStatus = await getUserSubscriptionStatus(session.user.id);

    console.log(`✅ Returning subscription status:`, subscriptionStatus);

    return NextResponse.json({ subscriptionStatus });
  } catch (error) {
    console.error("❌ Get subscription status error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
