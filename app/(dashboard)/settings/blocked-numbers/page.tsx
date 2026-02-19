"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Phone,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle,
  Shield,
} from "lucide-react";
import { useAdminApi } from "@/hooks/useAdminApi";
import { useAuth } from "@/contexts/AuthContext";

interface BlockedNumber {
  id: string;
  phone_number: string;
  reason?: string;
  created_at: string;
}

export default function BlockedNumbers() {
  const [blockedNumbers, setBlockedNumbers] = useState<BlockedNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddNumber, setShowAddNumber] = useState(false);
  const [newNumber, setNewNumber] = useState({ phone_number: "", reason: "" });
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const { adminRequest } = useAdminApi();
  const { isAuthenticated } = useAuth();

  const fetchBlockedNumbers = useCallback(async () => {
    try {
      const response = await adminRequest("/blocked-numbers", {
        method: "GET",
      });
      if (response) {
        setBlockedNumbers(response);
      }
    } catch (error) {
      console.error("Failed to fetch blocked numbers:", error);
    } finally {
      setLoading(false);
    }
  }, [adminRequest]);

  useEffect(() => {
    fetchBlockedNumbers();
  }, [fetchBlockedNumbers]);

  const addBlockedNumber = async () => {
    try {
      await adminRequest("/blocked-numbers", {
        method: "POST",
        body: JSON.stringify(newNumber),
      });

      setShowAddNumber(false);
      setNewNumber({ phone_number: "", reason: "" });
      fetchBlockedNumbers();
      setMessage({ type: "success", text: "Number blocked successfully" });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: "error", text: "Failed to block number" });
    }
  };

  const removeBlockedNumber = async (id: string) => {
    if (!confirm("Are you sure you want to unblock this number?")) return;

    try {
      await adminRequest(`/blocked-numbers/${id}`, { method: "DELETE" });
      fetchBlockedNumbers();
      setMessage({ type: "success", text: "Number unblocked" });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: "error", text: "Failed to unblock number" });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold font-serif">Blocked Numbers</h1>
          </div>
          <div className="grid gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-48"></div>
                      <div className="h-3 bg-gray-200 rounded w-32"></div>
                    </div>
                    <div className="h-8 bg-gray-200 rounded w-20"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2 font-serif">
            <Shield className="h-8 w-8" />
            Blocked Numbers
          </h1>
          <p className="text-muted-foreground">
            Numbers that will not be transcribed
          </p>
        </div>

        {isAuthenticated && (
            <Dialog open={showAddNumber} onOpenChange={setShowAddNumber}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Block Number
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Block Phone Number</DialogTitle>
                  <DialogDescription>
                    Calls from this number will be skipped and not transcribed
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone-number">Phone Number</Label>
                    <Input
                      id="phone-number"
                      value={newNumber.phone_number}
                      onChange={(e) =>
                        setNewNumber({
                          ...newNumber,
                          phone_number: e.target.value,
                        })
                      }
                      placeholder="+46123456789"
                    />
                    <p className="text-sm text-muted-foreground">
                      Include country code for best results
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reason">Reason (Optional)</Label>
                    <Input
                      id="reason"
                      value={newNumber.reason}
                      onChange={(e) =>
                        setNewNumber({ ...newNumber, reason: e.target.value })
                      }
                      placeholder="Spam, personal number, etc."
                    />
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowAddNumber(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={addBlockedNumber}>Block Number</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
      </div>

      {message && (
          <Alert variant={message.type === "error" ? "destructive" : "default"}>
            {message.type === "success" ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Blocked Numbers List</CardTitle>
            <CardDescription>
              {blockedNumbers.length} number
              {blockedNumbers.length !== 1 ? "s" : ""} blocked
            </CardDescription>
          </CardHeader>
          <CardContent>
            {blockedNumbers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No numbers blocked yet</p>
                <p className="text-sm">
                  Click &quot;Block Number&quot; to add one
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {blockedNumbers.map((number) => (
                  <div
                    key={number.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">
                          {number.phone_number}
                        </span>
                        <Badge variant="destructive" className="text-xs">
                          BLOCKED
                        </Badge>
                      </div>
                      {number.reason && (
                        <div className="text-sm text-muted-foreground">
                          Reason: {number.reason}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        Blocked{" "}
                        {new Date(number.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    {isAuthenticated && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeBlockedNumber(number.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-medium mb-2">Privacy Protection</h4>
                <p className="text-muted-foreground">
                  When a call comes from a blocked number, the system will:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
                  <li>Skip transcription entirely</li>
                  <li>Not fetch the recording from Telavox</li>
                  <li>
                    Create a &quot;skipped&quot; call record for audit purposes
                  </li>
                  <li>Never send the audio to any transcription service</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium mb-2">Use Cases</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Personal phone numbers</li>
                  <li>Known spam or marketing numbers</li>
                  <li>Internal test numbers</li>
                  <li>Numbers requiring special privacy handling</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
    </div>
  );
}
