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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  User,
  Bell,
  Shield,
  Key,
  Trash2,
  Save,
  ArrowLeft,
  Crown,
  Mail,
  Lock,
  Globe,
  Palette,
  Volume2,
  Download,
  Upload,
} from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/header";
import { toast } from "sonner";
import Link from "next/link";

interface UserSettings {
  name: string;
  email: string;
  notifications: {
    analysisComplete: boolean;
    weeklyReport: boolean;
    securityAlerts: boolean;
    productUpdates: boolean;
  };
  preferences: {
    theme: "dark" | "light" | "system";
    language: string;
    timezone: string;
    voiceSpeed: number;
    autoPlayAudio: boolean;
  };
  privacy: {
    profileVisible: boolean;
    shareAnalytics: boolean;
    allowDataExport: boolean;
  };
}

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [settings, setSettings] = useState<UserSettings>({
    name: "",
    email: "",
    notifications: {
      analysisComplete: true,
      weeklyReport: false,
      securityAlerts: true,
      productUpdates: false,
    },
    preferences: {
      theme: "dark",
      language: "en",
      timezone: "UTC",
      voiceSpeed: 1.0,
      autoPlayAudio: false,
    },
    privacy: {
      profileVisible: false,
      shareAnalytics: true,
      allowDataExport: true,
    },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<any>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }

    if (status === "authenticated") {
      loadSettings();
      fetchSubscriptionStatus();
    }
  }, [status, router]);

  useEffect(() => {
    if (settings.name || settings.email) {
      const ctx = gsap.context(() => {
        gsap.fromTo(
          ".settings-card",
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: "power3.out" }
        );
      }, pageRef);

      return () => ctx.revert();
    }
  }, [settings]);

  const loadSettings = () => {
    // Load settings from session and localStorage
    if (session?.user) {
      setSettings((prev) => ({
        ...prev,
        name: session.user.name || "",
        email: session.user.email || "",
      }));
    }

    // Load preferences from localStorage
    const savedPreferences = localStorage.getItem("QuantaCode-preferences");
    if (savedPreferences) {
      try {
        const preferences = JSON.parse(savedPreferences);
        setSettings((prev) => ({
          ...prev,
          preferences: { ...prev.preferences, ...preferences },
        }));
      } catch (error) {
        console.error("Failed to load preferences:", error);
      }
    }

    setIsLoading(false);
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

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      // Save preferences to localStorage
      localStorage.setItem(
        "QuantaCode-preferences",
        JSON.stringify(settings.preferences)
      );

      // In a real app, you would also save to the backend
      // await fetch('/api/user/settings', {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(settings),
      // });

      toast.success("Settings saved successfully!");
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const exportData = async () => {
    try {
      const response = await fetch("/api/user/export");
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `QuantaCode-data-${
          new Date().toISOString().split("T")[0]
        }.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success("Data exported successfully!");
      }
    } catch (error) {
      toast.error("Failed to export data");
    }
  };

  const deleteAccount = async () => {
    if (
      !confirm(
        "Are you sure you want to delete your account? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const response = await fetch("/api/user/delete", {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Account deleted successfully");
        router.push("/");
      } else {
        toast.error("Failed to delete account");
      }
    } catch (error) {
      toast.error("Failed to delete account");
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

          <h1 className="text-4xl font-bold text-white mb-2">Settings</h1>
          <p className="text-slate-300 text-lg">
            Manage your account preferences and privacy settings.
          </p>
        </div>

        {/* Subscription Status */}
        {subscriptionStatus && (
          <Card className="settings-card bg-background border-slate-700 mb-8">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {subscriptionStatus.isAdmin ? (
                    <Shield className="h-6 w-6 text-red-400" />
                  ) : subscriptionStatus.isPremium ? (
                    <Crown className="h-6 w-6 text-yellow-400" />
                  ) : (
                    <User className="h-6 w-6 text-slate-400" />
                  )}
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {subscriptionStatus.plan.toUpperCase()} Plan
                    </h3>
                    <p className="text-slate-400">
                      {subscriptionStatus.isAdmin
                        ? "Full platform access with unlimited features"
                        : subscriptionStatus.isPremium
                        ? "Premium features with unlimited repositories"
                        : "Free plan with limited features"}
                    </p>
                  </div>
                </div>
                {!subscriptionStatus.isAdmin &&
                  !subscriptionStatus.isPremium && (
                    <Link href="/billing">
                      <Button className="bg-gradient-to-r from-purple-600 to-yellow-600 hover:from-purple-700 hover:to-yellow-700">
                        <Crown className="h-4 w-4 mr-2" />
                        Upgrade to Premium
                      </Button>
                    </Link>
                  )}
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="bg-slate-800 border-slate-700">
            <TabsTrigger
              value="profile"
              className="data-[state=active]:bg-purple-600"
            >
              <User className="h-4 w-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger
              value="notifications"
              className="data-[state=active]:bg-purple-600"
            >
              <Bell className="h-4 w-4 mr-2" />
              Notifications
            </TabsTrigger>
            <TabsTrigger
              value="preferences"
              className="data-[state=active]:bg-purple-600"
            >
              <Palette className="h-4 w-4 mr-2" />
              Preferences
            </TabsTrigger>
            <TabsTrigger
              value="privacy"
              className="data-[state=active]:bg-purple-600"
            >
              <Shield className="h-4 w-4 mr-2" />
              Privacy
            </TabsTrigger>
            <TabsTrigger
              value="security"
              className="data-[state=active]:bg-purple-600"
            >
              <Lock className="h-4 w-4 mr-2" />
              Security
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <Card className="settings-card bg-background border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">
                  Profile Information
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Update your personal information and profile details.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-slate-300">
                      Full Name
                    </Label>
                    <Input
                      id="name"
                      value={settings.name}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      className="bg-slate-700/50 border-slate-600 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-slate-300">
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={settings.email}
                      disabled
                      className="bg-slate-700/30 border-slate-600 text-slate-400"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio" className="text-slate-300">
                    Bio
                  </Label>
                  <Textarea
                    id="bio"
                    placeholder="Tell us about yourself..."
                    className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card className="settings-card bg-background border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">
                  Notification Preferences
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Choose what notifications you want to receive.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-white font-medium">
                      Analysis Complete
                    </h4>
                    <p className="text-slate-400 text-sm">
                      Get notified when repository analysis is finished
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.analysisComplete}
                    onCheckedChange={(checked) =>
                      setSettings((prev) => ({
                        ...prev,
                        notifications: {
                          ...prev.notifications,
                          analysisComplete: checked,
                        },
                      }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-white font-medium">Weekly Reports</h4>
                    <p className="text-slate-400 text-sm">
                      Receive weekly summaries of your projects
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.weeklyReport}
                    onCheckedChange={(checked) =>
                      setSettings((prev) => ({
                        ...prev,
                        notifications: {
                          ...prev.notifications,
                          weeklyReport: checked,
                        },
                      }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-white font-medium">Security Alerts</h4>
                    <p className="text-slate-400 text-sm">
                      Important security notifications and vulnerabilities
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.securityAlerts}
                    onCheckedChange={(checked) =>
                      setSettings((prev) => ({
                        ...prev,
                        notifications: {
                          ...prev.notifications,
                          securityAlerts: checked,
                        },
                      }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-white font-medium">Product Updates</h4>
                    <p className="text-slate-400 text-sm">
                      News about new features and improvements
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.productUpdates}
                    onCheckedChange={(checked) =>
                      setSettings((prev) => ({
                        ...prev,
                        notifications: {
                          ...prev.notifications,
                          productUpdates: checked,
                        },
                      }))
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preferences" className="space-y-6">
            <Card className="settings-card bg-background border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">
                  Application Preferences
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Customize your QuantaCode experience.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Theme</Label>
                    <select
                      value={settings.preferences.theme}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          preferences: {
                            ...prev.preferences,
                            theme: e.target.value as
                              | "dark"
                              | "light"
                              | "system",
                          },
                        }))
                      }
                      className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white"
                    >
                      <option value="dark">Dark</option>
                      <option value="light">Light</option>
                      <option value="system">System</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-300">Language</Label>
                    <select
                      value={settings.preferences.language}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          preferences: {
                            ...prev.preferences,
                            language: e.target.value,
                          },
                        }))
                      }
                      className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white"
                    >
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">Voice Speed</Label>
                  <div className="flex items-center space-x-4">
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={settings.preferences.voiceSpeed}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          preferences: {
                            ...prev.preferences,
                            voiceSpeed: parseFloat(e.target.value),
                          },
                        }))
                      }
                      className="flex-1"
                    />
                    <span className="text-white text-sm w-12">
                      {settings.preferences.voiceSpeed}x
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-white font-medium">Auto-play Audio</h4>
                    <p className="text-slate-400 text-sm">
                      Automatically play voice responses
                    </p>
                  </div>
                  <Switch
                    checked={settings.preferences.autoPlayAudio}
                    onCheckedChange={(checked) =>
                      setSettings((prev) => ({
                        ...prev,
                        preferences: {
                          ...prev.preferences,
                          autoPlayAudio: checked,
                        },
                      }))
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="privacy" className="space-y-6">
            <Card className="settings-card bg-background border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Privacy Settings</CardTitle>
                <CardDescription className="text-slate-400">
                  Control your privacy and data sharing preferences.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-white font-medium">Public Profile</h4>
                    <p className="text-slate-400 text-sm">
                      Make your profile visible to other users
                    </p>
                  </div>
                  <Switch
                    checked={settings.privacy.profileVisible}
                    onCheckedChange={(checked) =>
                      setSettings((prev) => ({
                        ...prev,
                        privacy: { ...prev.privacy, profileVisible: checked },
                      }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-white font-medium">Share Analytics</h4>
                    <p className="text-slate-400 text-sm">
                      Help improve QuantaCode by sharing anonymous usage data
                    </p>
                  </div>
                  <Switch
                    checked={settings.privacy.shareAnalytics}
                    onCheckedChange={(checked) =>
                      setSettings((prev) => ({
                        ...prev,
                        privacy: { ...prev.privacy, shareAnalytics: checked },
                      }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-white font-medium">Data Export</h4>
                    <p className="text-slate-400 text-sm">
                      Allow exporting your data
                    </p>
                  </div>
                  <Switch
                    checked={settings.privacy.allowDataExport}
                    onCheckedChange={(checked) =>
                      setSettings((prev) => ({
                        ...prev,
                        privacy: { ...prev.privacy, allowDataExport: checked },
                      }))
                    }
                  />
                </div>

                {settings.privacy.allowDataExport && (
                  <div className="pt-4 border-t border-slate-700">
                    <Button
                      onClick={exportData}
                      variant="outline"
                      className="border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export My Data
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card className="settings-card bg-background border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Security Settings</CardTitle>
                <CardDescription className="text-slate-400">
                  Manage your account security and authentication.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h4 className="text-white font-medium">Change Password</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-slate-300">Current Password</Label>
                      <Input
                        type="password"
                        className="bg-slate-700/50 border-slate-600 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300">New Password</Label>
                      <Input
                        type="password"
                        className="bg-slate-700/50 border-slate-600 text-white"
                      />
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    <Key className="h-4 w-4 mr-2" />
                    Update Password
                  </Button>
                </div>

                <div className="pt-6 border-t border-slate-700">
                  <h4 className="text-red-400 font-medium mb-4">Danger Zone</h4>
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <h5 className="text-red-300 font-medium mb-2">
                      Delete Account
                    </h5>
                    <p className="text-red-400 text-sm mb-4">
                      Permanently delete your account and all associated data.
                      This action cannot be undone.
                    </p>
                    <Button
                      onClick={deleteAccount}
                      variant="destructive"
                      className="bg-red-600 hover:bg-red-700"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Account
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        <div className="settings-card flex justify-end pt-6">
          <Button
            onClick={saveSettings}
            disabled={isSaving}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isSaving ? (
              <>
                <Save className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </main>
    </div>
  );
}
