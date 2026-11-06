import { useEffect, useState } from 'react';
import { getPosts } from '../api/posts.js';
import CreatePostForm from '../components/posts/CreatePostForm.jsx';
import PostCard from '../components/posts/PostCard.jsx';
import Alert from '../components/ui/Alert.jsx';
import Button from '../components/ui/Button.jsx';
import { getErrorMessage } from '../utils/getErrorMessage.js';

export default function PublicSpacePage() {
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getPosts(1)
      .then((data) => {
        setPosts(data.posts);
        setHasMore(data.hasMore);
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  async function loadMore() {
    setLoadingMore(true);
    try {
      const data = await getPosts(page + 1);
      // Skip posts already shown (new posts push older ones onto the next page).
      setPosts((current) => {
        const shown = new Set(current.map((post) => post.id));
        return [...current, ...data.posts.filter((post) => !shown.has(post.id))];
      });
      setPage(page + 1);
      setHasMore(data.hasMore);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoadingMore(false);
    }
  }

  const addPost = (post) => setPosts((current) => [post, ...current]);
  const removePost = (id) => setPosts((current) => current.filter((post) => post.id !== id));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Public Space</h1>
        <p className="mt-1 text-slate-600">Share updates, photos and videos with other students.</p>
      </div>

      <CreatePostForm onCreated={addPost} />

      {error && <Alert>{error}</Alert>}

      {loading ? (
        <p className="py-8 text-center text-slate-500">Loading posts…</p>
      ) : posts.length === 0 ? (
        !error && (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white py-10 text-center text-slate-500">
            No posts yet. Be the first to share something!
          </p>
        )
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} onDeleted={removePost} />
          ))}
        </div>
      )}

      {hasMore && (
        <div className="text-center">
          <Button variant="secondary" onClick={loadMore} loading={loadingMore}>
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
