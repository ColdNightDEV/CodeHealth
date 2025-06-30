"use client";

import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Activity,
  LogOut,
  Settings,
  User,
  CreditCard,
  Crown,
  BarChart3,
  Shield,
  Menu,
  X,
} from "lucide-react";
import Link from "next/link";

export function DashboardHeader() {
  const { data: session } = useSession();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSignOut = () => {
    signOut({ callbackUrl: "/" });
  };

  // Check if user is admin
  const isAdmin = session?.user?.email === "admin@codehealth.com";

  const navigationItems = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: Activity,
      show: true,
    },
    {
      href: "/admin",
      label: "Analytics",
      icon: BarChart3,
      show: isAdmin,
    },
    {
      href: "/billing",
      label: "Billing",
      icon: CreditCard,
      show: true,
    },
  ];

  return (
    <header className="border-b border-purple-accent bg-black/50 backdrop-blur-sm">
      <div className="container mx-auto px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center space-x-2">
            <Activity className="h-6 w-6 sm:h-8 sm:w-8 text-purple-400" />
            <span className="text-xl sm:text-2xl font-bold text-white">
              CodeHealth
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navigationItems
              .filter((item) => item.show)
              .map((item) => (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-300 hover:text-white hover:bg-purple-accent"
                  >
                    <item.icon className="h-4 w-4 mr-2" />
                    {item.label}
                  </Button>
                </Link>
              ))}
          </nav>

          {/* Right Side */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Admin Badge */}
            {isAdmin && (
              <Badge
                variant={"outline"}
                className="hidden sm:flex bg-purple-500/20 text-purple-400 border-purple-500/30"
              >
                <Shield className="h-3 w-3 mr-1" />
                Admin
              </Badge>
            )}

            {/* Mobile Menu Button */}
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="lg:hidden text-gray-300 hover:text-white"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-[280px] bg-black/90 border-purple-accent"
              >
                <SheetHeader>
                  <SheetTitle className="text-white flex items-center">
                    <Activity className="h-5 w-5 mr-2 text-purple-400" />
                    CodeHealth
                  </SheetTitle>
                </SheetHeader>

                <div className="mt-6 space-y-4">
                  {/* User Info */}
                  <div className="p-4 bg-purple-accent rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-purple-600 text-white">
                          {session?.user?.name?.[0] ||
                            session?.user?.email?.[0] ||
                            "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {session?.user?.name || "User"}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {session?.user?.email}
                        </p>
                        {isAdmin && (
                          <Badge
                            variant={"outline"}
                            className="mt-1 bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs"
                          >
                            <Shield className="h-3 w-3 mr-1" />
                            Admin
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Navigation */}
                  <nav className="space-y-2">
                    {navigationItems
                      .filter((item) => item.show)
                      .map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <Button
                            variant="ghost"
                            className="w-full justify-start text-gray-300 hover:text-white hover:bg-purple-accent"
                          >
                            <item.icon className="h-4 w-4 mr-3" />
                            {item.label}
                          </Button>
                        </Link>
                      ))}
                  </nav>

                  {/* Additional Menu Items */}
                  <div className="pt-4 border-t border-purple-accent space-y-2">
                    <Link
                      href="/settings"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-gray-300 hover:text-white hover:bg-purple-accent"
                      >
                        <Settings className="h-4 w-4 mr-3" />
                        Settings
                      </Button>
                    </Link>

                    <Button
                      variant="ghost"
                      onClick={() => {
                        handleSignOut();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full justify-start text-error hover:text-red-300 hover:bg-red-500/10"
                    >
                      <LogOut className="h-4 w-4 mr-3" />
                      Sign out
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            {/* Desktop User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="hidden lg:flex relative h-10 w-10 rounded-full"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-purple-600 text-white">
                      {session?.user?.name?.[0] ||
                        session?.user?.email?.[0] ||
                        "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-56 bg-black/90 border-purple-accent"
                align="end"
              >
                <DropdownMenuLabel className="text-gray-300">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium text-white">
                      {session?.user?.name || "User"}
                    </p>
                    <p className="text-xs text-gray-400">
                      {session?.user?.email}
                    </p>
                    {isAdmin && (
                      <Badge
                        variant={"outline"}
                        className="bg-purple-500/20 text-purple-400 border-purple-500/30 w-fit"
                      >
                        <Shield className="h-3 w-3 mr-1" />
                        Administrator
                      </Badge>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-purple-accent" />

                <Link href="/dashboard">
                  <DropdownMenuItem className="text-gray-300 hover:bg-purple-accent hover:text-white">
                    <Activity className="mr-2 h-4 w-4" />
                    <span>Dashboard</span>
                  </DropdownMenuItem>
                </Link>

                <Link href="/billing">
                  <DropdownMenuItem className="text-gray-300 hover:bg-purple-accent hover:text-white">
                    <CreditCard className="mr-2 h-4 w-4" />
                    <span>Billing</span>
                  </DropdownMenuItem>
                </Link>

                {isAdmin && (
                  <Link href="/admin">
                    <DropdownMenuItem className="text-gray-300 hover:bg-purple-accent hover:text-white">
                      <BarChart3 className="mr-2 h-4 w-4" />
                      <span>Admin Analytics</span>
                    </DropdownMenuItem>
                  </Link>
                )}

                <Link href="/settings">
                  <DropdownMenuItem className="text-gray-300 hover:bg-purple-accent hover:text-white">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                </Link>

                <DropdownMenuSeparator className="bg-purple-accent" />
                <DropdownMenuItem
                  className="text-error hover:bg-red-500/10 hover:text-red-300"
                  onClick={handleSignOut}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
