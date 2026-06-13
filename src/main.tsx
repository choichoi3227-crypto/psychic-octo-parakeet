import { createRoot } from 'react-dom/client';
import './styles/global.css';
import { AccountPage } from './routes/account';
import { LoginPage } from './routes/auth/login';
import { RegisterPage } from './routes/auth/register';
import { DashboardPage } from './routes/dashboard';
import { HostingDetailPage } from './routes/dashboard/hostings/detail';
import { NewHostingPage } from './routes/dashboard/hostings/new';
import { DocsPage } from './routes/docs';
import { LandingPage } from './routes/index';
import { PricingPage } from './routes/pricing';

function App() {
  const path = window.location.pathname;
  if (path === '/auth/login') return <LoginPage />;
  if (path === '/auth/register') return <RegisterPage />;
  if (path === '/dashboard') return <DashboardPage />;
  if (path === '/dashboard/hostings/new') return <NewHostingPage />;
  if (path.startsWith('/dashboard/hostings/')) return <HostingDetailPage />;
  if (path === '/account') return <AccountPage />;
  if (path === '/docs') return <DocsPage />;
  if (path === '/pricing') return <PricingPage />;
  return <LandingPage />;
}

const root = document.getElementById('root');

if (root) {
  createRoot(root).render(<App />);
} else {
  document.body.innerHTML = '<main class="shell"><h1>CloudPress</h1><p>앱 루트 요소를 찾을 수 없습니다.</p></main>';
}
