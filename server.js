const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const fs = require("fs");

const app = express();
const PORT = 3000;

const DATA_FILE = "./data.json";

// ===============================
// DATABASE FUNCTIONS
// ===============================

function loadData() {
    if (!fs.existsSync(DATA_FILE)) {
        const data = {
            users: [],
            exams: [],
            questions: [],
            results: [],
            answers: [],
            nextUserId: 1,
            nextExamId: 1,
            nextQuestionId: 1,
            nextResultId: 1
        };

        saveData(data);
        return data;
    }

    return JSON.parse(
        fs.readFileSync(DATA_FILE, "utf8")
    );
}

function saveData(data) {
    fs.writeFileSync(
        DATA_FILE,
        JSON.stringify(data, null, 2)
    );
}

let db = loadData();

// ===============================
// DEFAULT ADMIN
// ===============================

if (!db.users.some(u => u.email === "admin@example.com")) {

    db.users.push({
        id: db.nextUserId++,
        name: "Administrator",
        email: "admin@example.com",
        password: bcrypt.hashSync("admin123", 10),
        role: "admin"
    });

    saveData(db);
}

// ===============================
// EXPRESS SETTINGS
// ===============================

app.set("view engine", "ejs");

app.use(express.urlencoded({
    extended: true
}));

app.use(express.json());

app.use(express.static("public"));

app.use(
    session({
        secret: "online-exam-secret",
        resave: false,
        saveUninitialized: false
    })
);

// ===============================
// AUTH MIDDLEWARE
// ===============================

function requireAdmin(req, res, next) {

    if (
        !req.session.user ||
        req.session.user.role !== "admin"
    ) {
        return res.redirect("/");
    }

    next();
}

function requireStudent(req, res, next) {

    if (
        !req.session.user ||
        req.session.user.role !== "student"
    ) {
        return res.redirect("/");
    }

    next();
}

// ===============================
// LOGIN
// ===============================

app.get("/", (req, res) => {

    if (req.session.user) {

        if (req.session.user.role === "admin") {
            return res.redirect("/admin");
        }

        return res.redirect("/student");
    }

    res.render("login", {
        error: null
    });
});

app.post("/login", (req, res) => {

    const {
        email,
        password
    } = req.body;

    const user = db.users.find(
        u => u.email === email
    );

    if (!user) {

        return res.render("login", {
            error: "Invalid email or password"
        });
    }

    if (
        !bcrypt.compareSync(
            password,
            user.password
        )
    ) {

        return res.render("login", {
            error: "Invalid email or password"
        });
    }

    req.session.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
    };

    if (user.role === "admin") {
        return res.redirect("/admin");
    }

    res.redirect("/student");
});

// ===============================
// REGISTER
// ===============================

app.get("/register", (req, res) => {

    res.render("register", {
        error: null
    });
});

app.post("/register", (req, res) => {

    const {
        name,
        email,
        password
    } = req.body;

    if (!name || !email || !password) {

        return res.render("register", {
            error: "All fields are required"
        });
    }

    if (password.length < 6) {

        return res.render("register", {
            error: "Password must be at least 6 characters"
        });
    }

    if (
        db.users.some(
            u => u.email === email
        )
    ) {

        return res.render("register", {
            error: "Email already registered"
        });
    }

    db.users.push({
        id: db.nextUserId++,
        name,
        email,
        password: bcrypt.hashSync(
            password,
            10
        ),
        role: "student"
    });

    saveData(db);

    res.redirect("/");
});

// ===============================
// LOGOUT
// ===============================

app.get("/logout", (req, res) => {

    req.session.destroy(() => {
        res.redirect("/");
    });

});

// ===============================
// ADMIN DASHBOARD
// ===============================

app.get(
    "/admin",
    requireAdmin,
    (req, res) => {

        const exams = db.exams.map(exam => {

            return {
                ...exam,
                question_count:
                    db.questions.filter(
                        q =>
                            q.exam_id === exam.id
                    ).length
            };

        });

        const students = db.users.filter(
            u => u.role === "student"
        );

        const results = db.results.map(
            result => {

                const student =
                    db.users.find(
                        u =>
                            u.id ===
                            result.student_id
                    );

                const exam =
                    db.exams.find(
                        e =>
                            e.id ===
                            result.exam_id
                    );

                return {
                    ...result,
                    student_name:
                        student
                            ? student.name
                            : "Unknown",
                    exam_title:
                        exam
                            ? exam.title
                            : "Unknown"
                };
            }
        );

        res.render("admin", {
            user: req.session.user,
            exams,
            students,
            results
        });
    }
);

// ===============================
// CREATE EXAM
// ===============================

app.get(
    "/admin/exam/create",
    requireAdmin,
    (req, res) => {

        res.render(
            "create-exam",
            {
                exam: null,
                questions: [],
                error: null
            }
        );
    }
);

