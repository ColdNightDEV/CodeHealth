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
  const partnersRef = useRef<HTMLDivElement>(null);

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

      // Partners animation
      gsap.fromTo(
        ".partner-logo",
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          delay: 1.5,
          stagger: 0.2,
          ease: "power3.out",
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
              <span className="text-xl font-bold sm:text-2xl">QuantaCode</span>
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
              Quantum-Level Code Intelligence
            </h1>

            <p className="hero-subtitle text-base md:text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
              Harness the power of AI to analyze, optimize, and elevate your
              codebase with quantum precision. Get intelligent insights,
              voice-powered analysis, and actionable recommendations.
            </p>

            <div className="hero-buttons flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <Link href="/auth/signup">
                <Button
                  size="lg"
                  className="bg-purple-600 hover:bg-purple-700 text-base sm:text-lg px-6 py-3 w-full sm:w-auto"
                >
                  Start Quantum Analysis
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

        {/* Partners Section */}
        <section
          ref={partnersRef}
          className="container mx-auto px-4 py-12 sm:px-6 md:py-16"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold mb-3 text-white">
              Powered by Industry Leaders
            </h2>
            <p className="text-gray-400 text-sm md:text-base">
              Built for the Bolt Hackathon with cutting-edge technology partners
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12 lg:gap-16">
            {/* Stripe */}
            <div className="partner-logo group">
              <div className="bg-white/5 hover:bg-white/10 transition-all duration-300 rounded-lg p-6 md:p-8">
                <svg
                  className="h-8 md:h-10 w-auto opacity-70 group-hover:opacity-100 transition-opacity duration-300"
                  viewBox="0 0 240 80"
                  fill="currentColor"
                >
                  <path
                    d="M240 40c0-22.091-17.909-40-40-40s-40 17.909-40 40 17.909 40 40 40 40-17.909 40-40zm-40-24c-13.255 0-24 10.745-24 24s10.745 24 24 24 24-10.745 24-24-10.745-24-24-24z"
                    fill="#6772e5"
                  />
                  <path
                    d="M59.64 14.28c1.2 0 2.16.96 2.16 2.16v47.12c0 1.2-.96 2.16-2.16 2.16H14.28c-1.2 0-2.16-.96-2.16-2.16V16.44c0-1.2.96-2.16 2.16-2.16h45.36zm-25.44 9.84c-8.64 0-15.6 6.96-15.6 15.6s6.96 15.6 15.6 15.6c4.32 0 8.16-1.68 11.04-4.32l-3.12-3.12c-2.16 1.92-4.8 2.88-7.92 2.88-5.76 0-10.32-4.56-10.32-10.32s4.56-10.32 10.32-10.32c3.12 0 5.76.96 7.92 2.88l3.12-3.12c-2.88-2.64-6.72-4.32-11.04-4.32z"
                    fill="white"
                  />
                  <text
                    x="80"
                    y="45"
                    fontSize="24"
                    fontWeight="600"
                    fill="white"
                  >
                    Stripe
                  </text>
                </svg>
              </div>
            </div>

            {/* ElevenLabs */}
            <div className="partner-logo group">
              <div className="bg-white/5 hover:bg-white/10 transition-all duration-300 rounded-lg p-6 md:p-8">
                <svg
                  className="h-8 md:h-10 w-auto opacity-70 group-hover:opacity-100 transition-opacity duration-300"
                  viewBox="0 0 694 90"
                  fill="white"
                >
                  <path d="M248.261 22.1901H230.466L251.968 88.5124H271.123L292.625 22.1901H274.83L261.365 72.1488L248.261 22.1901Z" />
                  <path d="M0 0H18.413V88.5124H0V0Z" />
                  <path d="M36.5788 0H54.9917V88.5124H36.5788V0Z" />
                  <path d="M73.1551 0H127.652V14.7521H91.568V35.8264H125.181V50.5785H91.568V73.7603H127.652V88.5124H73.1551V0Z" />
                  <path d="M138.896 0H156.32V88.5124H138.896V0Z" />
                  <path d="M166.824 55.2893C166.824 31.1157 178.811 20.7025 197.471 20.7025C216.131 20.7025 226.759 30.9917 226.759 55.5372V59.5041H184.001C184.619 73.8843 188.944 78.719 197.224 78.719C203.773 78.719 207.851 74.876 208.593 68.1818H226.017C224.905 82.8099 212.795 90 197.224 90C177.452 90 166.824 79.4628 166.824 55.2893ZM209.582 47.9752C208.717 35.8264 204.515 31.8595 197.224 31.8595C189.933 31.8595 185.36 35.9504 184.125 47.9752H209.582Z" />
                  <path d="M295.962 55.2893C295.962 31.1157 307.949 20.7025 326.609 20.7025C345.269 20.7025 355.897 30.9917 355.897 55.5372V59.5041H313.139C313.757 73.8843 318.082 78.719 326.362 78.719C332.911 78.719 336.989 74.876 337.731 68.1818H355.155C354.043 82.8099 341.932 90 326.362 90C306.589 90 295.962 79.4628 295.962 55.2893ZM338.719 47.9752C337.854 35.8264 333.653 31.8595 326.362 31.8595C319.071 31.8595 314.498 35.9504 313.263 47.9752H338.719Z" />
                  <path d="M438.443 0H456.856V73.7603H491.457V88.5124H438.443V0Z" />
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M495.783 55.2893C495.783 30 507.399 20.7025 522.352 20.7025C529.766 20.7025 536.563 24.9174 539.282 29.3802V22.1901H557.077V88.5124H539.776V80.7025C537.181 85.9091 529.89 90 521.857 90C506.04 90 495.783 79.8347 495.783 55.2893ZM526.924 33.719C535.574 33.719 540.27 40.2893 540.27 55.2893C540.27 70.2893 535.574 76.9835 526.924 76.9835C518.274 76.9835 513.331 70.2893 513.331 55.2893C513.331 40.2893 518.274 33.719 526.924 33.719Z"
                  />
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M587.847 80.7025V88.5124H570.547V0H587.971V29.3802C590.937 24.7934 597.857 20.7025 605.272 20.7025C619.854 20.7025 631.47 30 631.47 55.2893C631.47 80.5785 620.101 90 604.901 90C596.869 90 590.319 85.9091 587.847 80.7025ZM600.329 33.843C608.979 33.843 613.922 40.2893 613.922 55.2893C613.922 70.2893 608.979 76.9835 600.329 76.9835C591.678 76.9835 586.982 70.2893 586.982 55.2893C586.982 40.2893 591.678 33.843 600.329 33.843Z"
                  />
                  <path d="M638.638 68.8017H656.062C656.309 75.7438 660.016 79.0909 666.566 79.0909C673.115 79.0909 676.823 76.1157 676.823 70.9091C676.823 66.1983 673.981 64.4628 667.802 62.9752L662.488 61.6116C647.412 57.7686 639.873 53.6777 639.873 41.157C639.873 28.6364 651.49 20.7025 666.319 20.7025C681.148 20.7025 692.394 26.5289 692.888 40.2893H675.463C675.093 34.2149 671.385 31.6116 666.072 31.6116C660.758 31.6116 657.05 34.2149 657.05 39.1736C657.05 43.7603 660.016 45.4959 665.207 46.7355L670.644 48.0992C684.979 51.6942 694 55.2893 694 68.6777C694 82.0661 682.137 90 666.072 90C648.647 90 639.008 83.4297 638.638 68.8017Z" />
                  <path d="M384.072 49.4628C384.072 39.0496 389.015 33.3471 396.677 33.3471C402.979 33.3471 406.563 37.314 406.563 45.8678V88.5124H423.987V43.1405C423.987 27.7686 415.337 20.7025 402.732 20.7025C394.205 20.7025 387.162 25.0413 384.072 30.7438V22.1901H366.401V88.5124H384.072V49.4628Z" />
                </svg>
              </div>
            </div>

            {/* Netlify */}
            <div className="partner-logo group">
              <div className="bg-white/5 hover:bg-white/10 transition-all duration-300 rounded-lg p-6 md:p-8">
                <svg
                  className="h-8 md:h-10 w-auto opacity-70 group-hover:opacity-100 transition-opacity duration-300"
                  viewBox="0 0 128 113"
                  fill="currentColor"
                >
                  <path
                    d="M34.6,94.1h-1.2l-6-6v-1.2l9.2-9.2H43l0.9,0.9v6.4L34.6,94.1z"
                    fill="#05BDBA"
                  />
                  <path
                    d="M27.4,25.8v-1.2l6-6h1.2l9.2,9.2v6.4L43,35h-6.4L27.4,25.8z"
                    fill="#05BDBA"
                  />
                  <path
                    d="M80.5,74.6h-8.8l-0.7-0.7V53.3c0-3.7-1.4-6.5-5.8-6.6c-2.3-0.1-4.9,0-7.6,0.1l-0.4,0.4v26.6l-0.7,0.7h-8.8
                    l-0.7-0.7V38.8l0.7-0.7h19.8c7.7,0,13.9,6.2,13.9,13.9v21.9L80.5,74.6z"
                    fill="#014847"
                  />
                  <path
                    d="M35.8,61.4H0.7L0,60.7v-8.8l0.7-0.7h35.1l0.7,0.7v8.8L35.8,61.4z"
                    fill="#05BDBA"
                  />
                  <path
                    d="M127.3,61.4H92.2l-0.7-0.7v-8.8l0.7-0.7h35.1l0.7,0.7v8.8L127.3,61.4z"
                    fill="#05BDBA"
                  />
                  <path
                    d="M58.9,27.1V0.7L59.7,0h8.8l0.7,0.7v26.3l-0.7,0.7h-8.8L58.9,27.1z"
                    fill="#05BDBA"
                  />
                  <path
                    d="M58.9,111.9V85.6l0.7-0.7h8.8l0.7,0.7v26.3l-0.7,0.7h-8.8L58.9,111.9z"
                    fill="#05BDBA"
                  />
                </svg>
                <span className="text-white text-sm font-medium ml-2">
                  Netlify
                </span>
              </div>
            </div>

            {/* Bolt.new */}
            <div className="partner-logo group">
              <div className="bg-white/5 hover:bg-white/10 transition-all duration-300 rounded-lg p-6 md:p-8">
                <svg
                  className="h-8 md:h-10 w-auto opacity-70 group-hover:opacity-100 transition-opacity duration-300"
                  viewBox="0 0 360 166"
                  fill="white"
                >
                  <path d="M 224.97 0.32 L 219.34 25.99 A 0.54 0.53 -83.9 0 0 219.86 26.64 L 230.58 26.64 A 0.52 0.51 -83.7 0 1 231.08 27.27 L 227.10 45.43 A 0.72 0.71 -84.0 0 1 226.40 46.00 L 215.35 46.00 A 0.77 0.77 0.0 0 0 214.60 46.61 Q 213.34 52.74 212.01 58.51 C 211.04 62.68 210.10 67.42 215.30 68.19 Q 217.09 68.45 219.26 67.85 A 0.49 0.49 0.0 0 1 219.88 68.32 L 219.88 84.96 A 0.99 0.97 -16.2 0 1 219.41 85.79 Q 217.49 86.97 214.49 87.47 C 202.26 89.54 184.11 85.85 187.57 68.76 Q 188.53 64.01 192.35 46.67 A 0.55 0.54 -83.6 0 0 191.82 46.00 L 183.15 46.00 A 0.42 0.42 0.0 0 1 182.74 45.49 L 186.76 27.19 A 0.70 0.70 0.0 0 1 187.44 26.64 L 196.19 26.64 A 0.80 0.79 5.8 0 0 196.97 26.01 L 200.30 10.83 A 1.04 1.02 85.7 0 1 200.92 10.10 L 224.86 0.22 A 0.08 0.08 0.0 0 1 224.97 0.32 Z" />
                  <path d="M 37.53 32.06 C 41.33 28.57 44.78 26.06 50.10 25.37 C 64.04 23.56 73.99 32.54 75.11 46.23 C 76.15 58.96 71.70 73.13 61.75 81.54 C 53.06 88.87 39.22 90.50 29.76 83.68 C 28.83 83.01 27.75 81.72 26.90 80.82 A 0.43 0.43 0.0 0 0 26.17 81.02 L 25.13 85.72 A 1.69 1.66 -8.5 0 1 24.29 86.84 L 0.40 99.54 A 0.30 0.29 82.9 0 1 -0.02 99.21 L 20.83 4.14 A 0.35 0.34 6.2 0 1 21.17 3.87 L 42.58 3.87 A 0.48 0.47 -83.6 0 1 43.04 4.45 L 37.05 31.78 A 0.29 0.29 0.0 0 0 37.53 32.06 Z" />
                  <path d="M 167.55 86.53 L 145.99 86.53 A 0.35 0.35 0.0 0 1 145.64 86.11 L 163.62 4.15 A 0.35 0.35 0.0 0 1 163.96 3.87 L 185.53 3.87 A 0.35 0.35 0.0 0 1 185.88 4.30 L 167.89 86.26 A 0.35 0.35 0.0 0 1 167.55 86.53 Z" />
                  <path d="M 121.90 85.87 C 103.54 92.15 78.19 84.89 77.54 61.29 C 77.13 46.07 86.37 32.25 100.84 27.29 C 119.20 21.01 144.55 28.27 145.20 51.88 C 145.62 67.09 136.38 80.92 121.90 85.87 Z" />
                </svg>
                <span className="text-white text-sm font-medium ml-2">
                  bolt.new
                </span>
              </div>
            </div>
          </div>

          <div className="text-center mt-8">
            <Badge className="bg-purple-accent/20 text-purple-light border-purple-accent text-xs">
              Built for Bolt Hackathon 2024
            </Badge>
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
              Quantum-Powered Features
            </h2>
            <p className="text-base md:text-xl text-gray-300 max-w-2xl mx-auto">
              Everything you need to achieve quantum-level code excellence and
              maintainability
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            <Card className="feature-card group bg-card-dark border-purple-accent hover:bg-card-dark-hover transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/20">
              <CardContent className="p-5 sm:p-6">
                <div className="mb-3 p-2 bg-purple-accent rounded-lg w-fit group-hover:bg-purple-accent-hover transition-colors">
                  <Code2 className="h-5 w-5 text-purple-400 sm:h-6 sm:w-6" />
                </div>
                <h3 className="text-lg font-semibold mb-1 text-white sm:text-xl">
                  Quantum Code Analysis
                </h3>
                <p className="text-gray-300 text-sm sm:text-base">
                  Advanced AI-powered analysis that identifies code patterns,
                  complexity issues, and optimization opportunities with quantum
                  precision.
                </p>
              </CardContent>
            </Card>

            <Card className="feature-card group bg-card-dark border-purple-accent hover:bg-card-dark-hover transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/20">
              <CardContent className="p-5 sm:p-6">
                <div className="mb-3 p-2 bg-purple-accent rounded-lg w-fit group-hover:bg-purple-accent-hover transition-colors">
                  <Shield className="h-5 w-5 text-purple-400 sm:h-6 sm:w-6" />
                </div>
                <h3 className="text-lg font-semibold mb-1 text-white sm:text-xl">
                  Security Intelligence
                </h3>
                <p className="text-gray-300 text-sm sm:text-base">
                  Detect vulnerabilities and security issues with quantum-level
                  precision across your dependencies and code patterns.
                </p>
              </CardContent>
            </Card>

            <Card className="feature-card group bg-card-dark border-purple-accent hover:bg-card-dark-hover transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/20">
              <CardContent className="p-5 sm:p-6">
                <div className="mb-3 p-2 bg-purple-accent rounded-lg w-fit group-hover:bg-purple-accent-hover transition-colors">
                  <TrendingUp className="h-5 w-5 text-purple-400 sm:h-6 sm:w-6" />
                </div>
                <h3 className="text-lg font-semibold mb-1 text-white sm:text-xl">
                  Quantum Metrics
                </h3>
                <p className="text-gray-300 text-sm sm:text-base">
                  Track code health evolution over time with detailed quantum
                  metrics and predictive analytics.
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
                  Get quantum-powered suggestions for improving code quality,
                  architecture, and performance optimization.
                </p>
              </CardContent>
            </Card>

            <Card className="feature-card group bg-card-dark border-purple-accent hover:bg-card-dark-hover transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/20">
              <CardContent className="p-5 sm:p-6">
                <div className="mb-3 p-2 bg-purple-accent rounded-lg w-fit group-hover:bg-purple-accent-hover transition-colors">
                  <Users className="h-5 w-5 text-purple-400 sm:h-6 sm:w-6" />
                </div>
                <h3 className="text-lg font-semibold mb-1 text-white sm:text-xl">
                  Team Synchronization
                </h3>
                <p className="text-gray-300 text-sm sm:text-base">
                  Quantum-level collaboration tools to share insights and
                  synchronize progress across your development team.
                </p>
              </CardContent>
            </Card>

            <Card className="feature-card group bg-card-dark border-purple-accent hover:bg-card-dark-hover transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/20">
              <CardContent className="p-5 sm:p-6">
                <div className="mb-3 p-2 bg-purple-accent rounded-lg w-fit group-hover:bg-purple-accent-hover transition-colors">
                  <Activity className="h-5 w-5 text-purple-400 sm:h-6 sm:w-6" />
                </div>
                <h3 className="text-lg font-semibold mb-1 text-white sm:text-xl">
                  Real-time Quantum Monitoring
                </h3>
                <p className="text-gray-300 text-sm sm:text-base">
                  Continuous quantum-level monitoring with instant alerts for
                  critical issues and performance regressions.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-4 py-16 text-center sm:px-6 md:py-20">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              Ready to Achieve Quantum Code Excellence?
            </h2>
            <p className="text-base md:text-xl text-gray-300 mb-8">
              Join thousands of developers who trust QuantaCode to maintain
              superior, quantum-level codebases.
            </p>
            <Link href="/auth/signup">
              <Button
                size="lg"
                className="bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-700 hover:to-purple-900 text-base sm:text-lg px-6 py-3 w-full sm:w-auto"
              >
                Start Your Quantum Analysis
                <Zap className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
