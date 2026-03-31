import { config } from 'dotenv';
import path from 'path';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';

config({ path: path.join(process.cwd(), '.env.local') });
config({ path: path.join(process.cwd(), '.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })
    : null;

const BUCKET = 'profile-avatars';
const MAX_BYTES = 600_000; // after client resize; hard guard on server

async function userOwnsProfile(profileId: string, user: User): Promise<boolean> {
  if (!supabase) return false;
  const { data: row, error } = await supabase
    .from('profiles')
    .select('user_id, owner_address, email')
    .eq('id', profileId)
    .maybeSingle();
  if (error || !row) return false;
  const r = row as { user_id?: string | null; owner_address?: string | null; email?: string | null };
  if (r.user_id === user.id) return true;
  const wa = user.user_metadata?.wallet_address;
  if (wa && r.owner_address && String(r.owner_address).toLowerCase() === String(wa).toLowerCase()) return true;
  if (user.email && r.email && user.email === r.email) return true;
  return false;
}

function resolveImageMime(file: File): string | null {
  const t = file.type || '';
  if (t === 'image/jpeg' || t === 'image/png' || t === 'image/webp') return t;
  const n = file.name.toLowerCase();
  if (n.endsWith('.png')) return 'image/png';
  if (n.endsWith('.jpg') || n.endsWith('.jpeg')) return 'image/jpeg';
  if (n.endsWith('.webp')) return 'image/webp';
  return null;
}

/** POST multipart: profileId (text), file (image webp/jpeg/png) */
export async function POST(request: Request) {
  if (!supabase || !supabaseUrl) {
    return Response.json({ error: 'Storage not configured' }, { status: 503 });
  }

  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return Response.json({ error: 'Authorization required' }, { status: 401 });
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return Response.json({ error: 'Invalid or expired session' }, { status: 401 });
  }

  const ct = request.headers.get('content-type') || '';
  if (!ct.includes('multipart/form-data')) {
    return Response.json({ error: 'Expected multipart form data' }, { status: 400 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: 'Invalid multipart body' }, { status: 400 });
  }

  const profileId = form.get('profileId');
  const file = form.get('file');

  if (typeof profileId !== 'string' || profileId.length < 8 || profileId.length > 32) {
    return Response.json({ error: 'Invalid profile id' }, { status: 400 });
  }

  if (!file || typeof file === 'string' || !(file instanceof File)) {
    return Response.json({ error: 'Missing file' }, { status: 400 });
  }

  const mime = resolveImageMime(file);
  if (!mime) {
    return Response.json({ error: 'Use a JPEG, PNG, or WebP image' }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.byteLength > MAX_BYTES) {
    return Response.json({ error: 'Image too large' }, { status: 400 });
  }

  const ok = await userOwnsProfile(profileId, user);
  if (!ok) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const ext = mime === 'image/png' ? 'png' : mime === 'image/jpeg' ? 'jpg' : 'webp';
  const objectPath = `${profileId}/avatar.${ext}`;

  const { error: upErr } = await supabase.storage.from(BUCKET).upload(objectPath, buf, {
    contentType: mime,
    upsert: true,
  });

  if (upErr) {
    console.error('avatar upload:', upErr);
    return Response.json({ error: 'Upload failed', details: upErr.message }, { status: 500 });
  }

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(objectPath);
  const avatarUrl = pub.publicUrl;

  const { error: dbErr } = await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', profileId);
  if (dbErr) {
    console.error('avatar db update:', dbErr);
    return Response.json({ error: 'Saved file but profile update failed' }, { status: 500 });
  }

  return Response.json({ avatarUrl }, { status: 200 });
}
