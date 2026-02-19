'use client'

import { AlertCircle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface CompetitorMentionsProps {
  competitors: string[]
}

export function CompetitorMentions({ competitors }: CompetitorMentionsProps) {
  if (competitors.length === 0) {
    return (
      <Card className="p-4 bg-muted">
        <p className="text-sm text-muted-foreground">No competitors mentioned</p>
      </Card>
    )
  }

  return (
    <Card className="p-4 border-orange-200 bg-orange-50">
      <div className="flex items-center gap-2 mb-3">
        <AlertCircle className="w-4 h-4 text-orange-600" />
        <h3 className="text-sm font-semibold text-orange-900">Competitors Mentioned</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {competitors.map((comp, idx) => (
          <Badge key={idx} variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
            {comp}
          </Badge>
        ))}
      </div>
    </Card>
  )
}
