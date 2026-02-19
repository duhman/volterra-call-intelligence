"use client";

import { useAuth } from "@/contexts/AuthContext";
import {
  useWebhookUrl,
  useTelavoxDebug,
  useSetting,
  useUpdateSetting,
  useTelavoxKeys,
  useAddTelavoxKey,
  useUpdateTelavoxKey,
  useRemoveTelavoxKey,
  useTestAgentKey,
  useSlackMappings,
  useAddSlackMapping,
  useUpdateSlackMapping,
  useRemoveSlackMapping,
  useCompletedCalls,
  useGenerateSummary,
  useBulkRegenerateSummaries,
} from "@/hooks/useAdminApi";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Copy,
  ExternalLink,
  CheckCircle,
  Bug,
  RefreshCw,
  ShieldAlert,
  Phone,
  Key,
  Plus,
  Trash2,
  Pencil,
  TestTube2,
  AlertTriangle,
  Languages,
  ArrowRight,
  Sparkles,
  RotateCcw,
  Play,
  Power,
  MessageSquare,
} from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

interface AgentApiKey {
  id: string;
  agent_email: string;
  display_name?: string;
  api_key: string;
  hubspot_user_id?: string;
  created_at: string;
}

interface SlackMapping {
  id: string;
  agent_user_id: string;
  slack_user_id: string;
  slack_display_name?: string | null;
  is_active: boolean;
  created_at: string;
}

interface CompletedCall {
  id: string;
  webhook_timestamp: string;
  created_at: string;
  direction: string;
  to_number: string;
  from_number: string;
  agent_email?: string;
}

interface DebugCall {
  number: string;
  dateTime: string;
  recordingId?: string;
  callId: string;
}

interface DebugData {
  summary: {
    total_calls: number;
    outgoing_count: number;
    incoming_count: number;
    with_recording_id: number;
    without_recording_id: number;
  };
  date_range: {
    from: string;
    to: string;
  };
  sample_calls_with_recording: DebugCall[];
  sample_calls_without_recording: DebugCall[];
  available_fields: string[];
  raw_response: unknown;
}

