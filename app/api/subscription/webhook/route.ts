import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

// This route is now handled by the Stripe webhook
// Redirect to the new Stripe webhook endpoint
export async function POST(req: NextRequest) {
  return NextResponse.redirect(new URL("/api/stripe/webhook", req.url));
}
