import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GitHubAnalyzer } from "@/lib/github";

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
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const github = new GitHubAnalyzer();
    const match = project.repoUrl.match(/github\.com\/([^\/]+)\/([^\/\?]+)/);

    if (!match) {
      return NextResponse.json(
        { error: "Invalid GitHub URL" },
        { status: 400 }
      );
    }

    const [, owner, repo] = match;
    const cleanRepo = repo.replace(/\.git$/, "");

    // Get all files with detailed analysis
    const repoData = await github.analyzeRepository(owner, cleanRepo);

    return NextResponse.json({
      files: repoData.codeFiles,
      allFiles: repoData.files,
      repoInfo: repoData.repoInfo,
    });
  } catch (error) {
    console.error("Get files error:", error);
    return NextResponse.json(
      { error: "Failed to fetch files" },
      { status: 500 }
    );
  }
}
