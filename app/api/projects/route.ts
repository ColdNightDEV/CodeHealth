import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canCreateProject } from "@/lib/subscription";
import { z } from "zod";

const createProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  repoUrl: z.string().url(),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const projects = await prisma.project.findMany({
      where: { userId: session.user.id },
      include: {
        analyses: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ projects });
  } catch (error) {
    console.error("Get projects error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user can create more projects based on subscription
    const canCreate = await canCreateProject(session.user.id);
    if (!canCreate) {
      return NextResponse.json(
        {
          error:
            "Daily limit reached. Upgrade to Premium for 50 repositories per day.",
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { name, description, repoUrl } = createProjectSchema.parse(body);

    // Check if repository already exists for this user
    const existingProject = await prisma.project.findFirst({
      where: {
        userId: session.user.id,
        repoUrl,
      },
    });

    if (existingProject) {
      return NextResponse.json(
        { error: "This repository has already been added to your projects." },
        { status: 400 }
      );
    }

    const project = await prisma.project.create({
      data: {
        name,
        description,
        repoUrl,
        userId: session.user.id,
      },
    });

    return NextResponse.json({ project });
  } catch (error) {
    console.error("Create project error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
