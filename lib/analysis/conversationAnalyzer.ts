import { createServiceClient } from "@/lib/supabase/server";

/**
 * Escape special regex characters to prevent ReDoS attacks
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export interface ConversationAnalysis {
  sentiment: "positive" | "neutral" | "negative";
  keyPoints: string[];
  dealStage: string | null;
  competitorMentions: string[];
  nextSteps: string[];
  summary: string;
}

const DEAL_STAGES = [
  "Prospecting",
  "Qualification",
  "Needs Analysis",
  "Proposal",
  "Negotiation",
  "Closing",
  "Won",
  "Lost",
];

const COMPETITOR_KEYWORDS = [
  "competitor",
  "rival",
  "alternative",
  "other platform",
  "another solution",
  "different system",
];

export async function analyzeConversation(
  transcript: string,
): Promise<ConversationAnalysis> {
  // Apply vocabulary replacements
  let processedTranscript = transcript;
  try {
    const supabase = await createServiceClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: vocabSetting } = await (supabase as any)
      .from("settings")
      .select("value")
      .eq("key", "vocabulary_replacements")
      .maybeSingle();

    if (vocabSetting?.value) {
      const replacements = JSON.parse(vocabSetting.value);
      for (const [from, to] of Object.entries(replacements)) {
        // Case-insensitive global replacement for whole words
        // Escape special regex characters to prevent ReDoS attacks
        try {
          const escapedFrom = escapeRegex(from);
          const regex = new RegExp(`\\b${escapedFrom}\\b`, "gi");
          processedTranscript = processedTranscript.replace(
            regex,
            to as string,
          );
        } catch {
          // Fallback for simple string replacement if regex fails
          // Use split/join for global replacement without regex (ES2021+ replacement)
          processedTranscript = processedTranscript
            .split(from)
            .join(to as string);
        }
      }
    }
  } catch (error) {
    console.warn("Failed to apply vocabulary replacements:", error);
    // Continue with original transcript
  }

  const lines = processedTranscript.split("\n").filter((line) => line.trim());

  // Sentiment analysis (simple heuristic)
  const sentiment = analyzeSentiment(processedTranscript);

  // Extract key points
  const keyPoints = extractKeyPoints(lines);

  // Detect deal stage
  const dealStage = detectDealStage(processedTranscript);

  // Find competitor mentions
  const competitorMentions = findCompetitorMentions(processedTranscript);

  // Generate next steps
  const nextSteps = generateNextSteps(sentiment, dealStage, keyPoints);

  // Create summary
  const summary = generateSummary(processedTranscript, keyPoints);

  return {
    sentiment,
    keyPoints,
    dealStage,
    competitorMentions,
    nextSteps,
    summary,
  };
}

function analyzeSentiment(text: string): "positive" | "neutral" | "negative" {
  const positiveWords = [
    "great",
    "excellent",
    "interested",
    "perfect",
    "love",
    "amazing",
    "good",
    "happy",
  ];
  const negativeWords = [
    "bad",
    "terrible",
    "hate",
    "disappointed",
    "problem",
    "issue",
    "concerned",
    "worried",
  ];

  const lowerText = text.toLowerCase();
  const positiveCount = positiveWords.filter((word) =>
    lowerText.includes(word),
  ).length;
  const negativeCount = negativeWords.filter((word) =>
    lowerText.includes(word),
  ).length;

  if (positiveCount > negativeCount) return "positive";
  if (negativeCount > positiveCount) return "negative";
  return "neutral";
}

function extractKeyPoints(lines: string[]): string[] {
  const keyPoints: string[] = [];

  for (const line of lines) {
    // Look for lines with key indicators
    if (
      line.includes("needs") ||
      line.includes("challenge") ||
      line.includes("requirement") ||
      line.includes("priority") ||
      line.includes("budget") ||
      line.includes("timeline")
    ) {
      keyPoints.push(line.substring(0, 100));
    }
  }

  return keyPoints.slice(0, 5);
}

function detectDealStage(transcript: string): string | null {
  const lowerTranscript = transcript.toLowerCase();

  for (const stage of DEAL_STAGES) {
    if (lowerTranscript.includes(stage.toLowerCase())) {
      return stage;
    }
  }

  // Heuristic detection
  if (lowerTranscript.includes("how much") || lowerTranscript.includes("price"))
    return "Negotiation";
  if (
    lowerTranscript.includes("schedule") ||
    lowerTranscript.includes("implement")
  )
    return "Closing";
  if (
    lowerTranscript.includes("tell me more") ||
    lowerTranscript.includes("interested")
  )
    return "Qualification";

  return "Prospecting";
}

function findCompetitorMentions(transcript: string): string[] {
  const mentions: string[] = [];
  const lowerTranscript = transcript.toLowerCase();

  for (const keyword of COMPETITOR_KEYWORDS) {
    if (lowerTranscript.includes(keyword)) {
      mentions.push(keyword);
    }
  }

  // Look for company names (simplified)
  const companyPattern =
    /(?:using|with|from|at)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g;
  const matches = transcript.match(companyPattern);
  if (matches) {
    mentions.push(...matches.slice(0, 3));
  }

  return [...new Set(mentions)];
}

function generateNextSteps(
  sentiment: string,
  dealStage: string | null,
  keyPoints: string[],
): string[] {
  const steps: string[] = [];

  if (sentiment === "positive") {
    steps.push("Schedule follow-up meeting");
    steps.push("Send proposal");
  } else if (sentiment === "negative") {
    steps.push("Address concerns");
    steps.push("Schedule call to understand objections");
  }

  if (dealStage === "Closing") {
    steps.push("Prepare contract");
    steps.push("Coordinate implementation timeline");
  }

  if (keyPoints.length > 0) {
    steps.push("Prepare case studies addressing key concerns");
  }

  return steps;
}

function generateSummary(transcript: string, keyPoints: string[]): string {
  const lines = transcript.split("\n");
  const firstTurn = lines.slice(0, 3).join(" ");
  const lastTurn = lines.slice(-3).join(" ");

  return `Conversation started with: ${firstTurn.substring(0, 80)}... Key points discussed: ${keyPoints.join(", ")}. Concluded with: ${lastTurn.substring(0, 80)}...`;
}
