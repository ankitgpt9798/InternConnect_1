import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router';
import PostFeed from '../components/posts/PostFeed.jsx';

// All posts with one hashtag, e.g. /hashtags/internship
export default function HashtagPage() {
  const tag = useParams().tag.toLowerCase();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link to="/public-space" className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">
        <ArrowLeft className="size-4" />
        Back to Public Space
      </Link>
      <div>
        <h1 className="text-2xl font-bold break-words text-slate-900">#{tag}</h1>
        <p className="mt-1 text-slate-600">Posts in Public Space with this hashtag.</p>
      </div>
      <PostFeed key={tag} source="tag" tag={tag} />
    </div>
  );
}
