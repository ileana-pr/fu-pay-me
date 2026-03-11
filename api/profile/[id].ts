import { supabase } from '../lib/supabase';
import type { StoredProfile } from '../lib/profileSchema';

const snakeToCamel: Record<string, string> = {
  ethereum_address: 'ethereumAddress',
  base_address: 'baseAddress',
  bitcoin_address: 'bitcoinAddress',
  solana_address: 'solanaAddress',
  cash_app_cashtag: 'cashAppCashtag',
  venmo_username: 'venmoUsername',
  zelle_contact: 'zelleContact',
  paypal_username: 'paypalUsername',
};

function toProfile(row: Record<string, unknown>): StoredProfile {
  const profile: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(row)) {
    if (k === 'id' || k === 'created_at') continue;
    const key = snakeToCamel[k] ?? k;
    profile[key] = typeof v === 'string' ? v : undefined;
  }
  return profile as StoredProfile;
}

export async function GET(request: Request) {
  if (!supabase) {
    return Response.json({ error: 'Storage not configured' }, { status: 503 });
  }

  const path = new URL(request.url).pathname;
  const id = path.replace(/^\/api\/profile\//, '').split('/')[0];
  if (!id || id.length > 32) {
    return Response.json({ error: 'Invalid profile id' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return Response.json({ error: 'Profile not found' }, { status: 404 });
    }
    console.error('Supabase get error:', error);
    return Response.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }

  const profile = toProfile(data as Record<string, unknown>);
  return Response.json(profile, {
    status: 200,
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  });
}
