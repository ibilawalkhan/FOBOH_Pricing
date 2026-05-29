'use client';

function formatTodayLong(): string {
  const d = new Date();
  return d.toLocaleDateString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function TopBar() {
  return (
    <header className="bg-teal text-white px-8 py-4 flex items-center justify-between">
      <div>
        <div className="text-lg font-semibold leading-tight">Hello, Ekemini</div>
        <div className="text-xs opacity-80">{formatTodayLong()}</div>
      </div>
      <div className="flex items-center gap-5">
        <button
          aria-label="Notifications"
          className="rounded-full p-1 hover:bg-white/10 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          </svg>
        </button>
        <button
          aria-label="Help"
          className="rounded-full p-1 hover:bg-white/10 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <path d="M12 17h.01" />
          </svg>
        </button>
        <div className="flex items-center gap-3 pl-4 border-l border-white/20">
          <div className="text-right leading-tight">
            <div className="text-sm font-medium">Ekemini Mark</div>
            <div className="text-xs opacity-80">Heaps Normal</div>
          </div>
          <div
            className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center text-sm font-semibold"
            aria-hidden="true"
          >
            EM
          </div>
        </div>
      </div>
    </header>
  );
}
