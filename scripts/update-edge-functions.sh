#!/bin/bash

# Script to update Edge Functions to use sales_rep schema
# Usage: ./update-edge-functions.sh

set -e

echo "Updating Edge Functions for sales_rep schema..."

# Backup original functions
mkdir -p supabase/functions/backup
cp -r supabase/functions/* supabase/functions/backup/ 2>/dev/null || true

# Update each Edge Function to use sales_rep schema
for file in supabase/functions/*/index.ts; do
    if [ -f "$file" ]; then
        echo "Updating $file..."
        
        # Create a backup
        cp "$file" "$file.bak"
        
        # Update createClient calls to include schema
        sed -i.bak 's/createClient(supabaseUrl, supabaseServiceKey);/createClient(supabaseUrl, supabaseServiceKey, { db: { schema: "sales_rep" } });/g' "$file"
        
        # Handle other createClient patterns
        sed -i.bak 's/createClient(.*supabaseServiceKey);/createClient(supabaseUrl, supabaseServiceKey, { db: { schema: "sales_rep" } });/g' "$file"
        
        # Remove .bak files
        rm -f "$file.bak"
    fi
done

echo "All Edge Functions updated for sales_rep schema!"
echo "Original files backed up in supabase/functions/backup/"
