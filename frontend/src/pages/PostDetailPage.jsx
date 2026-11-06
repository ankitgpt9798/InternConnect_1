import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { getPost } from '../api/posts.js';
import PostCard from '../components/posts/PostCard.jsx';
import Alert from '../components/ui/Alert.jsx';
import { getErrorMessage } from '../utils/getErrorMessage.js';

// One post on its own page; shared links open here.
export default function PostDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getPost(id)
      .then(setPost)
      .catch((err) =>
        setError(err.response?.status === 404 ? 'This post does not exist or has been deleted.' : getErrorMessage(err)),
      );
  }, [id]);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link to="/public-space" className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">
        <ArrowLeft className="size-4" />
        Back to Public Space
      </Link>

      {error ? (
        <Alert>{error}</Alert>
      ) : post ? (
        <PostCard post={post} onUpdated={setPost} onRemoved={() => navigate('/public-space')} />
      ) : (
        <p className="py-8 text-center text-slate-500">Loading post…</p>
      )}
    </div>
  );
}
