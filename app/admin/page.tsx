"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { gsap } from "gsap";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  FolderGit2,
  Activity,
  Crown,
  TrendingUp,
  Calendar,
  BarChart3,
  Shield,
  RefreshCw,
  Download,
  Eye,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  DollarSign,
  CreditCard,
  Target,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
  PieChart,
  LineChart,
} from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/header";
import { toast } from "sonner";
import Link from "next/link";

interface AdminAnalytics {
  overview: {
    totalUsers: number;
    totalProjects: number;
    totalAnalyses: number;
    premiumUsers: number;
    freeUsers: number;
    conversionRate: number;
  };
  today: {
    newUsers: number;
    newProjects: number;
    newAnalyses: number;
  };
  recentActivity: Array<{
    id: string;
    name: string;
    repoUrl: string;
    createdAt: string;
    user: {
      email: string;
      name: string | null;
    };
    analyses: Array<{
      overallHealthScore: number;
      status: string;
    }>;
  }>;
}

interface RevenueAnalytics {
  overview: {
    totalRevenue: number;
    monthlyRecurringRevenue: number;
    averageRevenuePerUser: number;
    churnRate: number;
    lifetimeValue: number;
    conversionRate: number;
    revenueGrowth: number;
    activeSubscriptions: number;
    cancelledSubscriptions: number;
    refunds: number;
  };
  monthlyRevenue: Array<{
    month: string;
    revenue: number;
    subscriptions: number;
    churn: number;
  }>;
  revenueBySource: Array<{
    source: string;
    amount: number;
    percentage: number;
  }>;
  subscriptionMetrics: {
    newSubscriptions: number;
    cancelledSubscriptions: number;
    upgrades: number;
    downgrades: number;
    netGrowth: number;
  };
  cohortAnalysis: Array<{
    cohort: string;
    month0: number;
    month1: number;
    month2: number;
    month3: number;
    month6: number;
    month12: number;
  }>;
}

interface GrowthData {
  date: string;
  free: number;
  premium: number;
  total: number;
}

