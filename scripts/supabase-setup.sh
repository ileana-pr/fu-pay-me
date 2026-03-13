#!/usr/bin/env bash
# Supabase project setup via CLI
# Run from project root: ./scripts/supabase-setup.sh

set -e

echo "=== Piri Supabase Setup ==="
echo ""

# 1. Login
echo "Step 1: Log in to Supabase"
echo "  Token: https://supabase.com/dashboard/account/tokens"
echo ""
read -p "Have you logged in? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  npx supabase login
fi

# 2. Get org-id
echo ""
echo "Step 2: Get your organization ID"
echo "  → Run: npx supabase orgs list"
echo ""
read -p "Enter your org-id (from orgs list): " ORG_ID
if [[ -z "$ORG_ID" ]]; then
  echo "Error: org-id required"
  exit 1
fi

# 3. Create project
echo ""
echo "Step 3: Create Supabase project"
read -p "Enter database password (min 6 chars, save it!): " -s DB_PASSWORD
echo
if [[ ${#DB_PASSWORD} -lt 6 ]]; then
  echo "Error: password must be at least 6 characters"
  exit 1
fi

read -p "Region (e.g. us-east-1, eu-west-1) [us-east-1]: " REGION
REGION=${REGION:-us-east-1}

echo ""
echo "Creating project 'piri'..."
npx supabase projects create piri --org-id "$ORG_ID" --db-password "$DB_PASSWORD" --region "$REGION"

# 4. Get project ref from list
echo ""
echo "Step 4: Linking project"
PROJECT_REF=$(npx supabase projects list -o json 2>/dev/null | node -e "
  const d = JSON.parse(require('fs').readFileSync(0, 'utf8'));
  const p = d.find(x => x.name === 'piri');
  console.log(p ? p.id : '');
" 2>/dev/null || echo "")

if [[ -z "$PROJECT_REF" ]]; then
  echo "Could not auto-detect project ref. Run manually:"
  echo "  npx supabase link --project-ref <your-project-id>"
  echo "  npx supabase db push"
  echo ""
  echo "Get project-id from: https://supabase.com/dashboard"
  exit 0
fi

echo "Linking to project $PROJECT_REF..."
npx supabase link --project-ref "$PROJECT_REF" --password "$DB_PASSWORD"

# 5. Push migrations
echo ""
echo "Step 5: Pushing migrations"
npx supabase db push

# 6. Get API keys
echo ""
echo "Step 6: Get API keys for .env"
echo "  → Dashboard: https://supabase.com/dashboard/project/$PROJECT_REF/settings/api"
echo "  → Add to .env:"
echo "     SUPABASE_URL=https://$PROJECT_REF.supabase.co"
echo "     SUPABASE_SERVICE_ROLE_KEY=<service_role key from dashboard>"
echo ""
echo "Done! Add the env vars and restart your dev server."
