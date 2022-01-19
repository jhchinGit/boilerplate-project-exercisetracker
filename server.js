const express = require("express");
const moment = require("moment");
var bodyParser = require("body-parser");
const app = express();
const cors = require("cors");
var mongoose = require("mongoose");
const { Schema } = mongoose;
require("dotenv").config();

app.use(cors());
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: false }));
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const ExerciseLogSchema = new Schema({
  usernameId: String,
  description: String,
  duration: Number,
  date: Date,
});

const ExerciseUserSchema = new Schema({
  username: String,
});

const exerciseUserModel = mongoose.model("ExerciseUser", ExerciseUserSchema);

const exerciseLogModel = mongoose.model("ExerciseLog", ExerciseLogSchema);

const findUserById = async (id, done) => {
  await exerciseUserModel.findOne({ _id: id }, (err, data) => {
    if (err) {
      return done(err);
    }
    return done(null, data);
  });
};

const createExercise = async (id, description, duration, date, done) => {
  var exerciseLog = new exerciseLogModel({
    usernameId: id,
    description,
    duration,
    date,
  });
  if (!duration) {
    return done("duration too short");
  }
  await exerciseLog.save((err, data) => {
    if (err) {
      return done(err);
    } else {
      return done(null, data);
    }
  });
};

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.post("/api/users", async function (req, res) {
  var newUser = new exerciseUserModel({
    username: req.body.username,
  });
  await newUser.save((err, data) => {
    if (err) {
      res.status(400).json({ error: "invalid users" });
    } else {
      res.json({ username: data.username, _id: data._id });
    }
  });
});

app.post("/api/users/:_id/exercises", async function (req, res) {
  await findUserById(req.params._id, async (err, data) => {
    if (err) {
      res.status(404).statusMessage("Unknown userId");
    } else if (data) {
      const { description, duration, date } = req.body;
      const dateToSave = new Date(date);
      await createExercise(
        req.params._id,
        description,
        duration,
        dateToSave,
        (err, createData) => {
          if (err) {
            res.json(err);
          } else if (createData) {
            res.json({
              _id: createData.usernameId,
              username: data.username,
              date: `${moment(createData.date).format("ddd")} ${moment(
                createData.date
              ).format("MMM")} ${String(dateToSave.getDate()).padStart(
                2,
                "0"
              )} ${dateToSave.getFullYear()} `,
              duration: createData.duration,
              description: createData.description,
            });
          }
        }
      );
    }
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
