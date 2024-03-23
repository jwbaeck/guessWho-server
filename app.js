require("dotenv").config();
const http = require("http");
const createError = require("http-errors");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const express = require("express");
const logger = require("morgan");
const path = require("path");

const { setUpSocketServer } = require("./src/socket/socket");
const indexRouter = require("./routes/index");
const usersRouter = require("./routes/users");

const app = express();

const PORT = process.env.PORT || 8080;

const httpServer = http.createServer(app).listen(PORT);
const socketServer = setUpSocketServer(httpServer);

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));
app.use(cookieParser());
app.use(cors());
app.use(logger("dev"));

app.use("/", indexRouter);
app.use("/users", usersRouter);

app.use(function (req, res, next) {
  next(createError(404));
});

app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
