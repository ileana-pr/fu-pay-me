import ConnectChoice from './ConnectChoice';

interface LoginPageProps {
  hasPrivy: boolean;
  onConnected?: () => void;
}

export default function LoginPage({ hasPrivy }: LoginPageProps) {
  return <ConnectChoice hasPrivy={hasPrivy} variant="full" />;
}
