import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canUsePremiumVoices } from "@/lib/subscription";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { text, projectId, title } = await req.json();

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    if (!process.env.ELEVENLABS_API_KEY) {
      return NextResponse.json(
        { error: "ElevenLabs API key not configured" },
        { status: 500 }
      );
    }

    // Check if user can use premium voices
    const canUsePremium = await canUsePremiumVoices(session.user.id);

    // Select voice based on subscription
    const voiceId = canUsePremium
      ? "21m00Tcm4TlvDq8ikWAM" // Premium natural voice (Rachel)
      : "pNInz6obpgDQGcFmaJgB"; // Basic robotic voice (Adam)

    const voiceType = canUsePremium ? "premium" : "robotic";

    // Clean and optimize text for speech
    const cleanText = text
      .replace(/[#*`]/g, "") // Remove markdown formatting
      .replace(/\n+/g, ". ") // Replace line breaks with periods
      .replace(/\s+/g, " ") // Normalize whitespace
      .replace(/(\d+)%/g, "$1 percent") // Convert percentages
      .replace(/(\d+)\./g, "$1 point") // Convert decimal points
      .trim()
      .substring(0, 2500); // Limit length

    // Enhanced voice settings based on subscription
    const voiceSettings = canUsePremium
      ? {
          stability: 0.75,
          similarity_boost: 0.85,
          style: 0.4,
          use_speaker_boost: true,
        }
      : {
          stability: 0.5,
          similarity_boost: 0.6,
          style: 0.1,
          use_speaker_boost: false,
        };

    // Call ElevenLabs API
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          Accept: "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": process.env.ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text: cleanText,
          model_id: canUsePremium
            ? "eleven_multilingual_v2"
            : "eleven_monolingual_v1",
          voice_settings: voiceSettings,
        }),
      }
    );

    if (!response.ok) {
      console.error(
        "ElevenLabs API error:",
        response.status,
        response.statusText
      );
      const errorText = await response.text();
      console.error("Error details:", errorText);
      return NextResponse.json(
        { error: "Voice generation failed" },
        { status: 500 }
      );
    }

    const audioBuffer = await response.arrayBuffer();

    // In production, save to cloud storage (AWS S3, etc.)
    // For demo, we'll use base64 encoding
    const base64Audio = Buffer.from(audioBuffer).toString("base64");
    const audioUrl = `data:audio/mpeg;base64,${base64Audio}`;

    // Estimate duration
    const duration = Math.ceil(cleanText.length / 15);

    // Save audio summary to database if projectId provided
    if (projectId) {
      await prisma.audioSummary.create({
        data: {
          title: title || "Project Analysis Summary",
          content: cleanText,
          audioUrl,
          duration,
          voiceType,
          userId: session.user.id,
          projectId,
        },
      });
    }

    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.byteLength.toString(),
        "Cache-Control": "public, max-age=3600",
        "X-Voice-Type": voiceType,
        "X-Duration": duration.toString(),
      },
    });
  } catch (error) {
    console.error("Voice generation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
