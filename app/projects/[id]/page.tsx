"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Activity,
  ArrowLeft,
  Github,
  FileText,
  Search,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Code2,
  Shield,
  TestTube,
  BookOpen,
  Package,
  MessageSquare,
  Send,
  Volume2,
  VolumeX,
  Play,
  Pause,
  RefreshCw,
  ExternalLink,
  Copy,
  Eye,
  Calendar,
  MapPin,
  Zap,
  Target,
  Lightbulb,
  Bug,
  Info,
  Clock,
  Users,
  Star,
  GitBranch,
  Download,
  Mic,
} from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/header";
import { SyntaxHighlighter } from "@/components/ui/syntax-highlighter";
import { toast } from "sonner";
import Link from "next/link";
import { VoiceChat } from "@/components/voice/voice-chat";

interface Project {
  id: string;
  name: string;
  description: string;
  repoUrl: string;
  owner: string;
  repo: string;
  createdAt: string;
  analyses: Analysis[];
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
  status: string;
  createdAt: string;
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
}

interface FileData {
  path: string;
  content: string;
  size: number;
  language: string;
  issues: string[];
  strengths: string[];
  complexity: number;
  maintainability: number;
  readability: number;
}

interface DetailedIssue {
  id: string;
  type: "error" | "warning" | "info";
  category:
    | "code-quality"
    | "security"
    | "documentation"
    | "dependencies"
    | "performance"
    | "maintainability";
  title: string;
  description: string;
  file?: string;
  line?: number;
  column?: number;
  severity: "critical" | "high" | "medium" | "low";
  suggestion: string;
  codeSnippet?: string;
  impact: string;
  effort: "low" | "medium" | "high";
  tags: string[];
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface RepoInfo {
  name: string;
  full_name: string;
  description: string;
  language: string;
  stargazers_count: number;
  forks_count: number;
  default_branch: string;
  private: boolean;
}

export default function ProjectDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [project, setProject] = useState<Project | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [files, setFiles] = useState<FileData[]>([]);
  const [allFiles, setAllFiles] = useState<any[]>([]);
  const [repoInfo, setRepoInfo] = useState<RepoInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  const [detailedIssues, setDetailedIssues] = useState<DetailedIssue[]>([]);
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [issueFilter, setIssueFilter] = useState<string>("all");
  const [subscriptionStatus, setSubscriptionStatus] = useState<any>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }

    if (status === "authenticated" && params.id) {
      fetchProjectData();
      fetchSubscriptionStatus();
    }
  }, [status, params.id, router]);

  useEffect(() => {
    if (project && analysis) {
      const ctx = gsap.context(() => {
        gsap.fromTo(
          ".metric-card",
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: "power3.out" }
        );
      }, pageRef);

      return () => ctx.revert();
    }
  }, [project, analysis]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

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

  const fetchProjectData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/projects/${params.id}/analyze`);
      if (response.ok) {
        const data = await response.json();
        setProject(data.project);
        setAnalysis(data.analysis);

        if (data.analysis) {
          processDetailedIssues(data.analysis, data.project);
        }

        // Fetch files immediately
        await fetchFiles();
      } else {
        toast.error("Failed to fetch project data");
      }
    } catch (error) {
      toast.error("Failed to fetch project data");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFiles = async () => {
    try {
      const response = await fetch(`/api/projects/${params.id}/files`);
      if (response.ok) {
        const data = await response.json();
        setFiles(data.files || []);
        setAllFiles(data.allFiles || []);
        setRepoInfo(data.repoInfo);
      }
    } catch (error) {
      console.error("Failed to fetch files:", error);
    }
  };

  const processDetailedIssues = (analysis: Analysis, project: Project) => {
    const issues: DetailedIssue[] = [];
    const parsedIssues = JSON.parse(analysis.issues || "[]");

    parsedIssues.forEach((issue: string, index: number) => {
      // Enhanced parsing for better issue details
      const fileMatch = issue.match(
        /(?:in|file|detected:|found in)\s+([^\s]+\.[a-zA-Z]+)/i
      );
      const lineMatch = issue.match(/(?:line|at line)\s+(\d+)/i);
      const columnMatch = issue.match(/(?:column|col)\s+(\d+)/i);

      let category: DetailedIssue["category"] = "code-quality";
      let severity: DetailedIssue["severity"] = "medium";
      let type: DetailedIssue["type"] = "warning";
      let effort: DetailedIssue["effort"] = "medium";
      let tags: string[] = [];

      // Enhanced categorization
      const issueLower = issue.toLowerCase();

      if (
        issueLower.includes("security") ||
        issueLower.includes("vulnerable") ||
        issueLower.includes("xss") ||
        issueLower.includes("injection")
      ) {
        category = "security";
        severity = "critical";
        type = "error";
        effort = "high";
        tags.push("security", "vulnerability");
      } else if (
        issueLower.includes("documentation") ||
        issueLower.includes("readme") ||
        issueLower.includes("comment") ||
        issueLower.includes("docstring")
      ) {
        category = "documentation";
        severity = "low";
        type = "info";
        effort = "low";
        tags.push("documentation", "maintainability");
      } else if (
        issueLower.includes("dependency") ||
        issueLower.includes("outdated") ||
        issueLower.includes("package")
      ) {
        category = "dependencies";
        severity = issueLower.includes("vulnerable") ? "high" : "medium";
        effort = "low";
        tags.push("dependencies", "maintenance");
      } else if (
        issueLower.includes("performance") ||
        issueLower.includes("large file") ||
        issueLower.includes("complexity")
      ) {
        category = "performance";
        severity = "medium";
        effort = "high";
        tags.push("performance", "optimization");
      } else if (
        issueLower.includes("maintainability") ||
        issueLower.includes("refactor") ||
        issueLower.includes("duplicate")
      ) {
        category = "maintainability";
        severity = "medium";
        effort = "medium";
        tags.push("maintainability", "refactoring");
      }

      // Generate specific suggestions and impact
      let suggestion = "Review and address this issue to improve code quality.";
      let impact = "May affect code quality and maintainability.";

      if (issueLower.includes("console.log")) {
        suggestion =
          "Remove console.log statements and implement proper logging using a logging library like Winston or Bunyan. Use environment-specific log levels.";
        impact =
          "Debug statements in production can expose sensitive information and affect performance.";
        tags.push("debugging", "production");
      } else if (issueLower.includes("todo") || issueLower.includes("fixme")) {
        suggestion =
          "Complete the pending work items or create proper issue tickets for tracking. Consider using a project management tool.";
        impact =
          "Unfinished work can lead to bugs and incomplete features in production.";
        tags.push("incomplete", "tracking");
      } else if (issueLower.includes("large file")) {
        suggestion =
          "Break down large files into smaller, more manageable modules following the single responsibility principle. Consider using design patterns like Factory or Strategy.";
        impact =
          "Large files are harder to maintain, test, and can slow down development velocity.";
        tags.push("architecture", "modularity");
      } else if (
        issueLower.includes("docstring") ||
        issueLower.includes("documentation")
      ) {
        suggestion =
          "Add comprehensive documentation including function descriptions, parameters, return values, and usage examples. Use JSDoc for JavaScript/TypeScript.";
        impact =
          "Poor documentation makes code harder to understand and maintain for team members.";
        tags.push("documentation", "team-collaboration");
      } else if (
        issueLower.includes("vulnerable") ||
        issueLower.includes("security")
      ) {
        suggestion =
          "Update to the latest secure version immediately. Review security advisories and implement additional security measures if needed.";
        impact =
          "Security vulnerabilities can lead to data breaches and system compromises.";
        tags.push("security", "urgent");
      }

      // Extract title from issue
      let title =
        issue.split(" - ")[0] || issue.split(":")[0] || issue.substring(0, 60);
      if (title.length > 60) title = title.substring(0, 57) + "...";

      issues.push({
        id: `issue-${index}`,
        type,
        category,
        title,
        description: issue,
        file: fileMatch ? fileMatch[1] : undefined,
        line: lineMatch ? parseInt(lineMatch[1]) : undefined,
        column: columnMatch ? parseInt(columnMatch[1]) : undefined,
        severity,
        suggestion,
        impact,
        effort,
        tags,
      });
    });

    // Sort by severity (critical > high > medium > low)
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    issues.sort(
      (a, b) => severityOrder[b.severity] - severityOrder[a.severity]
    );

    setDetailedIssues(issues);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(`/api/projects/${params.id}/docs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "search", query: searchQuery }),
      });

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.documentation);
      } else {
        toast.error("Search failed");
      }
    } catch (error) {
      toast.error("Search failed");
    } finally {
      setIsSearching(false);
    }
  };

  const handleChat = async () => {
    if (!chatInput.trim()) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: chatInput,
      timestamp: new Date(),
    };

    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput("");
    setIsChatting(true);

    try {
      const response = await fetch(`/api/projects/${params.id}/docs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "search",
          query: `Context: This is a ${
            repoInfo?.language || "software"
          } project with ${
            analysis?.totalFiles || 0
          } files. ${chatInput}. Please provide a detailed explanation with code examples if relevant and reference specific files when possible.`,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const assistantMessage: ChatMessage = {
          role: "assistant",
          content: data.documentation,
          timestamp: new Date(),
        };
        setChatMessages((prev) => [...prev, assistantMessage]);
      } else {
        toast.error("Chat failed");
      }
    } catch (error) {
      toast.error("Chat failed");
    } finally {
      setIsChatting(false);
    }
  };

  const generateVoiceSummary = async () => {
    if (!analysis) return;

    setIsGeneratingVoice(true);
    try {
      const criticalIssues = detailedIssues.filter(
        (i) => i.severity === "critical"
      ).length;
      const highIssues = detailedIssues.filter(
        (i) => i.severity === "high"
      ).length;

      const summaryText = `
        Project Analysis Summary for ${project?.name}.
        
        Overall Health Score: ${analysis.overallHealthScore} percent.
        
        The project contains ${
          analysis.totalFiles
        } files with ${analysis.linesOfCode.toLocaleString()} lines of code.
        Code Quality Score: ${analysis.codeQualityScore} percent.
        Security Score: ${analysis.securityScore} percent.
        Documentation Score: ${analysis.documentationScore} percent.
        Test Coverage: ${analysis.testCoverageScore} percent.
        
        Documentation status: ${analysis.documentedFunctions} out of ${
        analysis.totalFunctions
      } functions are documented.
        Dependencies: ${analysis.totalDependencies} total dependencies with ${
        analysis.outdatedDependencies
      } potentially outdated.
        
        ${
          criticalIssues > 0
            ? `Critical issues found: ${criticalIssues} issues require immediate attention.`
            : ""
        }
        ${
          highIssues > 0
            ? `High priority issues: ${highIssues} issues should be addressed soon.`
            : ""
        }
        
        ${analysis.aiSummary}
        
        Key improvement areas: ${analysis.improvementPlan}
      `;

      const response = await fetch("/api/voice/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: summaryText }),
      });

      if (response.ok) {
        const audioBlob = await response.blob();
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        toast.success("Voice summary generated!");
      } else {
        toast.error("Failed to generate voice summary");
      }
    } catch (error) {
      toast.error("Failed to generate voice summary");
    } finally {
      setIsGeneratingVoice(false);
    }
  };

  const toggleAudio = () => {
    if (!audioRef.current || !audioUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return "text-green-400";
    if (score >= 60) return "text-yellow-400";
    return "text-red-400";
  };

  const getHealthBadgeColor = (score: number) => {
    if (score >= 80)
      return "bg-green-500/20 text-green-400 border-green-500/30";
    if (score >= 60)
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    return "bg-red-500/20 text-red-400 border-red-500/30";
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "text-red-500 bg-red-500/10 border-red-500/30";
      case "high":
        return "text-orange-400 bg-orange-500/10 border-orange-500/20";
      case "medium":
        return "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";
      case "low":
        return "text-blue-400 bg-blue-500/10 border-blue-500/20";
      default:
        return "text-slate-400 bg-slate-500/10 border-slate-500/20";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "security":
        return <Shield className="h-4 w-4" />;
      case "code-quality":
        return <Code2 className="h-4 w-4" />;
      case "documentation":
        return <BookOpen className="h-4 w-4" />;
      case "dependencies":
        return <Package className="h-4 w-4" />;
      case "performance":
        return <Zap className="h-4 w-4" />;
      case "maintainability":
        return <RefreshCw className="h-4 w-4" />;
      default:
        return <Bug className="h-4 w-4" />;
    }
  };

  const getEffortColor = (effort: string) => {
    switch (effort) {
      case "low":
        return "text-green-400";
      case "medium":
        return "text-yellow-400";
      case "high":
        return "text-red-400";
      default:
        return "text-slate-400";
    }
  };

  const filteredIssues = detailedIssues.filter((issue) => {
    if (issueFilter === "all") return true;
    return issue.severity === issueFilter || issue.category === issueFilter;
  });

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-dark-gradient flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading project analysis...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-dark-gradient">
        <DashboardHeader />
        <div className="container mx-auto px-6 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4">
              Project not found
            </h1>
            <Link href="/dashboard">
              <Button className="bg-purple-600 hover:bg-purple-700">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={pageRef} className="min-h-screen bg-dark-gradient">
      <DashboardHeader />

      <main className="container mx-auto px-6 py-8">
        {/* Enhanced Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col mb-4 md:mb-0 md:flex-row md:items-center md:space-x-4">
            <Link href="/dashboard">
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-300 hover:text-white mb-4 md:mb-0"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 mb-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 sm:mb-0">
                  {project.name}
                </h1>
                {repoInfo && (
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      variant="outline"
                      className="border-slate-600 text-slate-400"
                    >
                      <Star className="h-3 w-3 mr-1" />
                      {repoInfo.stargazers_count}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="border-slate-600 text-slate-400"
                    >
                      <GitBranch className="h-3 w-3 mr-1" />
                      {repoInfo.forks_count}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="border-slate-600 text-slate-400"
                    >
                      {repoInfo.language}
                    </Badge>
                  </div>
                )}
              </div>
              <p className="text-slate-300 text-sm sm:text-base">
                {project.description ||
                  repoInfo?.description ||
                  "No description"}
              </p>
              {analysis && (
                <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2 text-sm text-slate-400">
                  <div className="flex items-center">
                    <Calendar className="h-3 w-3 mr-1" />
                    Analyzed {new Date(analysis.createdAt).toLocaleDateString()}
                  </div>
                  <div className="flex items-center">
                    <FileText className="h-3 w-3 mr-1" />
                    {analysis.totalFiles} files
                  </div>
                  <div className="flex items-center">
                    <Code2 className="h-3 w-3 mr-1" />
                    {analysis.linesOfCode.toLocaleString()} lines
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-3 mt-6 md:mt-0">
            {analysis && (
              <>
                <Button
                  onClick={generateVoiceSummary}
                  disabled={isGeneratingVoice}
                  className="bg-teal-600 hover:bg-teal-700 w-full sm:w-auto"
                >
                  {isGeneratingVoice ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Volume2 className="h-4 w-4 mr-2" />
                  )}
                  Voice Summary
                </Button>

                {audioUrl && (
                  <Button
                    onClick={toggleAudio}
                    variant="outline"
                    className="border-slate-600 text-slate-300 w-full sm:w-auto"
                  >
                    {isPlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </>
            )}

            <a
              href={project.repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto"
            >
              <Button
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-700 w-full"
              >
                <Github className="h-4 w-4 mr-2" />
                Repository
                <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            </a>
          </div>
        </div>

        {audioUrl && (
          <audio
            ref={audioRef}
            src={audioUrl}
            onEnded={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
        )}

        {analysis ? (
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="space-y-6"
          >
            <TabsList className="grid w-full grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2 bg-background border-slate-700 h-full p-2">
              <TabsTrigger
                value="overview"
                className="data-[state=active]:bg-purple-600 flex flex-col items-center justify-center p-2 text-center"
              >
                <TrendingUp className="h-5 w-5" />
                <span className="text-xs mt-1">Overview</span>
              </TabsTrigger>
              <TabsTrigger
                value="issues"
                className="data-[state=active]:bg-purple-600 flex flex-col items-center justify-center p-2 text-center"
              >
                <AlertTriangle className="h-5 w-5" />
                <span className="text-xs mt-1">
                  Issues ({detailedIssues.length})
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="recommendations"
                className="data-[state=active]:bg-purple-600 flex flex-col items-center justify-center p-2 text-center"
              >
                <Target className="h-5 w-5" />
                <span className="text-xs mt-1">Recommendations</span>
              </TabsTrigger>
              <TabsTrigger
                value="files"
                className="data-[state=active]:bg-purple-600 flex flex-col items-center justify-center p-2 text-center"
              >
                <FileText className="h-5 w-5" />
                <span className="text-xs mt-1">Files ({files.length})</span>
              </TabsTrigger>
              <TabsTrigger
                value="search"
                className="data-[state=active]:bg-purple-600 flex flex-col items-center justify-center p-2 text-center"
              >
                <Search className="h-5 w-5" />
                <span className="text-xs mt-1">AI Search</span>
              </TabsTrigger>
              <TabsTrigger
                value="voice"
                className="data-[state=active]:bg-purple-600 flex flex-col items-center justify-center p-2 text-center"
              >
                <Mic className="h-5 w-5" />
                <span className="text-xs mt-1">Voice Chat</span>
              </TabsTrigger>
              <TabsTrigger
                value="chat"
                className="data-[state=active]:bg-purple-600 flex flex-col items-center justify-center p-2 text-center"
              >
                <MessageSquare className="h-5 w-5" />
                <span className="text-xs mt-1">Chat</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Health Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <Card className="metric-card bg-background border-slate-700 hover:border-purple-500/50 transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <TrendingUp className="h-5 w-5 text-purple-400" />
                      <Badge
                        className={getHealthBadgeColor(
                          analysis.overallHealthScore
                        )}
                      >
                        {analysis.overallHealthScore}%
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-white">Overall Health</h3>
                    <Progress
                      value={analysis.overallHealthScore}
                      className="mt-2"
                    />
                  </CardContent>
                </Card>

                <Card className="metric-card bg-background border-slate-700 hover:border-blue-500/50 transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <Code2 className="h-5 w-5 text-blue-400" />
                      <span
                        className={`font-bold ${getHealthColor(
                          analysis.codeQualityScore
                        )}`}
                      >
                        {analysis.codeQualityScore}%
                      </span>
                    </div>
                    <h3 className="font-semibold text-white">Code Quality</h3>
                    <Progress
                      value={analysis.codeQualityScore}
                      className="mt-2"
                    />
                  </CardContent>
                </Card>

                <Card className="metric-card bg-background border-slate-700 hover:border-green-500/50 transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <Shield className="h-5 w-5 text-green-400" />
                      <span
                        className={`font-bold ${getHealthColor(
                          analysis.securityScore
                        )}`}
                      >
                        {analysis.securityScore}%
                      </span>
                    </div>
                    <h3 className="font-semibold text-white">Security</h3>
                    <Progress value={analysis.securityScore} className="mt-2" />
                  </CardContent>
                </Card>

                <Card className="metric-card bg-background border-slate-700 hover:border-orange-500/50 transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <BookOpen className="h-5 w-5 text-orange-400" />
                      <span
                        className={`font-bold ${getHealthColor(
                          analysis.documentationScore
                        )}`}
                      >
                        {analysis.documentationScore}%
                      </span>
                    </div>
                    <h3 className="font-semibold text-white">Documentation</h3>
                    <Progress
                      value={analysis.documentationScore}
                      className="mt-2"
                    />
                  </CardContent>
                </Card>

                <Card className="metric-card bg-background border-slate-700 hover:border-teal-500/50 transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <TestTube className="h-5 w-5 text-teal-400" />
                      <span
                        className={`font-bold ${getHealthColor(
                          analysis.testCoverageScore
                        )}`}
                      >
                        {analysis.testCoverageScore}%
                      </span>
                    </div>
                    <h3 className="font-semibold text-white">Test Coverage</h3>
                    <Progress
                      value={analysis.testCoverageScore}
                      className="mt-2"
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Project Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="bg-background border-slate-700 hover:border-purple-500/30 transition-all duration-300">
                  <CardContent className="p-6 text-center">
                    <div className="text-2xl font-bold text-purple-400 mb-1">
                      {analysis.totalFiles}
                    </div>
                    <div className="text-sm text-slate-400">Total Files</div>
                  </CardContent>
                </Card>
                <Card className="bg-background border-slate-700 hover:border-blue-500/30 transition-all duration-300">
                  <CardContent className="p-6 text-center">
                    <div className="text-2xl font-bold text-blue-400 mb-1">
                      {analysis.linesOfCode.toLocaleString()}
                    </div>
                    <div className="text-sm text-slate-400">Lines of Code</div>
                  </CardContent>
                </Card>
                <Card className="bg-background border-slate-700 hover:border-green-500/30 transition-all duration-300">
                  <CardContent className="p-6 text-center">
                    <div className="text-2xl font-bold text-green-400 mb-1">
                      {analysis.totalDependencies}
                    </div>
                    <div className="text-sm text-slate-400">Dependencies</div>
                  </CardContent>
                </Card>
                <Card className="bg-background border-slate-700 hover:border-orange-500/30 transition-all duration-300">
                  <CardContent className="p-6 text-center">
                    <div className="text-2xl font-bold text-orange-400 mb-1">
                      {Math.round(
                        (analysis.documentedFunctions /
                          analysis.totalFunctions) *
                          100
                      ) || 0}
                      %
                    </div>
                    <div className="text-sm text-slate-400">
                      Documented Functions
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* AI Summary Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-background border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center">
                      <Activity className="h-5 w-5 mr-2 text-purple-400" />
                      AI Analysis Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-300 leading-relaxed">
                      {analysis.aiSummary}
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-background border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center">
                      <Code2 className="h-5 w-5 mr-2 text-blue-400" />
                      Complexity Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-300 leading-relaxed">
                      {analysis.complexityAnalysis}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Issue Summary */}
              {detailedIssues.length > 0 && (
                <Card className="bg-background border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center">
                      <AlertTriangle className="h-5 w-5 mr-2 text-orange-400" />
                      Issue Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-500 mb-1">
                          {
                            detailedIssues.filter(
                              (i) => i.severity === "critical"
                            ).length
                          }
                        </div>
                        <div className="text-sm text-slate-400">Critical</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-400 mb-1">
                          {
                            detailedIssues.filter((i) => i.severity === "high")
                              .length
                          }
                        </div>
                        <div className="text-sm text-slate-400">High</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-400 mb-1">
                          {
                            detailedIssues.filter(
                              (i) => i.severity === "medium"
                            ).length
                          }
                        </div>
                        <div className="text-sm text-slate-400">Medium</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-400 mb-1">
                          {
                            detailedIssues.filter((i) => i.severity === "low")
                              .length
                          }
                        </div>
                        <div className="text-sm text-slate-400">Low</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="issues" className="space-y-6">
              <Card className="bg-background border-slate-700">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-white flex items-center">
                        <AlertTriangle className="h-5 w-5 mr-2 text-orange-400" />
                        Detailed Issues Analysis ({filteredIssues.length})
                      </CardTitle>
                      <CardDescription className="text-slate-400">
                        Comprehensive breakdown of issues with specific
                        locations and actionable solutions
                      </CardDescription>
                    </div>

                    {/* Issue Filters */}
                    <div className="flex items-center space-x-2">
                      <select
                        value={issueFilter}
                        onChange={(e) => setIssueFilter(e.target.value)}
                        className="bg-slate-700 border border-slate-600 text-white rounded-md px-3 py-1 text-sm"
                      >
                        <option value="all">All Issues</option>
                        <option value="critical">Critical</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                        <option value="security">Security</option>
                        <option value="performance">Performance</option>
                        <option value="code-quality">Code Quality</option>
                        <option value="documentation">Documentation</option>
                      </select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {filteredIssues.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-white mb-2">
                        {issueFilter === "all"
                          ? "No Issues Found!"
                          : `No ${issueFilter} issues found!`}
                      </h3>
                      <p className="text-slate-400">
                        {issueFilter === "all"
                          ? "Your codebase looks clean and well-maintained."
                          : "Try adjusting the filter to see other issues."}
                      </p>
                    </div>
                  ) : (
                    <Accordion type="multiple" className="space-y-4">
                      {filteredIssues.map((issue, index) => (
                        <AccordionItem
                          key={issue.id}
                          value={issue.id}
                          className="border border-slate-700 rounded-lg bg-slate-900/30 hover:bg-slate-900/50 transition-all duration-200"
                        >
                          <AccordionTrigger className="px-4 py-3 hover:no-underline">
                            <div className="flex items-center justify-between w-full">
                              <div className="flex items-center space-x-3">
                                <div
                                  className={`p-2 rounded-full ${getSeverityColor(
                                    issue.severity
                                  )}`}
                                >
                                  {getCategoryIcon(issue.category)}
                                </div>
                                <div className="text-left">
                                  <h4 className="font-semibold text-white">
                                    {issue.title}
                                  </h4>
                                  <div className="flex items-center space-x-2 mt-1">
                                    <Badge
                                      className={getSeverityColor(
                                        issue.severity
                                      )}
                                    >
                                      {issue.severity.toUpperCase()}
                                    </Badge>
                                    <Badge
                                      variant="outline"
                                      className="border-slate-600 text-slate-400"
                                    >
                                      {issue.category
                                        .replace("-", " ")
                                        .toUpperCase()}
                                    </Badge>
                                    <Badge
                                      variant="outline"
                                      className={`border-slate-600 ${getEffortColor(
                                        issue.effort
                                      )}`}
                                    >
                                      {issue.effort.toUpperCase()} EFFORT
                                    </Badge>
                                    {issue.file && (
                                      <div className="flex items-center text-sm text-slate-400">
                                        <MapPin className="h-3 w-3 mr-1" />
                                        {issue.file}
                                        {issue.line && `:${issue.line}`}
                                        {issue.column && `:${issue.column}`}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-4 pb-4">
                            <div className="space-y-4">
                              <div>
                                <h5 className="font-medium text-white mb-2 flex items-center">
                                  <Info className="h-4 w-4 mr-2 text-blue-400" />
                                  Description
                                </h5>
                                <p className="text-slate-300 bg-background p-3 rounded-lg">
                                  {issue.description}
                                </p>
                              </div>

                              <div>
                                <h5 className="font-medium text-white mb-2 flex items-center">
                                  <AlertTriangle className="h-4 w-4 mr-2 text-orange-400" />
                                  Impact
                                </h5>
                                <p className="text-slate-300 bg-orange-500/10 border border-orange-500/20 p-3 rounded-lg">
                                  {issue.impact}
                                </p>
                              </div>

                              <div>
                                <h5 className="font-medium text-white mb-2 flex items-center">
                                  <Lightbulb className="h-4 w-4 mr-2 text-yellow-400" />
                                  Suggested Solution
                                </h5>
                                <p className="text-slate-300 bg-green-500/10 border border-green-500/20 p-3 rounded-lg">
                                  {issue.suggestion}
                                </p>
                              </div>

                              {issue.tags.length > 0 && (
                                <div>
                                  <h5 className="font-medium text-white mb-2">
                                    Tags
                                  </h5>
                                  <div className="flex flex-wrap gap-2">
                                    {issue.tags.map((tag, i) => (
                                      <Badge
                                        key={i}
                                        variant="outline"
                                        className="border-slate-600 text-slate-400 text-xs"
                                      >
                                        {tag}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {issue.file && (
                                <div>
                                  <h5 className="font-medium text-white mb-2 flex items-center">
                                    <FileText className="h-4 w-4 mr-2 text-purple-400" />
                                    File Location
                                  </h5>
                                  <div className="bg-background p-3 rounded-lg">
                                    <div className="flex items-center justify-between">
                                      <code className="text-purple-300">
                                        {issue.file}
                                      </code>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                          setActiveTab("files");
                                          setSelectedFile(issue.file ?? null);
                                        }}
                                        className="text-purple-400 hover:text-purple-300"
                                      >
                                        <Eye className="h-3 w-3 mr-1" />
                                        View File
                                      </Button>
                                    </div>
                                    {(issue.line || issue.column) && (
                                      <p className="text-sm text-slate-400 mt-1">
                                        {issue.line && `Line ${issue.line}`}
                                        {issue.line && issue.column && ", "}
                                        {issue.column &&
                                          `Column ${issue.column}`}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="recommendations" className="space-y-6">
              <Card className="bg-background border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Target className="h-5 w-5 mr-2 text-green-400" />
                    Improvement Recommendations
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Actionable suggestions to enhance your codebase quality and
                    maintainability
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 p-6 rounded-lg">
                      <h4 className="font-semibold text-blue-300 mb-3 flex items-center">
                        <Target className="h-5 w-5 mr-2" />
                        Strategic Improvement Plan
                      </h4>
                      <p className="text-slate-300 leading-relaxed">
                        {analysis.improvementPlan}
                      </p>
                    </div>

                    <Accordion type="multiple" className="space-y-3">
                      {JSON.parse(analysis.recommendations || "[]").map(
                        (rec: string, index: number) => {
                          // Categorize recommendations
                          const recLower = rec.toLowerCase();
                          let category = "general";
                          let icon = (
                            <Lightbulb className="h-4 w-4 text-yellow-400" />
                          );
                          let priority = "medium";

                          if (
                            recLower.includes("test") ||
                            recLower.includes("coverage")
                          ) {
                            category = "testing";
                            icon = (
                              <TestTube className="h-4 w-4 text-teal-400" />
                            );
                            priority = "high";
                          } else if (
                            recLower.includes("security") ||
                            recLower.includes("vulnerability")
                          ) {
                            category = "security";
                            icon = <Shield className="h-4 w-4 text-red-400" />;
                            priority = "critical";
                          } else if (
                            recLower.includes("documentation") ||
                            recLower.includes("comment")
                          ) {
                            category = "documentation";
                            icon = (
                              <BookOpen className="h-4 w-4 text-blue-400" />
                            );
                            priority = "medium";
                          } else if (
                            recLower.includes("dependency") ||
                            recLower.includes("package")
                          ) {
                            category = "dependencies";
                            icon = (
                              <Package className="h-4 w-4 text-orange-400" />
                            );
                            priority = "medium";
                          } else if (
                            recLower.includes("performance") ||
                            recLower.includes("optimization")
                          ) {
                            category = "performance";
                            icon = <Zap className="h-4 w-4 text-purple-400" />;
                            priority = "high";
                          }

                          return (
                            <AccordionItem
                              key={index}
                              value={`rec-${index}`}
                              className="border border-slate-700 rounded-lg bg-slate-900/30 hover:bg-slate-900/50 transition-all duration-200"
                            >
                              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                                <div className="flex items-center justify-between w-full">
                                  <div className="flex items-center space-x-3">
                                    <div className="p-2 bg-green-500/20 rounded-full">
                                      {icon}
                                    </div>
                                    <div className="text-left">
                                      <span className="font-medium text-white">
                                        {rec.split(".")[0] ||
                                          rec.substring(0, 60)}
                                        ...
                                      </span>
                                      <div className="flex items-center space-x-2 mt-1">
                                        <Badge
                                          className={getSeverityColor(priority)}
                                        >
                                          {priority.toUpperCase()}
                                        </Badge>
                                        <Badge
                                          variant="outline"
                                          className="border-slate-600 text-slate-400"
                                        >
                                          {category.toUpperCase()}
                                        </Badge>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="px-4 pb-4">
                                <div className="space-y-3">
                                  <p className="text-slate-300 leading-relaxed bg-background p-3 rounded-lg">
                                    {rec}
                                  </p>

                                  {/* Add implementation tips based on category */}
                                  <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg">
                                    <h6 className="font-medium text-blue-300 mb-2">
                                      Implementation Tips:
                                    </h6>
                                    <ul className="text-sm text-slate-300 space-y-1">
                                      {category === "testing" && (
                                        <>
                                          <li>
                                            • Start with unit tests for critical
                                            business logic
                                          </li>
                                          <li>
                                            • Use Jest or Vitest for
                                            JavaScript/TypeScript projects
                                          </li>
                                          <li>
                                            • Aim for at least 80% code coverage
                                          </li>
                                        </>
                                      )}
                                      {category === "security" && (
                                        <>
                                          <li>
                                            • Run security audits regularly (npm
                                            audit, Snyk)
                                          </li>
                                          <li>• Keep dependencies updated</li>
                                          <li>
                                            • Implement proper input validation
                                          </li>
                                        </>
                                      )}
                                      {category === "documentation" && (
                                        <>
                                          <li>
                                            • Use JSDoc for function
                                            documentation
                                          </li>
                                          <li>
                                            • Create comprehensive README with
                                            examples
                                          </li>
                                          <li>
                                            • Document API endpoints and data
                                            models
                                          </li>
                                        </>
                                      )}
                                      {category === "dependencies" && (
                                        <>
                                          <li>
                                            • Use tools like Dependabot for
                                            automated updates
                                          </li>
                                          <li>
                                            • Review changelogs before updating
                                          </li>
                                          <li>• Consider bundle size impact</li>
                                        </>
                                      )}
                                      {category === "performance" && (
                                        <>
                                          <li>
                                            • Profile your application to
                                            identify bottlenecks
                                          </li>
                                          <li>
                                            • Implement lazy loading where
                                            appropriate
                                          </li>
                                          <li>
                                            • Optimize database queries and API
                                            calls
                                          </li>
                                        </>
                                      )}
                                      {category === "general" && (
                                        <>
                                          <li>
                                            • Break down large tasks into
                                            smaller steps
                                          </li>
                                          <li>
                                            • Prioritize based on impact and
                                            effort
                                          </li>
                                          <li>
                                            • Consider team capacity and
                                            deadlines
                                          </li>
                                        </>
                                      )}
                                    </ul>
                                  </div>
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          );
                        }
                      )}
                    </Accordion>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="files" className="space-y-6">
              <Card className="bg-background border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <FileText className="h-5 w-5 mr-2 text-purple-400" />
                    Code Files ({files.length})
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Detailed analysis of your codebase files with syntax
                    highlighting
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {files.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                      <p className="text-slate-400">
                        No code files found or still loading...
                      </p>
                      <Button
                        onClick={fetchFiles}
                        className="mt-4 bg-purple-600 hover:bg-purple-700"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh Files
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {files.map((file, index) => (
                        <Card
                          key={index}
                          className={`bg-slate-900/50 border-slate-600 transition-all duration-200 ${
                            selectedFile === file.path
                              ? "border-purple-500 shadow-lg shadow-purple-500/20"
                              : "hover:border-slate-500"
                          }`}
                        >
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-lg text-white flex items-center">
                                <FileText className="h-4 w-4 mr-2 text-purple-400" />
                                {file.path}
                              </CardTitle>
                              <div className="flex items-center space-x-2">
                                <Badge
                                  variant="outline"
                                  className="border-slate-600 text-slate-400"
                                >
                                  {file.language}
                                </Badge>
                                <Badge
                                  variant="outline"
                                  className="border-slate-600 text-slate-400"
                                >
                                  {(file.size / 1024).toFixed(1)}KB
                                </Badge>
                                <Badge
                                  variant="outline"
                                  className={`border-slate-600 ${getHealthColor(
                                    file.maintainability
                                  )}`}
                                >
                                  {file.maintainability}% Quality
                                </Badge>
                              </div>
                            </div>

                            {/* File Metrics */}
                            <div className="grid grid-cols-3 gap-4 mt-3">
                              <div className="text-center">
                                <div className="text-sm font-medium text-slate-400">
                                  Complexity
                                </div>
                                <div
                                  className={`text-lg font-bold ${getHealthColor(
                                    100 - file.complexity * 10
                                  )}`}
                                >
                                  {file.complexity}/10
                                </div>
                              </div>
                              <div className="text-center">
                                <div className="text-sm font-medium text-slate-400">
                                  Maintainability
                                </div>
                                <div
                                  className={`text-lg font-bold ${getHealthColor(
                                    file.maintainability
                                  )}`}
                                >
                                  {file.maintainability}%
                                </div>
                              </div>
                              <div className="text-center">
                                <div className="text-sm font-medium text-slate-400">
                                  Readability
                                </div>
                                <div
                                  className={`text-lg font-bold ${getHealthColor(
                                    file.readability
                                  )}`}
                                >
                                  {file.readability}%
                                </div>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="max-h-[400px] overflow-auto">
                              <SyntaxHighlighter
                                code={file.content}
                                language={file.language}
                                showLineNumbers={true}
                              />
                            </div>

                            {(file.issues.length > 0 ||
                              file.strengths.length > 0) && (
                              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                {file.issues.length > 0 && (
                                  <div>
                                    <h5 className="font-medium text-red-400 mb-2 flex items-center">
                                      <AlertTriangle className="h-4 w-4 mr-2" />
                                      Issues ({file.issues.length})
                                    </h5>
                                    <ul className="space-y-2">
                                      {file.issues.map((issue, i) => (
                                        <li
                                          key={i}
                                          className="text-sm text-red-300 flex items-start bg-red-500/10 p-2 rounded"
                                        >
                                          <AlertTriangle className="h-3 w-3 mr-2 mt-0.5 flex-shrink-0" />
                                          {issue}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {file.strengths.length > 0 && (
                                  <div>
                                    <h5 className="font-medium text-green-400 mb-2 flex items-center">
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      Strengths ({file.strengths.length})
                                    </h5>
                                    <ul className="space-y-2">
                                      {file.strengths.map((strength, i) => (
                                        <li
                                          key={i}
                                          className="text-sm text-green-300 flex items-start bg-green-500/10 p-2 rounded"
                                        >
                                          <CheckCircle className="h-3 w-3 mr-2 mt-0.5 flex-shrink-0" />
                                          {strength}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="search" className="space-y-6">
              <Card className="bg-background border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Search className="h-5 w-5 mr-2 text-blue-400" />
                    AI-Powered Code Search
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Search through your codebase with natural language queries
                    and get detailed explanations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="flex space-x-2">
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Ask about your code... (e.g., 'How does authentication work?', 'Show me the main components')"
                        className="bg-slate-700/50 border-slate-600 text-white"
                        onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                      />
                      <Button
                        onClick={handleSearch}
                        disabled={isSearching || !searchQuery.trim()}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {isSearching ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Search className="h-4 w-4" />
                        )}
                      </Button>
                    </div>

                    {/* Search Suggestions */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[
                        "How does the main page.tsx file work?",
                        "Explain the authentication system",
                        "Show me the API routes structure",
                        "What are the main components?",
                        "How is data fetching handled?",
                        "Explain the database schema",
                      ].map((suggestion, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSearchQuery(suggestion);
                            handleSearch();
                          }}
                          className="border-slate-600 text-slate-300 hover:bg-slate-700 text-left justify-start"
                        >
                          {suggestion}
                        </Button>
                      ))}
                    </div>

                    {searchResults && (
                      <Card className="bg-slate-900/50 border-slate-600">
                        <CardHeader>
                          <CardTitle className="text-white text-lg">
                            Search Results
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="prose prose-invert max-w-none">
                            <SyntaxHighlighter
                              code={searchResults}
                              language="markdown"
                              showLineNumbers={false}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="voice" className="space-y-6">
              <VoiceChat
                projectId={params.id as string}
                isPremium={
                  subscriptionStatus?.isPremium ||
                  subscriptionStatus?.isAdmin ||
                  false
                }
                files={files}
                analysis={analysis}
                project={project}
              />
            </TabsContent>

            <TabsContent value="chat" className="space-y-6">
              <Card className="bg-background border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <MessageSquare className="h-5 w-5 mr-2 text-purple-400" />
                    Chat with Your Code
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Have an interactive conversation about your codebase with AI
                    assistance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Chat Messages */}
                    <div className="h-96 overflow-y-auto space-y-4 p-4 bg-slate-900/30 rounded-lg border border-slate-700">
                      {chatMessages.length === 0 ? (
                        <div className="text-center text-slate-400 py-8">
                          <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <h3 className="text-lg font-medium text-white mb-2">
                            Start a conversation!
                          </h3>
                          <p className="mb-4">
                            Ask me anything about your codebase and I'll help
                            you understand it better.
                          </p>
                          <div className="grid grid-cols-1 gap-2 max-w-md mx-auto text-sm">
                            <p className="text-purple-300">
                              💡 "Explain the main components"
                            </p>
                            <p className="text-blue-300">
                              🔒 "How can I improve security?"
                            </p>
                            <p className="text-green-300">
                              📚 "What needs better documentation?"
                            </p>
                            <p className="text-orange-300">
                              ⚡ "How to optimize performance?"
                            </p>
                          </div>
                        </div>
                      ) : (
                        chatMessages.map((message, index) => (
                          <div
                            key={index}
                            className={`flex ${
                              message.role === "user"
                                ? "justify-end"
                                : "justify-start"
                            }`}
                          >
                            <div
                              className={`max-w-[80%] p-4 rounded-lg ${
                                message.role === "user"
                                  ? "bg-purple-600 text-white"
                                  : "bg-slate-700 text-slate-100 border border-slate-600"
                              }`}
                            >
                              <div className="prose prose-invert prose-sm max-w-none">
                                {message.role === "assistant" ? (
                                  <SyntaxHighlighter
                                    code={message.content}
                                    language="markdown"
                                    showLineNumbers={false}
                                  />
                                ) : (
                                  <p className="mb-0">{message.content}</p>
                                )}
                              </div>
                              <div className="text-xs opacity-70 mt-2 flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                {message.timestamp.toLocaleTimeString()}
                              </div>
                            </div>
                          </div>
                        ))
                      )}

                      {isChatting && (
                        <div className="flex justify-start">
                          <div className="bg-slate-700 text-slate-100 p-4 rounded-lg border border-slate-600">
                            <div className="flex items-center space-x-2">
                              <RefreshCw className="h-4 w-4 animate-spin text-purple-400" />
                              <span>AI is analyzing your code...</span>
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>

                    {/* Chat Input */}
                    <div className="flex space-x-2">
                      <Textarea
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Ask me anything about your code... (e.g., 'How does the authentication system work?')"
                        className="bg-slate-700/50 border-slate-600 text-white resize-none"
                        rows={2}
                        onKeyPress={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleChat();
                          }
                        }}
                      />
                      <Button
                        onClick={handleChat}
                        disabled={isChatting || !chatInput.trim()}
                        className="bg-purple-600 hover:bg-purple-700 self-end"
                      >
                        {isChatting ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : (
          <Card className="bg-background border-slate-700">
            <CardContent className="p-12 text-center">
              <Activity className="h-16 w-16 text-slate-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                No Analysis Available
              </h3>
              <p className="text-slate-400 mb-6">
                This project hasn't been analyzed yet. Start an analysis to see
                detailed insights.
              </p>
              <Button className="bg-purple-600 hover:bg-purple-700">
                Start Analysis
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
