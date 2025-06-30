import { prisma } from "./prisma";

export interface SubscriptionStatus {
  isActive: boolean;
  isPremium: boolean;
  plan: "free" | "premium" | "admin";
  projectsUsed: number;
  projectsLimit: number;
  canUseVoiceChat: boolean;
  canUsePremiumVoices: boolean;
  subscriptionEnd?: Date;
  isAdmin: boolean;
}

export interface RevenueMetrics {
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
}

export interface RevenueAnalytics {
  overview: RevenueMetrics;
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

export async function getUserSubscriptionStatus(
  userId: string
): Promise<SubscriptionStatus> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      projects: true, // Get all projects, not just today's
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  console.log(`🔍 Checking subscription for user: ${user.email}`, {
    subscriptionStatus: user.subscriptionStatus,
    subscriptionEnd: user.subscriptionEnd,
    subscriptionId: user.subscriptionId,
    customerId: user.customerId,
  });

  // Check if user is admin
  const isAdmin = user.email === "admin@quantacode.com";

  // Admin gets unlimited access
  if (isAdmin) {
    console.log("👑 User is admin - granting unlimited access");
    return {
      isActive: true,
      isPremium: true,
      plan: "admin",
      projectsUsed: user.projects.length,
      projectsLimit: 999999, // Unlimited for admin
      canUseVoiceChat: true,
      canUsePremiumVoices: true,
      subscriptionEnd: undefined,
      isAdmin: true,
    };
  }

  // Check if user has active premium subscription
  const isPremium =
    user.subscriptionStatus === "premium" &&
    user.subscriptionEnd &&
    new Date(user.subscriptionEnd) > new Date();

  console.log(`📊 Premium status calculation:`, {
    subscriptionStatus: user.subscriptionStatus,
    subscriptionEnd: user.subscriptionEnd,
    currentDate: new Date(),
    isPremium,
  });

  const projectsUsed = user.projects.length; // Total projects, not daily
  const projectsLimit = isPremium ? 999999 : 2; // Premium gets unlimited, free gets 2 total

  const result = {
    isActive: !!isPremium,
    isPremium: !!isPremium,
    plan: isPremium ? "premium" : ("free" as "free" | "premium"),
    projectsUsed,
    projectsLimit,
    canUseVoiceChat: !!isPremium,
    canUsePremiumVoices: !!isPremium,
    subscriptionEnd: user.subscriptionEnd
      ? new Date(user.subscriptionEnd)
      : undefined,
    isAdmin: false,
  };

  console.log(`✅ Final subscription status:`, result);
  return result;
}

export async function updateUserSubscription(
  userId: string,
  subscriptionData: {
    status: string;
    subscriptionId?: string;
    customerId?: string;
    subscriptionStart?: Date;
    subscriptionEnd?: Date;
  }
) {
  console.log(`🔄 Updating subscription for user: ${userId}`, subscriptionData);

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionStatus: subscriptionData.status,
      subscriptionId: subscriptionData.subscriptionId,
      customerId: subscriptionData.customerId,
      subscriptionStart: subscriptionData.subscriptionStart,
      subscriptionEnd: subscriptionData.subscriptionEnd,
    },
  });

  console.log(`✅ Updated user subscription:`, {
    userId: updatedUser.id,
    email: updatedUser.email,
    subscriptionStatus: updatedUser.subscriptionStatus,
    subscriptionEnd: updatedUser.subscriptionEnd,
  });

  return updatedUser;
}

export async function canCreateProject(userId: string): Promise<boolean> {
  const status = await getUserSubscriptionStatus(userId);
  return status.projectsUsed < status.projectsLimit;
}

export async function canUseVoiceFeatures(userId: string): Promise<boolean> {
  const status = await getUserSubscriptionStatus(userId);
  return status.canUseVoiceChat;
}

export async function canUsePremiumVoices(userId: string): Promise<boolean> {
  const status = await getUserSubscriptionStatus(userId);
  return status.canUsePremiumVoices;
}

export async function isUserAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  return user?.email === "admin@quantacode.com";
}

