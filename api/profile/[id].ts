import { config } from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
config({ path: path.join(process.cwd(), '.env.local') });
config({ path: path.join(process.cwd(), '.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })
    : null;

const DISPLAY_NAME_MAX = 80;
const AVATAR_URL_MAX = 2048;

const PAYMENT_KEYS = [
  'ethereumAddress', 'baseAddress', 'bitcoinAddress', 'solanaAddress', 'tezosAddress',
  'cashAppCashtag', 'venmoUsername', 'zelleContact', 'paypalUsername',
];
const ALLOWED_KEYS = [...PAYMENT_KEYS, 'displayName', 'avatarUrl'];

function hasAtLeastOneMethod(p: Record<string, unknown>): boolean {
  return PAYMENT_KEYS.some((k) => typeof p[k] === 'string' && (p[k] as string).trim().length > 0);
}

function isValidOptionalHttpsUrl(url: string): boolean {
  const t = url.trim();
  if (!t) return true;
  if (t.length > AVATAR_URL_MAX) return false;
  try {
    const u = new URL(t);
    return u.protocol === 'https:';
  } catch {
    return false;
  }
}

function validateProfile(body: unknown): body is Record<string, unknown> {
  if (!body || typeof body !== 'object') return false;
  const p = body as Record<string, unknown>;
  for (const key of Object.keys(p)) {
    if (!ALLOWED_KEYS.includes(key) || typeof p[key] !== 'string') return false;
  }
  if (typeof p.displayName === 'string' && p.displayName.length > DISPLAY_NAME_MAX) return false;
  if (typeof p.avatarUrl === 'string' && !isValidOptionalHttpsUrl(p.avatarUrl)) return false;
  return hasAtLeastOneMethod(p);
}

const snakeToCamel: Record<string, string> = {
  ethereum_address: 'ethereumAddress',
  base_address: 'baseAddress',
  bitcoin_address: 'bitcoinAddress',
  solana_address: 'solanaAddress',
  tezos_address: 'tezosAddress',
  cash_app_cashtag: 'cashAppCashtag',
  venmo_username: 'venmoUsername',
  zelle_contact: 'zelleContact',
  paypal_username: 'paypalUsername',
  display_name: 'displayName',
  avatar_url: 'avatarUrl',
};

function toProfile(row: Record<string, unknown>): Record<string, string | undefined> {
  const profile: Record<string, string | undefined> = {};
  const skip = ['id', 'created_at', 'updated_at', 'user_id', 'owner_address', 'email'];
  for (const [k, v] of Object.entries(row)) {
    if (skip.includes(k)) continue;
    const key = snakeToCamel[k] ?? k;
    profile[key] = typeof v === 'string' ? v : undefined;
  }
  return profile;
}

export async function GET(request: Request) {
  try {
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
      return Response.json(
        {
          error: 'Failed to fetch profile',
          details: error.message,
          code: error.code,
          hint: 'If you just added tezos, run supabase db push so tezos_address exists.',
        },
        { status: 500 }
      );
    }

    const profile = toProfile(data as Record<string, unknown>);
    return Response.json(profile, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (e) {
    console.error('GET /api/profile/[id] fatal:', e);
    return Response.json(
      { error: 'Failed to fetch profile', details: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}

const camelToSnake: Record<string, string> = {
  ethereumAddress: 'ethereum_address',
  baseAddress: 'base_address',
  bitcoinAddress: 'bitcoin_address',
  solanaAddress: 'solana_address',
  tezosAddress: 'tezos_address',
  cashAppCashtag: 'cash_app_cashtag',
  venmoUsername: 'venmo_username',
  zelleContact: 'zelle_contact',
  paypalUsername: 'paypal_username',
  displayName: 'display_name',
  avatarUrl: 'avatar_url',
};

function toRow(profile: Record<string, unknown>): Record<string, string | null> {
  const row: Record<string, string | null> = {};
  for (const [k, v] of Object.entries(profile)) {
    if (k === 'id') continue;
    const col = camelToSnake[k];
    if (!col) continue;
    if (typeof v !== 'string') continue;
    const t = v.trim();
    row[col] = t.length > 0 ? t : null;
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
    return Response.json(
      {
        error: 'Failed to update profile',
        details: error.message,
        hint: "If RLS error, ensure 'profiles allow update' policy exists (run migration).",
      },
      { status: 500 }
    );
  }

  return Response.json({ id }, { status: 200 });
}
