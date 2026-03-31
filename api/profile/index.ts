import { config } from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { nanoid } from 'nanoid';
import { isValidTezosAddress } from '../lib/tezosAddress';

// load .env.local from project root (cwd when you run vercel dev)
config({ path: path.join(process.cwd(), '.env.local') });
config({ path: path.join(process.cwd(), '.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false },
      })
    : null;

const DISPLAY_NAME_MAX = 80;
const AVATAR_URL_MAX = 2048;

interface StoredProfile {
  ethereumAddress?: string;
  baseAddress?: string;
  bitcoinAddress?: string;
  solanaAddress?: string;
  tezosAddress?: string;
  cashAppCashtag?: string;
  venmoUsername?: string;
  zelleContact?: string;
  paypalUsername?: string;
  /** shown on public tip page */
  displayName?: string;
  /** https image url for tip page avatar */
  avatarUrl?: string;
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

function validateProfile(body: unknown): body is StoredProfile {
  if (!body || typeof body !== 'object') return false;
  const p = body as Record<string, unknown>;
  const allowed = [
    'ethereumAddress',
    'baseAddress',
    'bitcoinAddress',
    'solanaAddress',
    'tezosAddress',
    'cashAppCashtag',
    'venmoUsername',
    'zelleContact',
    'paypalUsername',
    'displayName',
    'avatarUrl',
    'ownerAddress', // wallet sign-in identity, not a payment method
  ];
  for (const key of Object.keys(p)) {
    if (!allowed.includes(key)) return false;
    if (key !== 'ownerAddress' && typeof p[key] !== 'string') return false;
    if (key === 'ownerAddress' && p[key] != null && typeof p[key] !== 'string') return false;
  }
  if (typeof p.displayName === 'string' && p.displayName.length > DISPLAY_NAME_MAX) return false;
  if (typeof p.avatarUrl === 'string' && !isValidOptionalHttpsUrl(p.avatarUrl)) return false;
  if (
    typeof p.tezosAddress === 'string' &&
    p.tezosAddress.trim().length > 0 &&
    !isValidTezosAddress(p.tezosAddress)
  ) {
    return false;
  }
  const vals = [
    p.ethereumAddress,
    p.baseAddress,
    p.bitcoinAddress,
    p.solanaAddress,
    p.tezosAddress,
    p.cashAppCashtag,
    p.venmoUsername,
    p.zelleContact,
    p.paypalUsername,
  ];
  return vals.some((v) => typeof v === 'string' && String(v).trim().length > 0);
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

function toRow(profile: StoredProfile): Record<string, string | null> {
  const row: Record<string, string | null> = {};
  for (const [k, v] of Object.entries(profile)) {
    const col = camelToSnake[k];
    if (!col) continue;
    if (typeof v !== 'string') continue;
    const t = v.trim();
    row[col] = t.length > 0 ? t : null;
  }
  return row;
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

// never echo arbitrary db columns (could shadow "error" or bloat payload)
const PUBLIC_PROFILE_KEYS = new Set([
  'ethereumAddress',
  'baseAddress',
  'bitcoinAddress',
  'solanaAddress',
  'tezosAddress',
  'cashAppCashtag',
  'venmoUsername',
  'zelleContact',
  'paypalUsername',
  'displayName',
  'avatarUrl',
]);

// wallet sign-in uses synthetic emails (0x...@wallet.piri) — never store in profiles.email
const WALLET_EMAIL_DOMAIN = 'wallet.piri';
function isWalletEmail(email: string | undefined): boolean {
  return !!email?.toLowerCase().endsWith(`@${WALLET_EMAIL_DOMAIN}`);
}

function rowToProfile(row: Record<string, unknown>): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(row)) {
    if (k === 'id' || k === 'created_at' || k === 'user_id' || k === 'owner_address' || k === 'email') continue;
    const key = (snakeToCamel[k] ?? k) as string;
    if (!PUBLIC_PROFILE_KEYS.has(key)) continue;
    out[key] = typeof v === 'string' ? v : undefined;
  }
  return out;
}

function profileJson(row: Record<string, unknown>): Record<string, unknown> {
  const id = row.id;
  return { id: id != null ? String(id) : '', ...rowToProfile(row) };
}

/** GET /api/profile — fetch by ?address=0x... OR by Authorization: Bearer <token> (user_id) */
export async function GET(request: Request) {
  try {
    if (!supabase) {
      return Response.json({ error: 'Storage not configured' }, { status: 503 });
    }
    const url = new URL(request.url);
    const address = url.searchParams.get('address')?.trim();
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    let query = supabase.from('profiles').select('*');
    if (address && address.length >= 10) {
      query = query.ilike('owner_address', address);
    } else if (token) {
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) {
        return Response.json({ error: 'Invalid or expired session' }, { status: 401 });
      }
      // for google/email: resolve by email first so one email = one profile (avoids duplicate users when supabase creates multiple auth users for same email)
      const realEmail = user.email?.trim();
      if (realEmail && !isWalletEmail(realEmail)) {
        const escaped = realEmail.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
        const { data: byEmail, error: emailLookupErr } = await supabase
          .from('profiles')
          .select('*')
          .ilike('email', escaped)
          .limit(1)
          .maybeSingle();
        if (emailLookupErr) {
          console.error('Supabase profile by email:', emailLookupErr);
          return Response.json(
            {
              error: 'Failed to fetch profile',
              details: emailLookupErr.message,
              code: emailLookupErr.code,
            },
            { status: 500 }
          );
        }
        if (byEmail) {
          const existing = byEmail as Record<string, unknown>;
          if (existing.user_id !== user.id) {
            const { error: linkErr } = await supabase
              .from('profiles')
              .update({ user_id: user.id })
              .eq('id', existing.id);
            if (linkErr) {
              console.error('Supabase profile link user_id:', linkErr);
              return Response.json(
                { error: 'Failed to fetch profile', details: linkErr.message, code: linkErr.code },
                { status: 500 }
              );
            }
          }
          return Response.json(profileJson(existing));
        }
      }
      query = query.eq('user_id', user.id);
    } else {
      return Response.json(
        { error: 'Provide ?address=0x... or Authorization: Bearer <token>' },
        { status: 400 }
      );
    }

    const { data: queryData, error } = await query.limit(1).maybeSingle();
    if (error) {
      console.error('Supabase get profile error:', error);
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
    const data = queryData;
    if (!data) {
      return Response.json({ error: 'Profile not found' }, { status: 404 });
    }
    const row = data as Record<string, unknown>;
    return Response.json(profileJson(row));
  } catch (e) {
    console.error('GET /api/profile fatal:', e);
    return Response.json(
      {
        error: 'Failed to fetch profile',
        details: e instanceof Error ? e.message : String(e),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!supabase) {
    const hasUrl = !!supabaseUrl;
    const hasKey = !!supabaseKey;
    const hint = !hasUrl || !hasKey
      ? ` (URL: ${hasUrl ? 'set' : 'missing'}, KEY: ${hasKey ? 'set' : 'missing'}. Use SUPABASE_URL or VITE_SUPABASE_URL, and SUPABASE_SERVICE_ROLE_KEY in .env.local)`
      : '';
    return Response.json(
      {
        error:
          'Storage not configured. Add Supabase project and set SUPABASE_URL (or VITE_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY.' + hint,
      },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!validateProfile(body)) {
    return Response.json(
      {
        error:
          'Invalid profile. Must have at least one payment method (ethereumAddress, baseAddress, solanaAddress, etc.).',
      },
      { status: 400 }
    );
  }

  const id = nanoid(10);
  const profile = body as StoredProfile & { ownerAddress?: string };
  const row: Record<string, unknown> = { id, ...toRow(profile) };

  // link to supabase user when session provided (google/email sign-in)
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (token) {
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (!authError && user) {
      row.user_id = user.id;
      // never put wallet synthetic email in profiles — only real emails
      if (user.email?.trim() && !isWalletEmail(user.email)) row.email = user.email.trim();
      // wallet users: set owner_address from verified metadata (client may not send it)
      if (user.user_metadata?.wallet_address) row.owner_address = String(user.user_metadata.wallet_address).trim();
    }
  }
  // link to wallet owner when provided by client (fallback)
  if (profile.ownerAddress?.trim() && !row.owner_address) row.owner_address = profile.ownerAddress.trim();

  const { error } = await supabase.from('profiles').insert(row);

  if (error) {
    console.error('Supabase insert error:', error);
    return Response.json(
      {
        error: 'Failed to save profile',
        details: error.message,
        hint: "Ensure the profiles table exists (run 'supabase db push' or apply migrations).",
      },
      { status: 500 }
    );
  }

  return Response.json({ id }, { status: 201 });
}
