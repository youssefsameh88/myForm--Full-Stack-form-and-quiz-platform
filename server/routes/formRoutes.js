import express from "express";
import db from "../config/db.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("", (req, res) => {

db.query(
        `SELECT  id, title, description, type FROM forms`
        , (err, result) => {

        if(err){
            console.log(err);
            return res.status(500).send("Error");
        }
        else if(result.rows.length == 0) return res.status(404).send("no forms with this id");
        else{

            let forms = []
            result.rows.forEach(row => {
                forms.push({
                    id: row.id,
                    title: row.title,
                    description: row.description,
                    type: row.type
                });
            })
            res.status(200).json(forms);
        }
    });
});


router.get("/my", authMiddleware, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT id, creator_id, title, description, type, status, time_limit, created_at
             FROM forms
             WHERE creator_id=$1
             ORDER BY created_at DESC`,
            [req.user.id]
        );

        res.status(200).json(result.rows);

    } catch (err) {
        console.log(err);
        res.status(500).send("Error");
    }
});


router.get("/:id", (req, res) => {
        db.query(
        `SELECT  id, title, description, type FROM forms WHERE id=$1`
        ,[req.params.id], (err, result) => {

        if(err){
            console.log(err);
            return res.status(500).send("Error");
        }
        else if(result.rows.length == 0) return res.status(404).send("no forms with this id");
        else{
            const form = {
                id: result.rows[0].id,
                title: result.rows[0].title,
                description: result.rows[0].description,
                type: result.rows[0].type,
            };
            res.status(200).json(form);
        }
    });
});

router.post("", authMiddleware, async(req, res) => {
    const creatorId = req.user.id
    const title = req.body.title;
    const description = req.body.description;
    const type = req.body.type;
    const timeLimit = req.body.time_limit;
    const form = [creatorId, title, description, type, timeLimit, "draft"];


    db.query("INSERT INTO forms(creator_id, title, description, type, time_limit, status, created_at)"+
        " VALUES($1, $2, $3, $4, $5, $6, NOW()) RETURNING *", form, (err,result) =>{

        if(err){
            console.log(err);
            return res.status(500).send("Error");
        }
        else{
            res.status(201).json(result.rows);
        }
            
    });
});


router.put("/:id",authMiddleware ,async (req, res) => {
    try{
    const id = req.params.id;

    const x = (await db.query("SELECT * FROM forms WHERE id=$1", [id])).rows;
    if(x.length == 0) return res.send("no forms with that id");

    const oldForm = x[0];
    const title = req.body.title ?? oldForm.title;
    const description = req.body.description ?? oldForm.description;
    const timeLimit = req.body.time_limit ?? oldForm.time_limit;
    const form = [title, description, timeLimit,id];



    if (x[0].creator_id !== req.user.id) {
        return res.status(403).send("You are not allowed to modify this form");
    }

    db.query("UPDATE forms SET title=$1, description=$2, time_limit=$3 WHERE id=$4 RETURNING *", form, (err,result) =>{
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

router.patch("/:id", authMiddleware,async (req, res) => {
    try{
    const id = req.params.id;

    const x = (await db.query("SELECT * FROM forms WHERE id=$1", [id])).rows;
    if(x.length == 0) return res.send("no forms with that id");

    const oldForm = x[0];
    const title = req.body.title ?? oldForm.title;
    const description = req.body.description ?? oldForm.description;
    const timeLimit = req.body.time_limit ?? oldForm.time_limit;
    const form = [title, description, timeLimit,id];


    if (x[0].creator_id !== req.user.id) {
        return res.status(403).send("You are not allowed to modify this form");
    }

    db.query("UPDATE forms SET title=$1, description=$2, time_limit=$3 WHERE id=$4 RETURNING *", form, (err,result) =>{
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

router.delete("/:id", authMiddleware,async (req, res) => {
    try{


        const x = (await db.query("SELECT * FROM forms WHERE id=$1", [req.params.id])).rows;
        if(x.length == 0) return res.send("no forms with that id");
        if (x[0].creator_id !== req.user.id) {
            return res.status(403).send("You are not allowed to modify this form");
        }

    db.query("DELETE FROM forms WHERE id=$1 RETURNING *", [req.params.id], (err,result) =>{
        if(err){
            console.log(err);
            return res.status(500).send("Error");
        }
        else if(result.rows.length == 0) return res.status(404).send("no forms with that id");
        else{
            res.status(200).json(result.rows);
        }
    });
    } catch(err){
        console.log(err);
        res.status(500).send("Error");
    }
});



router.post('/:id/open', authMiddleware, async (req, res) => {
    const result = await db.query(
        "SELECT * FROM forms WHERE id=$1",
        [req.params.id]
    );

    if (result.rows.length === 0) {
        return res.status(404).send("Form not found");
    }
   
    const form = result.rows[0];
    if (form.creator_id !== req.user.id) {
        return res.status(403).send("You are not allowed to modify this form");
    }
    if(form.status === "open"){
        return res.status(400).send("form is already open");
    }
    if(form.status === "closed"){
        return res.status(400).send("form is already closed");
    }
        
        db.query("UPDATE forms SET status='open', opened_at=now() WHERE id=$1 RETURNING *",
        [req.params.id], (err, result) => {
        if(err){
            return res.status(500).send("Error");
        }
        if(result.rows.length === 0){
            return res.status(404).send("no forms with this id");
        }
        res.status(200).json(result.rows);
        
    });
        
});


router.post('/:id/close', authMiddleware, async(req, res) => {
    const result = await db.query(
        "SELECT * FROM forms WHERE id=$1",
        [req.params.id]
    );

    if (result.rows.length === 0) {
        return res.status(404).send("Form not found");
    }
   
        const form = result.rows[0];
        if (form.creator_id !== req.user.id) {
            return res.status(403).send("You are not allowed to modify this form");
        }
        if(form.status === "draft"){
            return res.status(400).send("form is not open");
        }
        if(form.status === "closed"){
            return res.status(400).send("form is already closed");
        }
        
        db.query("UPDATE forms SET status='closed', closed_at=now() WHERE id=$1 RETURNING *", [req.params.id], (err, result) => {
        if(err){
            return res.status(500).send("Error");
        }
        if(result.rows.length === 0){
            return res.status(404).send("no forms with this id");
        }
        res.status(200).json(result.rows);
        
    }); 
    });


    export default router;