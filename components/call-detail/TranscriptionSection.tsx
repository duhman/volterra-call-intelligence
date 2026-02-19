'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';

interface TranscriptItem {
  speaker?: string;
  text?: string;
  content?: string;
  timestamp?: string;
}

type TranscriptData = TranscriptItem[] | Record<string, unknown>;

interface TranscriptionSectionProps {
  transcript?: string | null;
  transcriptData?: TranscriptData;
}

export function TranscriptionSection({ transcript, transcriptData }: TranscriptionSectionProps) {
  if (!transcript && !transcriptData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Transcription
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No transcription available for this call.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Transcription
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="prose prose-sm max-w-none">
          {transcript ? (
            <div className="whitespace-pre-wrap">{transcript}</div>
          ) : transcriptData ? (
            <div className="space-y-4">
              {Array.isArray(transcriptData) ? (
                transcriptData.map((item: TranscriptItem, index: number) => (
                  <div key={index} className="border-l-2 border-accent pl-4">
                    {item.speaker && (
                      <p className="text-xs font-medium text-accent mb-1">
                        {item.speaker}
                      </p>
                    )}
                    <p className="text-sm">{item.text || item.content}</p>
                    {item.timestamp && (
                      <p className="text-xs text-muted-foreground mt-1">{item.timestamp}</p>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-4 border rounded-lg bg-muted/20 text-center">
                  <p className="text-sm text-muted-foreground">Transcript format unavailable.</p>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