// Enhanced user lookup function for webhooks
export async function findUserByStripeData(
  customerId?: string,
  email?: string,
  subscriptionId?: string
): Promise<any> {
  console.log(`🔍 Looking up user with:`, {
    customerId,
    email,
    subscriptionId,
  });

  let user = null;

  // Try multiple lookup strategies
  const lookupStrategies = [
    // 1. By customer ID
    customerId ? { customerId } : null,
    // 2. By subscription ID
    subscriptionId ? { subscriptionId } : null,
    // 3. By email
    email ? { email } : null,
  ].filter(Boolean);

  for (const strategy of lookupStrategies) {
    if (strategy) {
      user = await prisma.user.findFirst({ where: strategy });
      if (user) {
        console.log(
          `✅ Found user by ${Object.keys(strategy)[0]}: ${user.email}`
        );
        break;
      }
    }
  }

  return user;
}

// Revenue tracking functions
export async function trackRevenueEvent(eventData: {
  type: string;
  amount: number;
  currency?: string;
  userId?: string;
  stripeEventId?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripeInvoiceId?: string;
  description?: string;
  metadata?: any;
}) {
  try {
    return await prisma.revenueEvent.create({
      data: {
        type: eventData.type,
        amount: eventData.amount,
        currency: eventData.currency || "usd",
        userId: eventData.userId,
        stripeEventId: eventData.stripeEventId,
        stripeCustomerId: eventData.stripeCustomerId,
        stripeSubscriptionId: eventData.stripeSubscriptionId,
        stripeInvoiceId: eventData.stripeInvoiceId,
        description: eventData.description,
        metadata: eventData.metadata
          ? JSON.stringify(eventData.metadata)
          : null,
      },
    });
  } catch (error) {
    console.error("Failed to track revenue event:", error);
    // Don't throw error to avoid breaking webhook processing
    return null;
  }
}

// Admin analytics functions
export async function getAdminAnalytics() {
  const [
    totalUsers,
    totalProjects,
    totalAnalyses,
    premiumUsers,
    todayUsers,
    todayProjects,
    todayAnalyses,
    recentActivity,
  ] = await Promise.all([
    // Total counts
    prisma.user.count(),
    prisma.project.count(),
    prisma.analysis.count(),

    // Premium users
    prisma.user.count({
      where: {
        subscriptionStatus: "premium",
        subscriptionEnd: {
          gt: new Date(),
        },
      },
    }),

    // Today's activity
    prisma.user.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    }),

    prisma.project.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    }),

    prisma.analysis.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    }),

    // Recent activity
    prisma.project.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { email: true, name: true },
        },
        analyses: {
          take: 1,
          orderBy: { createdAt: "desc" },
        },
      },
    }),
  ]);

  return {
    overview: {
      totalUsers,
      totalProjects,
      totalAnalyses,
      premiumUsers,
      freeUsers: totalUsers - premiumUsers,
      conversionRate: totalUsers > 0 ? (premiumUsers / totalUsers) * 100 : 0,
    },
    today: {
      newUsers: todayUsers,
      newProjects: todayProjects,
      newAnalyses: todayAnalyses,
    },
    recentActivity,
  };
}

