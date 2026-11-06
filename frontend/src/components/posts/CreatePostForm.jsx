import { ImagePlus, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPost } from '../../api/posts.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { getErrorMessage } from '../../utils/getErrorMessage.js';
import Avatar from '../Avatar.jsx';
import Button from '../ui/Button.jsx';

// The same limits as the backend (backend/src/middleware/upload.js).
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const MB = 1024 * 1024;
const CAPTION_MAX = 1000;

function checkFile(file) {
  const isImage = IMAGE_TYPES.includes(file.type);
  const isVideo = VIDEO_TYPES.includes(file.type);
  if (!isImage && !isVideo) return 'Only JPEG, PNG, WebP or GIF photos and MP4, WebM or MOV videos can be uploaded.';
  if (isImage && file.size > 5 * MB) return 'Photos can be up to 5 MB.';
  if (isVideo && file.size > 30 * MB) return 'Videos can be up to 30 MB.';
  return '';
}

export default function CreatePostForm({ onCreated }) {
  const { user } = useAuth();
  const [caption, setCaption] = useState('');
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(null); // upload percentage while posting, otherwise null
  const fileInput = useRef(null);

  // A temporary local URL so the chosen photo or video can be previewed before posting.
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : ''), [file]);
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  function handleFileChange(event) {
    const chosen = event.target.files[0];
    event.target.value = ''; // lets the same file be chosen again after removing it
    if (!chosen) return;
    const problem = checkFile(chosen);
    setError(problem);
    setFile(problem ? null : chosen);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!caption.trim() && !file) {
      setError('Write something or add a photo or video.');
      return;
    }

    const formData = new FormData();
    formData.append('caption', caption);
    if (file) formData.append('media', file);

    setError('');
    setProgress(0);
    try {
      const post = await createPost(formData, (event) => {
        if (event.total) setProgress(Math.round((event.loaded / event.total) * 100));
      });
      setCaption('');
      setFile(null);
      onCreated(post);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setProgress(null);
    }
  }

  const posting = progress !== null;

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex gap-3">
        <Avatar name={user.name} />
        <div className="min-w-0 flex-1">
          <label htmlFor="caption" className="sr-only">
            What do you want to share?
          </label>
          <textarea
            id="caption"
            rows={3}
            maxLength={CAPTION_MAX}
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            placeholder="Share an update, a photo or a video…"
            className="block w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none"
          />
          <p className="mt-1 text-right text-xs text-slate-500">
            {caption.length}/{CAPTION_MAX}
          </p>
        </div>
      </div>

      {file && (
        <div className="relative mt-3 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
          {file.type.startsWith('video/') ? (
            <video src={preview} controls className="max-h-80 w-full bg-black" />
          ) : (
            <img src={preview} alt="Preview of the chosen photo" className="max-h-80 w-full object-contain" />
          )}
          <button
            type="button"
            onClick={() => setFile(null)}
            disabled={posting}
            aria-label="Remove the photo or video"
            className="absolute top-2 right-2 rounded-full bg-slate-900/70 p-1.5 text-white hover:bg-slate-900"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-3 flex items-center justify-between gap-3">
        <input ref={fileInput} type="file" accept={[...IMAGE_TYPES, ...VIDEO_TYPES].join(',')} onChange={handleFileChange} hidden />
        <Button type="button" variant="ghost" size="sm" onClick={() => fileInput.current.click()} disabled={posting}>
          <ImagePlus className="size-4" />
          Photo / video
        </Button>
        <Button type="submit" size="sm" disabled={posting}>
          {posting ? `Posting… ${progress}%` : 'Post'}
        </Button>
      </div>
    </form>
  );
}
