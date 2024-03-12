const socketIo = require("socket.io");

const users = new Map();
const maxCapacity = 4;

function sendUserListToRoom(io, room) {
  const userList = Array.from(users.values())
    .filter(user => user.room === room)
    .map(user => ({ id: user.id, name: user.name }));

  io.to(room).emit("updateUsers", userList);
}

function checkCapacityAndSendResponse(io, room) {
  if (users.size >= maxCapacity) {
    const userList = Array.from(users.values())
      .filter(user => user.room === room)
      .map(user => ({ id: user.id, name: user.name }));

    io.to(room).emit("maxCapacityReached", userList);
  }
}

function setUpSocketServer(server) {
  const io = socketIo(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connect", socket => {
    console.log("클라이언트 소켓 연결 성공");

    socket.on("submitNickname", nickname => {
      const room = 1;

      users.set(socket.id, {
        id: socket.id,
        name: nickname,
        room,
      });

      sendUserListToRoom(io, room);
      checkCapacityAndSendResponse(io, room);
    });
  });

  return io;
}

module.exports = { setUpSocketServer };
