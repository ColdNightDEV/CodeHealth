import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { analyzeRepository, saveAnalysis } from "@/lib/analysis";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const project = await prisma.project.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Create initial analysis record
    const analysis = await prisma.analysis.create({
      data: {
        projectId: project.id,
        status: "analyzing",
      },
    });

    // Start analysis in background
    analyzeInBackground(project, analysis.id);

    return NextResponse.json({
      message: "Analysis started",
      analysisId: analysis.id,
      status: "analyzing",
    });
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function analyzeInBackground(project: any, analysisId: string) {
  try {
    // Update project with repo info
    const match = project.repoUrl.match(/github\.com\/([^\/]+)\/([^\/\?]+)/);
    if (match) {
      const [, owner, repo] = match;
      await prisma.project.update({
        where: { id: project.id },
        data: { owner, repo: repo.replace(/\.git$/, "") },
      });
    }

    // Perform analysis
    const analysisResult = await analyzeRepository(project.repoUrl);

    // Update analysis with results
    await prisma.analysis.update({
      where: { id: analysisId },
      data: {
        documentationScore: analysisResult.documentationScore,
        dependencyScore: analysisResult.dependencyScore,
        codeQualityScore: analysisResult.codeQualityScore,
        securityScore: analysisResult.securityScore,
        testCoverageScore: analysisResult.testCoverageScore,
        overallHealthScore: analysisResult.overallHealthScore,
        issues: JSON.stringify(analysisResult.issues),
        recommendations: JSON.stringify(analysisResult.recommendations),
        strengths: JSON.stringify(analysisResult.strengths),
        totalFiles: analysisResult.totalFiles,
        linesOfCode: analysisResult.linesOfCode,
        documentedFunctions: analysisResult.documentedFunctions,
        totalFunctions: analysisResult.totalFunctions,
        totalDependencies: analysisResult.totalDependencies,
        outdatedDependencies: analysisResult.outdatedDependencies,
        vulnerabilities: analysisResult.vulnerabilities,
        aiSummary: analysisResult.aiSummary,
        complexityAnalysis: analysisResult.complexityAnalysis,
        improvementPlan: analysisResult.improvementPlan,
        status: "completed",
      },
    });
  } catch (error) {
    console.error("Background analysis failed:", error);

    // Update analysis with error status
    await prisma.analysis.update({
      where: { id: analysisId },
      data: {
        status: "failed",
        aiSummary:
          "Analysis failed. Please check the repository URL and try again.",
      },
    });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const project = await prisma.project.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        analyses: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const latestAnalysis = project.analyses[0];

    return NextResponse.json({
      project,
      analysis: latestAnalysis || null,
    });
  } catch (error) {
    console.error("Get analysis error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
