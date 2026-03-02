'use client';

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  return (
    <html>
      <body>
        <div className="p-6">Application error: {error.message}</div>
      </body>
    </html>
  );
}
