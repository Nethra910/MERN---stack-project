import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-bold">Page not found</h1>
        <p className="text-sm text-white/70">The page you requested does not exist.</p>
        <Link
          to="/dashboard"
          className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
