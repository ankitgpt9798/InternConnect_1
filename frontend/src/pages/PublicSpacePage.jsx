import { useState } from 'react';
import PostFeed from '../components/posts/PostFeed.jsx';

const TABS = [
  { id: 'all', label: 'All posts' },
  { id: 'friends', label: 'Friends' },
  { id: 'saved', label: 'Saved' },
];

export default function PublicSpacePage() {
  const [tab, setTab] = useState('all');

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Public Space</h1>
        <p className="mt-1 text-slate-600">Share updates, photos and videos with other students.</p>
      </div>

      <div role="group" aria-label="Show posts" className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={tab === item.id}
            onClick={() => setTab(item.id)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === item.id ? 'bg-brand-700 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* The key gives each tab a fresh list, loaded from the start. */}
      <PostFeed key={tab} source={tab} />
    </div>
  );
}
