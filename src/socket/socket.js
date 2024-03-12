const socketIo = require("socket.io");

function setUpSocketServer(server) {
  const io = socketIo(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connect", socket => {
    console.log("클라이언트 소켓 연결 성공");

    socket.on("test", req => {
      console.log(req);
    });
  });

  return io;
}

module.exports = { setUpSocketServer };
