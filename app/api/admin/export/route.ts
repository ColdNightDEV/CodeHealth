import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isUserAdmin } from "@/lib/subscription";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const isAdmin = await isUserAdmin(session.user.id);
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Get all data for export
    const [users, projects, analyses] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          subscriptionStatus: true,
          createdAt: true,
          subscriptionStart: true,
          subscriptionEnd: true,
        },
      }),
      prisma.project.findMany({
        select: {
          id: true,
          name: true,
          repoUrl: true,
          language: true,
          createdAt: true,
          user: {
            select: { email: true },
          },
        },
      }),
      prisma.analysis.findMany({
        select: {
          id: true,
          overallHealthScore: true,
          status: true,
          createdAt: true,
          project: {
            select: { name: true },
          },
        },
      }),
    ]);

    // Create CSV content
    const csvContent = [
      // Users section
      "USERS",
      "Email,Name,Subscription Status,Created At,Subscription Start,Subscription End",
      ...users.map(
        (user) =>
          `"${user.email}","${user.name || ""}","${
            user.subscriptionStatus
          }","${user.createdAt.toISOString()}","${
            user.subscriptionStart?.toISOString() || ""
          }","${user.subscriptionEnd?.toISOString() || ""}"`
      ),
      "",
      // Projects section
      "PROJECTS",
      "Name,Repository URL,Language,Created At,User Email",
      ...projects.map(
        (project) =>
          `"${project.name}","${project.repoUrl}","${
            project.language || ""
          }","${project.createdAt.toISOString()}","${project.user.email}"`
      ),
      "",
      // Analyses section
      "ANALYSES",
      "Project Name,Health Score,Status,Created At",
      ...analyses.map(
        (analysis) =>
          `"${analysis.project.name}","${analysis.overallHealthScore || ""}","${
            analysis.status
          }","${analysis.createdAt.toISOString()}"`
      ),
    ].join("\n");

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="QuantaCode-analytics-${
          new Date().toISOString().split("T")[0]
        }.csv"`,
      },
    });
  } catch (error) {
    console.error("Export data error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
