const socketIo = require("socket.io");

const users = new Map();
const MAX_USERS = 4;

function sendUserListToRoom(io, room) {
  const userList = Array.from(users.values())
    .filter(user => user.room === room)
    .map(user => ({
      id: user.id,
      name: user.name,
      isLiar: user.isLiar || false,
    }));

  io.to(room).emit("updateUsers", userList);
}

function assignLiar(room) {
  const userList = Array.from(users.values()).filter(
    user => user.room === room,
  );

  userList.forEach(user => users.set(user.id, { ...user, isLiar: false }));

  const randomIndex = Math.floor(Math.random() * userList.length);
  const liar = userList[randomIndex];

  users.set(liar.id, { ...liar, isLiar: true });
}

function checkCapacityAndSendResponse(io, room) {
  const currentCapacity = Array.from(users.values()).filter(
    user => user.room === room,
  ).length;

  if (currentCapacity === MAX_USERS) {
    assignLiar(room);
  }

  sendUserListToRoom(io, room);
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
        isLiar: false,
      });

      checkCapacityAndSendResponse(io, roomNumber);
    });
  });

  return io;
}

module.exports = { setUpSocketServer };
