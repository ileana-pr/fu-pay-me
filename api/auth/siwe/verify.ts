import { config } from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { createPublicClient, http, getAddress } from 'viem';
import { base, mainnet } from 'viem/chains';
import { verifySiweMessage } from 'viem/siwe';
import { parseSiweMessage, validateSiweMessage } from 'viem/siwe';
import { nanoid } from 'nanoid';

config({ path: path.join(process.cwd(), '.env.local') });
config({ path: path.join(process.cwd(), '.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })
    : null;

const WALLET_EMAIL_DOMAIN = 'wallet.piri';

function chainIdToChain(chainId: number): 'ethereum' | 'base' {
  return chainId === 1 ? 'ethereum' : 'base';
}

/** POST /api/auth/siwe/verify — verify signature, create/find user, return session (SIWE standard) */
export async function POST(request: Request) {
  try {
    if (!supabase) {
      return Response.json(
        { error: 'Auth not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.' },
        { status: 503 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { message, signature } = body as { message?: string; signature?: string };

    if (!message || !signature) {
      return Response.json(
        { error: 'Missing message or signature' },
        { status: 400 }
      );
    }

    if (typeof signature !== 'string' || !signature.startsWith('0x')) {
      return Response.json({ error: 'Invalid signature format' }, { status: 400 });
    }

    // parse message and get nonce from it (SIWE standard — nonce is in the signed message)
    const parsed = parseSiweMessage(message);
    const nonce = parsed.nonce;

    if (!parsed.address || !nonce || !parsed.chainId) {
      return Response.json({ error: 'Invalid message: missing fields' }, { status: 400 });
    }

    const url = new URL(request.url);
    const domain = url.hostname === 'localhost' ? 'localhost' : url.hostname;
    const isValidFormat = validateSiweMessage({
      message: parsed,
      nonce,
      domain,
      time: new Date(),
    });
    if (!isValidFormat) {
      return Response.json({ error: 'Invalid or expired message format' }, { status: 401 });
    }

    // verify nonce exists in supabase (select then delete to consume)
    const { data: nonceRow, error: selectErr } = await supabase
      .from('siwe_nonces')
      .select('nonce, expires_at')
      .eq('nonce', nonce)
      .maybeSingle();

    if (selectErr || !nonceRow) {
      console.error('[SIWE] nonce lookup failed', { nonce: nonce?.slice(0, 12) + '...', selectErr });
      return Response.json(
        {
          error: 'Invalid or expired nonce',
          details: selectErr?.message ?? 'Nonce not found in database',
          _debug: process.env.NODE_ENV === 'development' ? { nonceLen: nonce?.length } : undefined,
        },
        { status: 400 }
      );
    }

    if (nonceRow.expires_at && new Date(nonceRow.expires_at) < new Date()) {
      await supabase.from('siwe_nonces').delete().eq('nonce', nonce);
      return Response.json({ error: 'Nonce expired' }, { status: 400 });
    }

    await supabase.from('siwe_nonces').delete().eq('nonce', nonce);

    // verify signature — use public client (supports EOA + smart contract wallets via EIP-1271)
    const chainId = Number(parsed.chainId);
    const publicClient = createPublicClient({
      chain: chainId === 8453 ? base : mainnet,
      transport: http(),
    });
    const isValidSig = await verifySiweMessage(publicClient, {
      message,
      signature: signature as `0x${string}`,
      domain,
      nonce,
      time: new Date(),
    });
    if (!isValidSig) {
      return Response.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const address = getAddress(parsed.address as `0x${string}`);
    const chain = chainIdToChain(Number(parsed.chainId));
    const addressLower = address.toLowerCase();

    const walletEmail = `${addressLower}@${WALLET_EMAIL_DOMAIN}`;

    // lookup by profiles.owner_address — same wallet = same user (prevents duplicates)
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('user_id')
      .ilike('owner_address', addressLower)
      .limit(1)
      .maybeSingle();

    let userId: string;

    if (existingProfile?.user_id) {
      userId = existingProfile.user_id;
    } else {
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: walletEmail,
        email_confirm: true,
        user_metadata: { wallet_address: address, chain },
      });
      if (createError) {
        console.error('SIWE create user error:', createError);
        const isAuthError = /Bearer token|valid Bearer|invalid.*key/i.test(createError.message);
        return Response.json(
          {
            error: 'Failed to create account',
            details: createError.message,
            hint: isAuthError ? 'Use SUPABASE_SERVICE_ROLE_KEY (from Supabase Dashboard → Settings → API), not the anon key' : undefined,
          },
          { status: 500 }
        );
      }
      userId = newUser.user.id;

      // create profile immediately — owner_address links wallet to user (no wallet_identities)
      const profileId = nanoid(10);
      const { error: profileErr } = await supabase.from('profiles').insert({
        id: profileId,
        user_id: userId,
        owner_address: addressLower,
      });
      if (profileErr) {
        console.error('SIWE profile insert error:', profileErr);
        return Response.json(
          { error: 'Failed to create profile', details: profileErr.message, hint: 'Run migrations: npm run supabase:db' },
          { status: 500 }
        );
      }
    }

    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: walletEmail,
    });

    if (linkError || !linkData?.properties?.hashed_token) {
      console.error('SIWE generateLink error:', linkError);
      const isAuthError = /Bearer token|valid Bearer|invalid.*key/i.test(linkError?.message ?? '');
      return Response.json(
        {
          error: 'Failed to create session',
          details: linkError?.message,
          hint: isAuthError ? 'Use SUPABASE_SERVICE_ROLE_KEY (from Supabase Dashboard → Settings → API), not the anon key' : undefined,
        },
        { status: 500 }
      );
    }

    return Response.json({
      token_hash: linkData.properties.hashed_token,
      user_id: userId,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error('SIWE verify handler error:', err);
    return Response.json(
      {
        error: 'Verification failed',
        details: msg,
        stack: process.env.NODE_ENV === 'development' ? stack : undefined,
      },
      { status: 500 }
    );
  }
}
