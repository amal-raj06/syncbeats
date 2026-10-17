"use client";

import { useState } from "react";
import RoomControls from "./components/RoomControls";

export default function Home() {
  const [roomId, setRoomId] = useState("");
  const [userName, setUserName] = useState("");
  const [inputRoom, setInputRoom] = useState("");
  const [role, setRole] = useState<"host" | "guest">("host");

  const createRoom = () => {
    const newRoom = Math.random().toString(36).substring(2, 8).toUpperCase();
    setRole("host");
    setRoomId(newRoom);
  };

  const joinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputRoom.trim()) return;
    setRole("guest");
    setRoomId(inputRoom.trim().toUpperCase());
  };

  if (roomId) {
    return (
      <main className="min-h-screen bg-[#090714] text-white flex flex-col items-center justify-center p-3 sm:p-6 relative overflow-hidden">
        <RoomControls roomId={roomId} role={role} userName={userName.trim() || (role === "host" ? "Host" : "Guest")} />
      </main>
    );
  }

  return (
    <main 
      className="min-h-screen text-white flex flex-col items-center justify-center p-4 relative overflow-hidden"
      style={{
        background: "radial-gradient(circle at 50% 20%, #1e1035 0%, #090714 60%, #030208 100%)",
      }}
    >
      {/* High-Visibility Ambient Glow Orbs */}
      <div 
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full pointer-events-none opacity-40 blur-[90px]"
        style={{ background: "radial-gradient(circle, #6366f1 0%, #a855f7 50%, transparent 100%)" }}
      />
      <div 
        className="absolute bottom-10 right-10 w-[280px] h-[280px] rounded-full pointer-events-none opacity-25 blur-[80px]"
        style={{ background: "radial-gradient(circle, #10b981 0%, transparent 70%)" }}
      />

      {/* Glassmorphic Main Card */}
      <div 
        className="w-full max-w-sm sm:max-w-md p-6 sm:p-8 rounded-3xl text-center space-y-6 shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl relative z-10"
        style={{
          background: "rgba(18, 14, 33, 0.75)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
        }}
      >
        {/* Brand Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-400/30 rounded-full text-[11px] font-semibold text-indigo-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Real-Time Dual Audio Sync
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300">
            SyncBeats
          </h1>
          <p className="text-xs sm:text-sm text-purple-200/70 font-medium">
            Listen to YouTube music together in perfect sync on multiple earpods & mobile devices.
          </p>
        </div>

        {/* Form Controls */}
        <div className="space-y-4 pt-1">
          <div className="space-y-1.5 text-left">
            <label className="text-[11px] font-bold text-indigo-200/60 uppercase tracking-wider pl-1">
              Your Display Name
            </label>
            <input
              type="text"
              placeholder="e.g. Amal"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full px-4 py-3.5 bg-black/40 border border-white/10 rounded-2xl text-sm text-white placeholder-white/20 focus:outline-none focus:border-indigo-400 transition shadow-inner"
            />
          </div>

          <button
            onClick={createRoom}
            className="w-full py-3.5 font-bold text-sm rounded-2xl text-white shadow-lg transition-all duration-200 active:scale-95"
            style={{
              background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
              boxShadow: "0 8px 25px -5px rgba(99, 102, 241, 0.5)",
            }}
          >
            🎧 Create New Listening Room
          </button>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-white/10"></div>
            <span className="flex-shrink mx-3 text-[10px] font-bold text-white/30 uppercase tracking-widest">
              OR JOIN EXISTING
            </span>
            <div className="flex-grow border-t border-white/10"></div>
          </div>

          <form onSubmit={joinRoom} className="flex gap-2">
            <input
              type="text"
              placeholder="6-CHAR CODE"
              value={inputRoom}
              onChange={(e) => setInputRoom(e.target.value)}
              className="flex-1 px-4 py-3.5 bg-black/40 border border-white/10 rounded-2xl text-sm font-mono tracking-wider text-center text-white uppercase placeholder-white/20 focus:outline-none focus:border-indigo-400 transition shadow-inner"
            />
            <button
              type="submit"
              className="px-5 py-3.5 bg-white/10 hover:bg-white/15 active:scale-95 text-white font-bold text-sm rounded-2xl transition border border-white/10 shadow-md"
            >
              Join
            </button>
          </form>
        </div>

        {/* Feature Highlights */}
        <div className="pt-2 border-t border-white/10 flex justify-center gap-4 text-[11px] text-purple-200/50 font-medium">
          <span className="flex items-center gap-1">⚡ Sub-second Sync</span>
          <span className="flex items-center gap-1">🎵 In-App Search</span>
          <span className="flex items-center gap-1">📱 Audio-Only</span>
        </div>
      </div>
    </main>
  );
}