export default function Settings() {
  const { isAuthenticated, isHydrated } = useAuth();
  const { data: webhookData, isLoading } = useWebhookUrl();
  const {
    data: debugData,
    isLoading: isDebugLoading,
    refetch: fetchDebug,
    isFetching: isDebugFetching,
  } = useTelavoxDebug();
  const { data: transcribeUnknownSetting, isLoading: isSettingLoading } =
    useSetting("transcribe_unknown_numbers");
  const { data: hubspotPortalIdSetting, isLoading: isPortalIdLoading } =
    useSetting("hubspot_portal_id");
  const { data: hubspotRegionSetting, isLoading: isRegionLoading } =
    useSetting("hubspot_region");
  const { data: systemEnabledSetting, isLoading: isSystemEnabledLoading } =
    useSetting("system_enabled");
  const { data: telavoxKeysData, isLoading: isKeysLoading } = useTelavoxKeys();
  const addTelavoxKey = useAddTelavoxKey();
  const updateTelavoxKey = useUpdateTelavoxKey();
  const removeTelavoxKey = useRemoveTelavoxKey();
  const testAgentKey = useTestAgentKey();
  const { data: slackMappingsData, isLoading: isSlackMappingsLoading } =
    useSlackMappings();
  const addSlackMapping = useAddSlackMapping();
  const updateSlackMapping = useUpdateSlackMapping();
  const removeSlackMapping = useRemoveSlackMapping();
  const updateSetting = useUpdateSetting();
  const { toast } = useToast();

  // System enabled state (master switch)
  const systemEnabled = systemEnabledSetting?.value !== "false";
  const [copied, setCopied] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  // Slack settings state
  const { data: slackBotTokenSetting, isLoading: isSlackTokenLoading } =
    useSetting("slack_bot_token");
  const { data: slackSigningSecretSetting, isLoading: isSlackSecretLoading } =
    useSetting("slack_signing_secret");
  const [slackBotToken, setSlackBotToken] = useState("");
  const [slackSigningSecret, setSlackSigningSecret] = useState("");
  const [hasSlackChanges, setHasSlackChanges] = useState(false);

  // Add key form state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newApiKey, setNewApiKey] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newHubspotUserId, setNewHubspotUserId] = useState("");

  // Edit key form state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<AgentApiKey | null>(null);
  const [editApiKey, setEditApiKey] = useState("");
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editHubspotUserId, setEditHubspotUserId] = useState("");

  // Slack mapping form state
  const [addSlackDialogOpen, setAddSlackDialogOpen] = useState(false);
  const [editSlackDialogOpen, setEditSlackDialogOpen] = useState(false);
  const [newAgentUserId, setNewAgentUserId] = useState("");
  const [newSlackUserId, setNewSlackUserId] = useState("");
  const [newSlackDisplayName, setNewSlackDisplayName] = useState("");
  const [newSlackActive, setNewSlackActive] = useState(true);
  const [editingSlackMapping, setEditingSlackMapping] =
    useState<SlackMapping | null>(null);
  const [editAgentUserId, setEditAgentUserId] = useState("");
  const [editSlackUserId, setEditSlackUserId] = useState("");
  const [editSlackDisplayName, setEditSlackDisplayName] = useState("");
  const [editSlackActive, setEditSlackActive] = useState(true);

  // Test key state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [testResult, setTestResult] = useState<any>(null);
  const [testingEmail, setTestingEmail] = useState<string | null>(null);

  // Vocabulary replacements state
  const { data: vocabSetting, isLoading: isVocabLoading } = useSetting(
    "vocabulary_replacements",
  );
  const [vocabReplacements, setVocabReplacements] = useState<
    Record<string, string>
  >({});
  const [newVocabFrom, setNewVocabFrom] = useState("");
  const [newVocabTo, setNewVocabTo] = useState("");

  // HubSpot settings state
  const [hubspotPortalId, setHubspotPortalId] = useState("");
  const [hubspotRegion, setHubspotRegion] = useState("");

  // AI Summary state
  const DEFAULT_PROMPT = `You are a sales analyst for Volterra. Write a brief summary of the call in English.

**Transcription:**
{transcription}

**Summarize in two parts:**

**Summary:**
Write 2-4 sentences describing what the call was about, what was clarified or agreed upon, and any projects/properties mentioned. No headers or bullet points.

📋 **Next Steps:**
The specific next action agreed upon (e.g., "Follow-up in February", "Send quote", "Awaiting board decision").`;

  const { data: summaryPromptSetting, isLoading: isSummaryPromptLoading } =
    useSetting("summary_prompt");
  const { data: completedCallsData, isLoading: isCompletedCallsLoading } =
    useCompletedCalls(10);
  const generateSummary = useGenerateSummary();
  const bulkRegenerateSummaries = useBulkRegenerateSummaries();
  const [summaryPrompt, setSummaryPrompt] = useState(DEFAULT_PROMPT);
  const [hasPromptChanges, setHasPromptChanges] = useState(false);
  const [selectedPreviewCall, setSelectedPreviewCall] = useState<string>("");
  const [previewResult, setPreviewResult] = useState<string>("");

  useEffect(() => {
    if (vocabSetting?.value) {
      try {
        setVocabReplacements(JSON.parse(vocabSetting.value));
      } catch {
        setVocabReplacements({});
      }
    }
  }, [vocabSetting]);

  useEffect(() => {
    if (hubspotPortalIdSetting?.value) {
      setHubspotPortalId(hubspotPortalIdSetting.value);
    }
  }, [hubspotPortalIdSetting]);

  useEffect(() => {
    if (hubspotRegionSetting?.value) {
      setHubspotRegion(hubspotRegionSetting.value);
    }
  }, [hubspotRegionSetting]);

  useEffect(() => {
    if (summaryPromptSetting?.value) {
      setSummaryPrompt(summaryPromptSetting.value);
    }
  }, [summaryPromptSetting]);

  useEffect(() => {
    if (slackBotTokenSetting?.value !== undefined) {
      setSlackBotToken(slackBotTokenSetting.value || "");
    }
  }, [slackBotTokenSetting]);

  useEffect(() => {
    if (slackSigningSecretSetting?.value !== undefined) {
      setSlackSigningSecret(slackSigningSecretSetting.value || "");
    }
  }, [slackSigningSecretSetting]);

  const transcribeUnknown = transcribeUnknownSetting?.value === "true";

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast({
      title: "Copied",
      description: "Webhook URL copied to clipboard",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRunDebug = () => {
    setShowDebug(true);
    fetchDebug();
  };

  const handleToggleSystemEnabled = async (checked: boolean) => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please log in to change system settings",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateSetting.mutateAsync({
        key: "system_enabled",
        value: checked ? "true" : "false",
      });
      toast({
        title: checked ? "System Enabled" : "System Paused",
        description: checked
          ? "Call processing has resumed"
          : "Call processing is now paused. Webhooks will still be logged.",
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to update system status";
      toast({
        title: "Error",
        description:
          errorMessage.includes("Unauthorized") || errorMessage.includes("401")
            ? "Please log in to change system settings"
            : errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleToggleTranscribeUnknown = async (checked: boolean) => {
    try {
      await updateSetting.mutateAsync({
        key: "transcribe_unknown_numbers",
        value: checked ? "true" : "false",
      });
      toast({
        title: "Setting updated",
        description: checked
          ? "Unknown numbers will now be transcribed"
          : "Only HubSpot contacts will be transcribed",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to update setting",
        variant: "destructive",
      });
    }
  };

  const handleSaveSlackSettings = async () => {
    try {
      await Promise.all([
        updateSetting.mutateAsync({
          key: "slack_bot_token",
          value: slackBotToken.trim(),
        }),
        updateSetting.mutateAsync({
          key: "slack_signing_secret",
          value: slackSigningSecret.trim(),
        }),
      ]);
      setHasSlackChanges(false);
      toast({
        title: "Slack settings saved",
        description: "Slack consent configuration updated",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to save Slack settings",
        variant: "destructive",
      });
    }
  };

  const handleAddVocabReplacement = async () => {
    if (!newVocabFrom.trim() || !newVocabTo.trim()) return;
    const updated = {
      ...vocabReplacements,
      [newVocabFrom.trim()]: newVocabTo.trim(),
    };
    try {
      await updateSetting.mutateAsync({
        key: "vocabulary_replacements",
        value: JSON.stringify(updated),
      });
      setVocabReplacements(updated);
      setNewVocabFrom("");
      setNewVocabTo("");
      toast({
        title: "Vocabulary updated",
        description: `"${newVocabFrom}" → "${newVocabTo}" added`,
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to save vocabulary",
        variant: "destructive",
      });
    }
  };

  const handleSaveHubSpotSettings = async () => {
    try {
      await Promise.all([
        updateSetting.mutateAsync({
          key: "hubspot_portal_id",
          value: hubspotPortalId.trim(),
        }),
        updateSetting.mutateAsync({
          key: "hubspot_region",
          value: hubspotRegion.trim(),
        }),
      ]);
      toast({
        title: "HubSpot settings saved",
        description: "Contact links will now open directly in HubSpot",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to save HubSpot settings",
        variant: "destructive",
      });
    }
  };

  const handleSaveSummaryPrompt = async () => {
    try {
      await updateSetting.mutateAsync({
        key: "summary_prompt",
        value: summaryPrompt,
      });
      setHasPromptChanges(false);
      toast({
        title: "Prompt saved",
        description: "AI summary prompt has been updated",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to save prompt",
        variant: "destructive",
      });
    }
  };

  const handleResetPrompt = () => {
    setSummaryPrompt(DEFAULT_PROMPT);
    setHasPromptChanges(true);
  };

  const handleGeneratePreview = async () => {
    if (!selectedPreviewCall) {
      toast({
        title: "Select a call",
        description: "Please select a call to generate preview",
        variant: "destructive",
      });
      return;
    }
    setPreviewResult("");
    try {
      const result = await generateSummary.mutateAsync({
        callId: selectedPreviewCall,
        previewOnly: true,
        customPrompt: summaryPrompt,
      });
      setPreviewResult(result.summary);
      toast({
        title: "Preview generated",
        description: "Summary preview has been generated",
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleRemoveVocabReplacement = async (key: string) => {
    const updated = { ...vocabReplacements };
    delete updated[key];
    try {
      await updateSetting.mutateAsync({
        key: "vocabulary_replacements",
        value: JSON.stringify(updated),
      });
      setVocabReplacements(updated);
      toast({ title: "Vocabulary updated", description: `"${key}" removed` });
    } catch {
      toast({
        title: "Error",
        description: "Failed to save vocabulary",
        variant: "destructive",
      });
    }
  };

  const handleAddKey = async () => {
    if (!newEmail || !newApiKey) return;
    try {
      await addTelavoxKey.mutateAsync({
        agent_email: newEmail,
        api_key: newApiKey,
        display_name: newDisplayName || undefined,
        hubspot_user_id: newHubspotUserId || undefined,
      });
      toast({
        title: "API key added",
        description: `Added key for ${newEmail}`,
      });
      setAddDialogOpen(false);
      setNewEmail("");
      setNewApiKey("");
      setNewDisplayName("");
      setNewHubspotUserId("");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleEditKey = async () => {
    if (!editingKey) return;
    try {
      await updateTelavoxKey.mutateAsync({
        id: editingKey.id,
        agent_email: editingKey.agent_email,
        api_key: editApiKey || editingKey.api_key,
        display_name: editDisplayName,
        hubspot_user_id: editHubspotUserId || undefined,
      });
      toast({ title: "API key updated" });
      setEditDialogOpen(false);
      setEditingKey(null);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleAddSlackMapping = async () => {
    if (!newAgentUserId || !newSlackUserId) return;
    try {
      await addSlackMapping.mutateAsync({
        agent_user_id: newAgentUserId.trim(),
        slack_user_id: newSlackUserId.trim(),
        slack_display_name: newSlackDisplayName.trim() || undefined,
        is_active: newSlackActive,
      });
      toast({
        title: "Slack mapping added",
        description: `Mapped ${newAgentUserId} → ${newSlackUserId}`,
      });
      setAddSlackDialogOpen(false);
      setNewAgentUserId("");
      setNewSlackUserId("");
      setNewSlackDisplayName("");
      setNewSlackActive(true);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleEditSlackMapping = async () => {
    if (!editingSlackMapping) return;
    try {
      await updateSlackMapping.mutateAsync({
        id: editingSlackMapping.id,
        agent_user_id: editAgentUserId.trim(),
        slack_user_id: editSlackUserId.trim(),
        slack_display_name: editSlackDisplayName.trim() || undefined,
        is_active: editSlackActive,
      });
      toast({ title: "Slack mapping updated" });
      setEditSlackDialogOpen(false);
      setEditingSlackMapping(null);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleRemoveSlackMapping = async (id: string, agentUserId: string) => {
    try {
      await removeSlackMapping.mutateAsync(id);
      toast({
        title: "Slack mapping removed",
        description: `Removed mapping for ${agentUserId}`,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const openEditSlackDialog = (mapping: SlackMapping) => {
    setEditingSlackMapping(mapping);
    setEditAgentUserId(mapping.agent_user_id);
    setEditSlackUserId(mapping.slack_user_id);
    setEditSlackDisplayName(mapping.slack_display_name || "");
    setEditSlackActive(mapping.is_active);
    setEditSlackDialogOpen(true);
  };

  const handleRemoveKey = async (id: string, email: string) => {
    try {
      await removeTelavoxKey.mutateAsync(id);
      toast({
        title: "API key removed",
        description: `Removed key for ${email}`,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (key: AgentApiKey) => {
    setEditingKey(key);
    setEditApiKey("");
    setEditDisplayName(key.display_name || "");
    setEditHubspotUserId(key.hubspot_user_id || "");
    setEditDialogOpen(true);
  };

  const handleTestKey = async (email: string) => {
    setTestingEmail(email);
    setTestResult(null);
    try {
      const result = await testAgentKey.mutateAsync(email);
      setTestResult(result);
      if (result.api_ok) {
        toast({
          title: "API Key Valid",
          description: `Found ${result.summary?.total_calls || 0} calls (${result.summary?.with_recording_id || 0} with recordings)`,
        });
      } else {
        toast({
          title: "API Key Invalid",
          description: result.error || "The API key is expired or invalid",
          variant: "destructive",
        });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      setTestResult({ error: errorMessage });
      toast({
        title: "Test Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setTestingEmail(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-serif">
          Settings
        </h1>
        <p className="text-muted-foreground">
          Configure your call transcription system
        </p>
      </div>

      {/* Master System Switch */}
      <Card
        className={systemEnabled ? "border-green-500/50" : "border-destructive"}
      >
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Power
              className={`h-5 w-5 ${systemEnabled ? "text-green-500" : "text-destructive"}`}
            />
            System Status
          </CardTitle>
          <CardDescription>
            Master control to pause all call processing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="space-y-1">
              <Label
                htmlFor="system-enabled"
                className="font-medium flex items-center gap-2"
              >
                Call Processing
                {systemEnabled ? (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-600">
                    Active
                  </span>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">
                    Paused
                  </span>
                )}
              </Label>
              <p className="text-sm text-muted-foreground">
                {systemEnabled
                  ? "System is processing incoming calls normally."
                  : "System is paused. Webhooks are logged but not processed."}
              </p>
            </div>
            {isSystemEnabledLoading || !isHydrated ? (
              <Skeleton className="h-6 w-11" />
            ) : (
              <Switch
                id="system-enabled"
                checked={systemEnabled}
                onCheckedChange={handleToggleSystemEnabled}
                disabled={updateSetting.isPending || !isAuthenticated}
              />
            )}
          </div>
          {!systemEnabled && (
            <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-sm text-destructive flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                <span>
                  <strong>System is paused.</strong> Incoming calls are being
                  logged but will not be transcribed until you re-enable the
                  system.
                </span>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Privacy Settings */}
      <Card className="border-amber-500/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
            Privacy Protection
          </CardTitle>
          <CardDescription>
            Control which calls are transcribed to protect personal privacy
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Transcribe unknown toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="space-y-1">
              <Label htmlFor="transcribe-unknown" className="font-medium">
                Transcribe unknown numbers
              </Label>
              <p className="text-sm text-muted-foreground">
                When disabled, only calls to/from numbers in HubSpot will be
                transcribed. This prevents personal calls from being recorded.
              </p>
            </div>
            {isSettingLoading || !isHydrated ? (
              <Skeleton className="h-6 w-11" />
            ) : isAuthenticated ? (
              <Switch
                id="transcribe-unknown"
                checked={transcribeUnknown}
                onCheckedChange={handleToggleTranscribeUnknown}
                disabled={updateSetting.isPending}
              />
            ) : (
              <Badge variant={transcribeUnknown ? "default" : "secondary"}>
                {transcribeUnknown ? "Enabled" : "Disabled"}
              </Badge>
            )}
          </div>

          {/* Blocked numbers link */}
          <Link
            href="/settings/blocked-numbers"
            className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent transition-colors"
          >
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Blocked Numbers</p>
                <p className="text-sm text-muted-foreground">
                  Manage personal numbers that should never be transcribed
                </p>
              </div>
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </Link>
        </CardContent>
      </Card>

      {/* Slack Consent Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Slack Consent
          </CardTitle>
          <CardDescription>
            Configure Slack credentials and map Telavox agents to Slack users
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {(isSlackTokenLoading || isSlackSecretLoading) && !isHydrated ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="slack-bot-token">Slack Bot Token</Label>
                  <Input
                    id="slack-bot-token"
                    type="password"
                    placeholder="xoxb-***"
                    value={slackBotToken}
                    onChange={(e) => {
                      setSlackBotToken(e.target.value);
                      setHasSlackChanges(true);
                    }}
                    disabled={!isAuthenticated}
                  />
                  <p className="text-xs text-muted-foreground">
                    Store in settings or env. Must include chat:write scope.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slack-signing-secret">
                    Slack Signing Secret
                  </Label>
                  <Input
                    id="slack-signing-secret"
                    type="password"
                    placeholder="Signing secret"
                    value={slackSigningSecret}
                    onChange={(e) => {
                      setSlackSigningSecret(e.target.value);
                      setHasSlackChanges(true);
                    }}
                    disabled={!isAuthenticated}
                  />
                  <p className="text-xs text-muted-foreground">
                    Used to verify Slack interactivity requests.
                  </p>
                </div>
              </div>
              {isAuthenticated && (
                <Button
                  onClick={handleSaveSlackSettings}
                  disabled={updateSetting.isPending || !hasSlackChanges}
                >
                  {updateSetting.isPending
                    ? "Saving..."
                    : "Save Slack Settings"}
                </Button>
              )}
            </div>
          )}

          <div className="border-t pt-6 space-y-4">
            <h4 className="font-medium">Agent Slack Mappings</h4>
            <p className="text-sm text-muted-foreground">
              Map Telavox agent_user_id to a Slack user ID (e.g. U12345678).
            </p>

            {isSlackMappingsLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : (slackMappingsData?.mappings?.length ?? 0) > 0 ? (
              <div className="space-y-2">
                {slackMappingsData!.mappings.map((mapping: SlackMapping) => (
                  <div
                    key={mapping.id}
                    className="p-4 rounded-lg border space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {mapping.slack_display_name || mapping.slack_user_id}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          Agent: {mapping.agent_user_id}
                        </p>
                        <p className="text-xs font-mono text-muted-foreground">
                          Slack ID: {mapping.slack_user_id}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {isAuthenticated ? (
                          <>
                            <Switch
                              checked={mapping.is_active}
                              onCheckedChange={(checked) => {
                                updateSlackMapping.mutate(
                                  {
                                    id: mapping.id,
                                    agent_user_id: mapping.agent_user_id,
                                    slack_user_id: mapping.slack_user_id,
                                    slack_display_name:
                                      mapping.slack_display_name || undefined,
                                    is_active: checked,
                                  },
                                  {
                                    onError: (error) => {
                                      const errorMessage =
                                        error instanceof Error
                                          ? error.message
                                          : "Failed to update mapping";
                                      toast({
                                        title: "Error",
                                        description: errorMessage,
                                        variant: "destructive",
                                      });
                                    },
                                  },
                                );
                              }}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditSlackDialog(mapping)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                handleRemoveSlackMapping(
                                  mapping.id,
                                  mapping.agent_user_id,
                                )
                              }
                              disabled={removeSlackMapping.isPending}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        ) : (
                          <Badge
                            variant={
                              mapping.is_active ? "default" : "secondary"
                            }
                          >
                            {mapping.is_active ? "Active" : "Inactive"}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No Slack mappings configured</p>
              </div>
            )}

            {isAuthenticated && (
              <Dialog
                open={addSlackDialogOpen}
                onOpenChange={setAddSlackDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Slack Mapping
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Slack Mapping</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="agent-user-id">Agent User ID</Label>
                      <Input
                        id="agent-user-id"
                        placeholder="Telavox agent_user_id"
                        value={newAgentUserId}
                        onChange={(e) => setNewAgentUserId(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="slack-user-id">Slack User ID</Label>
                      <Input
                        id="slack-user-id"
                        placeholder="U12345678"
                        value={newSlackUserId}
                        onChange={(e) => setNewSlackUserId(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="slack-display-name">
                        Display Name (optional)
                      </Label>
                      <Input
                        id="slack-display-name"
                        placeholder="Agent name in Slack"
                        value={newSlackDisplayName}
                        onChange={(e) => setNewSlackDisplayName(e.target.value)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="slack-active" className="font-medium">
                        Active
                      </Label>
                      <Switch
                        id="slack-active"
                        checked={newSlackActive}
                        onCheckedChange={setNewSlackActive}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button
                      onClick={handleAddSlackMapping}
                      disabled={
                        addSlackMapping.isPending ||
                        !newAgentUserId ||
                        !newSlackUserId
                      }
                    >
                      {addSlackMapping.isPending ? "Adding..." : "Add Mapping"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {isAuthenticated && (
              <Dialog
                open={editSlackDialogOpen}
                onOpenChange={setEditSlackDialogOpen}
              >
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Slack Mapping</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-agent-user-id">Agent User ID</Label>
                      <Input
                        id="edit-agent-user-id"
                        value={editAgentUserId}
                        onChange={(e) => setEditAgentUserId(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-slack-user-id">Slack User ID</Label>
                      <Input
                        id="edit-slack-user-id"
                        value={editSlackUserId}
                        onChange={(e) => setEditSlackUserId(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-slack-display-name">
                        Display Name
                      </Label>
                      <Input
                        id="edit-slack-display-name"
                        value={editSlackDisplayName}
                        onChange={(e) =>
                          setEditSlackDisplayName(e.target.value)
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor="edit-slack-active"
                        className="font-medium"
                      >
                        Active
                      </Label>
                      <Switch
                        id="edit-slack-active"
                        checked={editSlackActive}
                        onCheckedChange={setEditSlackActive}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button
                      onClick={handleEditSlackMapping}
                      disabled={updateSlackMapping.isPending}
                    >
                      {updateSlackMapping.isPending
                        ? "Saving..."
                        : "Save Changes"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardContent>
      </Card>

      {/* HubSpot Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.164 7.93V5.084a2.198 2.198 0 001.267-1.984 2.21 2.21 0 00-4.42 0c0 .873.52 1.626 1.267 1.984V7.93a5.202 5.202 0 00-3.3 1.69l-6.073-4.74a2.18 2.18 0 00.067-.538 2.21 2.21 0 10-2.21 2.21c.474 0 .91-.155 1.267-.413l5.962 4.654a5.252 5.252 0 00-.24 1.572 5.25 5.25 0 005.25 5.25 5.21 5.21 0 002.282-.527l2.27 2.27a1.75 1.75 0 102.43-2.43l-2.27-2.27a5.252 5.252 0 00.527-2.282 5.263 5.263 0 00-4.076-5.126zm-2.1 8.137a2.628 2.628 0 01-2.63-2.63 2.628 2.628 0 012.63-2.63 2.628 2.628 0 012.63 2.63 2.628 2.628 0 01-2.63 2.63z" />
            </svg>
            HubSpot Integration
          </CardTitle>
          <CardDescription>
            Configure your HubSpot portal settings for direct contact links
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isPortalIdLoading || isRegionLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="hubspot-portal-id">Portal ID</Label>
                  <Input
                    id="hubspot-portal-id"
                    placeholder="e.g., YOUR_PORTAL_ID"
                    value={hubspotPortalId}
                    onChange={(e) => setHubspotPortalId(e.target.value)}
                    disabled={!isAuthenticated}
                  />
                  <p className="text-xs text-muted-foreground">
                    Found in your HubSpot URL: app.hubspot.com/contacts/
                    <strong>PORTAL_ID</strong>/...
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hubspot-region">Region (optional)</Label>
                  <Input
                    id="hubspot-region"
                    placeholder="e.g., eu1"
                    value={hubspotRegion}
                    onChange={(e) => setHubspotRegion(e.target.value)}
                    disabled={!isAuthenticated}
                  />
                  <p className="text-xs text-muted-foreground">
                    EU accounts use &quot;eu1&quot;. Found in URL: app-
                    <strong>eu1</strong>.hubspot.com
                  </p>
                </div>
              </div>
              {isAuthenticated && (
                <Button
                  onClick={handleSaveHubSpotSettings}
                  disabled={updateSetting.isPending}
                >
                  Save HubSpot Settings
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* AI Summary Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Summary Configuration
          </CardTitle>
          <CardDescription>
            Configure how AI generates call summaries. Summaries are pushed to
            HubSpot call engagements.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isSummaryPromptLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <>
              {/* Prompt Editor */}
              <div className="space-y-2">
                <Label htmlFor="summary-prompt">System Prompt</Label>
                <Textarea
                  id="summary-prompt"
                  value={summaryPrompt}
                  onChange={(e) => {
                    setSummaryPrompt(e.target.value);
                    setHasPromptChanges(true);
                  }}
                  className="min-h-[300px] font-mono text-sm"
                  placeholder="Enter the AI system prompt..."
                  disabled={!isAuthenticated}
                />
                <p className="text-xs text-muted-foreground">
                  Available variables:{" "}
                  <code className="bg-muted px-1 rounded">
                    {"{transcription}"}
                  </code>
                  ,{" "}
                  <code className="bg-muted px-1 rounded">
                    {"{agent_name}"}
                  </code>
                  ,{" "}
                  <code className="bg-muted px-1 rounded">
                    {"{customer_phone}"}
                  </code>
                  ,{" "}
                  <code className="bg-muted px-1 rounded">
                    {"{call_direction}"}
                  </code>
                  ,{" "}
                  <code className="bg-muted px-1 rounded">
                    {"{call_duration}"}
                  </code>
                </p>
              </div>

              {/* Save / Reset buttons - Admin only */}
              {isAuthenticated && (
                <div className="flex gap-2">
                  <Button
                    onClick={handleSaveSummaryPrompt}
                    disabled={updateSetting.isPending || !hasPromptChanges}
                  >
                    {updateSetting.isPending ? "Saving..." : "Save Prompt"}
                  </Button>
                  <Button variant="outline" onClick={handleResetPrompt}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset to Default
                  </Button>
                </div>
              )}

              {/* Preview Section */}
              <div className="border-t pt-6 space-y-4">
                <h4 className="font-medium">Preview Summary</h4>
                <div className="flex gap-2 items-end">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="preview-call">
                      Select a completed call
                    </Label>
                    <Select
                      value={selectedPreviewCall}
                      onValueChange={setSelectedPreviewCall}
                    >
                      <SelectTrigger id="preview-call">
                        <SelectValue placeholder="Select a call..." />
                      </SelectTrigger>
                      <SelectContent>
                        {isCompletedCallsLoading ? (
                          <SelectItem value="loading" disabled>
                            Loading...
                          </SelectItem>
                        ) : (completedCallsData?.calls?.length ?? 0) > 0 ? (
                          completedCallsData!.calls.map(
                            (call: CompletedCall) => (
                              <SelectItem key={call.id} value={call.id}>
                                {new Date(
                                  call.webhook_timestamp || call.created_at,
                                ).toLocaleDateString("sv-SE")}{" "}
                                -{" "}
                                {call.direction === "outgoing"
                                  ? call.to_number
                                  : call.from_number}{" "}
                                ({call.agent_email || "Unknown"})
                              </SelectItem>
                            ),
                          )
                        ) : (
                          <SelectItem value="none" disabled>
                            No completed calls
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={handleGeneratePreview}
                    disabled={generateSummary.isPending || !selectedPreviewCall}
                  >
                    {generateSummary.isPending ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Generate Preview
                      </>
                    )}
                  </Button>
                </div>

                {/* Preview Result */}
                {previewResult && (
                  <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                    <h5 className="font-medium text-sm flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      Generated Summary
                    </h5>
                    <div className="text-sm whitespace-pre-wrap">
                      {previewResult}
                    </div>
                  </div>
                )}
              </div>

              {/* Bulk Regenerate Section - Admin only */}
              {isAuthenticated && (
                <div className="border-t pt-6 space-y-4">
                  <h4 className="font-medium">Bulk Regenerate Summaries</h4>
                  <p className="text-sm text-muted-foreground">
                    Regenerate AI summaries for all completed calls using the
                    current prompt, then resync to HubSpot.
                  </p>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      bulkRegenerateSummaries.mutate(undefined, {
                        onSuccess: (data: {
                          message?: string;
                          count?: number;
                        }) => {
                          toast({
                            title: "Regeneration Started",
                            description:
                              data.message ||
                              `Processing ${data.count} calls...`,
                          });
                        },
                        onError: (error) => {
                          const errorMessage =
                            error instanceof Error
                              ? error.message
                              : "An unknown error occurred";
                          toast({
                            title: "Error",
                            description: errorMessage,
                            variant: "destructive",
                          });
                        },
                      });
                    }}
                    disabled={bulkRegenerateSummaries.isPending}
                  >
                    {bulkRegenerateSummaries.isPending ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Regenerate All Summaries &amp; Sync to HubSpot
                      </>
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Languages className="h-5 w-5" />
            Vocabulary Replacements
          </CardTitle>
          <CardDescription>
            Replace commonly mispronounced words in transcriptions. Changes
            apply to new transcriptions only.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isVocabLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : (
            <>
              {Object.keys(vocabReplacements).length > 0 && (
                <div className="space-y-2">
                  {Object.entries(vocabReplacements).map(([from, to]) => (
                    <div
                      key={from}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-mono bg-muted px-2 py-0.5 rounded">
                          {from}
                        </span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        <span className="font-mono bg-muted px-2 py-0.5 rounded">
                          {to}
                        </span>
                      </div>
                      {isAuthenticated && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveVocabReplacement(from)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {isAuthenticated && (
                <div className="flex gap-2 items-end">
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="vocab-from" className="text-xs">
                      Mispronounced
                    </Label>
                    <Input
                      id="vocab-from"
                      placeholder="e.g., LoA"
                      value={newVocabFrom}
                      onChange={(e) => setNewVocabFrom(e.target.value)}
                    />
                  </div>
                  <ArrowRight className="h-4 w-4 mb-3 text-muted-foreground" />
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="vocab-to" className="text-xs">
                      Correct word
                    </Label>
                    <Input
                      id="vocab-to"
                      placeholder="e.g., Volterra"
                      value={newVocabTo}
                      onChange={(e) => setNewVocabTo(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={handleAddVocabReplacement}
                    disabled={
                      !newVocabFrom.trim() ||
                      !newVocabTo.trim() ||
                      updateSetting.isPending
                    }
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Webhook URL */}
      <Card>
        <CardHeader>
          <CardTitle>Telavox Webhook URL</CardTitle>
          <CardDescription>
            Use this URL in your Telavox webhook configuration to receive call
            events. Make sure to enable the &quot;answer&quot;,
            &quot;ringing&quot;, and &quot;hangup&quot; events.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <div className="flex gap-2">
              <Input
                value={webhookData?.webhookUrl || ""}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                onClick={() => copyToClipboard(webhookData?.webhookUrl || "")}
              >
                {copied ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}

          <div className="rounded-lg bg-muted p-4">
            <h4 className="font-medium mb-2">Telavox Setup Instructions</h4>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>Go to your Telavox admin portal</li>
              <li>Navigate to Webhooks configuration</li>
              <li>Create a new webhook with the URL above</li>
              <li>
                Enable events:{" "}
                <code className="bg-background px-1 rounded">answer</code>,{" "}
                <code className="bg-background px-1 rounded">ringing</code>,{" "}
                <code className="bg-background px-1 rounded">hangup</code>
              </li>
              <li>
                Add these POST variables:{" "}
                <code className="bg-background px-1 rounded">from</code>,{" "}
                <code className="bg-background px-1 rounded">to</code>,{" "}
                <code className="bg-background px-1 rounded">eventType</code>,{" "}
                <code className="bg-background px-1 rounded">direction</code>,{" "}
                <code className="bg-background px-1 rounded">agentEmail</code>,{" "}
                <code className="bg-background px-1 rounded">timestamp</code>
              </li>
              <li>Save the webhook configuration</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Debug Tools */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5" />
            Debug Tools
          </CardTitle>
          <CardDescription>
            Test the Telavox API connection and inspect the response to diagnose
            recording issues.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleRunDebug}
            disabled={isDebugFetching}
            variant="outline"
          >
            {isDebugFetching ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Testing API...
              </>
            ) : (
              <>
                <Bug className="h-4 w-4 mr-2" />
                Test Telavox API
              </>
            )}
          </Button>

          {showDebug && debugData && (
            <div className="space-y-4">
              {/* Handle 404 - No Telavox config */}
              {debugData.status === 404 ? (
                <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 space-y-2">
                  <h4 className="font-medium flex items-center gap-2 text-amber-600">
                    <AlertTriangle className="h-5 w-5" />
                    No Telavox Organization Configured
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {debugData.details ||
                      "No Telavox organization configuration found. Add a Telavox access token to enable the debug API."}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    To configure, add an environment variable{" "}
                    <code className="bg-muted px-1 rounded">
                      TELAVOX_ACCESS_TOKEN
                    </code>{" "}
                    or create an organization config in the database.
                  </p>
                </div>
              ) : (
                <>
                  {/* Summary */}
                  <div className="rounded-lg border p-4 space-y-3">
                    <h4 className="font-medium">API Response Summary</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="text-center p-2 rounded bg-muted">
                        <p className="text-2xl font-bold">
                          {debugData.summary?.total_calls || 0}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Total Calls
                        </p>
                      </div>
                      <div className="text-center p-2 rounded bg-muted">
                        <p className="text-2xl font-bold">
                          {debugData.summary?.outgoing_count || 0}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Outgoing
                        </p>
                      </div>
                      <div className="text-center p-2 rounded bg-green-500/10">
                        <p className="text-2xl font-bold text-green-600">
                          {debugData.summary?.with_recording_id || 0}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          With Recording ID
                        </p>
                      </div>
                      <div className="text-center p-2 rounded bg-yellow-500/10">
                        <p className="text-2xl font-bold text-yellow-600">
                          {debugData.summary?.without_recording_id || 0}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Without Recording ID
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Date range: {debugData.date_range?.from} to{" "}
                      {debugData.date_range?.to}
                    </p>
                  </div>

                  {/* Calls with recordings */}
                  {(debugData as DebugData).sample_calls_with_recording
                    ?.length > 0 && (
                    <div className="rounded-lg border p-4 space-y-2">
                      <h4 className="font-medium text-green-600">
                        Calls WITH Recording ID
                      </h4>
                      <div className="space-y-2">
                        {(
                          debugData as DebugData
                        ).sample_calls_with_recording.map(
                          (call: DebugCall, i: number) => (
                            <div
                              key={i}
                              className="text-sm font-mono bg-muted p-2 rounded"
                            >
                              <p>Number: {call.number}</p>
                              <p>Time: {call.dateTime}</p>
                              <p>
                                Recording ID:{" "}
                                <span className="text-green-600">
                                  {call.recordingId}
                                </span>
                              </p>
                              <p>Call ID: {call.callId}</p>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  )}

                  {/* Calls without recordings */}
                  {(debugData as DebugData).sample_calls_without_recording
                    ?.length > 0 && (
                    <div className="rounded-lg border p-4 space-y-2">
                      <h4 className="font-medium text-yellow-600">
                        Calls WITHOUT Recording ID
                      </h4>
                      <div className="space-y-2">
                        {(
                          debugData as DebugData
                        ).sample_calls_without_recording.map(
                          (call: DebugCall, i: number) => (
                            <div
                              key={i}
                              className="text-sm font-mono bg-muted p-2 rounded"
                            >
                              <p>Number: {call.number}</p>
                              <p>Time: {call.dateTime}</p>
                              <p>
                                Recording ID:{" "}
                                <span className="text-yellow-600">
                                  {call.recordingId || "null"}
                                </span>
                              </p>
                              <p>Call ID: {call.callId}</p>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  )}

                  {/* Available fields */}
                  <div className="rounded-lg border p-4 space-y-2">
                    <h4 className="font-medium">Available API Fields</h4>
                    <p className="text-sm text-muted-foreground font-mono">
                      {(debugData as DebugData).available_fields?.join(", ") ||
                        "None"}
                    </p>
                  </div>

                  {/* Raw response (collapsible) */}
                  <details className="rounded-lg border">
                    <summary className="p-4 font-medium cursor-pointer hover:bg-muted">
                      Raw API Response (click to expand)
                    </summary>
                    <pre className="p-4 text-xs overflow-auto max-h-96 bg-muted">
                      {JSON.stringify(
                        (debugData as DebugData).raw_response,
                        null,
                        2,
                      )}
                    </pre>
                  </details>
                </>
              )}
            </div>
          )}

          {showDebug && isDebugLoading && (
            <div className="space-y-2">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Agent API Keys */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Agent API Keys
          </CardTitle>
          <CardDescription>
            Manage Telavox API keys per sales agent. Each agent needs their own
            API key to fetch their call recordings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isKeysLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : (
            <>
              {(telavoxKeysData?.keys?.length ?? 0) > 0 ? (
                <div className="space-y-2">
                  {telavoxKeysData!.keys.map((key: AgentApiKey) => (
                    <div
                      key={key.id}
                      className="p-4 rounded-lg border space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {key.display_name || key.agent_email}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">
                            {key.agent_email}
                          </p>
                          <p className="text-xs font-mono text-muted-foreground">
                            Key: {key.api_key}
                          </p>
                          {key.hubspot_user_id && (
                            <p className="text-xs text-muted-foreground">
                              HubSpot ID: {key.hubspot_user_id}
                            </p>
                          )}
                        </div>
                        {isAuthenticated && (
                          <div className="flex gap-2 ml-4">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleTestKey(key.agent_email)}
                              disabled={testingEmail === key.agent_email}
                              title="Test API Key"
                            >
                              {testingEmail === key.agent_email ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <TestTube2 className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(key)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                handleRemoveKey(key.id, key.agent_email)
                              }
                              disabled={removeTelavoxKey.isPending}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </div>
                      {/* Show test result for this key */}
                      {testResult &&
                        testResult.agent_email === key.agent_email && (
                          <div
                            className={`rounded-lg p-3 text-sm ${testResult.api_ok ? "bg-green-500/10" : "bg-destructive/10"}`}
                          >
                            {testResult.api_ok ? (
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-green-600">
                                  <CheckCircle className="h-4 w-4" />
                                  <span className="font-medium">
                                    API Key Valid
                                  </span>
                                </div>
                                <p className="text-muted-foreground">
                                  Found {testResult.summary?.total_calls || 0}{" "}
                                  calls in last 24h (
                                  {testResult.summary?.with_recording_id || 0}{" "}
                                  with recordings)
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-destructive">
                                  <AlertTriangle className="h-4 w-4" />
                                  <span className="font-medium">
                                    {testResult.error || "API Key Invalid"}
                                  </span>
                                </div>
                                {testResult.suggestion && (
                                  <p className="text-muted-foreground">
                                    {testResult.suggestion}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Key className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No agent API keys configured</p>
                  <p className="text-sm">
                    Add keys for agents whose calls need to be transcribed
                  </p>
                </div>
              )}

              {/* Add Key Dialog - Admin only */}
              {isAuthenticated && (
                <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Agent API Key
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Agent API Key</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="agent-email">Agent Email</Label>
                        <Input
                          id="agent-email"
                          placeholder="agent@company.com"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="display-name">
                          Display Name (optional)
                        </Label>
                        <Input
                          id="display-name"
                          placeholder="Agent Name"
                          value={newDisplayName}
                          onChange={(e) => setNewDisplayName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="api-key">Telavox API Key</Label>
                        <Input
                          id="api-key"
                          type="password"
                          placeholder="Enter the agent's Telavox API key"
                          value={newApiKey}
                          onChange={(e) => setNewApiKey(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Get this from Telavox portal → User Settings → API
                          Keys
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="hubspot-user-id">
                          HubSpot User ID (optional)
                        </Label>
                        <Input
                          id="hubspot-user-id"
                          placeholder="e.g., 63737684"
                          value={newHubspotUserId}
                          onChange={(e) => setNewHubspotUserId(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Find in HubSpot → Settings → Users → Click user → ID
                          in URL
                        </p>
                      </div>
                    </div>
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                      </DialogClose>
                      <Button
                        onClick={handleAddKey}
                        disabled={
                          addTelavoxKey.isPending || !newEmail || !newApiKey
                        }
                      >
                        {addTelavoxKey.isPending ? "Adding..." : "Add Key"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}

              {/* Edit Key Dialog - Admin only */}
              {isAuthenticated && (
                <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit API Key</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Agent Email</Label>
                        <Input value={editingKey?.agent_email || ""} disabled />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-display-name">Display Name</Label>
                        <Input
                          id="edit-display-name"
                          placeholder="Agent Name"
                          value={editDisplayName}
                          onChange={(e) => setEditDisplayName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-api-key">
                          New API Key (leave blank to keep current)
                        </Label>
                        <Input
                          id="edit-api-key"
                          type="password"
                          placeholder="Enter new API key or leave blank"
                          value={editApiKey}
                          onChange={(e) => setEditApiKey(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-hubspot-user-id">
                          HubSpot User ID
                        </Label>
                        <Input
                          id="edit-hubspot-user-id"
                          placeholder="e.g., 63737684"
                          value={editHubspotUserId}
                          onChange={(e) => setEditHubspotUserId(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Find in HubSpot → Settings → Users → Click user → ID
                          in URL
                        </p>
                      </div>
                    </div>
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                      </DialogClose>
                      <Button
                        onClick={handleEditKey}
                        disabled={updateTelavoxKey.isPending}
                      >
                        {updateTelavoxKey.isPending
                          ? "Saving..."
                          : "Save Changes"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* API Keys Info */}
      <Card>
        <CardHeader>
          <CardTitle>System API Keys</CardTitle>
          <CardDescription>
            Default API keys are stored as environment secrets and used as
            fallback.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div>
                <p className="font-medium">Default Telavox API Key</p>
                <p className="text-sm text-muted-foreground">
                  Fallback for agents without individual keys
                </p>
              </div>
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div>
                <p className="font-medium">ElevenLabs API Key</p>
                <p className="text-sm text-muted-foreground">
                  Used for Scribe transcription service
                </p>
              </div>
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documentation Links */}
      <Card>
        <CardHeader>
          <CardTitle>Documentation</CardTitle>
          <CardDescription>
            Helpful links for configuring your integrations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <a
              href="https://www.telavox.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent transition-colors"
            >
              <div>
                <p className="font-medium">Telavox</p>
                <p className="text-sm text-muted-foreground">
                  API and webhook documentation
                </p>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </a>
            <a
              href="https://elevenlabs.io/docs/api-reference/speech-to-text"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent transition-colors"
            >
              <div>
                <p className="font-medium">ElevenLabs Scribe</p>
                <p className="text-sm text-muted-foreground">
                  Speech-to-text API reference
                </p>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
