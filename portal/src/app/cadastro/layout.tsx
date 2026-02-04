import Link from 'next/link';

export default function CadastroLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-zinc-800 bg-zinc-950/95 px-6 py-4">
        <Link href="/" className="text-lg font-semibold text-white">
          TraccarPro
        </Link>
      </header>
      {children}
    </div>
  );
}
