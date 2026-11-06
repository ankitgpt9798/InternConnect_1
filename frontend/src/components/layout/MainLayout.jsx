import { Outlet } from 'react-router';
import Footer from './Footer.jsx';
import Navbar from './Navbar.jsx';

// Shared page frame: navbar on top, the current page in the middle, footer at the bottom.
export default function MainLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
