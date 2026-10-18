"use client";

import { useEffect, useState, useRef } from "react";
import io, { Socket } from "socket.io-client";
import YouTube, { YouTubeProps } from "react-youtube";

interface Props {
  roomId: string;
  role: "host" | "guest";
  userName: string;
  onLeave?: () => void;
}

interface VideoItem {
  id: string;
  title: string;
  thumbnail?: string;
  channel?: string;
  duration?: string;
}

interface Member {
  id: string;
  name: string;
  role: string;
}

export default function RoomControls({ roomId, role, userName, onLeave }: Props) {
  const [connected, setConnected] = useState(false);
  const [ping, setPing] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentVideo, setCurrentVideo] = useState<VideoItem | null>(null);
  const [queue, setQueue] = useState<VideoItem[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [volume, setVolume] = useState(100);

  // Player state
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<VideoItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [userInteracted, setUserInteracted] = useState(role === "host");
  const socketRef = useRef<Socket | null>(null);
  const playerRef = useRef<any>(null);
  const isRemoteAction = useRef(false);
  const currentVideoIdRef = useRef<string | null>(null);
  const latencyRef = useRef<number>(0);
  const lastNudgeTimeRef = useRef<number>(0);

  // Tracks if the user interrupted audio locally via WhatsApp/Instagram/call
  const isLocallyInterruptedRef = useRef(false);

  useEffect(() => {
    const socketUrl =
      process.env.NEXT_PUBLIC_SOCKET_URL ||
      (typeof window !== "undefined" && window.location.hostname !== "localhost"
        ? "http://10.12.142.194:4000"
        : "http://localhost:4000");

    const socket = io(socketUrl);
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("join-room", { roomId, userName, role });

      const startTime = Date.now();
      socket.emit("ping-test", startTime, () => {
        const rtt = Date.now() - startTime;
        latencyRef.current = rtt / 2;
        setPing(rtt);
      });
    });

    socket.on("update-members", ({ members: updatedMembers }) => {
      setMembers(updatedMembers);
    });

    socket.on("sync-state", ({ currentVideo: initialVideo, queue: initialQueue, volume: initialVolume }) => {
      if (initialVideo) {
        currentVideoIdRef.current = initialVideo.id;
        setCurrentVideo(initialVideo);
      } else {
        currentVideoIdRef.current = null;
        setCurrentVideo(null);
      }
      if (initialQueue) setQueue(initialQueue);
      if (initialVolume !== undefined) {
        setVolume(initialVolume);
        if (playerRef.current && typeof playerRef.current.setVolume === "function") {
          playerRef.current.setVolume(initialVolume);
        }
      }
    });

    socket.on("change-volume", ({ volume: newVolume }) => {
      setVolume(newVolume);
      if (playerRef.current && typeof playerRef.current.setVolume === "function") {
        playerRef.current.setVolume(newVolume);
      }
    });

    socket.on("change-video", ({ video, autoPlay }) => {
      if (!video) {
        currentVideoIdRef.current = null;
        setCurrentVideo(null);
        setIsPlaying(false);
        return;
      }

      currentVideoIdRef.current = video.id;
      setCurrentVideo(video);

      setTimeout(() => {
        if (playerRef.current && typeof playerRef.current.loadVideoById === "function") {
          playerRef.current.loadVideoById(video.id);
          if (autoPlay) {
            playerRef.current.playVideo();
            setIsPlaying(true);
          }
        }
      }, 300);
    });

    socket.on("update-queue", ({ queue: updatedQueue }) => {
      setQueue(updatedQueue);
    });

    socket.on("sync-action", ({ action, currentTime, serverTimestamp }) => {
      if (!playerRef.current || typeof playerRef.current.getCurrentTime !== "function") return;

      // If user is currently listening to WhatsApp/Instagram reels locally, ignore remote sync
      if (isLocallyInterruptedRef.current && action !== "pause") return;

      isRemoteAction.current = true;
      const networkDelay = (Date.now() - serverTimestamp + latencyRef.current) / 1000;
      const targetTime = currentTime + networkDelay;
      const localTime = playerRef.current.getCurrentTime();

      if (action === "play") {
        if (Math.abs(localTime - targetTime) > 0.25) {
          playerRef.current.seekTo(targetTime, true);
        }
        playerRef.current.playVideo();
        setIsPlaying(true);
      } else if (action === "pause") {
        playerRef.current.pauseVideo();
        playerRef.current.seekTo(currentTime, true);
        setIsPlaying(false);
      } else if (action === "seek") {
        playerRef.current.seekTo(targetTime, true);
      }

      setTimeout(() => {
        isRemoteAction.current = false;
      }, 400);
    });

    return () => {
      socket.disconnect();
    };
  }, [roomId, role, userName]);

  // Handle returning from local media interruptions (WhatsApp voice note or Instagram Reels)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && isLocallyInterruptedRef.current) {
        isLocallyInterruptedRef.current = false;
        // Re-request latest state from server to catch up with where others reached
        if (socketRef.current) {
          socketRef.current.emit("join-room", { roomId, userName, role });
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [roomId, userName, role]);

  // Media Session API integration
  useEffect(() => {
    if ("mediaSession" in navigator && currentVideo) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentVideo.title || "SyncBeats Track",
        artist: currentVideo.channel || "SyncBeats Live Room",
        album: "SyncBeats",
        artwork: [
          {
            src: currentVideo.thumbnail || `https://img.youtube.com/vi/${currentVideo.id}/hqdefault.jpg`,
            sizes: "512x512",
            type: "image/jpeg",
          },
        ],
      });

      navigator.mediaSession.setActionHandler("play", () => {
        if (playerRef.current) {
          playerRef.current.playVideo();
          setIsPlaying(true);
        }
      });

      navigator.mediaSession.setActionHandler("pause", () => {
        if (playerRef.current) {
          playerRef.current.pauseVideo();
          setIsPlaying(false);
        }
      });
    }
  }, [currentVideo]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (playerRef.current && typeof playerRef.current.getCurrentTime === "function") {
        const curr = playerRef.current.getCurrentTime();
        const dur = playerRef.current.getDuration();
        setCurrentTime(curr || 0);
        setDuration(dur || 0);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLeaveRoom = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    if (onLeave) {
      onLeave();
    } else {
      window.location.href = "/";
    }
  };

  const togglePlayPause = () => {
    if (!playerRef.current || !currentVideo || !socketRef.current) return;
    const currTime = playerRef.current.getCurrentTime() || 0;
    if (isPlaying) {
      playerRef.current.pauseVideo();
      setIsPlaying(false);
      socketRef.current.emit("sync-action", { roomId, action: "pause", currentTime: currTime });
    } else {
      playerRef.current.playVideo();
      setIsPlaying(true);
      socketRef.current.emit("sync-action", { roomId, action: "play", currentTime: currTime });
    }
  };

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (playerRef.current && socketRef.current) {
      playerRef.current.seekTo(newTime, true);
      socketRef.current.emit("sync-action", { roomId, action: "seek", currentTime: newTime });
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseInt(e.target.value, 10);
    setVolume(newVol);
    if (playerRef.current && typeof playerRef.current.setVolume === "function") {
      playerRef.current.setVolume(newVol);
    }
    if (socketRef.current) {
      socketRef.current.emit("change-volume", { roomId, volume: newVol });
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const playNow = (video: VideoItem) => {
    if (!socketRef.current) return;
    currentVideoIdRef.current = video.id;
    setCurrentVideo(video);
    socketRef.current.emit("change-video", { roomId, video });
    setSearchResults([]);
    setSearchQuery("");
  };

  const addToQueue = (video: VideoItem) => {
    if (!socketRef.current) return;
    socketRef.current.emit("add-to-queue", { roomId, video });
    setSearchResults([]);
    setSearchQuery("");
  };

  const removeFromQueue = (index: number) => {
    if (!socketRef.current) return;
    socketRef.current.emit("remove-from-queue", { roomId, index });
  };

  const handleStateChange = (event: { data: number }) => {
    if (isRemoteAction.current || !playerRef.current || !socketRef.current) return;

    const currTime = playerRef.current.getCurrentTime() || 0;

    if (event.data === 1) {
      setIsPlaying(true);
      socketRef.current.emit("sync-action", { roomId, action: "play", currentTime: currTime });
    } else if (event.data === 2) {
      setIsPlaying(false);
      
      // Check if pause was triggered because user switched apps to WhatsApp/Instagram or lost audio focus
      if (document.hidden || document.visibilityState === "hidden") {
        isLocallyInterruptedRef.current = true;
        // DO NOT broadcast pause to the rest of the room!
        return;
      }

      socketRef.current.emit("sync-action", { roomId, action: "pause", currentTime: currTime });
    } else if (event.data === 0) {
      setIsPlaying(false);
      socketRef.current.emit("play-next", { roomId });
    }
  };

  const onPlayerReady: YouTubeProps["onReady"] = (event) => {
    playerRef.current = event.target;
    event.target.setVolume(volume);
    if (currentVideo) {
      event.target.playVideo();
      setIsPlaying(true);
    }
  };

  const enableGuestAudio = () => {
    setUserInteracted(true);
    if (playerRef.current) {
      playerRef.current.playVideo();
      setIsPlaying(true);
    }
  };

  const adjustOffset = (seconds: number) => {
    const now = Date.now();
    if (now - lastNudgeTimeRef.current < 250) return;
    lastNudgeTimeRef.current = now;

    if (playerRef.current && typeof playerRef.current.getCurrentTime === "function") {
      const curr = playerRef.current.getCurrentTime();
      playerRef.current.seekTo(curr + seconds, true);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // Chrome Background Option Tuning
  const opts: YouTubeProps["opts"] = {
    height: "1",
    width: "1",
    playerVars: {
      autoplay: 1,
      controls: 0,
      modestbranding: 1,
      playsinline: 1,
    },
  };

  const albumArt = currentVideo
    ? currentVideo.thumbnail || `https://img.youtube.com/vi/${currentVideo.id}/hqdefault.jpg`
    : null;

  return (
    <div 
      className="w-full max-w-sm sm:max-w-md mx-auto p-5 sm:p-7 rounded-3xl space-y-5 text-left shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl relative overflow-hidden z-10"
      style={{
        background: "rgba(18, 14, 33, 0.75)",
        border: "1px solid rgba(255, 255, 255, 0.12)",
      }}
    >
      {/* Dynamic Background Glow */}
      {albumArt && (
        <div
          className="absolute -inset-10 opacity-30 blur-3xl pointer-events-none transition-all duration-1000 bg-cover bg-center scale-125"
          style={{ backgroundImage: `url(${albumArt})` }}
        />
      )}

      {/* Top Bar */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Back/Leave Button */}
          <button
            onClick={handleLeaveRoom}
            className="px-2.5 py-1 bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 backdrop-blur rounded-full text-xs text-purple-200 font-medium transition flex items-center gap-1"
          >
            ← Leave
          </button>

          <span className="px-3.5 py-1 bg-indigo-500/10 border border-indigo-400/30 backdrop-blur rounded-full text-xs text-indigo-300 font-mono font-bold">
            ROOM: <span className="text-white">{roomId}</span>
          </span>
        </div>

        <span className="text-xs text-purple-200/70 flex items-center gap-1.5 font-medium">
          <span className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`}></span>
          {connected ? (
            <span className="text-emerald-400 font-mono font-bold">
              {ping !== null ? `${ping}ms` : "Syncing..."}
            </span>
          ) : (
            "Connecting..."
          )}
        </span>
      </div>

      {/* Active Member Carousel */}
      <div className="relative z-10 flex items-center gap-2 overflow-x-auto py-1 border-y border-white/10">
        <span className="text-[10px] text-purple-200/50 uppercase tracking-wider font-bold shrink-0">In Room:</span>
        <div className="flex gap-1.5 flex-nowrap">
          {members.map((m) => (
            <span
              key={m.id}
              className="px-2.5 py-1 bg-white/5 backdrop-blur rounded-full text-[11px] font-medium text-white flex items-center gap-1.5 shrink-0 border border-white/10"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              {m.name} {m.role === "host" ? "👑" : ""}
            </span>
          ))}
        </div>
      </div>

      {/* Chrome Background Player Fix (1px footprint avoids tab throttle) */}
      {currentVideo && (
        <div className="absolute top-0 left-0 w-[1px] h-[1px] opacity-10 overflow-hidden pointer-events-none z-0">
          <YouTube
            videoId={currentVideo.id}
            opts={opts}
            onReady={onPlayerReady}
            onStateChange={handleStateChange}
          />
        </div>
      )}

      {/* Tap to Enable Guest Audio */}
      {!userInteracted && role === "guest" && (
        <div className="relative z-10 bg-indigo-950/80 border border-indigo-500/40 p-3 rounded-2xl flex items-center justify-between shadow-lg">
          <p className="text-xs text-indigo-200 font-medium">Tap once to sync audio output</p>
          <button
            onClick={enableGuestAudio}
            className="px-3.5 py-1.5 font-bold text-xs rounded-xl text-white transition active:scale-95 shadow-md"
            style={{
              background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
            }}
          >
            Enable Audio
          </button>
        </div>
      )}

      {/* Main Music Control Glass Card */}
      <div className="relative z-10 bg-black/40 backdrop-blur-md p-4 rounded-2xl border border-white/10 space-y-4 shadow-inner">
        <div className="flex items-center gap-3.5">
          {albumArt ? (
            <div className="relative shrink-0">
              <img
                src={albumArt}
                alt="Album Art"
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border border-white/20 shadow-xl"
              />
              {isPlaying && (
                <div className="absolute inset-0 bg-black/20 rounded-2xl flex items-center justify-center">
                  <span className="w-2.5 h-2.5 bg-indigo-400 rounded-full animate-ping"></span>
                </div>
              )}
            </div>
          ) : (
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-purple-300 text-2xl shrink-0 shadow-inner">
              🎵
            </div>
          )}

          <div className="truncate flex-1">
            <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider">
              {currentVideo ? "Now Playing" : "Queue Empty"}
            </p>
            <p className="text-sm sm:text-base font-bold text-white truncate mt-0.5">
              {currentVideo ? currentVideo.title : "Search a song to play together!"}
            </p>
            {currentVideo?.channel && (
              <p className="text-xs text-purple-200/60 truncate mt-0.5">{currentVideo.channel}</p>
            )}
          </div>

          <button
            onClick={togglePlayPause}
            disabled={!currentVideo}
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-white shrink-0 shadow-xl transition active:scale-90 ${
              currentVideo ? "cursor-pointer" : "opacity-40 cursor-not-allowed"
            }`}
            style={{
              background: currentVideo ? "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)" : "rgba(255,255,255,0.1)",
              boxShadow: currentVideo ? "0 8px 20px -5px rgba(99, 102, 241, 0.5)" : "none",
            }}
          >
            {isPlaying ? (
              <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
            ) : (
              <svg className="w-6 h-6 fill-current ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            )}
          </button>
        </div>

        {/* Custom Touch Scrubber */}
        {currentVideo && (
          <div className="space-y-1.5 pt-1">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleScrub}
              className="w-full h-2 bg-white/10 accent-indigo-400 rounded-lg cursor-pointer touch-none"
            />
            <div className="flex justify-between text-[11px] text-purple-200/60 font-mono font-medium">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        )}

        {/* Synced Volume Slider */}
        {currentVideo && (
          <div className="flex items-center gap-2 pt-1 border-t border-white/5">
            <span className="text-xs text-purple-200/60">🔊</span>
            <input
              type="range"
              min={0}
              max={100}
              value={volume}
              onChange={handleVolumeChange}
              className="w-full h-1.5 bg-white/10 accent-purple-400 rounded-lg cursor-pointer"
            />
            <span className="text-[10px] font-mono text-purple-200/60 w-6 text-right">{volume}%</span>
          </div>
        )}
      </div>

      {/* Fine-Sync Micro Controls */}
      {currentVideo && (
        <div className="relative z-10 flex justify-between items-center bg-white/5 backdrop-blur p-2.5 rounded-2xl border border-white/10">
          <span className="text-xs text-purple-200/60 font-medium">Hardware Earpod Nudge:</span>
          <div className="flex gap-2">
            <button
              onClick={() => adjustOffset(-0.2)}
              className="px-3 py-1 bg-white/10 hover:bg-white/15 active:scale-95 text-xs font-mono font-semibold text-white rounded-xl transition border border-white/10"
            >
              -0.2s
            </button>
            <button
              onClick={() => adjustOffset(0.2)}
              className="px-3 py-1 bg-white/10 hover:bg-white/15 active:scale-95 text-xs font-mono font-semibold text-white rounded-xl transition border border-white/10"
            >
              +0.2s
            </button>
          </div>
        </div>
      )}

      {/* YouTube Live Search */}
      <div className="relative z-10 space-y-2">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            placeholder="Search YouTube songs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-4 py-3 bg-black/40 border border-white/10 rounded-2xl text-sm text-white placeholder-white/20 focus:outline-none focus:border-indigo-400 transition shadow-inner"
          />
          <button
            type="submit"
            className="px-5 py-3 font-bold text-sm rounded-2xl text-white transition active:scale-95 shadow-md shrink-0"
            style={{
              background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
            }}
          >
            {isSearching ? "..." : "Search"}
          </button>
        </form>

        {searchResults.length > 0 && (
          <div className="max-h-52 overflow-y-auto space-y-2 bg-black/80 backdrop-blur-xl p-2.5 border border-white/15 rounded-2xl shadow-2xl">
            {searchResults.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2 hover:bg-white/10 rounded-xl gap-2 text-xs transition"
              >
                <div className="truncate flex-1">
                  <p className="text-white font-semibold truncate">{item.title}</p>
                  <p className="text-purple-200/50 mt-0.5">
                    {item.channel} {item.duration ? `• ${item.duration}` : ""}
                  </p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={() => playNow(item)}
                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition active:scale-95 shadow-sm"
                  >
                    Play
                  </button>
                  <button
                    onClick={() => addToQueue(item)}
                    className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition active:scale-95 border border-white/10"
                  >
                    + Queue
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Up Next Queue */}
      <div className="relative z-10 bg-black/40 backdrop-blur p-3.5 rounded-2xl border border-white/10 space-y-2">
        <h3 className="text-[11px] font-bold text-purple-200/60 uppercase tracking-wider">
          Up Next Queue ({queue.length})
        </h3>
        {queue.length === 0 ? (
          <p className="text-xs text-purple-200/40 italic py-1">Queue is empty. Search songs above to stack up!</p>
        ) : (
          <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
            {queue.map((item, index) => (
              <div
                key={`${item.id}-${index}`}
                className="flex items-center justify-between bg-white/5 p-2 rounded-xl text-xs border border-white/10"
              >
                <span className="text-white font-medium truncate flex-1">{index + 1}. {item.title}</span>
                <button
                  onClick={() => removeFromQueue(index)}
                  className="text-red-400 hover:text-red-300 active:scale-90 ml-2 font-bold px-1 text-sm"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}