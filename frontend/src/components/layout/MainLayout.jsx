import { Outlet, useLocation } from 'react-router';
import Footer from './Footer.jsx';
import Navbar from './Navbar.jsx';

// Shared page frame: navbar on top, the current page in the middle, footer at the bottom. The homepage uses the full
// width for its coloured sections; every other page sits in the usual centred column.
export default function MainLayout() {
  const { pathname } = useLocation();
  const fullWidth = pathname === '/';

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className={fullWidth ? 'w-full flex-1' : 'mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6'}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
