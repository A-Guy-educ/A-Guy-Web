export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold mb-4">Payload + Next.js Starter</h1>
        <p className="text-muted-foreground">
          A production-ready starter template with Payload CMS and Next.js
        </p>
        <div className="mt-8 space-y-2">
          <p>
            <strong>Admin Panel:</strong>{' '}
            <a href="/admin" className="text-primary hover:underline">
              /admin
            </a>
          </p>
          <p>
            <strong>API:</strong>{' '}
            <a href="/api" className="text-primary hover:underline">
              /api
            </a>
          </p>
        </div>
      </div>
    </main>
  )
}
