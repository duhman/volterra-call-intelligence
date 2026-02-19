"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Lock, Phone } from "lucide-react";

function LoginForm() {
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const success = await login(password);

    if (success) {
      // Small delay to ensure auth context is fully updated before redirect
      await new Promise(resolve => setTimeout(resolve, 100));
      // Redirect to the page they came from, or dashboard as fallback
      const redirectTo = searchParams.get("redirectTo") || "/dashboard";
      router.push(decodeURIComponent(redirectTo));
    } else {
      toast({
        title: "Login Failed",
        description: "Invalid password. Please try again.",
        variant: "destructive",
      });
    }

    setIsLoading(false);
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Phone className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-2xl">Call Transcription Admin</CardTitle>
        <CardDescription>
          Enter your admin password to access the dashboard
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="Enter admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
                required
                data-testid="password-input"
              />
            </div>
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
            data-testid="login-button"
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function Login() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Suspense
        fallback={
          <div className="w-full max-w-md h-64 animate-pulse bg-muted rounded-lg" />
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
