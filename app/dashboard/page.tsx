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
import {
  Plus,
  Github,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Activity,
  Calendar,
  ExternalLink,
  Eye,
  Clock,
  Zap,
  Shield,
  Crown,
} from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/header";
import { CreateProjectDialog } from "@/components/dashboard/create-project-dialog";
import { toast } from "sonner";
import Link from "next/link";

interface Project {
  id: string;
  name: string;
  description: string;
  repoUrl: string;
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
  status: string;
  createdAt: string;
}

interface SubscriptionStatus {
  isActive: boolean;
  isPremium: boolean;
  plan: "free" | "premium" | "admin";
  projectsUsed: number;
  projectsLimit: number;
  isAdmin: boolean;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [subscriptionStatus, setSubscriptionStatus] =
    useState<SubscriptionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }

    if (status === "authenticated") {
      fetchProjects();
      fetchSubscriptionStatus();
    }
  }, [status, router]);

  useEffect(() => {
    if (projects.length > 0) {
      const ctx = gsap.context(() => {
        gsap.fromTo(
          ".project-card",
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: "power3.out" }
        );
      }, gridRef);

      return () => ctx.revert();
    }
  }, [projects]);

  const fetchProjects = async () => {
    try {
      const response = await fetch("/api/projects");
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects);
      }
    } catch (error) {
      toast.error("Failed to fetch projects");
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

  const handleProjectCreated = () => {
    fetchProjects();
    fetchSubscriptionStatus();
    setIsCreateDialogOpen(false);
  };

  const handleAnalyzeProject = async (projectId: string) => {
    try {
      toast.loading("Starting analysis...", { id: "analysis" });

      const response = await fetch(`/api/projects/${projectId}/analyze`, {
        method: "POST",
      });

      if (response.ok) {
        toast.success("Analysis started! Check back in a few minutes.", {
          id: "analysis",
        });
        // Refresh projects to show analyzing status
        setTimeout(fetchProjects, 1000);
      } else {
        const data = await response.json();
        toast.error(data.error || "Analysis failed", { id: "analysis" });
      }
    } catch (error) {
      toast.error("Analysis failed", { id: "analysis" });
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-success/20 text-success border-success/30">
            Completed
          </Badge>
        );
      case "analyzing":
        return (
          <Badge className="bg-info/20 text-info border-info/30">
            Analyzing...
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-error/20 text-error border-error/30">
            Failed
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">
            Pending
          </Badge>
        );
    }
  };

  const getPlanIcon = () => {
    if (subscriptionStatus?.isAdmin)
      return <Shield className="h-6 w-6 text-purple-400" />;
    if (subscriptionStatus?.isPremium)
      return <Crown className="h-6 w-6 text-purple-400" />;
    return <Zap className="h-6 w-6 text-purple-400" />;
  };

  const getPlanColor = () => {
    if (subscriptionStatus?.isAdmin)
      return "bg-purple-500/20 text-purple-400 border-purple-500/30";
    if (subscriptionStatus?.isPremium)
      return "bg-purple-500/20 text-purple-400 border-purple-500/30";
    return "bg-purple-500/20 text-purple-400 border-purple-500/30";
  };

  const getPlanDescription = () => {
    if (subscriptionStatus?.isAdmin)
      return "Full platform access with unlimited features";
    if (subscriptionStatus?.isPremium)
      return "Premium features with unlimited repositories";
    return "Free plan with limited features";
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-dark-gradient flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-gradient">
      <DashboardHeader />

      <main className="container mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Welcome back, {session?.user?.name || "Developer"}! 👋
          </h1>
          <p className="text-gray-300 text-lg">
            Monitor and improve your codebase health with AI-powered insights.
          </p>
        </div>

        {/* Subscription Status */}
        {subscriptionStatus && (
          <Card className="bg-card-dark border-purple-accent mb-8">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-purple-accent rounded-full">
                    {getPlanIcon()}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {subscriptionStatus.plan.toUpperCase()} Plan
                    </h3>
                    <p className="text-gray-400">{getPlanDescription()}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-sm text-gray-400">Projects Used</p>
                    <p className="text-2xl font-bold text-white">
                      {subscriptionStatus.projectsUsed}
                      {!subscriptionStatus.isAdmin &&
                        `/${subscriptionStatus.projectsLimit}`}
                    </p>
                  </div>
                  {!subscriptionStatus.isAdmin && (
                    <Progress
                      value={
                        (subscriptionStatus.projectsUsed /
                          subscriptionStatus.projectsLimit) *
                        100
                      }
                      className="w-32"
                    />
                  )}
                </div>
              </div>

              {!subscriptionStatus.isAdmin &&
                subscriptionStatus.projectsUsed >=
                  subscriptionStatus.projectsLimit && (
                  <div className="mt-4 p-3 bg-warning/10 border border-warning/20 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="h-4 w-4 text-warning" />
                        <p className="text-sm text-warning">
                          Project limit reached. You can add more repositories
                          by upgrading to Premium.
                        </p>
                      </div>
                      <Link href="/billing">
                        <Button
                          size="sm"
                          className="bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-700 hover:to-purple-900"
                        >
                          <Crown className="h-4 w-4 mr-2" />
                          Upgrade
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}
            </CardContent>
          </Card>
        )}

        {/* Quick Stats */}
        {projects.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="bg-card-dark border-purple-accent">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Total Projects</p>
                    <p className="text-3xl font-bold text-white">
                      {projects.length}
                    </p>
                  </div>
                  <Github className="h-8 w-8 text-purple-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card-dark border-purple-accent">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Avg Health Score</p>
                    <p className="text-3xl font-bold text-success">
                      {Math.round(
                        projects.reduce((acc, project) => {
                          const latestAnalysis = project.analyses[0];
                          return (
                            acc + (latestAnalysis?.overallHealthScore || 0)
                          );
                        }, 0) / projects.length
                      )}
                      %
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-success" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card-dark border-purple-accent">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Issues Found</p>
                    <p className="text-3xl font-bold text-warning">
                      {projects.reduce((acc, project) => {
                        const latestAnalysis = project.analyses[0];
                        const issues = latestAnalysis
                          ? JSON.parse(latestAnalysis.issues || "[]")
                          : [];
                        return acc + issues.length;
                      }, 0)}
                    </p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-warning" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card-dark border-purple-accent">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Analyzed</p>
                    <p className="text-3xl font-bold text-purple-300">
                      {
                        projects.filter(
                          (p) =>
                            p.analyses.length > 0 &&
                            p.analyses[0].status === "completed"
                        ).length
                      }
                    </p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-purple-300" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Projects Section */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Your Projects</h2>
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            disabled={
              !!(
                subscriptionStatus &&
                !subscriptionStatus.isAdmin &&
                subscriptionStatus.projectsUsed >=
                  subscriptionStatus.projectsLimit
              )
            }
            className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Project
            {subscriptionStatus &&
              !subscriptionStatus.isAdmin &&
              subscriptionStatus.projectsUsed >=
                subscriptionStatus.projectsLimit && (
                <span className="ml-2 text-xs">(Limit Reached)</span>
              )}
          </Button>
        </div>

        {projects.length === 0 ? (
          <Card className="bg-card-dark border-purple-accent">
            <CardContent className="p-12 text-center">
              <Github className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                No projects yet
              </h3>
              <p className="text-gray-400 mb-6 max-w-md mx-auto">
                Start monitoring your first repository by adding a project.
                We'll analyze your code and provide actionable insights.
              </p>
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Project
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div
            ref={gridRef}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {projects.map((project) => {
              const latestAnalysis = project.analyses[0];
              const hasAnalysis = !!latestAnalysis;

              return (
                <Card
                  key={project.id}
                  className="project-card group bg-card-dark border-purple-accent hover:bg-card-dark-hover transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/20"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg text-white group-hover:text-purple-300 transition-colors">
                          {project.name}
                        </CardTitle>
                        <CardDescription className="text-gray-400">
                          {project.description || "No description"}
                        </CardDescription>
                      </div>
                      {hasAnalysis && latestAnalysis.status === "completed" && (
                        <Badge
                          className={getHealthBadgeColor(
                            latestAnalysis.overallHealthScore
                          )}
                        >
                          {latestAnalysis.overallHealthScore}%
                        </Badge>
                      )}
                      {hasAnalysis &&
                        latestAnalysis.status !== "completed" &&
                        getStatusBadge(latestAnalysis.status)}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="flex items-center text-sm text-gray-400">
                      <Github className="h-4 w-4 mr-2" />
                      <a
                        href={project.repoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-purple-300 transition-colors flex items-center truncate"
                      >
                        {project.repoUrl.replace("https://github.com/", "")}
                        <ExternalLink className="h-3 w-3 ml-1 flex-shrink-0" />
                      </a>
                    </div>

                    {hasAnalysis && latestAnalysis.status === "completed" ? (
                      <>
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-400">
                                Documentation
                              </span>
                              <span
                                className={getHealthColor(
                                  latestAnalysis.documentationScore
                                )}
                              >
                                {latestAnalysis.documentationScore}%
                              </span>
                            </div>
                            <Progress
                              value={latestAnalysis.documentationScore}
                              className="h-2"
                            />
                          </div>

                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-400">
                                Code Quality
                              </span>
                              <span
                                className={getHealthColor(
                                  latestAnalysis.codeQualityScore
                                )}
                              >
                                {latestAnalysis.codeQualityScore}%
                              </span>
                            </div>
                            <Progress
                              value={latestAnalysis.codeQualityScore}
                              className="h-2"
                            />
                          </div>

                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-400">Security</span>
                              <span
                                className={getHealthColor(
                                  latestAnalysis.securityScore
                                )}
                              >
                                {latestAnalysis.securityScore}%
                              </span>
                            </div>
                            <Progress
                              value={latestAnalysis.securityScore}
                              className="h-2"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-purple-accent">
                          <div className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {new Date(
                              latestAnalysis.createdAt
                            ).toLocaleDateString()}
                          </div>
                          <div className="flex space-x-2">
                            <Link href={`/projects/${project.id}`}>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                View
                              </Button>
                            </Link>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleAnalyzeProject(project.id)}
                              className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                            >
                              <Activity className="h-3 w-3 mr-1" />
                              Re-analyze
                            </Button>
                          </div>
                        </div>
                      </>
                    ) : hasAnalysis && latestAnalysis.status === "analyzing" ? (
                      <div className="text-center py-6">
                        <Activity className="h-8 w-8 text-info mx-auto mb-2 animate-pulse" />
                        <p className="text-info text-sm mb-3">
                          Analyzing repository...
                        </p>
                        <Link href={`/projects/${project.id}`}>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-gray-600 text-gray-300 hover:bg-card-dark"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View Progress
                          </Button>
                        </Link>
                      </div>
                    ) : hasAnalysis && latestAnalysis.status === "failed" ? (
                      <div className="text-center py-6">
                        <AlertTriangle className="h-8 w-8 text-error mx-auto mb-2" />
                        <p className="text-error text-sm mb-3">
                          Analysis failed
                        </p>
                        <div className="flex space-x-2 justify-center">
                          <Link href={`/projects/${project.id}`}>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-gray-600 text-gray-300 hover:bg-card-dark"
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </Button>
                          </Link>
                          <Button
                            size="sm"
                            onClick={() => handleAnalyzeProject(project.id)}
                            className="bg-purple-600 hover:bg-purple-700"
                          >
                            Retry
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <Activity className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-400 text-sm mb-3">
                          Not analyzed yet
                        </p>
                        <Button
                          size="sm"
                          onClick={() => handleAnalyzeProject(project.id)}
                          className="bg-purple-600 hover:bg-purple-700"
                        >
                          Start Analysis
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      <CreateProjectDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onProjectCreated={handleProjectCreated}
        dailyUsage={subscriptionStatus?.projectsUsed || 0}
      />
    </div>
  );
}
