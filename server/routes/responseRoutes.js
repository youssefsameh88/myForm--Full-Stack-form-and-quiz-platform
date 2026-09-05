import express from "express";
import db from "../config/db.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/:id/start",authMiddleware ,async(req,res) => {
    db.query("SELECT * FROM forms WHERE id=$1", [req.params.id], (err, result) => {
        if(err){
            return res.status(500).send("Error");
        }
        if(result.rows.length === 0) return res.status(404).send("no forms with that id");
        if(result.rows[0].status !== "open") return res.status(400).send("form is not open");

        db.query("INSERT INTO responses(form_id, user_id, started_at) VALUES($1, $2, NOW()) RETURNING *",
        [req.params.id, req.user.id], (err, result) => {
            if(err){
                return res.status(500).send("Error");
            }
            res.status(201).json(result.rows);
        }
    );
    });
});

router.post("/:id/submit", authMiddleware,async (req,res) => {
    try{
        const formId = req.params.id;
        const responseId = req.body.response_id;
        const answers = req.body.answers;
        const user = req.user.id;

        if (!Array.isArray(answers)) {
            return res.status(400).send("Answers must be an array");
        }   

        const responseResult = await db.query(
            "SELECT * FROM responses WHERE id=$1 AND form_id=$2 AND user_id=$3", [responseId,formId, user]
        );
        if (responseResult.rows.length === 0) {
            return res.status(404).send("Response not found");
        }
        if (responseResult.rows[0].submitted_at !== null) {
            return res.status(400).send("Response already submitted");
        }


        const formResult = await db.query(
            "SELECT * FROM forms WHERE id=$1", [formId]
        );
        if (formResult.rows.length === 0) {
            return res.status(404).send("No form with this id");
        }



        const form = formResult.rows[0];
        if(form.status !== "open"){
            return res.status(400).send("form is not open");
        }
        for (const answer of answers) {

            const questionResult = await db.query(
                `SELECT id
                FROM questions
                WHERE id=$1 AND form_id=$2`,
                [answer.question_id, formId]
            );

            if (questionResult.rows.length === 0) {
                return res.status(400).send("Invalid question");
            }

            if (answer.choice_id !== undefined && answer.choice_id !== null) {

                const choiceResult = await db.query(
                    `SELECT choices.id
                    FROM choices
                    JOIN questions
                    ON questions.id = choices.question_id
                    WHERE choices.id=$1
                    AND questions.id=$2
                    AND questions.form_id=$3`,
                    [
                        answer.choice_id,
                        answer.question_id,
                        formId
                    ]
                );

                if (choiceResult.rows.length === 0) {
                    return res.status(400).send("Invalid choice");
                }
            }
        }


        for (const answer of answers) {
            await db.query(
                `INSERT INTO answers
                (response_id, question_id, choice_id, value)
                VALUES ($1, $2, $3, $4)`,
                [responseId, answer.question_id, answer.choice_id ?? null, answer.value ?? null]
            );
        }
        if(form.type === 'quiz'){
        const correctResult = await db.query(
            `SELECT question_id, id AS choice_id
             FROM choices
             WHERE is_correct = true
             AND question_id IN (
                 SELECT id FROM questions WHERE form_id=$1
             )`,
            [formId]
        );

        let score = 0;

        answers.forEach(answer => {
            const correct = correctResult.rows.find(
                row => row.question_id === answer.question_id
            );

            if (correct && correct.choice_id === answer.choice_id) {
                score++;
            }
        })

        const result = await db.query(
            `UPDATE responses
             SET score=$1, submitted_at=NOW()
             WHERE id=$2
             RETURNING *`,
            [score, responseId]
        );

        return res.status(200).json(result.rows[0]);
    }

    const result = await db.query(
            `UPDATE responses
             SET submitted_at=NOW()
             WHERE id=$1
             RETURNING *`,
            [responseId]
        );

        res.status(200).json(result.rows[0]);
    }
    catch(err){
        res.status(500).send("Error");
    }
});


router.get("/:id/leaderboard", authMiddleware,async (req, res) => {
    try {
        const formId = req.params.id;
        const formResult = await db.query(
            "SELECT * FROM forms WHERE id=$1",
            [formId]
        );

        if (formResult.rows.length === 0) {
            return res.status(404).send("No form with this id");
        }

        const form = formResult.rows[0];
        if (form.creator_id !== req.user.id) {
            return res.status(403).send("You are not allowed to view these results");
        }
        if (form.type !== "quiz") {
            return res.status(400).send("Leaderboard is only available for quizzes");
        }

        const result = await db.query(
            `SELECT *
             FROM responses
             WHERE form_id=$1
             AND submitted_at IS NOT NULL
             ORDER BY score DESC`,
            [formId]
        );

        res.status(200).json(result.rows);

    } catch (err) {
        console.log(err);
        res.status(500).send("Error");
    }
});


router.get("/:id/results", authMiddleware,async (req, res) => {
    try {
        const formId = req.params.id;
        const formResult = await db.query(
            "SELECT * FROM forms WHERE id=$1",
            [formId]
        );

        if (formResult.rows.length === 0) {
            return res.status(404).send("No form with this id");
        }

        const form = formResult.rows[0];
        if (form.creator_id !== req.user.id) {
            return res.status(403).send("You are not allowed to view these results");
        }

        if (form.type === "quiz") {

            const result = await db.query(
                `SELECT id, user_id, score, started_at, submitted_at
                 FROM responses
                 WHERE form_id=$1
                 AND submitted_at IS NOT NULL
                 ORDER BY score DESC`,
                [formId]
            );

            return res.status(200).json(result.rows);
        }

        const result = await db.query(
            `SELECT answers.question_id, answers.choice_id, answers.value
             FROM answers
             JOIN responses
             ON responses.id = answers.response_id
             WHERE responses.form_id=$1
             AND responses.submitted_at IS NOT NULL`,
            [formId]
        );

        res.status(200).json(result.rows);

    } catch (err) {
        console.log(err);
        res.status(500).send("Error");
    }
});

export default router;