app.post(
    "/admin/exam/create",
    requireAdmin,
    (req, res) => {

        const {
            title,
            description,
            duration
        } = req.body;

        if (!title) {

            return res.render(
                "create-exam",
                {
                    exam: null,
                    questions: [],
                    error:
                        "Exam title is required"
                }
            );
        }

        const exam = {
            id: db.nextExamId++,
            title,
            description:
                description || "",
            duration:
                Number(duration) || 30,
            published: 0
        };

        db.exams.push(exam);

        saveData(db);

        res.redirect(
            `/admin/exam/${exam.id}/questions`
        );
    }
);

// ===============================
// QUESTIONS PAGE
// ===============================

app.get(
    "/admin/exam/:id/questions",
    requireAdmin,
    (req, res) => {

        const exam = db.exams.find(
            e =>
                e.id ===
                Number(req.params.id)
        );

        if (!exam) {
            return res.status(404).send(
                "Exam not found"
            );
        }

        const questions =
            db.questions.filter(
                q =>
                    q.exam_id === exam.id
            );

        res.render(
            "create-exam",
            {
                exam,
                questions,
                error: null
            }
        );
    }
);

// ===============================
// ADD QUESTION
// ===============================

app.post(
    "/admin/exam/:id/questions",
    requireAdmin,
    (req, res) => {

        const {
            question,
            option_a,
            option_b,
            option_c,
            option_d,
            correct_answer
        } = req.body;

        db.questions.push({
            id: db.nextQuestionId++,
            exam_id:
                Number(req.params.id),
            question,
            option_a,
            option_b,
            option_c,
            option_d,
            correct_answer
        });

        saveData(db);

        res.redirect(
            `/admin/exam/${req.params.id}/questions`
        );
    }
);

// ===============================
// DELETE QUESTION
// ===============================

app.post(
    "/admin/question/:id/delete",
    requireAdmin,
    (req, res) => {

        const id =
            Number(req.params.id);

        const question =
            db.questions.find(
                q => q.id === id
            );

        db.questions =
            db.questions.filter(
                q => q.id !== id
            );

        saveData(db);

        if (question) {

            return res.redirect(
                `/admin/exam/${question.exam_id}/questions`
            );
        }

        res.redirect("/admin");
    }
);

// ===============================
// PUBLISH EXAM
// ===============================

app.post(
    "/admin/exam/:id/publish",
    requireAdmin,
    (req, res) => {

        const exam = db.exams.find(
            e =>
                e.id ===
                Number(req.params.id)
        );

        if (exam) {
            exam.published = 1;
        }

        saveData(db);

        res.redirect("/admin");
    }
);

// ===============================
// UNPUBLISH
// ===============================

app.post(
    "/admin/exam/:id/unpublish",
    requireAdmin,
    (req, res) => {

        const exam = db.exams.find(
            e =>
                e.id ===
                Number(req.params.id)
        );

        if (exam) {
            exam.published = 0;
        }

        saveData(db);

        res.redirect("/admin");
    }
);

// ===============================
// DELETE EXAM
// ===============================

app.post(
    "/admin/exam/:id/delete",
    requireAdmin,
    (req, res) => {

        const id =
            Number(req.params.id);

        db.exams =
            db.exams.filter(
                e => e.id !== id
            );

        db.questions =
            db.questions.filter(
                q => q.exam_id !== id
            );

        const resultIds =
            db.results
                .filter(
                    r => r.exam_id === id
                )
                .map(
                    r => r.id
                );

        db.results =
            db.results.filter(
                r => r.exam_id !== id
            );

        db.answers =
            db.answers.filter(
                a =>
                    !resultIds.includes(
                        a.result_id
                    )
            );

        saveData(db);

        res.redirect("/admin");
    }
);

// ===============================
// STUDENT DASHBOARD
// ===============================

app.get(
    "/student",
    requireStudent,
    (req, res) => {

        const exams =
            db.exams
                .filter(
                    e =>
                        e.published === 1
                )
                .map(exam => {

                    return {
                        ...exam,
                        question_count:
                            db.questions.filter(
                                q =>
                                    q.exam_id ===
                                    exam.id
                            ).length
                    };

                });

        const results =
            db.results
                .filter(
                    r =>
                        r.student_id ===
                        req.session.user.id
                )
                .map(result => {

                    const exam =
                        db.exams.find(
                            e =>
                                e.id ===
                                result.exam_id
                        );

                    return {
                        ...result,
                        exam_title:
                            exam
                                ? exam.title
                                : "Unknown"
                    };
                });

        res.render(
            "student",
            {
                user: req.session.user,
                exams,
                results
            }
        );
    }
);

// ===============================
// TAKE EXAM
// ===============================

app.get(
    "/student/exam/:id",
    requireStudent,
    (req, res) => {

        const exam =
            db.exams.find(
                e =>
                    e.id ===
                    Number(req.params.id) &&
                    e.published === 1
            );

        if (!exam) {
            return res.status(404).send(
                "Exam not found"
            );
        }

        const questions =
            db.questions.filter(
                q =>
                    q.exam_id === exam.id
            );

        res.render(
            "take-exam",
            {
                exam,
                questions
            }
        );
    }
);

