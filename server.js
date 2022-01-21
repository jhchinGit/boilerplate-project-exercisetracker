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

const exerciseLogSchema = new Schema({
  usernameId: String,
  description: String,
  duration: Number,
  date: Date,
});

const exerciseUserSchema = new Schema({
  username: String,
});

const ExerciseUserModel = mongoose.model("ExerciseUser", exerciseUserSchema);

const ExerciseLogModel = mongoose.model("ExerciseLog", exerciseLogSchema);

const findUserById = async (id, done) => {
  await ExerciseUserModel.findOne({ _id: id }, (err, data) => {
    if (err) {
      return done(err);
    }
    return done(null, data);
  });
};

const findAllUsers = async (done) => {
  await ExerciseUserModel.find({}, (err, data) => {
    if (err) {
      return done(err);
    }
    return done(null, data);
  });
};

const findExerciseByUserId = async (id, done) => {
  await ExerciseLogModel.find({ usernameId: id }, (err, data) => {
    if (err) {
      return done(err);
    }
    return done(null, data);
  });
};

const createExercise = async (id, description, duration, date, done) => {
  var exerciseLog = new ExerciseLogModel({
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
  var newUser = new ExerciseUserModel({
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
      const dateToSave = date ? new Date(date) : new Date();
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
              )} ${dateToSave.getFullYear()}`,
              duration: createData.duration,
              description: createData.description,
            });
          }
        }
      );
    }
  });
});

app.get("/api/users", async function (req, res) {
  await findAllUsers((err, data) => {
    if (err) {
      res.json({ error: "Something went wrong." });
    }

    res.json(data);
  });
});

app.get("/api/users/:_id/logs?", async function (req, res) {
  const { from, to, limit } = req.query;
  const { _id } = req.params;
  await findUserById(_id, async (err, data) => {
    if (err) {
      res.status(404).statusMessage("Unknown userId");
    } else if (data) {
      await findExerciseByUserId(_id, (err, exercises) => {
        if (err) {
          res.json(err);
        } else if (exercises) {
          const exercisesDto = [];
          const theLimit =
            limit !== undefined && limit !== null ? limit : exercises.length;
          for (
            let index = 0;
            index < exercises.length && index < theLimit;
            index++
          ) {
            if (
              from &&
              to &&
              (exercises[index].date < new Date(from) ||
                exercises[index].date > new Date(to))
            ) {
              continue;
            }

            const newDto = {
              description: exercises[index].description,
              duration: exercises[index].duration,
              date: `${moment(exercises[index].date).format("ddd")} ${moment(
                exercises[index].date
              ).format("MMM")} ${String(
                exercises[index].date.getDate()
              ).padStart(2, "0")} ${exercises[index].date.getFullYear()}`,
            };
            exercisesDto.push(newDto);
          }
          res.json({
            _id,
            username: data.username,
            count: exercises.length,
            log: exercisesDto,
          });
        }
      });
    }
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
