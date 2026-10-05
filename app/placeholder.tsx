export function Placeholder({ title, note }: { title: string; note?: string }) {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-neutral-500">
        {note ?? 'Coming soon.'}
      </p>
    </main>
  );
}
