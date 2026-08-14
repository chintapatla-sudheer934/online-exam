# Online Examination System

A web-based Online Examination System built using Node.js, Express.js, EJS, HTML, CSS, and JavaScript.

The system provides separate login facilities for **Admin** and **Students**. Admins can create and manage examinations, while students can attend exams and view their marks and answers.

---

## Features

### Admin Login

- Admin authentication
- Admin dashboard
- Create examinations
- Set exam title and description
- Set examination duration
- Add multiple-choice questions
- Add four options (A, B, C, D)
- Select correct answers
- Publish examinations
- Unpublish examinations
- Delete examinations
- Delete questions
- View registered students
- View student marks
- View student answers

### Student Login

- Student registration
- Student login
- Student dashboard
- View available examinations
- Start examination
- Countdown timer
- Answer multiple-choice questions
- Submit examination
- Automatic answer evaluation
- View marks
- View percentage
- View correct answers
- View previous results

---

## Technologies Used

- Node.js
- Express.js
- EJS
- HTML5
- CSS3
- JavaScript
- Express Session
- bcryptjs
- JSON file storage

---

## Project Structure

```text
online-exam/
│
├── .gitignore
├── README.md
├── data.json
├── package.json
├── package-lock.json
├── server.js
│
├── public/
│   ├── exam.js
│   └── style.css
│
└── views/
    ├── admin.ejs
    ├── answers.ejs
    ├── create-exam.ejs
    ├── login.ejs
    ├── register.ejs
    ├── result.ejs
    ├── student.ejs
    └── take-exam.ejs
