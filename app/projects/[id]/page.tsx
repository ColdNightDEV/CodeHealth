"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { gsap } from "gsap";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Activity,
  Github,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  ExternalLink,
  ArrowLeft,
  RefreshCw,
  Volume2,
  FileText,
  Code,
  Shield,
  Target,
  Zap,
  Eye,
  Download,
  Mic,
} from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/header";
import { VoiceChat } from "@/components/voice/voice-chat";
import { toast } from "sonner";
import Link from "next/link";

interface Project {
  id: string;
  name: string;
  description: string;
  repoUrl: string;
  language: string;
  createdAt: string;
}

interface Analysis {
  id: string;
  documentationScore: number;
  dependencyScore: number;
  codeQualityScore: number;
  securityScore: number;
  testCoverageScore: number;
  overallHealthScore: number;
  issues: string;
  recommendations: string;
  strengths: string;
  totalFiles: number;
  linesOfCode: number;
  documentedFunctions: number;
  totalFunctions: number;
  totalDependencies: number;
  outdatedDependencies: number;
  vulnerabilities: number;
  aiSummary: string;
  complexityAnalysis: string;
  improvementPlan: string;
  status: string;
  createdAt: string;
}

interface SubscriptionStatus {
  isActive: boolean;
  isPremium: boolean;
  canUseVoiceChat: boolean;
  canUsePremiumVoices: boolean;
}

