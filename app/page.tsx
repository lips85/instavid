import ScriptGenerator from '@/components/ScriptGenerator';

export default function Home() {
  return (
    <div className="min-h-screen p-8">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-4">InstaVid</h1>
        <p className="text-gray-600">AI-Powered Instant Video Generation Platform</p>
      </header>

      <main>
        <ScriptGenerator />
      </main>

      <footer className="mt-16 text-center text-gray-500 text-sm">
        <p>© 2024 InstaVid. All rights reserved.</p>
      </footer>
    </div>
  );
}
