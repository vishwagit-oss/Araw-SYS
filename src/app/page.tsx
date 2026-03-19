import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white p-4 sm:p-8">
      <div className="mb-8 sm:mb-12 text-center">
        <span className="text-4xl sm:text-5xl font-bold text-sky-700 block">SYS OIL</span>
        <span className="text-lg sm:text-xl font-semibold text-sky-800 uppercase tracking-wider">
          AND PETROLEUMS CORP
        </span>
      </div>
      <p className="text-slate-600 mb-8 sm:mb-12 text-center max-w-md text-sm sm:text-base px-2">
        Ship Management — Cargo Receiving/Discharge & Results
      </p>
      <Link
        href="/login"
        className="w-full sm:w-auto text-center px-6 sm:px-8 py-3 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 transition"
      >
        Sign In
      </Link>
      <Link
        href="/dashboard"
        className="mt-6 sm:mt-8 text-sky-600 font-medium hover:underline text-sm sm:text-base"
      >
        Go to Dashboard →
      </Link>
      <p className="mt-8 sm:mt-12 text-xs sm:text-sm text-slate-500">
        Ship Management Admin
      </p>
    </div>
  );
}