export default function ProjectPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] =
    useState<SubscriptionStatus | null>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }

    if (status === "authenticated") {
      fetchProjectData();
      fetchSubscriptionStatus();

      // Set up polling for analysis status
      const pollInterval = setInterval(() => {
        if (analysis?.status === "analyzing") {
          fetchProjectData();
        }
      }, 5000); // Poll every 5 seconds

      return () => clearInterval(pollInterval);
    }
  }, [status, router, params.id]);

  useEffect(() => {
    if (project && analysis) {
      const ctx = gsap.context(() => {
        gsap.fromTo(
          ".project-card",
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: "power3.out" }
        );
      }, pageRef);

      return () => ctx.revert();
    }
  }, [project, analysis]);

  const fetchProjectData = async () => {
    try {
      const response = await fetch(`/api/projects/${params.id}/analyze`);
      if (response.ok) {
        const data = await response.json();
        setProject(data.project);
        setAnalysis(data.analysis);

        // Fetch files if analysis is completed
        if (data.analysis?.status === "completed") {
          fetchFiles();
        }
      } else {
        toast.error("Failed to load project data");
      }
    } catch (error) {
      toast.error("Failed to load project data");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSubscriptionStatus = async () => {
    try {
      const response = await fetch("/api/subscription/status");
      if (response.ok) {
        const data = await response.json();
        setSubscriptionStatus(data.subscriptionStatus);
      }
    } catch (error) {
      console.error("Failed to fetch subscription status:", error);
    }
  };

  const fetchFiles = async () => {
    try {
      const response = await fetch(`/api/projects/${params.id}/files`);
      if (response.ok) {
        const data = await response.json();
        setFiles(data.files || []);
      }
    } catch (error) {
      console.error("Failed to fetch files:", error);
    }
  };

  const handleReanalyze = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch(`/api/projects/${params.id}/analyze`, {
        method: "POST",
      });

      if (response.ok) {
        toast.success(
          "Re-analysis started! The page will update automatically."
        );
        // Reset analysis to show analyzing state
        setAnalysis((prev) => (prev ? { ...prev, status: "analyzing" } : null));

        // Start polling for updates
        const pollInterval = setInterval(async () => {
          const updateResponse = await fetch(
            `/api/projects/${params.id}/analyze`
          );
          if (updateResponse.ok) {
            const data = await updateResponse.json();
            if (data.analysis?.status !== "analyzing") {
              setAnalysis(data.analysis);
              clearInterval(pollInterval);
              if (data.analysis?.status === "completed") {
                fetchFiles();
                toast.success("Analysis completed!");
              }
            }
          }
        }, 5000);

        // Clear interval after 20 minutes
        setTimeout(() => clearInterval(pollInterval), 20 * 60 * 1000);
      } else {
        const data = await response.json();
        toast.error(data.error || "Re-analysis failed");
      }
    } catch (error) {
      toast.error("Re-analysis failed");
    } finally {
      setIsRefreshing(false);
    }
  };

  const generateAudioSummary = async () => {
    if (!analysis?.aiSummary) return;

    setIsGeneratingAudio(true);
    try {
      const response = await fetch("/api/voice/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: analysis.aiSummary,
          projectId: project?.id,
          title: `${project?.name} Analysis Summary`,
        }),
      });

      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);

        audio.play().catch(() => {
          toast.error("Failed to play audio");
        });

        toast.success("Audio summary generated!");
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to generate audio");
      }
    } catch (error) {
      toast.error("Failed to generate audio summary");
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return "text-success";
    if (score >= 60) return "text-warning";
    return "text-error";
  };

  const getHealthBadgeColor = (score: number) => {
    if (score >= 80) return "bg-success/20 text-success border-success/30";
    if (score >= 60) return "bg-warning/20 text-warning border-warning/30";
    return "bg-error/20 text-error border-error/30";
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-dark-gradient flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-dark-gradient">
        <DashboardHeader />
        <main className="container mx-auto px-6 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4">
              Project Not Found
            </h1>
            <Link href="/dashboard">
              <Button>Back to Dashboard</Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-gradient">
      <DashboardHeader />

      <main ref={pageRef} className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-white/80 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
                {project.name}
              </h1>
              <p className="text-gray-300 text-base sm:text-lg">
                {project.description || "No description provided"}
              </p>
              <div className="flex items-center mt-2 text-sm text-gray-400">
                <Github className="h-4 w-4 mr-2" />
                <a
                  href={project.repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-purple-300 transition-colors flex items-center"
                >
                  {project.repoUrl.replace("https://github.com/", "")}
                  <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
              {analysis?.status === "completed" && (
                <>
                  <Button
                    onClick={generateAudioSummary}
                    disabled={isGeneratingAudio}
                    variant="outline"
                    size="sm"
                    className="border-gray-600 text-gray-300 hover:bg-card-dark"
                  >
                    {isGeneratingAudio ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Volume2 className="h-4 w-4 mr-2" />
                    )}
                    Audio Summary
                  </Button>
                  <Button
                    onClick={handleReanalyze}
                    disabled={isRefreshing}
                    variant="outline"
                    size="sm"
                    className="border-gray-600 text-gray-300 hover:bg-card-dark"
                  >
                    {isRefreshing ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Re-analyze
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Analysis Status */}
        {analysis ? (
          analysis.status === "analyzing" ? (
            <Card className="project-card bg-card-dark border-purple-accent mb-8">
              <CardContent className="p-8 text-center">
                <Activity className="h-16 w-16 text-info mx-auto mb-4 animate-pulse" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  Quantum Analysis in Progress
                </h3>
                <p className="text-gray-400 mb-4">
                  We're analyzing your repository with quantum-level precision.
                  This may take a few minutes...
                </p>
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                  <Clock className="h-4 w-4" />
                  <span>
                    Started {new Date(analysis.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ) : analysis.status === "failed" ? (
            <Card className="project-card bg-card-dark border-red-500/30 mb-8">
              <CardContent className="p-8 text-center">
                <AlertTriangle className="h-16 w-16 text-error mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  Analysis Failed
                </h3>
                <p className="text-gray-400 mb-4">
                  {analysis.aiSummary ||
                    "The analysis could not be completed. Please try again."}
                </p>
                <Button
                  onClick={handleReanalyze}
                  disabled={isRefreshing}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {isRefreshing ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Retry Analysis
                </Button>
              </CardContent>
            </Card>
          ) : (
            // Analysis completed - show results
            <div className="space-y-8">
              {/* Overall Health Score */}
              <Card className="project-card bg-card-dark border-purple-accent">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-white text-xl">
                        Overall Quantum Health Score
                      </CardTitle>
                      <CardDescription className="text-gray-400">
                        Comprehensive analysis of your codebase quality
                      </CardDescription>
                    </div>
                    <Badge
                      className={getHealthBadgeColor(
                        analysis.overallHealthScore
                      )}
                    >
                      {analysis.overallHealthScore}%
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <Progress
                    value={analysis.overallHealthScore}
                    className="h-4 mb-4"
                  />
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                    <div className="text-center">
                      <div
                        className={`text-2xl font-bold ${getHealthColor(
                          analysis.documentationScore
                        )}`}
                      >
                        {analysis.documentationScore}%
                      </div>
                      <div className="text-xs text-gray-400">Documentation</div>
                    </div>
                    <div className="text-center">
                      <div
                        className={`text-2xl font-bold ${getHealthColor(
                          analysis.codeQualityScore
                        )}`}
                      >
                        {analysis.codeQualityScore}%
                      </div>
                      <div className="text-xs text-gray-400">Code Quality</div>
                    </div>
                    <div className="text-center">
                      <div
                        className={`text-2xl font-bold ${getHealthColor(
                          analysis.securityScore
                        )}`}
                      >
                        {analysis.securityScore}%
                      </div>
                      <div className="text-xs text-gray-400">Security</div>
                    </div>
                    <div className="text-center">
                      <div
                        className={`text-2xl font-bold ${getHealthColor(
                          analysis.dependencyScore
                        )}`}
                      >
                        {analysis.dependencyScore}%
                      </div>
                      <div className="text-xs text-gray-400">Dependencies</div>
                    </div>
                    <div className="text-center">
                      <div
                        className={`text-2xl font-bold ${getHealthColor(
                          analysis.testCoverageScore
                        )}`}
                      >
                        {analysis.testCoverageScore}%
                      </div>
                      <div className="text-xs text-gray-400">Test Coverage</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Detailed Analysis Tabs */}
              <Tabs defaultValue="summary" className="space-y-6">
                <TabsList className="bg-black/50 border border-purple-accent flex flex-wrap justify-center sm:justify-start h-auto p-1 rounded-lg gap-1">
                  <TabsTrigger
                    value="summary"
                    className="flex-shrink-0 text-xs sm:text-sm data-[state=active]:bg-purple-600 px-3 py-1 sm:px-4 sm:py-2 whitespace-nowrap"
                  >
                    <FileText className="h-3 w-3 mr-1 sm:h-4 sm:w-4 sm:mr-2" />
                    Summary
                  </TabsTrigger>
                  <TabsTrigger
                    value="issues"
                    className="flex-shrink-0 text-xs sm:text-sm data-[state=active]:bg-purple-600 px-3 py-1 sm:px-4 sm:py-2 whitespace-nowrap"
                  >
                    <AlertTriangle className="h-3 w-3 mr-1 sm:h-4 sm:w-4 sm:mr-2" />
                    Issues
                  </TabsTrigger>
                  <TabsTrigger
                    value="recommendations"
                    className="flex-shrink-0 text-xs sm:text-sm data-[state=active]:bg-purple-600 px-3 py-1 sm:px-4 sm:py-2 whitespace-nowrap"
                  >
                    <Target className="h-3 w-3 mr-1 sm:h-4 sm:w-4 sm:mr-2" />
                    Recommendations
                  </TabsTrigger>
                  <TabsTrigger
                    value="metrics"
                    className="flex-shrink-0 text-xs sm:text-sm data-[state=active]:bg-purple-600 px-3 py-1 sm:px-4 sm:py-2 whitespace-nowrap"
                  >
                    <TrendingUp className="h-3 w-3 mr-1 sm:h-4 sm:w-4 sm:mr-2" />
                    Metrics
                  </TabsTrigger>
                  {subscriptionStatus?.canUseVoiceChat && (
                    <TabsTrigger
                      value="voice"
                      className="flex-shrink-0 text-xs sm:text-sm data-[state=active]:bg-purple-600 px-3 py-1 sm:px-4 sm:py-2 whitespace-nowrap"
                    >
                      <Mic className="h-3 w-3 mr-1 sm:h-4 sm:w-4 sm:mr-2" />
                      Voice Chat
                    </TabsTrigger>
                  )}
                </TabsList>

                <TabsContent value="summary" className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="project-card bg-card-dark border-purple-accent">
                      <CardHeader>
                        <CardTitle className="text-white">AI Summary</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-300 leading-relaxed">
                          {analysis.aiSummary}
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="project-card bg-card-dark border-purple-accent">
                      <CardHeader>
                        <CardTitle className="text-white">
                          Complexity Analysis
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-300 leading-relaxed">
                          {analysis.complexityAnalysis}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="project-card bg-card-dark border-purple-accent">
                    <CardHeader>
                      <CardTitle className="text-white">
                        Improvement Plan
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-300 leading-relaxed whitespace-pre-line">
                        {analysis.improvementPlan}
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="issues" className="space-y-6">
                  <Card className="project-card bg-card-dark border-purple-accent">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center">
                        <AlertTriangle className="h-5 w-5 mr-2 text-warning" />
                        Issues Found (
                        {JSON.parse(analysis.issues || "[]").length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {JSON.parse(analysis.issues || "[]").map(
                          (issue: string, index: number) => (
                            <div
                              key={index}
                              className="p-3 bg-warning/10 border border-warning/20 rounded-lg"
                            >
                              <p className="text-warning text-sm">{issue}</p>
                            </div>
                          )
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="recommendations" className="space-y-6">
                  <Card className="project-card bg-card-dark border-purple-accent">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center">
                        <Target className="h-5 w-5 mr-2 text-info" />
                        Recommendations (
                        {JSON.parse(analysis.recommendations || "[]").length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {JSON.parse(analysis.recommendations || "[]").map(
                          (rec: string, index: number) => (
                            <div
                              key={index}
                              className="p-3 bg-info/10 border border-info/20 rounded-lg"
                            >
                              <p className="text-info text-sm">{rec}</p>
                            </div>
                          )
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="metrics" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Card className="project-card bg-card-dark border-purple-accent">
                      <CardHeader>
                        <CardTitle className="text-white text-lg">
                          Code Metrics
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Total Files</span>
                          <span className="text-white font-semibold">
                            {analysis.totalFiles}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Lines of Code</span>
                          <span className="text-white font-semibold">
                            {analysis.linesOfCode.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Functions</span>
                          <span className="text-white font-semibold">
                            {analysis.totalFunctions}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">
                            Documented Functions
                          </span>
                          <span className="text-white font-semibold">
                            {analysis.documentedFunctions} (
                            {Math.round(
                              (analysis.documentedFunctions /
                                analysis.totalFunctions) *
                                100
                            )}
                            %)
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="project-card bg-card-dark border-purple-accent">
                      <CardHeader>
                        <CardTitle className="text-white text-lg">
                          Dependencies
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-400">
                            Total Dependencies
                          </span>
                          <span className="text-white font-semibold">
                            {analysis.totalDependencies}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Outdated</span>
                          <span className="text-warning font-semibold">
                            {analysis.outdatedDependencies}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Vulnerabilities</span>
                          <span className="text-error font-semibold">
                            {analysis.vulnerabilities}
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="project-card bg-card-dark border-purple-accent">
                      <CardHeader>
                        <CardTitle className="text-white text-lg">
                          Strengths
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {JSON.parse(analysis.strengths || "[]")
                            .slice(0, 3)
                            .map((strength: string, index: number) => (
                              <div
                                key={index}
                                className="flex items-start space-x-2"
                              >
                                <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                                <span className="text-success text-sm">
                                  {strength}
                                </span>
                              </div>
                            ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {subscriptionStatus?.canUseVoiceChat && (
                  <TabsContent value="voice" className="space-y-6">
                    <VoiceChat
                      projectId={project.id}
                      isPremium={subscriptionStatus.canUseVoiceChat}
                      files={files}
                      analysis={analysis}
                      project={project}
                    />
                  </TabsContent>
                )}
              </Tabs>
            </div>
          )
        ) : (
          // No analysis yet
          <Card className="project-card bg-card-dark border-purple-accent">
            <CardContent className="p-8 text-center">
              <Code className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                Ready for Quantum Analysis
              </h3>
              <p className="text-gray-400 mb-6">
                This project hasn't been analyzed yet. Start the quantum
                analysis to get detailed insights about your codebase.
              </p>
              <Button
                onClick={handleReanalyze}
                disabled={isRefreshing}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isRefreshing ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4 mr-2" />
                )}
                Start Quantum Analysis
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
