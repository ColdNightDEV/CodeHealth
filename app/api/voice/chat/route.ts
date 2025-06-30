import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canUseVoiceFeatures, canUsePremiumVoices } from "@/lib/subscription";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user can use voice features
    const canUseVoice = await canUseVoiceFeatures(session.user.id);
    if (!canUseVoice) {
      return NextResponse.json(
        {
          error:
            "Voice chat is a premium feature. Please upgrade to access this functionality.",
        },
        { status: 403 }
      );
    }

    const { message, projectId, context } = await req.json();

    if (!message || !projectId) {
      return NextResponse.json(
        { error: "Message and project ID are required" },
        { status: 400 }
      );
    }

    // Get project and analysis data for context
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
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

    // Create enhanced context for AI response using provided context
    const enhancedContext = `
Project: ${project.name}
Repository: ${project.repoUrl}
Language: ${project.language || "Unknown"}
Description: ${project.description || "No description"}

${
  latestAnalysis
    ? `
Analysis Summary:
- Overall Health Score: ${latestAnalysis.overallHealthScore}%
- Documentation Score: ${latestAnalysis.documentationScore}%
- Code Quality Score: ${latestAnalysis.codeQualityScore}%
- Security Score: ${latestAnalysis.securityScore}%
- Total Files: ${latestAnalysis.totalFiles}
- Lines of Code: ${latestAnalysis.linesOfCode}
- Issues Found: ${JSON.parse(latestAnalysis.issues || "[]").length}

AI Summary: ${latestAnalysis.aiSummary}

Recent Issues:
${JSON.parse(latestAnalysis.issues || "[]")
  .slice(0, 3)
  .map((issue: string, i: number) => `${i + 1}. ${issue}`)
  .join("\n")}

Key Recommendations:
${JSON.parse(latestAnalysis.recommendations || "[]")
  .slice(0, 3)
  .map((rec: string, i: number) => `${i + 1}. ${rec}`)
  .join("\n")}
`
    : "No analysis available yet."
}

${
  context?.files && context.files.length > 0
    ? `
File Structure (sample):
${context.files
  .map(
    (file: any) =>
      `- ${file.path} (${file.language}, ${(file.size / 1024).toFixed(1)}KB)`
  )
  .join("\n")}
`
    : ""
}
`;

    // Get AI response with enhanced context
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are a senior software architect and code reviewer assistant with deep knowledge of the user's codebase. You have access to detailed analysis of their project and can provide specific, actionable advice. 

Key guidelines:
- Reference specific details from the analysis when relevant
- Provide concrete, actionable advice
- Keep responses conversational but professional
- Under 200 words for voice synthesis
- Use the project context to give personalized recommendations
- When discussing issues, be specific about what was found in their code
- Suggest improvements based on their actual codebase metrics

Current project context:
${enhancedContext}`,
        },
        {
          role: "user",
          content: message,
        },
      ],
      max_tokens: 300,
      temperature: 0.7,
    });

    const response =
      completion.choices[0].message.content ||
      "I apologize, but I could not generate a response at this time.";

    // Generate voice response
    const canUsePremium = await canUsePremiumVoices(session.user.id);
    const voiceId = canUsePremium
      ? "21m00Tcm4TlvDq8ikWAM"
      : "pNInz6obpgDQGcFmaJgB"; // Premium vs basic voice

    const voiceResponse = await generateVoiceResponse(response, voiceId);

    // Save chat to database
    const voiceChat = await prisma.voiceChat.create({
      data: {
        message,
        response,
        audioUrl: voiceResponse.audioUrl,
        duration: voiceResponse.duration,
        userId: session.user.id,
        projectId,
      },
    });

    return NextResponse.json({
      response,
      audioUrl: voiceResponse.audioUrl,
      duration: voiceResponse.duration,
      chatId: voiceChat.id,
    });
  } catch (error) {
    console.error("Voice chat error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function generateVoiceResponse(text: string, voiceId: string) {
  try {
    const cleanText = text
      .replace(/[#*`]/g, "")
      .replace(/\n+/g, ". ")
      .replace(/\s+/g, " ")
      .trim();

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          Accept: "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": process.env.ELEVENLABS_API_KEY!,
        },
        body: JSON.stringify({
          text: cleanText,
          model_id: "eleven_monolingual_v1",
          voice_settings: {
            stability: 0.7,
            similarity_boost: 0.8,
            style: 0.3,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error("Voice generation failed");
    }

    const audioBuffer = await response.arrayBuffer();

    // In a real app, you'd save this to cloud storage (AWS S3, etc.)
    // For now, we'll create a data URL
    const base64Audio = Buffer.from(audioBuffer).toString("base64");
    const audioUrl = `data:audio/mpeg;base64,${base64Audio}`;

    // Estimate duration (rough calculation)
    const duration = Math.ceil(cleanText.length / 15); // ~15 chars per second

    return { audioUrl, duration };
  } catch (error) {
    console.error("Voice generation error:", error);
    return { audioUrl: null, duration: 0 };
  }
}
