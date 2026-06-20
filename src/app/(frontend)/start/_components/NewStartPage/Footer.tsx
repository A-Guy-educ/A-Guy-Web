export function Footer() {
  return (
    <footer className="bg-surface-gray-900 text-surface-gray-400 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
              style={{ background: 'var(--gradient-sky-purple)' }}
            >
              A
            </div>
            <span className="text-white font-bold">A-Guy</span>
          </div>
          <div className="flex gap-6 text-sm">
            <a href="#" className="hover:text-white transition">
              תנאי שימוש
            </a>
            <a href="#" className="hover:text-white transition">
              פרטיות
            </a>
            <a href="#" className="hover:text-white transition">
              צור קשר
            </a>
          </div>
          <div className="text-sm">© 2025 A-Guy. כל הזכויות שמורות.</div>
        </div>
      </div>
    </footer>
  )
}
