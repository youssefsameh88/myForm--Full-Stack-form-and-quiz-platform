import express from "express";
import db from "../config/db.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/api/forms/:formId/questions", async (req, res) => {
    db.query(
        `SELECT forms.id AS form_id, forms.title, forms.description, forms.type,
        questions.id AS question_id, questions.question_text, questions.answer_type,
        choices.id AS choice_id, choices.choice_text 
        FROM forms
        LEFT JOIN questions ON questions.form_id=forms.id
        LEFT JOIN choices ON choices.question_id=questions.id
        WHERE forms.id=$1`
        ,[req.params.formId], (err, result) => {

        if(err){
            console.log(err);
            return res.status(500).send("Error");
        }
        else if(result.rows.length == 0) return res.status(404).send("no forms with this id");
        else{
            const form = {
                title: result.rows[0].title,
                description: result.rows[0].description,
                type: result.rows[0].type,
                questions: []
            };
            result.rows.forEach(row => {
                let question = form.questions.find(q => q.id == row.question_id);
                if(!question){
                    question = {
                        id: row.question_id,
                        question_text: row.question_text,
                        answer_type: row.answer_type,
                        choices: []
                    }
                    form.questions.push(question);
                }

                if(row.choice_id !== null){
                    question.choices.push({
                        id: row.choice_id,
                        choice_text: row.choice_text
                    })
                }

            })
            res.status(200).json(form);
        }
    });
});


router.get("/api/questions/:id", (req, res) => {
    db.query(
        `SELECT questions.*, choices.id AS choice_id, choices.choice_text
        FROM questions
        LEFT JOIN  choices ON choices.question_id = questions.id
        WHERE questions.id=$1`, [req.params.id], (err, result) => {
        if(err){
            console.log(err);
            return res.status(500).send("Error");
        }
        else{
            if (result.rows.length === 0) {
                return res.status(404).send("No question with this id");
            }
            let question = {
                id: result.rows[0].id,
                question_text: result.rows[0].question_text,
                answer_type: result.rows[0].answer_type,
                choices: []
            }
            result.rows.forEach(row => {
                let choice = question.choices.find(ch => ch.id == row.choice_id);
                if(!choice){
                    question.choices.push({
                        id: row.choice_id,
                        choice_text: row.choice_text,
                    })
                }
            })
            res.status(200).json(question);
        }
    });
});


router.post("/api/forms/:formId/questions", authMiddleware, async (req, res) => {
    try{
        const formId = req.params.formId;
        const formResult = await db.query(
            "SELECT creator_id FROM forms WHERE id=$1",
            [req.params.formId]
        );

        if (formResult.rows.length === 0) {
            return res.status(404).send("Form not found");
        }

        if (formResult.rows[0].creator_id !== req.user.id) {
            return res.status(403).send("You are not allowed to modify this form");
        }


    const questionText = req.body.question_text;
    const answerType = req.body.answer_type;
    const question = [formId, questionText, answerType];
    db.query("INSERT INTO questions (form_id,question_text, answer_type) VALUES($1, $2, $3) RETURNING *",
         question, (err, result) =>{
            if(err){
            console.log(err);
            return res.status(500).send("Error");
            }
            else{
                res.status(201).json(result.rows);
            }
         });
         } catch(err){
        console.log(err);
        res.status(500).send("Error");
    }
});


router.patch("/api/questions/:id", authMiddleware, async (req, res) => {
    try{
        const ownerResult = await db.query(
            `SELECT forms.creator_id
            FROM questions
            JOIN forms ON forms.id = questions.form_id
            WHERE questions.id=$1`,
            [req.params.id]
        );

        if (ownerResult.rows.length === 0) {
            return res.status(404).send("Question not found");
        }
        if (ownerResult.rows[0].creator_id !== req.user.id) {
            return res.status(403).send("You are not allowed to modify this question");
        }

    const id = req.params.id;
    const x = (await db.query("SELECT * FROM questions WHERE id=$1", [id])).rows;
    if(x.length == 0) return res.send("no question with that id");

    const oldQ = x[0];
    const text = req.body.question_text ?? oldQ.question_text;
    const answerType = req.body.answer_type ?? oldQ.answer_type;
    const question = [text, answerType, id];

    db.query("UPDATE questions SET question_text=$1, answer_type=$2 WHERE id=$3 RETURNING *", question, (err,result) =>{
        if(err){
            console.log(err);
            return res.status(500).send("Error");
        }
        else{
            res.status(200).json(result.rows);
        }
    });
    } catch(err){
        console.log(err);
        res.status(500).send("Error");
    }
});


router.delete("/api/questions/:id", authMiddleware, async (req, res) => {
        const ownerResult = await db.query(
            `SELECT forms.creator_id
            FROM questions
            JOIN forms ON forms.id = questions.form_id
            WHERE questions.id=$1`,
            [req.params.id]
        );

        if (ownerResult.rows.length === 0) {
            return res.status(404).send("Question not found");
        }

        if (ownerResult.rows[0].creator_id !== req.user.id) {
            return res.status(403).send("You are not allowed to delete this question");
        }
    db.query("DELETE FROM questions WHERE id=$1 RETURNING *", [req.params.id], (err,result) =>{
        if(err){
            console.log(err);
            return res.status(500).send("Error");
        }
        else if(result.rows.length == 0) return res.status(404).send("no question with that id");
        else{
            res.status(200).json(result.rows);
        }
    });
});

export default router;