const { createServer } = require("http");
const { Server } = require("socket.io");

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Read Render's assigned port dynamically, default to 4000 locally
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

  socket.on("add-to-queue", ({ roomId, video }) => {
    if (rooms[roomId]) {
      rooms[roomId].queue.push(video);
      io.to(roomId).emit("update-queue", { queue: rooms[roomId].queue });
    }
  });

  socket.on("play-next", ({ roomId }) => {
    if (rooms[roomId] && rooms[roomId].queue.length > 0) {
      const nextVideo = rooms[roomId].queue.shift();
      rooms[roomId].currentVideo = nextVideo;
      io.to(roomId).emit("change-video", { video: nextVideo, autoPlay: true });
      io.to(roomId).emit("update-queue", { queue: rooms[roomId].queue });
    } else if (rooms[roomId]) {
      rooms[roomId].currentVideo = null;
      io.to(roomId).emit("change-video", { video: null, autoPlay: false });
    }
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