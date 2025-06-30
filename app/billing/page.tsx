"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
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
  Crown,
  Check,
  X,
  Mic,
  Volume2,
  Zap,
  Calendar,
  CreditCard,
  ArrowLeft,
  Star,
  Shield,
  Headphones,
  Loader2,
  AlertCircle,
  ExternalLink,
  Settings,
  Gift,
  Percent,
} from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/header";
import { toast } from "sonner";
import Link from "next/link";

interface SubscriptionStatus {
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

export default function BillingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [subscriptionStatus, setSubscriptionStatus] =
    useState<SubscriptionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isManaging, setIsManaging] = useState(false);
  const [stripeConfigured, setStripeConfigured] = useState(false);
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }

    if (status === "authenticated") {
      fetchSubscriptionStatus();

      // Check if Stripe is configured
      setStripeConfigured(!!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

      // Handle success/cancel from Stripe
      const success = searchParams.get("success");
      const canceled = searchParams.get("canceled");

      if (success) {
        toast.success(
          "Welcome to Premium! 🎉 Your subscription is now active."
        );
        // Remove the success parameter from URL
        router.replace("/billing");
      } else if (canceled) {
        toast.info("Subscription upgrade was canceled.");
        // Remove the canceled parameter from URL
        router.replace("/billing");
      }
    }
  }, [status, router, searchParams]);

  useEffect(() => {
    if (subscriptionStatus) {
      const ctx = gsap.context(() => {
        gsap.fromTo(
          ".billing-card",
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: "power3.out" }
        );
      }, pageRef);

      return () => ctx.revert();
    }
  }, [subscriptionStatus]);

  const fetchSubscriptionStatus = async () => {
    try {
      const response = await fetch("/api/subscription/status");
      if (response.ok) {
        const data = await response.json();
        setSubscriptionStatus(data.subscriptionStatus);
      } else {
        toast.error("Failed to load billing information");
      }
    } catch (error) {
      console.error("Failed to fetch subscription status:", error);
      toast.error("Failed to load billing information");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpgrade = async () => {
    if (!stripeConfigured) {
      toast.error("Billing is not configured. Please contact support.");
      return;
    }

    setIsUpgrading(true);
    toast.loading("Redirecting to checkout...", { id: "upgrade" });

    try {
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID,
        }),
      });

      const data = await response.json();

      if (response.ok && data.url) {
        toast.dismiss("upgrade");
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Failed to create checkout session", {
          id: "upgrade",
        });

        // If it's a configuration error, show setup instructions
        if (
          data.error?.includes("configured") ||
          data.error?.includes("pricing")
        ) {
          toast.info(
            "Please contact support to set up billing configuration.",
            {
              duration: 5000,
            }
          );
        }
      }
    } catch (error) {
      console.error("Upgrade failed:", error);
      toast.error("Upgrade failed. Please try again.", { id: "upgrade" });
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleManageSubscription = async () => {
    setIsManaging(true);
    toast.loading("Opening billing portal...", { id: "manage" });

    try {
      const response = await fetch("/api/stripe/create-portal-session", {
        method: "POST",
      });

      if (response.ok) {
        const { url } = await response.json();
        toast.dismiss("manage");
        window.location.href = url;
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to open billing portal", {
          id: "manage",
        });
      }
    } catch (error) {
      console.error("Manage subscription failed:", error);
      toast.error("Failed to open billing portal", { id: "manage" });
    } finally {
      setIsManaging(false);
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-dark-gradient flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  const features = [
    {
      name: "Project Analysis",
      free: subscriptionStatus?.isAdmin ? "Unlimited" : "2 total",
      premium: "Unlimited",
      icon: Zap,
    },
    {
      name: "Voice Summaries",
      free: "Robotic voice only",
      premium: "Natural premium voices",
      icon: Volume2,
    },
    {
      name: "Voice Chat",
      free: "Not available",
      premium: "Unlimited conversations",
      icon: Mic,
    },
    {
      name: "Audio History",
      free: "Not saved",
      premium: "Persistent storage",
      icon: Headphones,
    },
    {
      name: "Priority Support",
      free: false,
      premium: true,
      icon: Shield,
    },
    {
      name: "Advanced Analytics",
      free: false,
      premium: true,
      icon: Star,
    },
  ];

  const getPlanIcon = () => {
    if (subscriptionStatus?.isAdmin)
      return <Shield className="h-6 w-6 text-red-400" />;
    if (subscriptionStatus?.isPremium)
      return <Crown className="h-6 w-6 text-yellow-400" />;
    return <Zap className="h-6 w-6 text-purple-400" />;
  };

  const getPlanColor = () => {
    if (subscriptionStatus?.isAdmin)
      return "bg-red-500/20 text-red-400 border-red-500/30";
    if (subscriptionStatus?.isPremium)
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    return "bg-purple-500/20 text-purple-400 border-purple-500/30";
  };

  return (
    <div className="min-h-screen bg-dark-gradient">
      <DashboardHeader />

      <main ref={pageRef} className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-white/80 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>

          <h1 className="text-4xl font-bold text-white mb-2">
            Billing & Subscription
          </h1>
          <p className="text-slate-300 text-lg">
            Manage your QuantaCode subscription powered by Stripe.
          </p>
        </div>

        {/* Promotion Code Banner */}
        <Card className="billing-card bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20 mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Gift className="h-6 w-6 text-green-400" />
                <div>
                  <h3 className="text-green-300 font-medium">
                    🎉 Limited Time Offer!
                  </h3>
                  <p className="text-green-400 text-sm">
                    Get 2 months completely FREE with promotion codes! Use any
                    of these codes at checkout:
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {[
                      "QuantaCode2FREE",
                      "LAUNCH2024",
                      "FREEMONTHS",
                      "PREMIUM2FREE",
                      "WELCOME100",
                    ].map((code) => (
                      <Badge
                        key={code}
                        variant={"outline"}
                        className="bg-green-500/20 text-green-300 border-green-500/30"
                      >
                        <Percent className="h-3 w-3 mr-1" />
                        {code}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stripe Configuration Warning */}
        {!stripeConfigured && (
          <Card className="billing-card bg-orange-500/10 border-orange-500/20 mb-8">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <AlertCircle className="h-6 w-6 text-orange-400" />
                <div>
                  <h3 className="text-orange-300 font-medium">
                    Billing Not Configured
                  </h3>
                  <p className="text-orange-400 text-sm">
                    Stripe billing is not configured. Please contact support to
                    enable premium features.
                  </p>
                  <div className="mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-orange-500/30 text-orange-300 hover:bg-orange-500/10"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Contact Support
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Current Plan Status */}
        {subscriptionStatus && (
          <Card className="billing-card bg-background border-slate-700 mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-3 rounded-full bg-slate-700/30">
                    {getPlanIcon()}
                  </div>
                  <div>
                    <CardTitle className="text-white">
                      {subscriptionStatus.plan.toUpperCase()} Plan
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      {subscriptionStatus.isAdmin
                        ? "Full platform access with unlimited features"
                        : subscriptionStatus.isPremium
                        ? "You have access to all premium features"
                        : "Upgrade to unlock premium features"}
                    </CardDescription>
                  </div>
                </div>
                <Badge variant={"outline"} className={getPlanColor()}>
                  {subscriptionStatus.plan.toUpperCase()}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Usage Stats */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-300">Projects Used</span>
                  <span className="text-white">
                    {subscriptionStatus.projectsUsed}
                    {!subscriptionStatus.isAdmin &&
                      ` / ${subscriptionStatus.projectsLimit}`}
                    {subscriptionStatus.isAdmin && " (Unlimited)"}
                  </span>
                </div>
                {!subscriptionStatus.isAdmin && (
                  <Progress
                    value={
                      (subscriptionStatus.projectsUsed /
                        subscriptionStatus.projectsLimit) *
                      100
                    }
                    className="h-2"
                  />
                )}
              </div>

              {/* Subscription Details */}
              {subscriptionStatus.isPremium &&
                subscriptionStatus.subscriptionEnd && (
                  <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Calendar className="h-5 w-5 text-purple-400" />
                      <div>
                        <p className="text-white font-medium">
                          Next Billing Date
                        </p>
                        <p className="text-slate-400 text-sm">
                          {new Date(
                            subscriptionStatus.subscriptionEnd
                          ).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={handleManageSubscription}
                      disabled={isManaging}
                      variant="outline"
                      size="sm"
                      className="border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                      {isManaging ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <CreditCard className="h-4 w-4 mr-2" />
                      )}
                      Manage
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                )}

              {/* Action Buttons */}
              <div className="flex space-x-3">
                {!subscriptionStatus.isPremium &&
                  !subscriptionStatus.isAdmin && (
                    <Button
                      onClick={handleUpgrade}
                      disabled={isUpgrading || !stripeConfigured}
                      className="flex-1 bg-gradient-to-r from-purple-600 to-yellow-600 hover:from-purple-700 hover:to-yellow-700 text-white"
                      size="lg"
                    >
                      {isUpgrading ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Crown className="h-5 w-5 mr-2" />
                          Upgrade to Premium - $20/month
                        </>
                      )}
                    </Button>
                  )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pricing Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Free Plan */}
          <Card className="billing-card bg-background border-slate-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl text-white">
                    Free Plan
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Perfect for trying out QuantaCode
                  </CardDescription>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-white">$0</div>
                  <div className="text-slate-400 text-sm">forever</div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {features.map((feature) => (
                <div
                  key={feature.name}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <feature.icon className="h-4 w-4 text-slate-400" />
                    <span className="text-slate-300">{feature.name}</span>
                  </div>
                  <div className="text-right">
                    {typeof feature.free === "boolean" ? (
                      feature.free ? (
                        <Check className="h-4 w-4 text-green-400" />
                      ) : (
                        <X className="h-4 w-4 text-red-400" />
                      )
                    ) : (
                      <span className="text-slate-400 text-sm">
                        {feature.free}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Premium Plan */}
          <Card className="billing-card bg-gradient-to-br from-purple-900/50 to-yellow-900/50 border-purple-500/50 relative overflow-hidden">
            {/* Moved POPULAR badge to be a direct sibling to CardHeader for better positioning control */}
            <div className="absolute -top-3 right-4 z-10 transform translate-x-1/2 -translate-y-1/2">
              {" "}
              {/* Adjust top and right as needed */}
              {/* This transform will center the badge on the corner if you want it exactly like the image, else remove */}
              <Badge
                variant={"outline"}
                className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 rotate-12 px-3 py-1 text-sm font-semibold shadow-lg"
              >
                {" "}
                {/* Added rotate and padding for visual appeal */}
                POPULAR
              </Badge>
            </div>

            <CardHeader className="relative pb-10">
              {" "}
              {/* Added relative and increased padding-bottom to make space for badge */}
              <div className="flex items-start justify-between">
                {" "}
                {/* Changed items-center to items-start for better top alignment */}
                <div>
                  <CardTitle className="text-xl text-white flex items-center">
                    <Crown className="h-5 w-5 text-yellow-400 mr-2" />
                    Premium Plan
                  </CardTitle>
                  <CardDescription className="text-slate-300">
                    Full access to all features
                  </CardDescription>
                </div>
                <div className="text-right ml-4">
                  {" "}
                  {/* Added ml-4 for spacing from title */}
                  <div className="text-3xl font-bold text-white leading-none">
                    $20
                  </div>{" "}
                  {/* Added leading-none for tight line height */}
                  <div className="text-slate-300 text-sm">per month</div>
                  <div className="text-green-400 text-xs font-medium">
                    2 months FREE with promo!
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {features.map((feature) => (
                <div
                  key={feature.name}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <feature.icon className="h-4 w-4 text-purple-400" />
                    <span className="text-white">{feature.name}</span>
                  </div>
                  <div className="text-right">
                    {typeof feature.premium === "boolean" ? (
                      feature.premium ? (
                        <Check className="h-4 w-4 text-green-400" />
                      ) : (
                        <X className="h-4 w-4 text-red-400" />
                      )
                    ) : (
                      <span className="text-purple-300 text-sm font-medium">
                        {feature.premium}
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {!subscriptionStatus?.isPremium &&
                !subscriptionStatus?.isAdmin && (
                  <Button
                    onClick={handleUpgrade}
                    disabled={isUpgrading || !stripeConfigured}
                    className="w-full bg-gradient-to-r from-purple-600 to-yellow-600 hover:from-purple-700 hover:to-yellow-700 text-white mt-6"
                    size="lg"
                  >
                    {isUpgrading ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Crown className="h-5 w-5 mr-2" />
                        Upgrade Now
                      </>
                    )}
                  </Button>
                )}
            </CardContent>
          </Card>
        </div>

        {/* Stripe Powered Badge */}
        <Card className="billing-card bg-background border-slate-700 mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-center space-x-3">
              <Shield className="h-5 w-5 text-blue-400" />
              <span className="text-slate-300">Secure payments powered by</span>
              <span className="text-blue-400 font-semibold">Stripe</span>
            </div>
          </CardContent>
        </Card>

        {/* Voice Features Showcase */}
        <Card className="billing-card bg-background border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Headphones className="h-6 w-6 text-purple-400 mr-3" />
              Voice Features Comparison
            </CardTitle>
            <CardDescription className="text-slate-400">
              Experience the difference with premium voice technology powered by
              ElevenLabs
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">
                  Free Voice Features
                </h3>
                <div className="p-4 bg-slate-700/30 rounded-lg">
                  <div className="flex items-center space-x-3 mb-3">
                    <Volume2 className="h-5 w-5 text-slate-400" />
                    <span className="text-slate-300">
                      Robotic Voice Summaries
                    </span>
                  </div>
                  <p className="text-slate-400 text-sm mb-3">
                    Basic text-to-speech for project analysis summaries
                  </p>
                  <div className="flex items-center space-x-2 text-red-400">
                    <X className="h-4 w-4" />
                    <span className="text-sm">No voice chat available</span>
                  </div>
                  <div className="flex items-center space-x-2 text-red-400 mt-1">
                    <X className="h-4 w-4" />
                    <span className="text-sm">Audio not saved</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">
                  Premium Voice Features
                </h3>
                <div className="p-4 bg-gradient-to-br from-purple-900/30 to-yellow-900/30 rounded-lg border border-purple-500/30">
                  <div className="flex items-center space-x-3 mb-3">
                    <Crown className="h-5 w-5 text-yellow-400" />
                    <span className="text-white">Natural Voice Synthesis</span>
                  </div>
                  <p className="text-purple-300 text-sm mb-3">
                    High-quality, natural-sounding voices powered by ElevenLabs
                    AI
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-green-400">
                      <Check className="h-4 w-4" />
                      <span className="text-sm">
                        Interactive voice chat with your codebase
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-green-400">
                      <Check className="h-4 w-4" />
                      <span className="text-sm">
                        Persistent audio history and playback
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-green-400">
                      <Check className="h-4 w-4" />
                      <span className="text-sm">
                        Multiple premium voice personalities
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-green-400">
                      <Check className="h-4 w-4" />
                      <span className="text-sm">
                        Real-time speech-to-text input
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* FAQ Section */}
        <Card className="billing-card bg-background border-slate-700 mt-8">
          <CardHeader>
            <CardTitle className="text-white">
              Frequently Asked Questions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="text-white font-medium mb-2">
                How do promotion codes work?
              </h4>
              <p className="text-slate-400 text-sm">
                Enter any of our promotion codes during checkout to get 2 months
                completely free! After the free period, you'll be charged the
                regular $20/month rate.
              </p>
            </div>
            <div>
              <h4 className="text-white font-medium mb-2">
                Can I cancel anytime?
              </h4>
              <p className="text-slate-400 text-sm">
                Yes, you can cancel your subscription at any time through the
                Stripe billing portal. You'll continue to have access to premium
                features until the end of your billing period.
              </p>
            </div>
            <div>
              <h4 className="text-white font-medium mb-2">
                What happens to my data if I cancel?
              </h4>
              <p className="text-slate-400 text-sm">
                Your project data and analysis history will be preserved.
                However, you'll lose access to premium features like voice chat
                and natural voice synthesis.
              </p>
            </div>
            <div>
              <h4 className="text-white font-medium mb-2">
                Do you offer refunds?
              </h4>
              <p className="text-slate-400 text-sm">
                We offer a 7-day money-back guarantee for new subscribers.
                Contact support if you're not satisfied with your premium
                experience.
              </p>
            </div>
            <div>
              <h4 className="text-white font-medium mb-2">
                How does the billing work?
              </h4>
              <p className="text-slate-400 text-sm">
                Billing is handled securely through Stripe. You'll be charged
                monthly and can manage your subscription through the Stripe
                billing portal.
              </p>
            </div>
            <div>
              <h4 className="text-white font-medium mb-2">
                Is my payment information secure?
              </h4>
              <p className="text-slate-400 text-sm">
                Yes, all payments are processed securely by Stripe, which is PCI
                DSS compliant and trusted by millions of businesses worldwide.
                We never store your payment information.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
