import Markdown from 'react-markdown';

const components = {
  h1: (props: { children?: React.ReactNode }) => (
    <h1 className="mt-5 mb-2 text-2xl font-bold">{props.children}</h1>
  ),
  h2: (props: { children?: React.ReactNode }) => (
    <h2 className="mt-4 mb-2 text-xl font-semibold">{props.children}</h2>
  ),
  h3: (props: { children?: React.ReactNode }) => (
    <h3 className="mt-3 mb-1 text-lg font-semibold">{props.children}</h3>
  ),
  p: (props: { children?: React.ReactNode }) => (
    <p className="my-2 leading-relaxed">{props.children}</p>
  ),
  ul: (props: { children?: React.ReactNode }) => (
    <ul className="my-2 list-disc space-y-1 pl-6">{props.children}</ul>
  ),
  ol: (props: { children?: React.ReactNode }) => (
    <ol className="my-2 list-decimal space-y-1 pl-6">{props.children}</ol>
  ),
  li: (props: { children?: React.ReactNode }) => (
    <li className="leading-relaxed">{props.children}</li>
  ),
  blockquote: (props: { children?: React.ReactNode }) => (
    <blockquote className="my-2 border-l-2 border-neutral-300 pl-3 italic text-neutral-600 dark:border-neutral-700 dark:text-neutral-400">
      {props.children}
    </blockquote>
  ),
  code: (props: { children?: React.ReactNode }) => (
    <code className="rounded bg-neutral-100 px-1 py-0.5 text-sm dark:bg-neutral-800">
      {props.children}
    </code>
  ),
  pre: (props: { children?: React.ReactNode }) => (
    <pre className="my-2 overflow-x-auto rounded-md bg-neutral-100 p-3 text-sm dark:bg-neutral-800">
      {props.children}
    </pre>
  ),
  a: (props: { children?: React.ReactNode; href?: string }) => (
    <a href={props.href} className="text-blue-600 underline dark:text-blue-400">
      {props.children}
    </a>
  ),
  hr: () => <hr className="my-4 border-neutral-200 dark:border-neutral-700" />,
  table: (props: { children?: React.ReactNode }) => (
    <table className="my-2 w-full border-collapse text-sm">{props.children}</table>
  ),
  th: (props: { children?: React.ReactNode }) => (
    <th className="border border-neutral-200 bg-neutral-50 px-2 py-1 text-left font-semibold dark:border-neutral-700 dark:bg-neutral-800">
      {props.children}
    </th>
  ),
  td: (props: { children?: React.ReactNode }) => (
    <td className="border border-neutral-200 px-2 py-1 dark:border-neutral-700">
      {props.children}
    </td>
  ),
};

export function MarkdownPreview({ children }: { children: string }) {
  return <div className="text-neutral-800 dark:text-neutral-200"><Markdown components={components}>{children}</Markdown></div>;
}
