import { useState, useMemo, useEffect } from 'react';

/**
 * Chain logos: chain png → chain jpg → /logo/piri.png → letter badge.
 * png is preferred because it preserves transparent backgrounds.
 */
type ChainId = 'ethereum' | 'base' | 'bitcoin' | 'solana' | 'tezos' | 'cashapp' | 'venmo' | 'zelle' | 'paypal';

const LOGO_DIR = '/logo';
const SHARED_PLACEHOLDER = `${LOGO_DIR}/piri.png`;

const FALLBACK_LETTER: Record<ChainId, string> = {
  ethereum: '⟠',
  base: '⬡',
  bitcoin: '₿',
  solana: '◎',
  tezos: 'ꜩ',
  cashapp: '$',
  venmo: 'V',
  zelle: 'Z',
  paypal: 'P',
};

function logoCandidates(chain: ChainId): string[] {
  const aliases: Record<ChainId, string[]> = {
    ethereum: ['ethereum', 'eth'],
    base: ['base'],
    bitcoin: ['bitcoin', 'btc'],
    solana: ['solana', 'sol'],
    tezos: ['tezos', 'xtz'],
    cashapp: ['cashapp', 'cash-app'],
    venmo: ['venmo'],
    zelle: ['zelle'],
    paypal: ['paypal'],
  };

  const candidates = aliases[chain].flatMap((name) => [
    `${LOGO_DIR}/${name}.svg`,
    `${LOGO_DIR}/${name}.png`,
    `${LOGO_DIR}/${name}.jpg`,
  ]);

  return [...candidates, SHARED_PLACEHOLDER];
}

interface ChainLogoProps {
  chain: ChainId;
  className?: string;
  size?: number;
}

const defaultSize = 40;

export default function ChainLogo({ chain, className = '', size = defaultSize }: ChainLogoProps) {
  const candidates = useMemo(() => logoCandidates(chain), [chain]);
  const [index, setIndex] = useState(0);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setIndex(0);
    setImgError(false);
  }, [chain]);

  const src = candidates[index] ?? '';

  const handleError = () => {
    if (index + 1 < candidates.length) setIndex((n) => n + 1);
    else setImgError(true);
  };

  if (imgError || !src) {
    return (
      <span
        className={`inline-flex items-center justify-center font-bold text-piri ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.5 }}
        aria-hidden
      >
        {FALLBACK_LETTER[chain]}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size, objectFit: 'contain' }}
      onError={handleError}
      aria-hidden
    />
  );
}
