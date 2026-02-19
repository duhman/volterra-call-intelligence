'use client'

import { ThumbsUp, ThumbsDown, Minus } from 'lucide-react'

interface SentimentIndicatorProps {
  sentiment: 'positive' | 'neutral' | 'negative'
  confidence?: number
}

export function SentimentIndicator({ sentiment, confidence = 0.8 }: SentimentIndicatorProps) {
  // Use semantic color tokens for theme consistency
  const getSentimentColor = () => {
    switch (sentiment) {
      case 'positive':
        return 'text-success'
      case 'negative':
        return 'text-destructive'
      case 'neutral':
        return 'text-muted-foreground'
    }
  }

  const getSentimentLabel = () => {
    switch (sentiment) {
      case 'positive':
        return 'Positive'
      case 'negative':
        return 'Negative'
      case 'neutral':
        return 'Neutral'
    }
  }

  const getSentimentIcon = () => {
    switch (sentiment) {
      case 'positive':
        return <ThumbsUp className="w-5 h-5" aria-hidden="true" />
      case 'negative':
        return <ThumbsDown className="w-5 h-5" aria-hidden="true" />
      case 'neutral':
        return <Minus className="w-5 h-5" aria-hidden="true" />
    }
  }

  const getSentimentBarColor = () => {
    switch (sentiment) {
      case 'positive':
        return 'bg-success'
      case 'negative':
        return 'bg-destructive'
      case 'neutral':
        return 'bg-muted-foreground'
    }
  }

  return (
    <div className="flex items-center gap-3">
      <div className={getSentimentColor()} role="img" aria-label={`${getSentimentLabel()} sentiment`}>
        {getSentimentIcon()}
      </div>
      <div>
        <p className="text-sm font-medium">{getSentimentLabel()}</p>
        <div className="w-24 h-2 bg-muted rounded-full overflow-hidden" role="progressbar" aria-valuenow={confidence * 100} aria-valuemin={0} aria-valuemax={100} aria-label="Sentiment confidence">
          <div
            className={`h-full ${getSentimentBarColor()}`}
            style={{ width: `${confidence * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}
