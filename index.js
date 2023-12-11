import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import pg from "pg";
import 'dotenv/config';

const app = express();
const port = process.env.PORT || process.env.DEV_PORT;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static("public"));


// Connect Database
const db = new pg.Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DB,
    password: process.env.DB_PW,
    port: process.env.DB_PORT,
});

db.connect();

// To end postgreSQL connection use:
// db.end();


// Select all notes from database.
async function getNotes() {
    const result = await db.query("SELECT * FROM notes ORDER BY date DESC");
    let notes = [];
    result.rows.forEach((note) => {
        notes.push(note);
    });
    return notes;
};


// Display all notes on home page and generate fact with API.
app.get("/", async (req, res) => {
    try {
        const limit = 1;
        const api = await axios.get(process.env.API_URL + limit, {
            headers: { 'X-Api-Key': process.env.APIKEY }
        });
        const result = JSON.stringify(api.data[0]);
        const data_results = JSON.parse(result);

        const notes = await getNotes();

        res.render("index.ejs", {
            fact: data_results["fact"],
            notes: notes
        });

    } catch (error) {
        res.status(404).send(error.message);
    }
});


// Create a new note. Render new page.
app.get("/new", (req, res) => {
    res.render("new.ejs");
});


// Check add a new note form isn't empty. If not save/post the data to database.
app.post("/add", async (req, res) => {
    const title = req.body["title"];
    const note = req.body["note"]; // user input value

    try {
        if (title == '' || note == '') {
            res.render("new.ejs", {
                error: "There was an error, please try again.",
            });
        } else {
            await db.query("INSERT INTO notes (title, note) VALUES ($1, $2)", [
                title, note]);

            res.redirect("/");
        }

    } catch (err) {
        res.render("new.ejs", {
            error: "There was an error, please try again.",
        });
    }
});


// View a specific note and render note page.
app.get("/view/:id", async (req, res) => {
    const notes = await getNotes();

    const idNum = req.params.id;

    var result = notes.find(n => {
        return n.id == idNum;
    });

    try {
        res.render("note.ejs", {
            note: result
        });

    } catch (err) {
        res.render("note.ejs", {
            error: "There was an error, please try again.",
        });
    }
});


// Edit an exisiting note and update it in the database.
app.post("/edit/:id", async (req, res) => {

    const title = req.body.newTitle;
    const note = req.body.newNote;
    const id = req.params.id;

    try {
        await db.query("UPDATE notes SET title = $1, note = $2 WHERE id = $3", [title, note, id]);
        res.redirect("/");
    } catch (err) {
        console.log(err);
    }
});


// Delete a specific note.
app.post("/delete/:id", async (req, res) => {

    const id = req.params.id;

    try {
        db.query("DELETE FROM notes WHERE id = $1", [id]);
        res.redirect("/");
    } catch (err) {
        console.log(err);
    }
});


// Port
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});