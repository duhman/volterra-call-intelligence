'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Users, CheckCircle } from 'lucide-react';
import { useSetting } from '@/hooks/useAdminApi';

interface HubSpotSectionProps {
  contactId?: string | null;
  contactName?: string | null;
  syncedAt?: string | null;
}

export function HubSpotSection({ contactId, contactName, syncedAt }: HubSpotSectionProps) {
  const { data: hubspotRegionSetting } = useSetting('hubspot_region');
  const hubspotRegion = hubspotRegionSetting?.value || '';
  if (!contactId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            HubSpot Contact
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">This call is not linked to a HubSpot contact.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-orange-600" />
          HubSpot Contact
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium">{contactName || 'Contact'}</p>
          <p className="text-xs text-muted-foreground">Contact ID: {contactId}</p>
        </div>

        {syncedAt && (
          <Badge variant="outline" className="text-green-600 border-green-600">
            <CheckCircle className="h-3 w-3 mr-1" />
            Synced to HubSpot
          </Badge>
        )}

        <Button variant="outline" size="sm" asChild>
          <a
            href={
              hubspotRegion
                ? `https://app-${hubspotRegion}.hubspot.com/contacts/${contactId}`
                : `https://app.hubspot.com/contacts/${contactId}`
            }
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            View in HubSpot
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}
