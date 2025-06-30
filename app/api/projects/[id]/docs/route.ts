import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GitHubAnalyzer } from "@/lib/github";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { type, query } = await req.json();

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

    // Get repository data
    const repoData = await github.analyzeRepository(owner, cleanRepo);

    let documentation = "";

    switch (type) {
      case "overview":
        documentation = await generateOverviewDocs(repoData);
        break;
      case "api":
        documentation = await generateAPIDocumentation(repoData);
        break;
      case "setup":
        documentation = await generateSetupGuide(repoData);
        break;
      case "search":
        documentation = await searchCodebase(repoData, query);
        break;
      default:
        return NextResponse.json(
          { error: "Invalid documentation type" },
          { status: 400 }
        );
    }

    return NextResponse.json({ documentation });
  } catch (error) {
    console.error("Documentation generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate documentation" },
      { status: 500 }
    );
  }
}

async function generateOverviewDocs(repoData: any): Promise<string> {
  const codeContext = repoData.codeFiles
    .slice(0, 10)
    .map((file: any) => `File: ${file.path}\n${file.content.slice(0, 500)}...`)
    .join("\n\n");

  const prompt = `
Generate comprehensive overview documentation for this codebase:

Repository: ${repoData.repoInfo.full_name}
Language: ${repoData.repoInfo.language}
Description: ${repoData.repoInfo.description}

README Content:
${repoData.readme.slice(0, 1000)}

Key Files:
${codeContext}

Package.json:
${JSON.stringify(repoData.packageJson, null, 2)}

Create a detailed overview that includes:
1. Project purpose and goals
2. Architecture overview
3. Key components and their roles
4. Technology stack explanation
5. Main features and functionality
6. Code organization and structure

Format as markdown with clear sections and examples.
`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content:
            "You are a technical documentation expert. Create clear, comprehensive documentation that helps developers understand the codebase quickly.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 2000,
    });

    return (
      completion.choices[0].message.content ||
      "Failed to generate documentation"
    );
  } catch (error) {
    console.error("OpenAI API error:", error);
    return "Documentation generation failed. Please try again.";
  }
}

async function generateAPIDocumentation(repoData: any): Promise<string> {
  const apiFiles = repoData.codeFiles.filter(
    (file: any) =>
      file.path.includes("api") ||
      file.path.includes("route") ||
      file.content.includes("export async function") ||
      file.content.includes("app.get") ||
      file.content.includes("app.post")
  );

  const apiContext = apiFiles
    .slice(0, 8)
    .map((file: any) => `File: ${file.path}\n${file.content}`)
    .join("\n\n");

  const prompt = `
Generate API documentation for this codebase:

API Files and Routes:
${apiContext}

Create comprehensive API documentation that includes:
1. Available endpoints
2. HTTP methods and paths
3. Request/response formats
4. Parameters and body schemas
5. Authentication requirements
6. Error responses
7. Usage examples with curl or JavaScript

Format as markdown with clear sections and code examples.
`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content:
            "You are an API documentation specialist. Create clear, detailed API docs with examples.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 2000,
    });

    return (
      completion.choices[0].message.content ||
      "Failed to generate API documentation"
    );
  } catch (error) {
    console.error("OpenAI API error:", error);
    return "API documentation generation failed. Please try again.";
  }
}

async function generateSetupGuide(repoData: any): Promise<string> {
  const configFiles = repoData.codeFiles.filter(
    (file: any) =>
      file.path.includes("package.json") ||
      file.path.includes("config") ||
      file.path.includes("env") ||
      file.path.includes("docker") ||
      file.path.includes("setup")
  );

  const setupContext = [
    `README: ${repoData.readme}`,
    `Package.json: ${JSON.stringify(repoData.packageJson, null, 2)}`,
    ...configFiles.map((file: any) => `${file.path}:\n${file.content}`),
  ].join("\n\n");

  const prompt = `
Generate a comprehensive setup and installation guide for this project:

Project Context:
${setupContext}

Create a detailed setup guide that includes:
1. Prerequisites and system requirements
2. Installation steps
3. Environment configuration
4. Database setup (if applicable)
5. Running the development server
6. Building for production
7. Common troubleshooting issues
8. Development workflow

Format as markdown with clear step-by-step instructions and code blocks.
`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content:
            "You are a developer onboarding specialist. Create clear, step-by-step setup instructions.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 2000,
    });

    return (
      completion.choices[0].message.content || "Failed to generate setup guide"
    );
  } catch (error) {
    console.error("OpenAI API error:", error);
    return "Setup guide generation failed. Please try again.";
  }
}

async function searchCodebase(repoData: any, query: string): Promise<string> {
  // Find relevant files based on the query
  const relevantFiles = repoData.codeFiles
    .filter(
      (file: any) =>
        file.content.toLowerCase().includes(query.toLowerCase()) ||
        file.path.toLowerCase().includes(query.toLowerCase())
    )
    .slice(0, 5);

  const searchContext = relevantFiles
    .map((file: any) => `File: ${file.path}\n${file.content}`)
    .join("\n\n");

  const prompt = `
Search query: "${query}"

Relevant code files:
${searchContext}

Based on the search query and the relevant code files found, provide:
1. Direct answers to the query
2. Code examples and explanations
3. Related functionality and components
4. Usage patterns and best practices
5. Links between different parts of the codebase

Format as markdown with code examples and clear explanations.
`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content:
            "You are a code search assistant. Help users understand how specific functionality works in the codebase.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 1500,
    });

    return (
      completion.choices[0].message.content || "No relevant information found"
    );
  } catch (error) {
    console.error("OpenAI API error:", error);
    return "Search failed. Please try again.";
  }
}
