import { supabase } from '../lib/supabase';
import { validateProfile, type StoredProfile } from '../lib/profileSchema';

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

const camelToSnake: Record<string, string> = {
  ethereumAddress: 'ethereum_address',
  baseAddress: 'base_address',
  bitcoinAddress: 'bitcoin_address',
  solanaAddress: 'solana_address',
  cashAppCashtag: 'cash_app_cashtag',
  venmoUsername: 'venmo_username',
  zelleContact: 'zelle_contact',
  paypalUsername: 'paypal_username',
};

function toRow(profile: Record<string, unknown>): Record<string, string | null> {
  const row: Record<string, string | null> = {};
  for (const [k, v] of Object.entries(profile)) {
    if (k === 'id') continue;
    const col = camelToSnake[k];
    if (col) row[col] = typeof v === 'string' && v.trim() ? v.trim() : null;
  }
  return row;
}

export async function PUT(request: Request) {
  if (!supabase) {
    return Response.json({ error: 'Storage not configured' }, { status: 503 });
  }

  const path = new URL(request.url).pathname;
  const id = path.replace(/^\/api\/profile\//, '').split('/')[0];
  if (!id || id.length > 32) {
    return Response.json({ error: 'Invalid profile id' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!validateProfile(body)) {
    return Response.json(
      { error: 'Invalid profile. Must have at least one payment method.' },
      { status: 400 }
    );
  }

  const profile = body as Record<string, unknown>;
  const row = toRow(profile);

  const { error } = await supabase.from('profiles').update(row).eq('id', id);

  if (error) {
    if (error.code === 'PGRST116') {
      return Response.json({ error: 'Profile not found' }, { status: 404 });
    }
    console.error('Supabase update error:', error);
    return Response.json({ error: 'Failed to update profile' }, { status: 500 });
  }

  return Response.json({ id }, { status: 200 });
}
