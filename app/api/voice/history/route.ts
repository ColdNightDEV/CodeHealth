import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    // Get voice chat history
    const voiceChats = await prisma.voiceChat.findMany({
      where: {
        userId: session.user.id,
        ...(projectId && { projectId }),
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        project: {
          select: { name: true },
        },
      },
    });

    // Get audio summaries
    const audioSummaries = await prisma.audioSummary.findMany({
      where: {
        userId: session.user.id,
        ...(projectId && { projectId }),
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        project: {
          select: { name: true },
        },
      },
    });

    return NextResponse.json({
      voiceChats,
      audioSummaries,
    });
  } catch (error) {
    console.error("Get voice history error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
