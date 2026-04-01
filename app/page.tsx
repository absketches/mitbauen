import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="flex-1 flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-2xl px-4">
        <h1 className="text-5xl font-semibold text-gray-900 mb-4">
          Mitbauen
        </h1>
        <p className="text-xl text-gray-500 mb-8">
          Post your idea. Show your commitment. Find your crew.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/projects"
            className="bg-gray-900 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Browse ideas
          </Link>
          <Link
            href="/projects/new"
            className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Post an idea
          </Link>
        </div>
      </div>
    </div>
  )
}