export async function getRevenueAnalytics(): Promise<RevenueAnalytics> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  // Get all revenue events
  const allRevenueEvents = await prisma.revenueEvent.findMany({
    where: {
      createdAt: {
        gte: new Date(now.getFullYear() - 1, 0, 1), // Last year
      },
    },
    include: {
      user: {
        select: { id: true, email: true, createdAt: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Calculate total revenue
  const totalRevenue =
    allRevenueEvents
      .filter((event) =>
        ["payment_succeeded", "subscription_created"].includes(event.type)
      )
      .reduce((sum, event) => sum + event.amount, 0) / 100; // Convert from cents

  // Calculate MRR (Monthly Recurring Revenue)
  const activeSubscriptions = await prisma.user.count({
    where: {
      subscriptionStatus: "premium",
      subscriptionEnd: {
        gt: now,
      },
    },
  });

  const monthlyRecurringRevenue = activeSubscriptions * 20; // $20 per subscription

  // Calculate this month's revenue
  const thisMonthRevenue =
    allRevenueEvents
      .filter(
        (event) =>
          ["payment_succeeded", "subscription_created"].includes(event.type) &&
          event.createdAt >= startOfMonth
      )
      .reduce((sum, event) => sum + event.amount, 0) / 100;

  // Calculate last month's revenue
  const lastMonthRevenue =
    allRevenueEvents
      .filter(
        (event) =>
          ["payment_succeeded", "subscription_created"].includes(event.type) &&
          event.createdAt >= startOfLastMonth &&
          event.createdAt <= endOfLastMonth
      )
      .reduce((sum, event) => sum + event.amount, 0) / 100;

  // Calculate revenue growth
  const revenueGrowth =
    lastMonthRevenue > 0
      ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
      : 0;

  // Calculate ARPU (Average Revenue Per User)
  const totalUsers = await prisma.user.count();
  const averageRevenuePerUser = totalUsers > 0 ? totalRevenue / totalUsers : 0;

  // Calculate churn rate
  const cancelledThisMonth = await prisma.user.count({
    where: {
      subscriptionStatus: "cancelled",
      updatedAt: {
        gte: startOfMonth,
      },
    },
  });

  const activeStartOfMonth = await prisma.user.count({
    where: {
      subscriptionStatus: "premium",
      subscriptionStart: {
        lt: startOfMonth,
      },
    },
  });

  const churnRate =
    activeStartOfMonth > 0
      ? (cancelledThisMonth / activeStartOfMonth) * 100
      : 0;

  // Calculate LTV (Customer Lifetime Value)
  const averageMonthlyChurn = churnRate / 100;
  const lifetimeValue = averageMonthlyChurn > 0 ? 20 / averageMonthlyChurn : 0; // $20 monthly / churn rate

  // Calculate conversion rate
  const totalSignups = await prisma.user.count();
  const totalPremiumUsers = await prisma.user.count({
    where: { subscriptionStatus: "premium" },
  });
  const conversionRate =
    totalSignups > 0 ? (totalPremiumUsers / totalSignups) * 100 : 0;

  // Get refunds
  const refunds =
    allRevenueEvents
      .filter((event) => event.type === "refund")
      .reduce((sum, event) => sum + Math.abs(event.amount), 0) / 100;

  // Monthly revenue breakdown
  const monthlyRevenue = [];
  for (let i = 11; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

    const monthRevenue =
      allRevenueEvents
        .filter(
          (event) =>
            ["payment_succeeded", "subscription_created"].includes(
              event.type
            ) &&
            event.createdAt >= monthStart &&
            event.createdAt <= monthEnd
        )
        .reduce((sum, event) => sum + event.amount, 0) / 100;

    const monthSubscriptions = await prisma.user.count({
      where: {
        subscriptionStart: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
    });

    const monthChurn = await prisma.user.count({
      where: {
        subscriptionStatus: "cancelled",
        updatedAt: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
    });

    monthlyRevenue.push({
      month: monthStart.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      }),
      revenue: monthRevenue,
      subscriptions: monthSubscriptions,
      churn: monthChurn,
    });
  }

  // Revenue by source
  const revenueBySource = [
    {
      source: "Subscriptions",
      amount: totalRevenue - refunds,
      percentage:
        totalRevenue > 0 ? ((totalRevenue - refunds) / totalRevenue) * 100 : 0,
    },
    {
      source: "Refunds",
      amount: -refunds,
      percentage: totalRevenue > 0 ? (refunds / totalRevenue) * 100 : 0,
    },
  ];

  // Subscription metrics for this month
  const newSubscriptions = await prisma.user.count({
    where: {
      subscriptionStatus: "premium",
      subscriptionStart: {
        gte: startOfMonth,
      },
    },
  });

  const cancelledSubscriptions = await prisma.user.count({
    where: {
      subscriptionStatus: "cancelled",
      updatedAt: {
        gte: startOfMonth,
      },
    },
  });

  // Cohort analysis (simplified)
  const cohortAnalysis = [];
  for (let i = 5; i >= 0; i--) {
    const cohortStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const cohortUsers = await prisma.user.findMany({
      where: {
        createdAt: {
          gte: cohortStart,
          lt: new Date(
            cohortStart.getFullYear(),
            cohortStart.getMonth() + 1,
            1
          ),
        },
      },
      select: { id: true, createdAt: true, subscriptionStart: true },
    });

    const cohortSize = cohortUsers.length;
    const subscribedUsers = cohortUsers.filter(
      (user) => user.subscriptionStart
    ).length;

    cohortAnalysis.push({
      cohort: cohortStart.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      }),
      month0: cohortSize,
      month1: subscribedUsers,
      month2: Math.round(subscribedUsers * 0.9), // Simplified retention
      month3: Math.round(subscribedUsers * 0.8),
      month6: Math.round(subscribedUsers * 0.7),
      month12: Math.round(subscribedUsers * 0.6),
    });
  }

  return {
    overview: {
      totalRevenue,
      monthlyRecurringRevenue,
      averageRevenuePerUser,
      churnRate,
      lifetimeValue,
      conversionRate,
      revenueGrowth,
      activeSubscriptions,
      cancelledSubscriptions: cancelledThisMonth,
      refunds,
    },
    monthlyRevenue,
    revenueBySource,
    subscriptionMetrics: {
      newSubscriptions,
      cancelledSubscriptions: cancelledThisMonth,
      upgrades: newSubscriptions, // Simplified
      downgrades: 0, // Not implemented yet
      netGrowth: newSubscriptions - cancelledThisMonth,
    },
    cohortAnalysis,
  };
}

export async function getUserGrowthData(days: number = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const users = await prisma.user.findMany({
    where: {
      createdAt: {
        gte: startDate,
      },
    },
    select: {
      createdAt: true,
      subscriptionStatus: true,
    },
    orderBy: { createdAt: "asc" },
  });

  // Group by day
  const dailyData: {
    [key: string]: { free: number; premium: number; total: number };
  } = {};

  users.forEach((user) => {
    const day = user.createdAt.toISOString().split("T")[0];
    if (!dailyData[day]) {
      dailyData[day] = { free: 0, premium: 0, total: 0 };
    }

    dailyData[day].total++;
    if (user.subscriptionStatus === "premium") {
      dailyData[day].premium++;
    } else {
      dailyData[day].free++;
    }
  });

  return Object.entries(dailyData).map(([date, data]) => ({
    date,
    ...data,
  }));
}

export async function getProjectAnalyticsData() {
  const [languageStats, healthScoreStats, analysisStats] = await Promise.all([
    // Language distribution
    prisma.project.groupBy({
      by: ["language"],
      _count: true,
      where: {
        language: {
          not: null,
        },
      },
    }),

    // Health score distribution
    prisma.analysis.findMany({
      where: {
        status: "completed",
        overallHealthScore: {
          not: undefined,
        },
      },
      select: {
        overallHealthScore: true,
      },
    }),

    // Analysis status distribution
    prisma.analysis.groupBy({
      by: ["status"],
      _count: true,
    }),
  ]);

  // Process health scores into ranges
  const healthRanges = {
    "Excellent (80-100)": 0,
    "Good (60-79)": 0,
    "Fair (40-59)": 0,
    "Poor (0-39)": 0,
  };

  healthScoreStats.forEach((analysis) => {
    const score = analysis.overallHealthScore;
    if (score >= 80) healthRanges["Excellent (80-100)"]++;
    else if (score >= 60) healthRanges["Good (60-79)"]++;
    else if (score >= 40) healthRanges["Fair (40-59)"]++;
    else healthRanges["Poor (0-39)"]++;
  });

  return {
    languages: languageStats.map((stat) => ({
      language: stat.language || "Unknown",
      count: stat._count,
    })),
    healthScores: Object.entries(healthRanges).map(([range, count]) => ({
      range,
      count,
    })),
    analysisStatus: analysisStats.map((stat) => ({
      status: stat.status,
      count: stat._count,
    })),
  };
}
