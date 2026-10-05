'use client';

import { useState } from 'react';

export function TagInput({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const [draft, setDraft] = useState('');

  function commit() {
    const tag = draft.trim().toLowerCase();
    if (tag !== '' && !tags.includes(tag)) onChange([...tags, tag]);
    setDraft('');
  }

  return (
    <div className="flex flex-1 flex-wrap items-center gap-1">
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
        >
          {tag}
          <button
            type="button"
            aria-label={`Remove tag ${tag}`}
            onClick={() => onChange(tags.filter((t) => t !== tag))}
            className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
          >
            ×
          </button>
        </span>
      ))}
      <input
        aria-label="Add tag"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ',') {
            event.preventDefault();
            commit();
          } else if (event.key === 'Backspace' && draft === '' && tags.length > 0) {
            onChange(tags.slice(0, -1));
          }
        }}
        placeholder="Add tag"
        className="min-w-20 flex-1 border-none bg-transparent px-1 py-0.5 text-sm outline-none placeholder:text-neutral-400"
      />
    </div>
  );
}
