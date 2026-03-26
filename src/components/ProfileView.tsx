import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, QrCode, Copy, Check, Pencil, Download, Loader2, LogOut } from 'lucide-react';
import QRCode from 'qrcode';
import { UserProfile } from './ProfileCreation';
import { encodeProfileForUrl } from '../lib/profileUrl';
import {
  prepareShareImageExport,
  downloadShareBlob,
  formatFileSize,
  SHARE_IMAGE_PRESETS,
  type ShareImageExport,
  type ShareImageTheme,
} from '../lib/shareImage';
import { logClientError, shareImageUserMessage } from '../lib/userFacingErrors';

interface ProfileViewProps {
  profile: UserProfile;
  onBack: () => void;
  onEdit?: () => void;
  onSignOut?: () => void;
}

export default function ProfileView({ profile, onBack, onEdit, onSignOut }: ProfileViewProps) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [shareExport, setShareExport] = useState<ShareImageExport | null>(null);
  const [sharePanelOpen, setSharePanelOpen] = useState(false);
  const [shareLoadingDimension, setShareLoadingDimension] = useState<number | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareTheme, setShareTheme] = useState<ShareImageTheme>('light');
  const previewUrlRef = useRef<string | null>(null);

  // stable link when we have id — updates reflect without reshare; else legacy encoded URL
  const getProfileUrl = () =>
    profile.id
      ? `${window.location.origin}/tip/${profile.id}`
      : `${window.location.origin}/tip/${encodeProfileForUrl(profile)}`;

  useEffect(() => {
    const url = profile.id
      ? `${window.location.origin}/tip/${profile.id}`
      : `${window.location.origin}/tip/${encodeProfileForUrl(profile)}`;
    const generateQR = async () => {
      try {
        const dataUrl = await QRCode.toDataURL(url, {
          width: 400,
          margin: 2,
          color: { dark: '#2D0A00', light: '#ffffff' },
        });
        setQrDataUrl(dataUrl);
      } catch (error) {
        console.error('Error generating QR code:', error);
      }
    };
    generateQR();
  }, [profile]);

  const loadShareExportForDimension = async (dimension: number, themeOverride?: ShareImageTheme) => {
    const theme = themeOverride ?? shareTheme;
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setShareError(null);
    setShareLoadingDimension(dimension);
    try {
      const data = await prepareShareImageExport(getProfileUrl(), dimension, theme);
      setShareExport(data);
      previewUrlRef.current = URL.createObjectURL(data.png.blob);
    } catch (e) {
      logClientError('ProfileView share export', e);
      setShareError(shareImageUserMessage());
    } finally {
      setShareLoadingDimension(null);
    }
  };

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, []);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="piri-page">
      <div className="max-w-lg mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-6">
          <button onClick={onBack} className="flex items-center gap-2 font-semibold text-piri transition-opacity hover:opacity-70">
            <ArrowLeft className="w-5 h-5" /> Back
          </button>
          <div className="flex items-center gap-4">
            {onSignOut && (
              <button onClick={onSignOut} className="flex items-center gap-2 font-semibold text-sm text-piri-muted hover:text-piri transition-opacity">
                <LogOut className="w-4 h-4" /> Sign out
              </button>
            )}
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="piri-heading text-4xl font-black mb-2">Your Piri</h1>
          <p className="text-sm font-semibold piri-muted">one link for every flavor — share the QR to get paid</p>
        </div>

        <div className="rounded-2xl p-8 mb-6 border-2 bg-piri-cream border-piri-cashapp">
          <div className="flex flex-col items-center">
            {qrDataUrl && (
              <div className="p-6 bg-white rounded-2xl shadow-lg mb-6 border-2 border-piri">
                <img src={qrDataUrl} alt="Scan to pay with Piri" className="w-64 h-64" />
              </div>
            )}
            <div className="flex items-center gap-2 mb-4 piri-muted">
              <QrCode className="w-5 h-5" />
              <span className="text-sm font-semibold">scan to pay — crypto or any payment app</span>
            </div>
            {profile.id && (
              <p className="text-xs piri-muted mb-2 text-center">your link stays the same when you edit — no need to reshare</p>
            )}
            <div className="flex flex-col items-center gap-3 w-full">
              <button
                onClick={() => copyToClipboard(getProfileUrl(), 'url')}
                className="flex items-center gap-2 px-5 py-2.5 text-sm piri-btn-primary"
              >
                {copied === 'url' ? <><Check className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy Link</>}
              </button>

              {/* export: pick dimensions first, then see file sizes, then format */}
              {!sharePanelOpen && (
                <button
                  type="button"
                  onClick={() => {
                    setSharePanelOpen(true);
                    setShareError(null);
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl border-2 border-piri text-piri bg-white hover:opacity-90 transition-opacity"
                >
                  <Download className="w-4 h-4" /> Download image
                </button>
              )}
              {onEdit && (
                <button
                  type="button"
                  onClick={onEdit}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl border-2 border-piri-cashapp bg-piri-cashapp/15 text-piri hover:bg-piri-cashapp/25 transition-colors"
                >
                  <Pencil className="w-4 h-4" /> Edit
                </button>
              )}
              {sharePanelOpen && (
                <div className="w-full max-w-sm rounded-xl border-2 border-piri/20 bg-white/80 p-4 text-left">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold piri-muted uppercase tracking-wider">image size</p>
                    <button
                      type="button"
                      className="text-xs font-bold text-piri hover:opacity-80"
                      onClick={() => {
                        setSharePanelOpen(false);
                        setShareExport(null);
                        setShareError(null);
                        if (previewUrlRef.current) {
                          URL.revokeObjectURL(previewUrlRef.current);
                          previewUrlRef.current = null;
                        }
                      }}
                    >
                      close
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-bold piri-muted uppercase tracking-wider">theme</span>
                    <div className="flex rounded-lg border-2 border-piri/20 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => {
                          setShareTheme('light');
                          if (shareExport) loadShareExportForDimension(shareExport.dimension, 'light');
                        }}
                        className={`px-3 py-1.5 text-xs font-bold transition-colors ${shareTheme === 'light' ? 'bg-piri text-white' : 'bg-white text-piri hover:bg-piri/10'}`}
                      >
                        Light
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShareTheme('dark');
                          if (shareExport) loadShareExportForDimension(shareExport.dimension, 'dark');
                        }}
                        className={`px-3 py-1.5 text-xs font-bold transition-colors ${shareTheme === 'dark' ? 'bg-piri text-white' : 'bg-white text-piri hover:bg-piri/10'}`}
                      >
                        Dark
                      </button>
                    </div>
                  </div>
                  <p className="text-xs piri-muted mb-3">smaller dimensions = smaller files. pick one, then choose PNG or JPEG.</p>
                  <div className="flex flex-col gap-2 mb-4">
                    {SHARE_IMAGE_PRESETS.map((p) => {
                      const loading = shareLoadingDimension === p.size;
                      const selected = shareExport?.dimension === p.size;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          disabled={loading}
                          onClick={() => loadShareExportForDimension(p.size)}
                          className={`flex items-center justify-between rounded-lg border-2 px-3 py-2 text-left transition-colors ${
                            selected
                              ? 'border-piri-cashapp bg-piri-cream/50'
                              : 'border-piri/15 bg-white hover:border-piri/30'
                          }`}
                        >
                          <span>
                            <span className="font-bold text-piri text-sm">{p.label}</span>
                            <span className="block text-xs piri-muted">{p.hint}</span>
                          </span>
                          {loading && <Loader2 className="w-4 h-4 shrink-0 animate-spin text-piri" />}
                        </button>
                      );
                    })}
                  </div>
                  {shareError && (
                    <p className="text-sm font-semibold text-red-600 mb-3">{shareError}</p>
                  )}
                  {shareExport && (
                    <>
                      <p className="text-xs font-bold piri-muted uppercase tracking-wider mb-2">
                        preview
                      </p>
                      <div className="mb-4 rounded-xl overflow-hidden border-2 border-piri/20 bg-piri-bg flex justify-center">
                        {previewUrlRef.current && (
                          <img
                            src={previewUrlRef.current}
                            alt="Share image preview"
                            className="max-w-full w-full max-h-[320px] object-contain"
                          />
                        )}
                      </div>
                      <p className="text-xs font-bold piri-muted uppercase tracking-wider mb-2">
                        download ({shareExport.dimension} px)
                      </p>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div>
                            <span className="font-bold text-piri">PNG</span>
                            <span className="text-sm piri-muted ml-2">{formatFileSize(shareExport.png.bytes)}</span>
                            {shareExport.png.overRecommendedMax && (
                              <span className="block text-xs text-amber-700 font-semibold mt-0.5">
                                over 1 MB — try JPEG or a smaller size above
                              </span>
                            )}
                            <span className="block text-xs piri-muted">lossless, sharpest QR</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => downloadShareBlob(shareExport.png.blob, shareExport.png.filename)}
                            className="shrink-0 px-3 py-2 text-xs font-bold piri-btn-primary rounded-lg"
                          >
                            Download
                          </button>
                        </div>
                        <div className="flex items-center justify-between gap-2 flex-wrap border-t border-piri/10 pt-3">
                          <div>
                            <span className="font-bold text-piri">JPEG</span>
                            <span className="text-sm piri-muted ml-2">{formatFileSize(shareExport.jpeg.bytes)}</span>
                            {shareExport.jpeg.overRecommendedMax && (
                              <span className="block text-xs text-amber-700 font-semibold mt-0.5">
                                over 1 MB — pick a smaller size above
                              </span>
                            )}
                            <span className="block text-xs piri-muted">smaller file, still scannable</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => downloadShareBlob(shareExport.jpeg.blob, shareExport.jpeg.filename)}
                            className="shrink-0 px-3 py-2 text-xs font-bold piri-btn-primary rounded-lg"
                          >
                            Download
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-12 text-center">
          <p className="text-xs font-semibold piri-muted">
            Made with <span aria-label="love">🍧</span> for{' '}
            <a href="https://x.com/homebasedotlove" target="_blank" rel="noopener noreferrer" className="piri-link">Home Base</a>
            {' · ETH Denver 2026 · '}
            <a href="https://x.com/adigitaltati" target="_blank" rel="noopener noreferrer" className="piri-link">@adigitaltati</a>
          </p>
        </div>
      </div>
    </div>
  );
}
