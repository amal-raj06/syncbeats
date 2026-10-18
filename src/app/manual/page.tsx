"use client";

import Link from "next/link";

export default function UserManual() {
  return (
    <main className="min-h-screen bg-[#0d0914] text-white p-6 sm:p-12 flex flex-col items-center justify-center">
      <div className="max-w-2xl w-full space-y-8 bg-white/5 border border-white/10 backdrop-blur-2xl p-6 sm:p-10 rounded-3xl shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-5">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            SyncBeats User Guide 🎧
          </h1>
          <Link
            href="/"
            className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-xs font-semibold rounded-full border border-white/10 transition active:scale-95"
          >
            ← Back to App
          </Link>
        </div>

        {/* Instructions */}
        <div className="space-y-6 text-sm sm:text-base text-purple-100/90 leading-relaxed">
          
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-indigo-300">1. Creating or Joining a Room</h2>
            <p className="text-xs sm:text-sm text-purple-200/70">
              Enter your display name. Click <span className="text-white font-semibold">"Create New Listening Room"</span> to host, or enter a 6-character room code and click <span className="text-white font-semibold">"Join"</span>.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-indigo-300">2. Enabling Audio (Guest Device)</h2>
            <p className="text-xs sm:text-sm text-purple-200/70">
              Browser security policies require user interaction before playing audio automatically. If you are a guest, tap the <span className="text-white font-semibold">"Enable Audio"</span> banner once when you enter the room.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-indigo-300">3. Searching & Queueing Tracks</h2>
            <p className="text-xs sm:text-sm text-purple-200/70">
              Use the built-in search bar to find YouTube songs. Click <span className="text-emerald-400 font-semibold">"Play"</span> to start immediately or <span className="text-white font-semibold">"+ Queue"</span> to add songs to the shared room queue.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-indigo-300">4. Hardware Earpod Micro-Sync</h2>
            <p className="text-xs sm:text-sm text-purple-200/70">
              If your Bluetooth earpods have slight latency variance, tap <span className="text-white font-semibold">-0.2s</span> or <span className="text-white font-semibold">+0.2s</span> under "Hardware Earpod Nudge" to make micro-adjustments without interrupting others.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-indigo-300">5. Background & Multitasking Play</h2>
            <p className="text-xs sm:text-sm text-purple-200/70">
              SyncBeats maintains background playback via the Web Media Session API. If you listen to a WhatsApp voice note or Instagram reel, SyncBeats will isolate local audio and catch up automatically when you return!
            </p>
          </section>

        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-white/10 text-center">
          <Link
            href="/"
            className="inline-block px-6 py-3 font-bold text-sm rounded-2xl text-white transition active:scale-95 shadow-lg"
            style={{
              background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
            }}
          >
            Got It! Return to SyncBeats
          </Link>
        </div>

      </div>
    </main>
  );
}