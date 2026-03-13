import { useState, useEffect } from 'react';
import TipPage from './TipPage';
import { UserProfile } from './ProfileCreation';
import { isProfileId } from '../lib/profileUrl';
import { decodeProfileFromUrl } from '../lib/profileUrl';
import { fetchProfile } from '../lib/profileApi';

interface TipPageLoaderProps {
  segment: string;
}

export default function TipPageLoader({ segment }: TipPageLoaderProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isProfileId(segment)) {
      fetchProfile(segment)
        .then(setProfile)
        .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
        .finally(() => setLoading(false));
    } else {
      try {
        setProfile(decodeProfileFromUrl(segment));
      } catch {
        setError('Invalid link');
      }
      setLoading(false);
    }
  }, [segment]);

  if (loading) {
    return (
      <div className="piri-page min-h-screen flex items-center justify-center">
        <p className="text-piri font-semibold">Loading...</p>
      </div>
    );
  }
  if (error || !profile) {
    return (
      <div className="piri-page min-h-screen flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-red-600 font-semibold">{error || 'Profile not found'}</p>
        <a href="/" className="piri-link text-sm">Go home</a>
      </div>
    );
  }
  const hasPrivy = !!import.meta.env.VITE_PRIVY_APP_ID;
  return <TipPage profile={profile} hasPrivy={hasPrivy} />;
}
