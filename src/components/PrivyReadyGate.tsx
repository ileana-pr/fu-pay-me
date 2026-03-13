import { usePrivy } from '@privy-io/react-auth';

/** waits for Privy to be ready before rendering children — avoids blank screen during init */
export default function PrivyReadyGate({ children }: { children: React.ReactNode }) {
  const { ready } = usePrivy();

  if (!ready) {
    return (
      <div className="piri-page min-h-screen flex items-center justify-center">
        <p className="text-piri font-semibold">Loading...</p>
      </div>
    );
  }

  return <>{children}</>;
}
