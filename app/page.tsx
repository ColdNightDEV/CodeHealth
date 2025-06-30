"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { gsap } from "gsap";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  Code2,
  Shield,
  Zap,
  Github,
  TrendingUp,
  Users,
  Target,
} from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const heroRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard");
      return;
    }

    const ctx = gsap.context(() => {
      // Hero animations
      gsap.fromTo(
        ".hero-title",
        { y: 100, opacity: 0 },
        { y: 0, opacity: 1, duration: 1.2, ease: "power3.out" }
      );

      gsap.fromTo(
        ".hero-subtitle",
        { y: 50, opacity: 0 },
        { y: 0, opacity: 1, duration: 1, delay: 0.3, ease: "power3.out" }
      );

      gsap.fromTo(
        ".hero-buttons",
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, delay: 0.6, ease: "power3.out" }
      );

      // Feature cards animation
      gsap.fromTo(
        ".feature-card",
        { y: 60, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          delay: 0.8,
          stagger: 0.2,
          ease: "power3.out",
        }
      );

      // Stats animation
      gsap.fromTo(
        ".stat-item",
        { scale: 0, opacity: 0 },
        {
          scale: 1,
          opacity: 1,
          duration: 0.6,
          delay: 1.2,
          stagger: 0.1,
          ease: "back.out(1.7)",
        }
      );

      // Floating particles animation
      gsap.to(".particle", {
        y: -20,
        duration: 2,
        repeat: -1,
        yoyo: true,
        stagger: 0.3,
        ease: "power2.inOut",
      });
    }, heroRef);

    return () => ctx.revert();
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-dark-gradient flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-gradient text-white overflow-hidden">
      {/* Floating Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="particle absolute w-2 h-2 bg-purple-400 rounded-full opacity-20"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      <div ref={heroRef} className="relative z-10">
        {/* Header */}
        <header className="container mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <nav className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="h-7 w-7 text-purple-400 sm:h-8 sm:w-8" />
              <span className="text-xl font-bold sm:text-2xl">CodeHealth</span>
            </div>
            <div className="flex space-x-2 sm:space-x-4">
              <Link href="/auth/signin">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:text-purple-300 hover:bg-purple-accent/20"
                >
                  Sign In
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  Get Started
                </Button>
              </Link>
            </div>
          </nav>
        </header>

        {/* Hero Section */}
        <section className="container mx-auto px-4 py-16 text-center sm:px-6 md:py-20">
          <div className="max-w-4xl mx-auto">
            <Badge className="hero-title mb-4 bg-purple-accent text-purple-light border-purple-accent text-sm md:text-base">
              AI-Powered Code Analysis
            </Badge>

            <h1 className="hero-title text-4xl leading-tight md:text-6xl lg:text-7xl font-bold mb-4 bg-gradient-to-r from-white to-purple-300 bg-clip-text text-transparent">
              Monitor Your Codebase Health
            </h1>

            <p className="hero-subtitle text-base md:text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
              Get AI-powered insights, track code quality metrics, and maintain
              healthy repositories with automated analysis and actionable
              recommendations.
            </p>

            <div className="hero-buttons flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <Link href="/auth/signup">
                <Button
                  size="lg"
                  className="bg-purple-600 hover:bg-purple-700 text-base sm:text-lg px-6 py-3 w-full sm:w-auto"
                >
                  Start Free Analysis
                  <Zap className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="text-base sm:text-lg px-6 py-3 border-gray-600 text-white hover:bg-card-dark w-full sm:w-auto"
              >
                View Demo
                <Github className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section
          ref={statsRef}
          className="container mx-auto px-4 py-10 sm:px-6 md:py-12"
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-4xl mx-auto">
            <div className="stat-item text-center">
              <div className="text-2xl sm:text-3xl font-bold text-purple-400 mb-1">
                99%
              </div>
              <div className="text-gray-300 text-sm sm:text-base">Accuracy</div>
            </div>
            <div className="stat-item text-center">
              <div className="text-2xl sm:text-3xl font-bold text-purple-300 mb-1">
                10k+
              </div>
              <div className="text-gray-300 text-sm sm:text-base">
                Repositories
              </div>
            </div>
            <div className="stat-item text-center">
              <div className="text-2xl sm:text-3xl font-bold text-purple-200 mb-1">
                5min
              </div>
              <div className="text-gray-300 text-sm sm:text-base">
                Analysis Time
              </div>
            </div>
            <div className="stat-item text-center">
              <div className="text-2xl sm:text-3xl font-bold text-purple-100 mb-1">
                24/7
              </div>
              <div className="text-gray-300 text-sm sm:text-base">
                Monitoring
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section
          ref={featuresRef}
          className="container mx-auto px-4 py-16 sm:px-6 md:py-20"
        >
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-3">
              Powerful Features
            </h2>
            <p className="text-base md:text-xl text-gray-300 max-w-2xl mx-auto">
              Everything you need to maintain healthy, well-documented codebases
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            <Card className="feature-card group bg-card-dark border-purple-accent hover:bg-card-dark-hover transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/20">
              <CardContent className="p-5 sm:p-6">
                <div className="mb-3 p-2 bg-purple-accent rounded-lg w-fit group-hover:bg-purple-accent-hover transition-colors">
                  <Code2 className="h-5 w-5 text-purple-400 sm:h-6 sm:w-6" />
                </div>
                <h3 className="text-lg font-semibold mb-1 text-white sm:text-xl">
                  Code Quality Analysis
                </h3>
                <p className="text-gray-300 text-sm sm:text-base">
                  Advanced static analysis to identify code smells, complexity
                  issues, and maintainability concerns.
                </p>
              </CardContent>
            </Card>

            <Card className="feature-card group bg-card-dark border-purple-accent hover:bg-card-dark-hover transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/20">
              <CardContent className="p-5 sm:p-6">
                <div className="mb-3 p-2 bg-purple-accent rounded-lg w-fit group-hover:bg-purple-accent-hover transition-colors">
                  <Shield className="h-5 w-5 text-purple-400 sm:h-6 sm:w-6" />
                </div>
                <h3 className="text-lg font-semibold mb-1 text-white sm:text-xl">
                  Security Scanning
                </h3>
                <p className="text-gray-300 text-sm sm:text-base">
                  Detect vulnerabilities and security issues in your
                  dependencies and code patterns.
                </p>
              </CardContent>
            </Card>

            <Card className="feature-card group bg-card-dark border-purple-accent hover:bg-card-dark-hover transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/20">
              <CardContent className="p-5 sm:p-6">
                <div className="mb-3 p-2 bg-purple-accent rounded-lg w-fit group-hover:bg-purple-accent-hover transition-colors">
                  <TrendingUp className="h-5 w-5 text-purple-400 sm:h-6 sm:w-6" />
                </div>
                <h3 className="text-lg font-semibold mb-1 text-white sm:text-xl">
                  Trend Analysis
                </h3>
                <p className="text-gray-300 text-sm sm:text-base">
                  Track code health over time with detailed metrics and
                  historical comparisons.
                </p>
              </CardContent>
            </Card>

            <Card className="feature-card group bg-card-dark border-purple-accent hover:bg-card-dark-hover transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/20">
              <CardContent className="p-5 sm:p-6">
                <div className="mb-3 p-2 bg-purple-accent rounded-lg w-fit group-hover:bg-purple-accent-hover transition-colors">
                  <Target className="h-5 w-5 text-purple-400 sm:h-6 sm:w-6" />
                </div>
                <h3 className="text-lg font-semibold mb-1 text-white sm:text-xl">
                  AI Recommendations
                </h3>
                <p className="text-gray-300 text-sm sm:text-base">
                  Get personalized suggestions for improving code quality and
                  documentation.
                </p>
              </CardContent>
            </Card>

            <Card className="feature-card group bg-card-dark border-purple-accent hover:bg-card-dark-hover transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/20">
              <CardContent className="p-5 sm:p-6">
                <div className="mb-3 p-2 bg-purple-accent rounded-lg w-fit group-hover:bg-purple-accent-hover transition-colors">
                  <Users className="h-5 w-5 text-purple-400 sm:h-6 sm:w-6" />
                </div>
                <h3 className="text-lg font-semibold mb-1 text-white sm:text-xl">
                  Team Collaboration
                </h3>
                <p className="text-gray-300 text-sm sm:text-base">
                  Share insights and track progress across your development
                  team.
                </p>
              </CardContent>
            </Card>

            <Card className="feature-card group bg-card-dark border-purple-accent hover:bg-card-dark-hover transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/20">
              <CardContent className="p-5 sm:p-6">
                <div className="mb-3 p-2 bg-purple-accent rounded-lg w-fit group-hover:bg-purple-accent-hover transition-colors">
                  <Activity className="h-5 w-5 text-purple-400 sm:h-6 sm:w-6" />
                </div>
                <h3 className="text-lg font-semibold mb-1 text-white sm:text-xl">
                  Real-time Monitoring
                </h3>
                <p className="text-gray-300 text-sm sm:text-base">
                  Continuous monitoring with instant alerts for critical issues
                  and regressions.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-4 py-16 text-center sm:px-6 md:py-20">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              Ready to Improve Your Code Health?
            </h2>
            <p className="text-base md:text-xl text-gray-300 mb-8">
              Join thousands of developers who trust CodeHealth to maintain
              better codebases.
            </p>
            <Link href="/auth/signup">
              <Button
                size="lg"
                className="bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-700 hover:to-purple-900 text-base sm:text-lg px-6 py-3 w-full sm:w-auto"
              >
                Start Your Free Analysis
                <Zap className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
