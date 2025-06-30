"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Mic,
  MicOff,
  Send,
  Volume2,
  VolumeX,
  Crown,
  MessageCircle,
  Loader2,
  Shield,
} from "lucide-react";
import { toast } from "sonner";

interface VoiceChatProps {
  projectId: string;
  isPremium: boolean;
  files?: any[];
  analysis?: any;
  project?: any;
}

interface ChatMessage {
  id: string;
  message: string;
  response: string;
  audioUrl?: string;
  duration?: number;
  createdAt: string;
}

export function VoiceChat({
  projectId,
  isPremium,
  files = [],
  analysis,
  project,
}: VoiceChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(
    null
  );
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (!isPremium) {
      return;
    }

    // Load chat history
    loadChatHistory();
  }, [projectId, isPremium]);

  const loadChatHistory = async () => {
    try {
      const response = await fetch(`/api/voice/history?projectId=${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.voiceChats || []);
      }
    } catch (error) {
      console.error("Failed to load chat history:", error);
    }
  };

  const sendMessage = async (message: string) => {
    if (!message.trim() || isLoading) return;

    setIsLoading(true);
    setCurrentMessage("");

    try {
      // Create context from available data
      const context = {
        project: project
          ? {
              name: project.name,
              description: project.description,
              language: project.language,
              repoUrl: project.repoUrl,
            }
          : null,
        analysis: analysis
          ? {
              overallHealthScore: analysis.overallHealthScore,
              documentationScore: analysis.documentationScore,
              codeQualityScore: analysis.codeQualityScore,
              securityScore: analysis.securityScore,
              aiSummary: analysis.aiSummary,
              issues: JSON.parse(analysis.issues || "[]").slice(0, 5), // Limit for context
              recommendations: JSON.parse(
                analysis.recommendations || "[]"
              ).slice(0, 5),
            }
          : null,
        files: files.slice(0, 10).map((file) => ({
          // Limit files for context
          path: file.path,
          language: file.language,
          size: file.size,
        })),
      };

      const response = await fetch("/api/voice/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          projectId,
          context, // Send context to help AI understand the codebase
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const newMessage: ChatMessage = {
          id: data.chatId,
          message,
          response: data.response,
          audioUrl: data.audioUrl,
          duration: data.duration,
          createdAt: new Date().toISOString(),
        };

        setMessages((prev) => [newMessage, ...prev]);

        // Auto-play the response
        if (data.audioUrl) {
          playAudio(data.audioUrl, data.chatId);
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to send message");
      }
    } catch (error) {
      toast.error("Failed to send message");
    } finally {
      setIsLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/wav",
        });
        await transcribeAndSend(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      toast.error("Failed to access microphone");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const transcribeAndSend = async (audioBlob: Blob) => {
    // In a real implementation, you would:
    // 1. Send audio to speech-to-text service (OpenAI Whisper, etc.)
    // 2. Get transcribed text
    // 3. Send the text message

    // For demo, we'll simulate transcription
    toast.info("Voice transcription would happen here in production");
  };

  const playAudio = (audioUrl: string, messageId: string) => {
    // Stop current audio if playing
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }

    const audio = new Audio(audioUrl);
    setCurrentAudio(audio);
    setPlayingMessageId(messageId);

    audio.onended = () => {
      setPlayingMessageId(null);
      setCurrentAudio(null);
    };

    audio.onerror = () => {
      toast.error("Failed to play audio");
      setPlayingMessageId(null);
      setCurrentAudio(null);
    };

    audio.play().catch(() => {
      toast.error("Failed to play audio");
      setPlayingMessageId(null);
      setCurrentAudio(null);
    });
  };

  const stopAudio = () => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setCurrentAudio(null);
      setPlayingMessageId(null);
    }
  };

  if (!isPremium) {
    return (
      <Card className="bg-background border-slate-700">
        <CardContent className="p-8 text-center">
          <Crown className="h-16 w-16 text-yellow-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">
            Premium Feature
          </h3>
          <p className="text-slate-400 mb-6">
            Voice chat with your codebase is available for Premium subscribers
            and Admins only.
          </p>
          <Button className="bg-gradient-to-r from-purple-600 to-yellow-600 hover:from-purple-700 hover:to-yellow-700">
            <Crown className="h-4 w-4 mr-2" />
            Upgrade to Premium
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-background border-slate-700 h-[600px] flex flex-col">
      <CardHeader className="pb-4">
        <CardTitle className="text-white flex items-center">
          <MessageCircle className="h-5 w-5 mr-2 text-purple-400" />
          Voice Chat with Your Codebase
          <Badge className="ml-2 bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
            <Crown className="h-3 w-3 mr-1" />
            Premium
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col space-y-4">
        {/* Context Info */}
        {(project || analysis) && (
          <div className="p-3 bg-slate-700/30 rounded-lg">
            <p className="text-slate-300 text-sm">
              <strong>Context:</strong> I have access to your project details
              {analysis && ", analysis results"}
              {files.length > 0 && ", and file structure"}. Ask me anything
              about your codebase!
            </p>
          </div>
        )}

        {/* Chat Messages */}
        <ScrollArea ref={scrollAreaRef} className="flex-1 pr-4">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <Mic className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-400">
                  Start a conversation about your codebase!
                </p>
                <p className="text-slate-500 text-sm mt-2">
                  Ask about code quality, architecture, security issues, or get
                  recommendations.
                </p>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className="space-y-3">
                  {/* User Message */}
                  <div className="flex justify-end">
                    <div className="bg-purple-600/20 border border-purple-500/30 rounded-lg p-3 max-w-[80%]">
                      <p className="text-white text-sm">{msg.message}</p>
                    </div>
                  </div>

                  {/* AI Response */}
                  <div className="flex justify-start">
                    <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-3 max-w-[80%]">
                      <p className="text-slate-200 text-sm mb-2">
                        {msg.response}
                      </p>

                      {msg.audioUrl && (
                        <div className="flex items-center space-x-2 mt-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              playingMessageId === msg.id
                                ? stopAudio()
                                : playAudio(msg.audioUrl!, msg.id)
                            }
                            className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                          >
                            {playingMessageId === msg.id ? (
                              <VolumeX className="h-4 w-4" />
                            ) : (
                              <Volume2 className="h-4 w-4" />
                            )}
                          </Button>
                          {msg.duration && (
                            <span className="text-xs text-slate-400">
                              {msg.duration}s
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="flex space-x-2">
          <div className="flex-1 flex space-x-2">
            <Input
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyPress={(e) =>
                e.key === "Enter" && sendMessage(currentMessage)
              }
              placeholder="Ask about your codebase..."
              className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-purple-500"
              disabled={isLoading}
            />

            <Button
              onClick={() => sendMessage(currentMessage)}
              disabled={isLoading || !currentMessage.trim()}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>

          <Button
            onClick={isRecording ? stopRecording : startRecording}
            variant={isRecording ? "destructive" : "outline"}
            className={
              isRecording
                ? ""
                : "border-slate-600 text-slate-300 hover:bg-slate-700"
            }
          >
            {isRecording ? (
              <MicOff className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </Button>
        </div>

        {isRecording && (
          <div className="text-center">
            <div className="inline-flex items-center space-x-2 text-red-400">
              <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
              <span className="text-sm">Recording... Click to stop</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
