import { useState, useEffect } from 'react';
import { ArrowLeft, QrCode, Copy, Check, Pencil } from 'lucide-react';
import QRCode from 'qrcode';
import { UserProfile } from './ProfileCreation';
import { encodeProfileForUrl } from '../lib/profileUrl';

interface ProfileViewProps {
  profile: UserProfile;
  onBack: () => void;
  onEdit?: () => void;
}

export default function ProfileView({ profile, onBack, onEdit }: ProfileViewProps) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  const getProfileUrl = () =>
    `${window.location.origin}/tip/${encodeProfileForUrl(profile)}`;

  useEffect(() => {
    const url = `${window.location.origin}/tip/${encodeProfileForUrl(profile)}`;
    const generateQR = async () => {
      try {
        const dataUrl = await QRCode.toDataURL(url, {
          width: 400,
          margin: 2,
          color: { dark: '#000000', light: '#ffffff' },
        });
        setQrDataUrl(dataUrl);
      } catch (error) {
        console.error('Error generating QR code:', error);
      }
    };
    generateQR();
  }, [profile]);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      <div className="max-w-lg mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" /> Back
          </button>
          {onEdit && (
            <button
              onClick={onEdit}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
            >
              <Pencil className="w-4 h-4" /> Edit
            </button>
          )}
        </div>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            Your FU Pay Me Code
          </h1>
          <p className="text-gray-400">one link for crypto & fiat — share the QR to get paid</p>
        </div>

        {/* qr code — the star of the show */}
        <div className="bg-slate-800/50 rounded-2xl p-8 mb-6 backdrop-blur-sm">
          <div className="flex flex-col items-center">
            {qrDataUrl && (
              <div className="p-6 bg-white rounded-2xl shadow-2xl mb-6">
                <img src={qrDataUrl} alt="QR Code" className="w-64 h-64" />
              </div>
            )}
            <div className="flex items-center gap-2 text-gray-300 mb-4">
              <QrCode className="w-5 h-5" />
              <span className="text-sm">scan to pay with crypto or any payment app</span>
            </div>
            <button
              onClick={() => copyToClipboard(getProfileUrl(), 'url')}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors text-sm"
            >
              {copied === 'url' ? (
                <><Check className="w-4 h-4" /> Copied!</>
              ) : (
                <><Copy className="w-4 h-4" /> Copy Link</>
              )}
            </button>
          </div>
        </div>

        {/* configured addresses */}
        <div className="space-y-3">
          {profile.ethereumAddress && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
              <span className="text-xl">⟠</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-400 mb-1">Ethereum</div>
                <code className="text-sm text-cyan-400 break-all">
                  {profile.ethereumAddress}
                </code>
              </div>
              <button
                onClick={() => copyToClipboard(profile.ethereumAddress, 'eth')}
                className="p-2 hover:bg-slate-700 rounded transition-colors shrink-0"
              >
                {copied === 'eth' ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4 text-gray-400" />
                )}
              </button>
            </div>
          )}

          {profile.baseAddress && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
              <span className="inline-block w-5 h-5 bg-blue-500 rounded-md shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-400 mb-1">Base</div>
                <code className="text-sm text-indigo-400 break-all">
                  {profile.baseAddress}
                </code>
              </div>
              <button
                onClick={() => copyToClipboard(profile.baseAddress ?? '', 'base')}
                className="p-2 hover:bg-slate-700 rounded transition-colors shrink-0"
              >
                {copied === 'base' ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4 text-gray-400" />
                )}
              </button>
            </div>
          )}

          {profile.bscAddress && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
              <span className="text-xl font-bold text-amber-400">◆</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-400 mb-1">BNB Chain</div>
                <code className="text-sm text-amber-400 break-all">
                  {profile.bscAddress}
                </code>
              </div>
              <button
                onClick={() => copyToClipboard(profile.bscAddress ?? '', 'bsc')}
                className="p-2 hover:bg-slate-700 rounded transition-colors shrink-0"
              >
                {copied === 'bsc' ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4 text-gray-400" />
                )}
              </button>
            </div>
          )}

          {profile.solanaAddress && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
              <span className="text-xl">◎</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-400 mb-1">Solana</div>
                <code className="text-sm text-purple-400 break-all">
                  {profile.solanaAddress}
                </code>
              </div>
              <button
                onClick={() => copyToClipboard(profile.solanaAddress, 'sol')}
                className="p-2 hover:bg-slate-700 rounded transition-colors shrink-0"
              >
                {copied === 'sol' ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4 text-gray-400" />
                )}
              </button>
            </div>
          )}
        </div>

        <div className="mt-12 text-center">
          <p className="text-xs text-gray-500">
            Made with <span className="text-blue-500">💙</span> for{' '}
            <a
              href="https://x.com/homebasedotlove"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline"
            >
              Home Base
            </a>
            {' · ETH Denver 2026 · '}
            <a
              href="https://x.com/adigitaltati"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline"
            >
              @adigitaltati
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
