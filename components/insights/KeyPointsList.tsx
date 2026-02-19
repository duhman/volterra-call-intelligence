'use client'

import { CheckCircle2 } from 'lucide-react'
import { Card } from '@/components/ui/card'

interface KeyPointsListProps {
  keyPoints: string[]
}

export function KeyPointsList({ keyPoints }: KeyPointsListProps) {
  if (keyPoints.length === 0) {
    return (
      <Card className="p-4 bg-muted">
        <p className="text-sm text-muted-foreground">No key points identified yet</p>
      </Card>
    )
  }

  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold mb-3">Key Points</h3>
      <ul className="space-y-2">
        {keyPoints.map((point, idx) => (
          <li key={idx} className="flex gap-2">
            <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-600 flex-shrink-0" />
            <span className="text-sm text-foreground">{point}</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}