interface ProjectAnalytics {
  languages: Array<{ language: string; count: number }>;
  healthScores: Array<{ range: string; count: number }>;
  analysisStatus: Array<{ status: string; count: number }>;
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [revenueAnalytics, setRevenueAnalytics] =
    useState<RevenueAnalytics | null>(null);
  const [growthData, setGrowthData] = useState<GrowthData[]>([]);
  const [projectAnalytics, setProjectAnalytics] =
    useState<ProjectAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }

    if (status === "authenticated") {
      // Check if user is admin
      if (session?.user?.email !== "admin@quantacode.com") {
        router.push("/dashboard");
        toast.error("Access denied. Admin privileges required.");
        return;
      }

      fetchAllAnalytics();
    }
  }, [status, session, router]);

  useEffect(() => {
    if (analytics && revenueAnalytics) {
      const ctx = gsap.context(() => {
        gsap.fromTo(
          ".admin-card",
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: "power3.out" }
        );
      }, pageRef);

      return () => ctx.revert();
    }
  }, [analytics, revenueAnalytics]);

  const fetchAllAnalytics = async () => {
    try {
      const [analyticsRes, revenueRes, growthRes, projectRes] =
        await Promise.all([
          fetch("/api/admin/analytics"),
          fetch("/api/admin/revenue"),
          fetch("/api/admin/growth"),
          fetch("/api/admin/projects"),
        ]);

      if (analyticsRes.ok) {
        const data = await analyticsRes.json();
        setAnalytics(data);
      }

      if (revenueRes.ok) {
        const data = await revenueRes.json();
        setRevenueAnalytics(data);
      }

      if (growthRes.ok) {
        const data = await growthRes.json();
        setGrowthData(data);
      }

      if (projectRes.ok) {
        const data = await projectRes.json();
        setProjectAnalytics(data);
      }
    } catch (error) {
      toast.error("Failed to fetch analytics data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchAllAnalytics();
    setIsRefreshing(false);
    toast.success("Analytics data refreshed");
  };

  const exportData = async () => {
    try {
      const response = await fetch("/api/admin/export");
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `QuantaCode-analytics-${
          new Date().toISOString().split("T")[0]
        }.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success("Analytics data exported");
      }
    } catch (error) {
      toast.error("Failed to export data");
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-success";
      case "analyzing":
        return "text-info";
      case "failed":
        return "text-error";
      default:
        return "text-gray-400";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4" />;
      case "analyzing":
        return <Clock className="h-4 w-4" />;
      case "failed":
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
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

      <main ref={pageRef} className="container mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 flex items-center">
              <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-purple-400 mr-3" />
              Admin Analytics
            </h1>
            <p className="text-gray-300 text-base sm:text-lg">
              Comprehensive platform insights, revenue analytics, and business
              intelligence
            </p>
          </div>

          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
            <Button
              onClick={handleRefresh}
              disabled={isRefreshing}
              variant="outline"
              size="sm"
              className="border-gray-600 text-gray-300 hover:bg-card-dark"
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            <Button
              onClick={exportData}
              size="sm"
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {analytics && revenueAnalytics && (
          <Tabs defaultValue="revenue" className="space-y-6">
            {/* Mobile-Responsive Tab Navigation */}

            <TabsList className="grid w-full grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 bg-black/50 border border-purple-accent h-full p-2">
              <TabsTrigger
                value="revenue"
                className="data-[state=active]:bg-purple-600 flex flex-col items-center justify-center p-2 text-center"
              >
                <DollarSign className="h-5 w-5 sm:h-6 sm:w-6" />
                <span className="text-xs sm:text-sm mt-1">Revenue</span>
              </TabsTrigger>
              <TabsTrigger
                value="overview"
                className="data-[state=active]:bg-purple-600 flex flex-col items-center justify-center p-2 text-center"
              >
                <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6" />
                <span className="text-xs sm:text-sm mt-1">Overview</span>
              </TabsTrigger>
              <TabsTrigger
                value="users"
                className="data-[state=active]:bg-purple-600 flex flex-col items-center justify-center p-2 text-center"
              >
                <Users className="h-5 w-5 sm:h-6 sm:w-6" />
                <span className="text-xs sm:text-sm mt-1">Users</span>
              </TabsTrigger>
              <TabsTrigger
                value="projects"
                className="data-[state=active]:bg-purple-600 flex flex-col items-center justify-center p-2 text-center"
              >
                <FolderGit2 className="h-5 w-5 sm:h-6 sm:w-6" />
                <span className="text-xs sm:text-sm mt-1">Projects</span>
              </TabsTrigger>
              <TabsTrigger
                value="activity"
                className="data-[state=active]:bg-purple-600 flex flex-col items-center justify-center p-2 text-center"
              >
                <Activity className="h-5 w-5 sm:h-6 sm:w-6" />
                <span className="text-xs sm:text-sm mt-1">Activity</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="revenue" className="space-y-6">
              {/* Revenue Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <Card className="admin-card bg-card-dark border-purple-accent">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-xs sm:text-sm">
                          Total Revenue
                        </p>
                        <p className="text-xl sm:text-3xl font-bold text-white">
                          {formatCurrency(
                            revenueAnalytics.overview.totalRevenue
                          )}
                        </p>
                        <div className="flex items-center mt-1">
                          {revenueAnalytics.overview.revenueGrowth >= 0 ? (
                            <ArrowUpRight className="h-3 w-3 sm:h-4 sm:w-4 text-success mr-1" />
                          ) : (
                            <ArrowDownRight className="h-3 w-3 sm:h-4 sm:w-4 text-error mr-1" />
                          )}
                          <span
                            className={`text-xs sm:text-sm ${
                              revenueAnalytics.overview.revenueGrowth >= 0
                                ? "text-success"
                                : "text-error"
                            }`}
                          >
                            {formatPercentage(
                              revenueAnalytics.overview.revenueGrowth
                            )}{" "}
                            this month
                          </span>
                        </div>
                      </div>
                      <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 text-success" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="admin-card bg-card-dark border-purple-accent">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-xs sm:text-sm">
                          Monthly Recurring Revenue
                        </p>
                        <p className="text-xl sm:text-3xl font-bold text-white">
                          {formatCurrency(
                            revenueAnalytics.overview.monthlyRecurringRevenue
                          )}
                        </p>
                        <p className="text-info text-xs sm:text-sm">
                          {revenueAnalytics.overview.activeSubscriptions} active
                          subscriptions
                        </p>
                      </div>
                      <CreditCard className="h-6 w-6 sm:h-8 sm:w-8 text-info" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="admin-card bg-card-dark border-purple-accent">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-xs sm:text-sm">
                          Average Revenue Per User
                        </p>
                        <p className="text-xl sm:text-3xl font-bold text-white">
                          {formatCurrency(
                            revenueAnalytics.overview.averageRevenuePerUser
                          )}
                        </p>
                        <p className="text-purple-400 text-xs sm:text-sm">
                          LTV:{" "}
                          {formatCurrency(
                            revenueAnalytics.overview.lifetimeValue
                          )}
                        </p>
                      </div>
                      <Target className="h-6 w-6 sm:h-8 sm:w-8 text-purple-400" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="admin-card bg-card-dark border-purple-accent">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-xs sm:text-sm">
                          Churn Rate
                        </p>
                        <p className="text-xl sm:text-3xl font-bold text-white">
                          {revenueAnalytics.overview.churnRate.toFixed(1)}%
                        </p>
                        <p className="text-warning text-xs sm:text-sm">
                          {revenueAnalytics.overview.cancelledSubscriptions}{" "}
                          cancelled this month
                        </p>
                      </div>
                      <TrendingDown className="h-6 w-6 sm:h-8 sm:w-8 text-warning" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Monthly Revenue Chart */}
              <Card className="admin-card bg-card-dark border-purple-accent">
                <CardHeader>
                  <CardTitle className="text-white flex items-center text-lg sm:text-xl">
                    <LineChart className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-success" />
                    Monthly Revenue Trend
                  </CardTitle>
                  <CardDescription className="text-gray-400 text-sm">
                    Revenue, subscriptions, and churn over the last 12 months
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 sm:space-y-4">
                    {revenueAnalytics.monthlyRevenue.map((month, index) => (
                      <div
                        key={month.month}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-black/30 rounded-lg space-y-2 sm:space-y-0"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                          <span className="text-gray-300 font-medium text-sm sm:text-base sm:w-16">
                            {month.month}
                          </span>
                          <div className="flex flex-wrap items-center gap-3 sm:gap-6">
                            <div className="flex items-center space-x-2">
                              <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-success" />
                              <span className="text-white font-semibold text-sm sm:text-base">
                                {formatCurrency(month.revenue)}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Users className="h-3 w-3 sm:h-4 sm:w-4 text-info" />
                              <span className="text-info text-sm">
                                {month.subscriptions} subs
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-warning" />
                              <span className="text-warning text-sm">
                                {month.churn} churn
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="w-full sm:w-32">
                          <Progress
                            value={Math.min(
                              100,
                              (month.revenue /
                                Math.max(
                                  ...revenueAnalytics.monthlyRevenue.map(
                                    (m) => m.revenue
                                  )
                                )) *
                                100
                            )}
                            className="h-2"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Subscription Metrics */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <Card className="admin-card bg-card-dark border-purple-accent">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center text-lg sm:text-xl">
                      <PieChart className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-purple-400" />
                      Subscription Metrics
                    </CardTitle>
                    <CardDescription className="text-gray-400 text-sm">
                      This month's subscription activity
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 sm:space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <ArrowUpRight className="h-3 w-3 sm:h-4 sm:w-4 text-success" />
                          <span className="text-gray-300 text-sm sm:text-base">
                            New Subscriptions
                          </span>
                        </div>
                        <Badge className="bg-success/20 text-success border-success/30 text-xs sm:text-sm">
                          {
                            revenueAnalytics.subscriptionMetrics
                              .newSubscriptions
                          }
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <ArrowDownRight className="h-3 w-3 sm:h-4 sm:w-4 text-error" />
                          <span className="text-gray-300 text-sm sm:text-base">
                            Cancelled
                          </span>
                        </div>
                        <Badge className="bg-error/20 text-error border-error/30 text-xs sm:text-sm">
                          {
                            revenueAnalytics.subscriptionMetrics
                              .cancelledSubscriptions
                          }
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-info" />
                          <span className="text-gray-300 text-sm sm:text-base">
                            Net Growth
                          </span>
                        </div>
                        <Badge
                          className={`text-xs sm:text-sm ${
                            revenueAnalytics.subscriptionMetrics.netGrowth >= 0
                              ? "bg-success/20 text-success border-success/30"
                              : "bg-error/20 text-error border-error/30"
                          }`}
                        >
                          {revenueAnalytics.subscriptionMetrics.netGrowth >= 0
                            ? "+"
                            : ""}
                          {revenueAnalytics.subscriptionMetrics.netGrowth}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Percent className="h-3 w-3 sm:h-4 sm:w-4 text-purple-400" />
                          <span className="text-gray-300 text-sm sm:text-base">
                            Conversion Rate
                          </span>
                        </div>
                        <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs sm:text-sm">
                          {revenueAnalytics.overview.conversionRate.toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="admin-card bg-card-dark border-purple-accent">
                  <CardHeader>
                    <CardTitle className="text-white text-lg sm:text-xl">
                      Revenue Sources
                    </CardTitle>
                    <CardDescription className="text-gray-400 text-sm">
                      Breakdown of revenue by source
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 sm:space-y-4">
                      {revenueAnalytics.revenueBySource.map((source) => (
                        <div key={source.source} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-300 text-sm sm:text-base">
                              {source.source}
                            </span>
                            <div className="flex items-center space-x-2">
                              <span className="text-white font-semibold text-sm sm:text-base">
                                {formatCurrency(source.amount)}
                              </span>
                              <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs">
                                {source.percentage.toFixed(1)}%
                              </Badge>
                            </div>
                          </div>
                          <Progress
                            value={Math.abs(source.percentage)}
                            className="h-2"
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Cohort Analysis */}
              <Card className="admin-card bg-card-dark border-purple-accent">
                <CardHeader>
                  <CardTitle className="text-white text-lg sm:text-xl">
                    Cohort Analysis
                  </CardTitle>
                  <CardDescription className="text-gray-400 text-sm">
                    User retention by signup cohort (simplified view)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs sm:text-sm min-w-[600px]">
                      <thead>
                        <tr className="border-b border-gray-700">
                          <th className="text-left text-gray-400 p-2">
                            Cohort
                          </th>
                          <th className="text-center text-gray-400 p-2">
                            Month 0
                          </th>
                          <th className="text-center text-gray-400 p-2">
                            Month 1
                          </th>
                          <th className="text-center text-gray-400 p-2">
                            Month 2
                          </th>
                          <th className="text-center text-gray-400 p-2">
                            Month 3
                          </th>
                          <th className="text-center text-gray-400 p-2">
                            Month 6
                          </th>
                          <th className="text-center text-gray-400 p-2">
                            Month 12
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {revenueAnalytics.cohortAnalysis.map((cohort) => (
                          <tr
                            key={cohort.cohort}
                            className="border-b border-gray-700/50"
                          >
                            <td className="text-gray-300 p-2 font-medium">
                              {cohort.cohort}
                            </td>
                            <td className="text-center text-white p-2">
                              {cohort.month0}
                            </td>
                            <td className="text-center text-info p-2">
                              {cohort.month1}
                            </td>
                            <td className="text-center text-success p-2">
                              {cohort.month2}
                            </td>
                            <td className="text-center text-warning p-2">
                              {cohort.month3}
                            </td>
                            <td className="text-center text-warning p-2">
                              {cohort.month6}
                            </td>
                            <td className="text-center text-error p-2">
                              {cohort.month12}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="overview" className="space-y-6">
              {/* Overview Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <Card className="admin-card bg-card-dark border-purple-accent">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-xs sm:text-sm">
                          Total Users
                        </p>
                        <p className="text-xl sm:text-3xl font-bold text-white">
                          {analytics.overview.totalUsers}
                        </p>
                        <p className="text-success text-xs sm:text-sm">
                          +{analytics.today.newUsers} today
                        </p>
                      </div>
                      <Users className="h-6 w-6 sm:h-8 sm:w-8 text-info" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="admin-card bg-card-dark border-purple-accent">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-xs sm:text-sm">
                          Total Projects
                        </p>
                        <p className="text-xl sm:text-3xl font-bold text-white">
                          {analytics.overview.totalProjects}
                        </p>
                        <p className="text-success text-xs sm:text-sm">
                          +{analytics.today.newProjects} today
                        </p>
                      </div>
                      <FolderGit2 className="h-6 w-6 sm:h-8 sm:w-8 text-purple-400" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="admin-card bg-card-dark border-purple-accent">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-xs sm:text-sm">
                          Premium Users
                        </p>
                        <p className="text-xl sm:text-3xl font-bold text-white">
                          {analytics.overview.premiumUsers}
                        </p>
                        <p className="text-purple-400 text-xs sm:text-sm">
                          {analytics.overview.conversionRate.toFixed(1)}%
                          conversion
                        </p>
                      </div>
                      <Crown className="h-6 w-6 sm:h-8 sm:w-8 text-purple-400" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="admin-card bg-card-dark border-purple-accent">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-xs sm:text-sm">
                          Total Analyses
                        </p>
                        <p className="text-xl sm:text-3xl font-bold text-white">
                          {analytics.overview.totalAnalyses}
                        </p>
                        <p className="text-success text-xs sm:text-sm">
                          +{analytics.today.newAnalyses} today
                        </p>
                      </div>
                      <Activity className="h-6 w-6 sm:h-8 sm:w-8 text-purple-300" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* User Distribution */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <Card className="admin-card bg-card-dark border-purple-accent">
                  <CardHeader>
                    <CardTitle className="text-white text-lg sm:text-xl">
                      User Distribution
                    </CardTitle>
                    <CardDescription className="text-gray-400 text-sm">
                      Free vs Premium users breakdown
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 sm:space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                          <span className="text-gray-300 text-sm sm:text-base">
                            Free Users
                          </span>
                        </div>
                        <span className="text-white font-semibold text-sm sm:text-base">
                          {analytics.overview.freeUsers}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-purple-400 rounded-full"></div>
                          <span className="text-gray-300 text-sm sm:text-base">
                            Premium Users
                          </span>
                        </div>
                        <span className="text-white font-semibold text-sm sm:text-base">
                          {analytics.overview.premiumUsers}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="admin-card bg-card-dark border-purple-accent">
                  <CardHeader>
                    <CardTitle className="text-white text-lg sm:text-xl">
                      Today's Activity
                    </CardTitle>
                    <CardDescription className="text-gray-400 text-sm">
                      New registrations and activity for today
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 sm:space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-300 text-sm sm:text-base">
                          New Users
                        </span>
                        <Badge className="bg-info/20 text-info border-info/30 text-xs sm:text-sm">
                          {analytics.today.newUsers}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-300 text-sm sm:text-base">
                          New Projects
                        </span>
                        <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs sm:text-sm">
                          {analytics.today.newProjects}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-300 text-sm sm:text-base">
                          New Analyses
                        </span>
                        <Badge className="bg-purple-300/20 text-purple-300 border-purple-300/30 text-xs sm:text-sm">
                          {analytics.today.newAnalyses}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="users" className="space-y-6">
              <Card className="admin-card bg-card-dark border-purple-accent">
                <CardHeader>
                  <CardTitle className="text-white text-lg sm:text-xl">
                    User Growth Trends
                  </CardTitle>
                  <CardDescription className="text-gray-400 text-sm">
                    User registration trends over the last 30 days
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <BarChart3 className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-400 text-sm sm:text-base">
                      Growth chart visualization would be implemented here
                    </p>
                    <p className="text-gray-500 text-xs sm:text-sm mt-2">
                      Integration with charting library like Recharts or
                      Chart.js
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="projects" className="space-y-6">
              {projectAnalytics && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  <Card className="admin-card bg-card-dark border-purple-accent">
                    <CardHeader>
                      <CardTitle className="text-white text-lg sm:text-xl">
                        Popular Languages
                      </CardTitle>
                      <CardDescription className="text-gray-400 text-sm">
                        Most analyzed programming languages
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {projectAnalytics.languages
                          .slice(0, 5)
                          .map((lang, index) => (
                            <div
                              key={lang.language}
                              className="flex items-center justify-between"
                            >
                              <span className="text-gray-300 text-sm sm:text-base">
                                {lang.language}
                              </span>
                              <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs sm:text-sm">
                                {lang.count}
                              </Badge>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="admin-card bg-card-dark border-purple-accent">
                    <CardHeader>
                      <CardTitle className="text-white text-lg sm:text-xl">
                        Health Score Distribution
                      </CardTitle>
                      <CardDescription className="text-gray-400 text-sm">
                        Project health score ranges
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {projectAnalytics.healthScores.map((score) => (
                          <div
                            key={score.range}
                            className="flex items-center justify-between"
                          >
                            <span className="text-gray-300 text-sm sm:text-base">
                              {score.range}
                            </span>
                            <Badge className="bg-purple-300/20 text-purple-300 border-purple-300/30 text-xs sm:text-sm">
                              {score.count}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            <TabsContent value="activity" className="space-y-6">
              <Card className="admin-card bg-card-dark border-purple-accent">
                <CardHeader>
                  <CardTitle className="text-white text-lg sm:text-xl">
                    Recent Project Activity
                  </CardTitle>
                  <CardDescription className="text-gray-400 text-sm">
                    Latest projects added to the platform
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics.recentActivity.map((project) => (
                      <div
                        key={project.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-black/30 rounded-lg space-y-2 sm:space-y-0"
                      >
                        <div className="flex-1">
                          <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-3">
                            <h4 className="text-white font-medium text-sm sm:text-base">
                              {project.name}
                            </h4>
                            {project.analyses.length > 0 && (
                              <div
                                className={`flex items-center space-x-1 ${getStatusColor(
                                  project.analyses[0].status
                                )}`}
                              >
                                {getStatusIcon(project.analyses[0].status)}
                                <span className="text-xs sm:text-sm capitalize">
                                  {project.analyses[0].status}
                                </span>
                              </div>
                            )}
                          </div>
                          <p className="text-gray-400 text-xs sm:text-sm">
                            {project.user.email}
                          </p>
                          <p className="text-gray-500 text-xs truncate">
                            {project.repoUrl}
                          </p>
                        </div>
                        <div className="text-left sm:text-right">
                          {project.analyses.length > 0 &&
                            project.analyses[0].overallHealthScore && (
                              <Badge className="bg-success/20 text-success border-success/30 mb-2 text-xs">
                                {project.analyses[0].overallHealthScore}% Health
                              </Badge>
                            )}
                          <p className="text-gray-400 text-xs">
                            {new Date(project.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}
