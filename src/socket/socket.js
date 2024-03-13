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
    console.log("최대 용량 도달, 응답 전송");

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
    socket.on("joinRoom", roomNumber => {
      socket.join(roomNumber);
    });

    socket.on("submitNickname", data => {
      const { nickname, roomNumber } = data;

      users.set(socket.id, {
        id: socket.id,
        name: nickname,
        room: roomNumber,
      });

      sendUserListToRoom(io, roomNumber);

      checkCapacityAndSendResponse(io, roomNumber);
    });
  });

  return io;
}

module.exports = { setUpSocketServer };