// ===============================
// SUBMIT EXAM
// ===============================

app.post(
    "/student/exam/:id/submit",
    requireStudent,
    (req, res) => {

        const examId =
            Number(req.params.id);

        const studentId =
            req.session.user.id;

        const questions =
            db.questions.filter(
                q =>
                    q.exam_id === examId
            );

        let score = 0;

        const studentAnswers = [];

        questions.forEach(q => {

            const selected =
                req.body[
                    `question_${q.id}`
                ] || "";

            if (
                selected ===
                q.correct_answer
            ) {
                score++;
            }

            studentAnswers.push({
                question_id: q.id,
                selected_answer: selected
            });
        });

        const result = {
            id: db.nextResultId++,
            student_id: studentId,
            exam_id: examId,
            score,
            total: questions.length,
            submitted_at:
                new Date().toISOString()
        };

        db.results.push(result);

        studentAnswers.forEach(answer => {

            db.answers.push({
                result_id: result.id,
                question_id:
                    answer.question_id,
                selected_answer:
                    answer.selected_answer
            });

        });

        saveData(db);

        res.redirect(
            `/student/result/${result.id}`
        );
    }
);

// ===============================
// RESULT
// ===============================

app.get(
    "/student/result/:id",
    requireStudent,
    (req, res) => {

        const result =
            db.results.find(
                r =>
                    r.id ===
                    Number(req.params.id) &&
                    r.student_id ===
                    req.session.user.id
            );

        if (!result) {
            return res.status(404).send(
                "Result not found"
            );
        }

        const exam =
            db.exams.find(
                e =>
                    e.id ===
                    result.exam_id
            );

        res.render(
            "result",
            {
                result: {
                    ...result,
                    exam_title:
                        exam
                            ? exam.title
                            : "Unknown"
                }
            }
        );
    }
);

// ===============================
// ANSWERS
// ===============================

app.get(
    "/student/result/:id/answers",
    requireStudent,
    (req, res) => {

        const result =
            db.results.find(
                r =>
                    r.id ===
                    Number(req.params.id) &&
                    r.student_id ===
                    req.session.user.id
            );

        if (!result) {
            return res.status(404).send(
                "Result not found"
            );
        }

        const exam =
            db.exams.find(
                e =>
                    e.id ===
                    result.exam_id
            );

        const answers =
            db.answers
                .filter(
                    a =>
                        a.result_id ===
                        result.id
                )
                .map(answer => {

                    const question =
                        db.questions.find(
                            q =>
                                q.id ===
                                answer.question_id
                        );

                    return {
                        question:
                            question
                                ? question.question
                                : "",
                        correct_answer:
                            question
                                ? question.correct_answer
                                : "",
                        selected_answer:
                            answer.selected_answer
                    };
                });

        res.render(
            "answers",
            {
                result: {
                    ...result,
                    exam_title:
                        exam
                            ? exam.title
                            : "Unknown"
                },
                answers
            }
        );
    }
);

// ===============================
// ADMIN VIEW ANSWERS
// ===============================

app.get(
    "/admin/result/:id/answers",
    requireAdmin,
    (req, res) => {

        const result =
            db.results.find(
                r =>
                    r.id ===
                    Number(req.params.id)
            );

        if (!result) {
            return res.status(404).send(
                "Result not found"
            );
        }

        const exam =
            db.exams.find(
                e =>
                    e.id ===
                    result.exam_id
            );

        const student =
            db.users.find(
                u =>
                    u.id ===
                    result.student_id
            );

        const answers =
            db.answers
                .filter(
                    a =>
                        a.result_id ===
                        result.id
                )
                .map(answer => {

                    const question =
                        db.questions.find(
                            q =>
                                q.id ===
                                answer.question_id
                        );

                    return {
                        question:
                            question
                                ? question.question
                                : "",
                        correct_answer:
                            question
                                ? question.correct_answer
                                : "",
                        selected_answer:
                            answer.selected_answer
                    };
                });

        res.render(
            "answers",
            {
                result: {
                    ...result,
                    exam_title:
                        exam
                            ? exam.title
                            : "Unknown",
                    student_name:
                        student
                            ? student.name
                            : "Unknown"
                },
                answers
            }
        );
    }
);

// ===============================
// SERVER
// ===============================

app.listen(
    PORT,
    () => {

        console.log("");
        console.log(
            "=============================="
        );
        console.log(
            " ONLINE EXAMINATION SYSTEM"
        );
        console.log(
            "=============================="
        );
        console.log(
            "Open: http://localhost:3000"
        );
        console.log("");
        console.log(
            "ADMIN LOGIN"
        );
        console.log(
            "Email: admin@example.com"
        );
        console.log(
            "Password: admin123"
        );
        console.log(
            "=============================="
        );
        console.log("");
    }
);