'use client'

import { TrendingUp } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface DealStageSuggestionProps {
  dealStage: string | null
}

export function DealStageSuggestion({ dealStage }: DealStageSuggestionProps) {
  const getStageColor = (stage: string | null) => {
    switch (stage) {
      case 'Prospecting':
        return 'bg-blue-100 text-blue-800'
      case 'Qualification':
        return 'bg-cyan-100 text-cyan-800'
      case 'Needs Analysis':
        return 'bg-purple-100 text-purple-800'
      case 'Proposal':
        return 'bg-yellow-100 text-yellow-800'
      case 'Negotiation':
        return 'bg-orange-100 text-orange-800'
      case 'Closing':
        return 'bg-red-100 text-red-800'
      case 'Won':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-muted text-muted-foreground'
    }
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-2">
        <TrendingUp className="w-4 h-4" />
        <h3 className="text-sm font-semibold">Suggested Deal Stage</h3>
      </div>
      {dealStage ? (
        <Badge className={getStageColor(dealStage)}>{dealStage}</Badge>
      ) : (
        <p className="text-sm text-muted-foreground">Unable to determine stage</p>
      )}
    </Card>
  )
}
