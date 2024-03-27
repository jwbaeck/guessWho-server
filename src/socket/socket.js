const socketIo = require("socket.io");

const gameStarted = new Map();
const users = new Map();
const votes = {};
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

function distributeRoles(io, room) {
  const userList = Array.from(users.values()).filter(
    user => user.room === room,
  );

  userList.forEach(user => {
    io.to(user.id).emit("roleInfo", { isLiar: user.isLiar });
  });
}

function checkAndStartGame(io, room) {
  const currentCapacity = Array.from(users.values()).filter(
    user => user.room === room,
  ).length;

  if (currentCapacity === MAX_USERS) {
    const startTime = new Date().getTime() + 3 * 60 * 1000;

    io.to(room).emit("gameStart", { startTime });
  }
}

function checkCapacityAndSendResponse(io, room) {
  const currentCapacity = Array.from(users.values()).filter(
    user => user.room === room,
  ).length;

  if (!gameStarted.has(room) && currentCapacity === MAX_USERS) {
    assignLiar(room);

    gameStarted.set(room, true);
  }

  if (currentCapacity === MAX_USERS) {
    distributeRoles(io, room);
    checkAndStartGame(io, room);
  }

  sendUserListToRoom(io, room);
}

function checkAllVotesSubmitted() {
  const totalVotes = Object.values(votes).reduce(
    (sum, numVotes) => sum + numVotes,
    0,
  );

  return totalVotes === MAX_USERS;
}

function findTopVotedUserAndCheckUnique() {
  const voteCounts = Object.values(votes);
  const highestVoteCount = Math.max(...voteCounts);
  const topVoters = Object.entries(votes).filter(
    ([_, numVotes]) => numVotes === highestVoteCount,
  );

  if (topVoters.length === 1) {
    return { userId: topVoters[0][0], isUnique: true };
  }
  return { userId: null, isUnique: false };
}

function verifyIsLiar(topVotedUserId) {
  const user = users.get(topVotedUserId);

  return user && user.isLiar;
}

function createVotingResultData() {
  const { userId: topVotedUserId, isUnique } = findTopVotedUserAndCheckUnique();
  const isTopVotedUserLiar =
    topVotedUserId && isUnique && verifyIsLiar(topVotedUserId);
  const userVotes = {};

  users.forEach((value, key) => {
    userVotes[key] = votes[key] || 0;
  });

  const resultData = {
    isLiarCorrectlyIdentified: isTopVotedUserLiar,
    votes: userVotes,
    topVotedUserId,
  };

  return resultData;
}

function registerWebRTCEvents(socket, io) {
  socket.on("webRTC-offer", (data) => {
    io.to(data.target).emit("webRTC-offer", { sender: socket.id, sdp: data.sdp });
  });

  socket.on("webRTC-answer", (data) => {
    io.to(data.target).emit("webRTC-answer", { sender: socket.id, sdp: data.sdp });
  });

  socket.on("webRTC-candidate", (data) => {
    io.to(data.target).emit("webRTC-candidate", { sender: socket.id, candidate: data.candidate });
  });
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

      socket.emit("yourSocketId", { socketId: socket.id });

      checkCapacityAndSendResponse(io, roomNumber);
    });

    socket.on("userEnteredChatRoom", () => {
      const user = users.get(socket.id);

      if (user) {
        io.to(user.room).emit("userEntered", socket.id);

        checkCapacityAndSendResponse(io, user.room);
      }
    });

    socket.on("submitVote", ({ userId: votedForId }) => {
      const votingUser = users.get(socket.id);

      if (votingUser && !votes[votedForId]) {
        votes[votedForId] = 0;
      }

      votes[votedForId] += 1;

      if (checkAllVotesSubmitted()) {
        const votingResult = createVotingResultData();
        const userRoom = votingUser.room;

        io.to(userRoom).emit("voteResults", votingResult);
      }
    });

    registerWebRTCEvents(socket, io);
  });

  return io;
}

module.exports = { setUpSocketServer };
