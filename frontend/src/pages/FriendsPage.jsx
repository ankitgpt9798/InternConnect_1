import { Check, Search, UserPlus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { acceptRequest, deleteRequest, getFriends, removeFriend, searchStudents, sendRequest } from '../api/friends.js';
import { getAllowance } from '../api/posts.js';
import Avatar from '../components/Avatar.jsx';
import PostingAllowance from '../components/PostingAllowance.jsx';
import Alert from '../components/ui/Alert.jsx';
import Button from '../components/ui/Button.jsx';
import { getErrorMessage } from '../utils/getErrorMessage.js';
import { timeAgo } from '../utils/timeAgo.js';

function Section({ title, count, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">
        {title}
        {count !== undefined && <span className="ml-2 text-sm font-normal text-slate-500">({count})</span>}
      </h2>
      {children}
    </section>
  );
}

function StudentRow({ name, subtitle, children }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar name={name} />
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-900">{name}</p>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </li>
  );
}

const Empty = ({ children }) => <p className="mt-3 text-sm text-slate-500">{children}</p>;

export default function FriendsPage() {
  const [lists, setLists] = useState(null); // { friends, received, sent }
  const [results, setResults] = useState(null);
  const [allowance, setAllowance] = useState(null); // the posting limit depends on the number of friends
  const [query, setQuery] = useState('');
  const [searchedFor, setSearchedFor] = useState('');
  const [busy, setBusy] = useState(''); // what is waiting for the server
  const [confirmRemove, setConfirmRemove] = useState(''); // id of the friend about to be removed
  const [message, setMessage] = useState(null); // { type: 'success' | 'error', text }

  useEffect(() => {
    Promise.all([getFriends(), searchStudents(''), getAllowance()])
      .then(([nextLists, nextResults, nextAllowance]) => {
        setLists(nextLists);
        setResults(nextResults);
        setAllowance(nextAllowance);
      })
      .catch((err) => setMessage({ type: 'error', text: getErrorMessage(err) }));
  }, []);

  // Runs one action, then reloads the lists and the search results so every section is up to date.
  async function act(key, request) {
    setBusy(key);
    setMessage(null);
    try {
      const data = await request();
      const [nextLists, nextResults, nextAllowance] = await Promise.all([
        getFriends(),
        searchStudents(searchedFor),
        getAllowance(),
      ]);
      setLists(nextLists);
      setResults(nextResults);
      setAllowance(nextAllowance);
      setMessage({ type: 'success', text: data.message });
    } catch (err) {
      setMessage({ type: 'error', text: getErrorMessage(err) });
    } finally {
      setBusy('');
      setConfirmRemove('');
    }
  }

  async function handleSearch(event) {
    event.preventDefault();
    setBusy('search');
    setMessage(null);
    try {
      setResults(await searchStudents(query));
      setSearchedFor(query);
    } catch (err) {
      setMessage({ type: 'error', text: getErrorMessage(err) });
    } finally {
      setBusy('');
    }
  }

  // The buttons shown next to a student in the search results.
  function resultActions(student) {
    if (student.status === 'friend') {
      return (
        <span className="inline-flex items-center gap-1 text-sm font-medium text-green-700">
          <Check className="size-4" /> Friends
        </span>
      );
    }
    if (student.status === 'request_sent') {
      return (
        <Button variant="secondary" size="sm" disabled={!!busy} onClick={() => act(student.id, () => deleteRequest(student.requestId))}>
          Cancel request
        </Button>
      );
    }
    if (student.status === 'request_received') {
      return (
        <>
          <Button size="sm" disabled={!!busy} onClick={() => act(student.id, () => acceptRequest(student.requestId))}>
            Accept
          </Button>
          <Button variant="ghost" size="sm" disabled={!!busy} onClick={() => act(student.id, () => deleteRequest(student.requestId))}>
            Decline
          </Button>
        </>
      );
    }
    return (
      <Button size="sm" disabled={!!busy} onClick={() => act(student.id, () => sendRequest(student.id))}>
        <UserPlus className="size-4" /> {busy === student.id ? 'Sending…' : 'Add friend'}
      </Button>
    );
  }

  if (!lists || !results) {
    return message ? <Alert>{message.text}</Alert> : <p className="py-16 text-center text-slate-500">Loading…</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Friends</h1>
        <p className="mt-1 text-slate-600">Find other students, send friend requests and manage your friends.</p>
      </div>

      {message && <Alert type={message.type}>{message.text}</Alert>}

      {allowance && (
        <section className="rounded-2xl border border-brand-100 bg-brand-50 p-5">
          <h2 className="font-semibold text-brand-900">Your posting limit in Public Space</h2>
          <div className="mt-1">
            <PostingAllowance allowance={allowance} showFriendsLink={false} />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Each friend lets you post once a day: 1 friend = 1 post, 2 friends = 2 posts, and so on. With more than 10
            friends you can post as often as you like. The count restarts at midnight (IST).
          </p>
        </section>
      )}

      {lists.received.length > 0 && (
        <Section title="Friend requests" count={lists.received.length}>
          <ul className="mt-2 divide-y divide-slate-100">
            {lists.received.map((request) => (
              <StudentRow key={request.id} name={request.user.name} subtitle={`Sent you a request ${timeAgo(request.createdAt)}`}>
                <Button size="sm" disabled={!!busy} onClick={() => act(request.id, () => acceptRequest(request.id))}>
                  Accept
                </Button>
                <Button variant="ghost" size="sm" disabled={!!busy} onClick={() => act(request.id, () => deleteRequest(request.id))}>
                  Decline
                </Button>
              </StudentRow>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Find students">
        <form onSubmit={handleSearch} className="mt-3 flex gap-2">
          <label htmlFor="student-search" className="sr-only">
            Search students by name
          </label>
          <input
            id="student-search"
            type="search"
            maxLength={50}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name"
            className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none"
          />
          <Button type="submit" variant="secondary" loading={busy === 'search'}>
            <Search className="size-4" /> Search
          </Button>
        </form>
        {!searchedFor && <p className="mt-3 text-xs text-slate-500">Newest students on InternConnect:</p>}
        {results.length === 0 ? (
          <Empty>No students found{searchedFor ? ` for "${searchedFor}"` : ''}.</Empty>
        ) : (
          <ul className="mt-1 divide-y divide-slate-100">
            {results.map((student) => (
              <StudentRow key={student.id} name={student.name}>
                {resultActions(student)}
              </StudentRow>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Your friends" count={lists.friends.length}>
        {lists.friends.length === 0 ? (
          <Empty>You have no friends yet. Search for students above and send a request.</Empty>
        ) : (
          <ul className="mt-2 divide-y divide-slate-100">
            {lists.friends.map((friend) => (
              <StudentRow key={friend.id} name={friend.name}>
                {confirmRemove === friend.id ? (
                  <>
                    <span className="text-sm text-slate-600">Remove?</span>
                    <Button variant="secondary" size="sm" disabled={!!busy} onClick={() => act(friend.id, () => removeFriend(friend.id))}>
                      Yes, remove
                    </Button>
                    <Button variant="ghost" size="sm" disabled={!!busy} onClick={() => setConfirmRemove('')}>
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button variant="ghost" size="sm" disabled={!!busy} onClick={() => setConfirmRemove(friend.id)}>
                    Remove
                  </Button>
                )}
              </StudentRow>
            ))}
          </ul>
        )}
      </Section>

      {lists.sent.length > 0 && (
        <Section title="Requests you sent" count={lists.sent.length}>
          <ul className="mt-2 divide-y divide-slate-100">
            {lists.sent.map((request) => (
              <StudentRow key={request.id} name={request.user.name} subtitle={`Sent ${timeAgo(request.createdAt)}`}>
                <Button variant="secondary" size="sm" disabled={!!busy} onClick={() => act(request.id, () => deleteRequest(request.id))}>
                  Cancel request
                </Button>
              </StudentRow>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
