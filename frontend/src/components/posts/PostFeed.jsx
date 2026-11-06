import { useEffect, useState } from 'react';
import { getPosts, getSavedPosts } from '../../api/posts.js';
import { getErrorMessage } from '../../utils/getErrorMessage.js';
import Alert from '../ui/Alert.jsx';
import Button from '../ui/Button.jsx';
import CreatePostForm from './CreatePostForm.jsx';
import PostCard from './PostCard.jsx';

// A list of posts with "Load more". source = "all" (with the post composer) or "saved".
export default function PostFeed({ source }) {
  const fetchPage = source === 'saved' ? getSavedPosts : getPosts;
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false; // an answer that arrives after the list was closed is ignored
    fetchPage(1)
      .then((data) => {
        if (ignore) return;
        setPosts(data.posts);
        setHasMore(data.hasMore);
      })
      .catch((err) => !ignore && setError(getErrorMessage(err)))
      .finally(() => !ignore && setLoading(false));
    return () => {
      ignore = true;
    };
  }, [fetchPage]);

  async function loadMore() {
    setLoadingMore(true);
    try {
      const data = await fetchPage(page + 1);
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
  const updatePost = (updated) =>
    // In the Saved list, a post that is no longer saved disappears.
    source === 'saved' && !updated.savedByMe
      ? removePost(updated.id)
      : setPosts((current) => current.map((post) => (post.id === updated.id ? updated : post)));

  const emptyMessage =
    source === 'saved'
      ? 'You have not saved any posts yet. Use the bookmark icon on a post to save it.'
      : 'No posts yet. Be the first to share something!';

  return (
    <div className="space-y-6">
      {source === 'all' && <CreatePostForm onCreated={addPost} />}

      {error && <Alert>{error}</Alert>}

      {loading ? (
        <p className="py-8 text-center text-slate-500">Loading posts…</p>
      ) : posts.length === 0 ? (
        !error && (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-slate-500">
            {emptyMessage}
          </p>
        )
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} onUpdated={updatePost} onRemoved={removePost} />
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
