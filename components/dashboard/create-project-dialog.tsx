"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Github, Plus, AlertTriangle, Crown, Zap, Shield } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectCreated: () => void;
  dailyUsage?: number;
}

interface SubscriptionStatus {
  isActive: boolean;
  isPremium: boolean;
  plan: "free" | "premium" | "admin";
  projectsUsed: number;
  projectsLimit: number;
  isAdmin: boolean;
}

export function CreateProjectDialog({
  open,
  onOpenChange,
  onProjectCreated,
  dailyUsage = 0,
}: CreateProjectDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] =
    useState<SubscriptionStatus | null>(null);

  useEffect(() => {
    if (open) {
      fetchSubscriptionStatus();
    }
  }, [open]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subscriptionStatus) {
      toast.error("Unable to verify subscription status");
      return;
    }

    if (
      !subscriptionStatus.isAdmin &&
      subscriptionStatus.projectsUsed >= subscriptionStatus.projectsLimit
    ) {
      toast.error(
        `Project limit reached. You can only add ${subscriptionStatus.projectsLimit} repositories total.`
      );
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, repoUrl }),
      });

      if (response.ok) {
        toast.success("Project created successfully!");
        setName("");
        setDescription("");
        setRepoUrl("");
        onProjectCreated();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to create project");
      }
    } catch (error) {
      toast.error("Failed to create project");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUrlBlur = () => {
    if (repoUrl && !name) {
      // Auto-fill project name from repo URL
      const match = repoUrl.match(/github\.com\/[^\/]+\/([^\/\?]+)/);
      if (match) {
        setName(match[1].replace(/\.git$/, ""));
      }
    }
  };

  const isLimitReached =
    subscriptionStatus &&
    !subscriptionStatus.isAdmin &&
    subscriptionStatus.projectsUsed >= subscriptionStatus.projectsLimit;

  const getPlanIcon = () => {
    if (subscriptionStatus?.isAdmin)
      return <Shield className="h-4 w-4 text-red-400" />;
    if (subscriptionStatus?.isPremium)
      return <Crown className="h-4 w-4 text-yellow-400" />;
    return <Zap className="h-4 w-4 text-slate-400" />;
  };

  const getPlanColor = () => {
    if (subscriptionStatus?.isAdmin)
      return "bg-red-500/20 text-red-400 border-red-500/30";
    if (subscriptionStatus?.isPremium)
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    return "bg-slate-500/20 text-slate-400 border-slate-500/30";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Github className="h-5 w-5 mr-2 text-purple-400" />
            Add New Project
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Add a GitHub repository to start monitoring its health.
            {subscriptionStatus && (
              <div className="flex items-center justify-between mt-3 p-3 bg-slate-700/30 rounded-lg">
                <div className="flex items-center space-x-2">
                  {getPlanIcon()}
                  <span className="text-sm">
                    {subscriptionStatus.plan.toUpperCase()} Plan
                  </span>
                </div>
                <Badge className={getPlanColor()}>
                  {subscriptionStatus.isAdmin
                    ? `${subscriptionStatus.projectsUsed} projects (Unlimited)`
                    : `${subscriptionStatus.projectsUsed}/${subscriptionStatus.projectsLimit} projects`}
                </Badge>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        {isLimitReached ? (
          <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-400" />
              <div>
                <p className="text-orange-300 font-medium">
                  Project Limit Reached
                </p>
                <p className="text-orange-400 text-sm">
                  You have reached your limit of{" "}
                  {subscriptionStatus?.projectsLimit} repositories. Upgrade to
                  Premium for unlimited repositories.
                </p>
                <Link href="/billing">
                  <Button
                    className="mt-3 bg-gradient-to-r from-purple-600 to-yellow-600 hover:from-purple-700 hover:to-yellow-700 text-white"
                    size="sm"
                  >
                    <Crown className="h-4 w-4 mr-2" />
                    Upgrade to Premium
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="repoUrl" className="text-slate-300">
                Repository URL *
              </Label>
              <Input
                id="repoUrl"
                type="url"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                onBlur={handleUrlBlur}
                placeholder="https://github.com/username/repository"
                className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-purple-500"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name" className="text-slate-300">
                Project Name *
              </Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Awesome Project"
                className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-purple-500"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-slate-300">
                Description
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of your project..."
                className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-purple-500 resize-none"
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="text-slate-300 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isLoading ? (
                  "Creating..."
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Project
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
