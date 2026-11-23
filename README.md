# Attendance Tracker

A small website for 2nd year EE students at IIT Patna to keep track of their own attendance. You log in with your roll number, the site shows the classes for the day from our timetable, and you mark each one present or absent. It then shows your percentage for every course.

Live: https://attendance-tracker-six-gold.vercel.app

## Why I made it
We have a 75% attendance rule and most of us were counting classes in our heads or in a notes app. I wanted one place that already knows the timetable, so marking a day takes a few taps.

## How it works
- `timetable.js` has the courses and the weekly schedule for our batch.
- `server.js` is an Express app with a small JSON API (courses, schedule, login, attendance, stats).
- `db.js` stores data in Upstash Redis when the env vars are set (this is what the deployed site uses). Without them it falls back to a local `attendance_data.json` file, which is only for running it on your own machine.
- `public/` is the frontend, plain HTML, CSS and JS.
- It is deployed on Vercel (`vercel.json` sends every route to `server.js`).

## API
| method | route | what it does |
|---|---|---|
| GET | `/api/courses` | all courses |
| GET | `/api/schedule` / `/api/schedule/:day` | weekly schedule / one day |
| POST | `/api/login` | get or create a student by roll number |
| GET | `/api/attendance/:rollNo` | all records for a student |
| GET | `/api/attendance/:rollNo/:date` | records for one day |
| POST | `/api/attendance` | mark present or absent |
| DELETE | `/api/attendance/:rollNo/:courseCode/:date` | undo a mark |
| GET | `/api/stats/:rollNo` | percentage per course |

## Run locally
    npm install
    npm run dev

Then open http://localhost:3000. To use Redis locally, set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` (or `KV_REST_API_URL` and `KV_REST_API_TOKEN`) in a `.env` file.

## Limits
- There is no password. Anyone who knows a roll number can see or change that student's attendance. It's fine for a class tool, but it's the first thing I'd fix.
- The timetable is hardcoded for one semester, so it has to be edited by hand every semester.
- It only covers the EE timetable.
