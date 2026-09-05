import express from "express";
import db from "../config/db.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();


router.get("/:chId/choices", async (req, res) => {
    try{

    const chId = req.params.chId;
    const x = (await db.query("SELECT * FROM questions WHERE id=$1", [chId])).rows;
    if(x.length == 0) return res.send("no questions with that id");

    db.query("SELECT id, question_id, choice_text FROM choices WHERE question_id=$1", [chId], (err, result) => {
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


router.get("/:id", (req, res) => {
    db.query("SELECT id, question_id, choice_text FROM choices WHERE id=$1", [req.params.id], (err, result) => {
        if(err){
            console.log(err);
            return res.status(500).send("Error");
        }
        else{
            res.status(200).json(result.rows);
        }
    });
});


router.post("/:chId/choices", authMiddleware, async (req, res) => {
    try{
        const chId = req.params.chId;
        const ownerResult = await db.query(
            `SELECT forms.creator_id
            FROM questions
            JOIN forms ON forms.id = questions.form_id
            WHERE questions.id=$1`,
            [chId]
        );
    
        if (ownerResult.rows.length === 0) {
            return res.status(404).send("Question not found");
        }
    
        if (ownerResult.rows[0].creator_id !== req.user.id) {
            return res.status(403).send("You are not allowed to modify this question");
        }


    const choiceText = req.body.choice_text;
    const isCorrect = req.body.is_correct;
    const choice = [chId, choiceText, isCorrect];

    db.query("INSERT INTO choices (question_id,choice_text, is_correct) VALUES($1, $2, $3) RETURNING *",
         choice, (err, result) =>{
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


router.patch("/:id", authMiddleware, async (req, res) => {
    try{
    const id = req.params.id;
    const ownerResult = await db.query(
        `SELECT forms.creator_id
        FROM choices
        JOIN questions ON questions.id = choices.question_id
        JOIN forms ON forms.id = questions.form_id
        WHERE choices.id=$1`,
        [id]
    );

    if (ownerResult.rows.length === 0) {
        return res.status(404).send("Choice not found");
    }

    if (ownerResult.rows[0].creator_id !== req.user.id) {
        return res.status(403).send("You are not allowed to modify this choice");
    }
    const x = (await db.query("SELECT * FROM choices WHERE id=$1", [id])).rows;

    const oldCH = x[0];
    const text = req.body.choice_text ?? oldCH.choice_text;
    const isCorrect = req.body.is_correct ?? oldCH.is_correct;
    const choice = [text, isCorrect, id];

    db.query("UPDATE choices SET choice_text=$1, is_correct=$2 WHERE id=$3 RETURNING *", choice, (err,result) =>{
        if(err){
            console.log(err);
            return res.send("Error");
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


router.delete("/:id", authMiddleware, async (req, res) => {
    const ownerResult = await db.query(
        `SELECT forms.creator_id
        FROM choices
        JOIN questions ON questions.id = choices.question_id
        JOIN forms ON forms.id = questions.form_id
        WHERE choices.id=$1`,
        [req.params.id]
    );

    if (ownerResult.rows.length === 0) {
        return res.status(404).send("Choice not found");
    }

    if (ownerResult.rows[0].creator_id !== req.user.id) {
        return res.status(403).send("You are not allowed to delete this choice");
    }
    db.query("DELETE FROM choices WHERE id=$1 RETURNING *", [req.params.id], (err,result) =>{
        if(err){
            console.log(err);
            return res.status(500).send("Error");
        }
        else if(result.rows.length == 0) return res.status(404).send("no choices with that id");
        else{
            res.status(200).json(result.rows);
        }
    });
});

export default router;