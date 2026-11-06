import { useCallback, useEffect, useState } from 'react';
import { getAllowance, getPosts, getSavedPosts } from '../../api/posts.js';
import { getErrorMessage } from '../../utils/getErrorMessage.js';
import Alert from '../ui/Alert.jsx';
import Button from '../ui/Button.jsx';
import CreatePostForm from './CreatePostForm.jsx';
import PostCard from './PostCard.jsx';

const EMPTY_MESSAGES = {
  all: 'No posts yet. Be the first to share something!',
  friends: 'No posts from your friends yet. Add friends on the Friends page, or share something yourself.',
  saved: 'You have not saved any posts yet. Use the bookmark icon on a post to save it.',
  tag: 'No posts with this hashtag yet.',
};

// A list of posts with "Load more".
// source: "all" or "friends" (both with the post composer), "saved", or "tag" (posts with the hashtag `tag`).
export default function PostFeed({ source, tag }) {
  const fetchPage = useCallback(
    (page) => {
      if (source === 'saved') return getSavedPosts(page);
      if (source === 'friends') return getPosts(page, { feed: 'friends' });
      if (source === 'tag') return getPosts(page, { tag });
      return getPosts(page);
    },
    [source, tag],
  );
  const showComposer = source === 'all' || source === 'friends';
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [allowance, setAllowance] = useState(null); // today's posting limit, for the composer

  // If the allowance cannot be loaded the composer still works; the server enforces the limit anyway.
  const refreshAllowance = () =>
    getAllowance()
      .then(setAllowance)
      .catch(() => {});

  useEffect(() => {
    if (!showComposer) return;
    getAllowance()
      .then(setAllowance)
      .catch(() => {});
  }, [showComposer]);

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

  function addPost(post, nextAllowance) {
    setPosts((current) => [post, ...current]);
    setAllowance(nextAllowance);
  }
  function removePost(id) {
    setPosts((current) => current.filter((post) => post.id !== id));
    if (showComposer) refreshAllowance(); // deleting today's post frees a slot
  }
  const updatePost = (updated) =>
    // In the Saved list, a post that is no longer saved disappears.
    source === 'saved' && !updated.savedByMe
      ? removePost(updated.id)
      : setPosts((current) => current.map((post) => (post.id === updated.id ? updated : post)));

  return (
    <div className="space-y-6">
      {showComposer && <CreatePostForm allowance={allowance} onCreated={addPost} onAllowanceChange={setAllowance} />}

      {error && <Alert>{error}</Alert>}

      {loading ? (
        <p className="py-8 text-center text-slate-500">Loading posts…</p>
      ) : posts.length === 0 ? (
        !error && (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-slate-500">
            {EMPTY_MESSAGES[source]}
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
