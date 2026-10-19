const { createServer } = require("http");
const { Server } = require("socket.io");

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.PORT || 4000;
const rooms = {};

io.on("connection", (socket) => {
  socket.on("ping-test", (clientTimestamp, callback) => {
    if (typeof callback === "function") {
      callback(clientTimestamp);
    }
  });

  socket.on("join-room", ({ roomId, userName, role }) => {
    socket.join(roomId);

    if (!rooms[roomId]) {
      rooms[roomId] = {
        currentVideo: null,
        queue: [],
        members: {},
        volume: 100,
        isTransitioning: false, // Lock to prevent multi-client double queue skipping
      };
    }

    rooms[roomId].members[socket.id] = {
      id: socket.id,
      name: userName || (role === "host" ? "Host" : "Guest"),
      role,
    };

    io.to(roomId).emit("update-members", {
      members: Object.values(rooms[roomId].members),
    });

    socket.emit("sync-state", {
      currentVideo: rooms[roomId].currentVideo,
      queue: rooms[roomId].queue,
      volume: rooms[roomId].volume,
    });
  });

  socket.on("sync-action", ({ roomId, action, currentTime }) => {
    socket.to(roomId).emit("sync-action", {
      action,
      currentTime,
      serverTimestamp: Date.now(),
    });
  });

  socket.on("change-volume", ({ roomId, volume }) => {
    if (rooms[roomId]) {
      rooms[roomId].volume = volume;
      socket.to(roomId).emit("change-volume", { volume });
    }
  });

  socket.on("change-video", ({ roomId, video }) => {
    if (rooms[roomId]) {
      rooms[roomId].currentVideo = video;
      io.to(roomId).emit("change-video", { video, autoPlay: true });
    }
  });

  // FIX: Auto-play immediately if queue was added while no video was playing
  socket.on("add-to-queue", ({ roomId, video }) => {
    const room = rooms[roomId];
    if (!room) return;

    if (!room.currentVideo) {
      // Nothing is playing, play this video immediately
      room.currentVideo = video;
      io.to(roomId).emit("change-video", { video, autoPlay: true });
    } else {
      // Something is currently playing, append to queue
      room.queue.push(video);
      io.to(roomId).emit("update-queue", { queue: room.queue });
    }
  });

  // FIX: Single transition lock prevents multiple clients from skipping songs simultaneously on track end
  socket.on("play-next", ({ roomId }) => {
    const room = rooms[roomId];
    if (!room || room.isTransitioning) return;

    room.isTransitioning = true;

    if (room.queue.length > 0) {
      const nextVideo = room.queue.shift();
      room.currentVideo = nextVideo;
      io.to(roomId).emit("change-video", { video: nextVideo, autoPlay: true });
      io.to(roomId).emit("update-queue", { queue: room.queue });
    } else {
      room.currentVideo = null;
      io.to(roomId).emit("change-video", { video: null, autoPlay: false });
    }

    // Release lock after 1 second
    setTimeout(() => {
      if (room) room.isTransitioning = false;
    }, 1000);
  });

  socket.on("remove-from-queue", ({ roomId, index }) => {
    if (rooms[roomId] && rooms[roomId].queue[index]) {
      rooms[roomId].queue.splice(index, 1);
      io.to(roomId).emit("update-queue", { queue: rooms[roomId].queue });
    }
  });

  socket.on("disconnecting", () => {
    for (const roomId of socket.rooms) {
      if (rooms[roomId] && rooms[roomId].members[socket.id]) {
        delete rooms[roomId].members[socket.id];
        io.to(roomId).emit("update-members", {
          members: Object.values(rooms[roomId].members),
        });
      }
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
});