'use client';

import { useState } from 'react';

export interface ClassFormValues {
  name: string;
  period: string;
  subject: string;
}

export function ClassForm({
  onSubmit,
  initial,
  submitLabel = 'Add class',
}: {
  onSubmit: (values: ClassFormValues) => void;
  initial?: ClassFormValues;
  submitLabel?: string;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [period, setPeriod] = useState(initial?.period ?? '');
  const [subject, setSubject] = useState(initial?.subject ?? '');

  const inputClass =
    'rounded-md border border-neutral-200 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-neutral-400 dark:border-neutral-700';

  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (name.trim() === '') return;
        onSubmit({ name, period, subject });
        if (initial === undefined) {
          setName('');
          setPeriod('');
          setSubject('');
        }
      }}
    >
      <label className="flex flex-col gap-1 text-xs font-medium text-neutral-500">
        Class name
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          placeholder="Algebra I"
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-neutral-500">
        Period
        <input
          value={period}
          onChange={(event) => setPeriod(event.target.value)}
          placeholder="Period 3"
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-neutral-500">
        Subject
        <input
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          placeholder="Math"
          className={inputClass}
        />
      </label>
      <button
        type="submit"
        className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm text-white hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
      >
        {submitLabel}
      </button>
    </form>
  );
}
