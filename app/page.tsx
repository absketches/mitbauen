import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="flex-1">
      <section className="mx-auto grid min-h-[calc(100dvh-3.5rem)] max-w-7xl gap-[clamp(2rem,6vw,4rem)] px-4 py-[clamp(3rem,8vw,6rem)] sm:min-h-[calc(100dvh-4rem)] sm:px-6 lg:grid-cols-[1.4fr_0.95fr] lg:items-center lg:px-8">
        <div className="max-w-3xl">
          <p className="mb-5 text-[0.72rem] font-medium uppercase tracking-[0.34em] text-black/45">
            Serious Projects Only
          </p>
          <h1 className="max-w-3xl text-[clamp(3.15rem,10vw,5.6rem)] font-semibold leading-[0.94] tracking-[-0.055em] text-black">
            Build with people who actually show up.
          </h1>
          <p className="mt-6 max-w-2xl text-[clamp(1.02rem,2.5vw,1.25rem)] leading-[1.9] text-black/62">
            Mitbauen is for founders who lead from the front. Put your idea out there, state your
            real commitment, and attract contributors who care about the work as much as you do.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/projects"
              className="inline-flex items-center justify-center rounded-full border border-black bg-black px-6 py-3 text-sm font-medium text-white hover:-translate-y-0.5 hover:bg-black/85"
            >
              Browse ideas
            </Link>
            <Link
              href="/projects/new"
              className="inline-flex items-center justify-center rounded-full border border-black/15 bg-white/85 px-6 py-3 text-sm font-medium text-black hover:-translate-y-0.5 hover:bg-white"
            >
              Post an idea
            </Link>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-1">
          <div className="rounded-[2rem] border border-black bg-black p-5 text-white shadow-[0_24px_80px_rgba(0,0,0,0.12)] sm:p-6">
            <p className="text-[0.7rem] uppercase tracking-[0.3em] text-white/55">Core Signal</p>
            <p className="mt-5 text-2xl font-semibold leading-tight">
              Every idea starts with the founder&apos;s own weekly commitment.
            </p>
            <p className="mt-3 text-sm leading-6 text-white/70">
              Hours, role, and what you bring are surfaced before the rest of the pitch.
            </p>
          </div>

          <div className="rounded-[2rem] border border-black/10 bg-white/90 p-5 shadow-[0_18px_48px_rgba(0,0,0,0.05)] sm:p-6">
            <p className="text-[0.7rem] uppercase tracking-[0.3em] text-black/45">Applications</p>
            <p className="mt-4 text-lg font-semibold text-black">
              Private threads between founders and applicants keep conversations focused.
            </p>
          </div>

          <div className="rounded-[2rem] border border-black/10 bg-white/90 p-5 shadow-[0_18px_48px_rgba(0,0,0,0.05)] sm:p-6">
            <p className="text-[0.7rem] uppercase tracking-[0.3em] text-black/45">Tone</p>
            <p className="mt-4 text-lg font-semibold text-black">
              Quiet, sharp, and monochrome. Nothing decorative that dilutes the signal.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
