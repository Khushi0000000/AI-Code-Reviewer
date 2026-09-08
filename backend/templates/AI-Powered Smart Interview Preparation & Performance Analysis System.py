from flask import Flask, render_template, request, redirect, session
from flask_sqlalchemy import SQLAlchemy
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

app = Flask(__name__)

app.secret_key = "ai_interview_secret_key"

app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///interview.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)


# ---------------- DATABASE ----------------

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password = db.Column(db.String(100), nullable=False)


class Result(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("user.id"),
        nullable=False
    )
    domain = db.Column(db.String(100), nullable=False)
    score = db.Column(db.Float, nullable=False)
# ---------------- QUESTIONS ----------------

questions = {
    "Python": [
        {
            "question": "What is Python?",
            "answer": "Python is a high level interpreted programming language."
        },
        {
            "question": "What is a list in Python?",
            "answer": "A list is a mutable ordered collection of elements."
        }
    ],

    "Data Science": [
        {
            "question": "What is Data Science?",
            "answer": "Data Science is the field of extracting useful insights from data."
        },
        {
            "question": "What is Machine Learning?",
            "answer": "Machine Learning allows computers to learn patterns from data."
        }
    ],

    "SQL": [
        {
            "question": "What is SQL?",
            "answer": "SQL is a language used to manage relational databases."
        },
        {
            "question": "What is a primary key?",
            "answer": "A primary key uniquely identifies each record in a database table."
        }
    ]
}
questions["Java"] = [
    {
        "question": "What is Java?",
        "answer": "Java is a high-level, object-oriented programming language."
    },
    {
        "question": "What is JVM?",
        "answer": "JVM stands for Java Virtual Machine. It executes Java bytecode."
    }
]
questions["C"] = [
    {
        "question": "What is C?",
        "answer": "C is a procedural programming language developed by Dennis Ritchie."
    },
    {
        "question": "What is a pointer in C?",
        "answer": "A pointer is a variable that stores the memory address of another variable."
    }
]

questions["C++"] = [
    {
        "question": "What is C++?",
        "answer": "C++ is an object-oriented programming language based on C."
    },
    {
        "question": "What is OOP?",
        "answer": "OOP stands for Object-Oriented Programming. It is based on objects and classes."
    }
]


# ---------------- AI EVALUATION ----------------

def evaluate_answer(user_answer, correct_answer):

    if not user_answer:
        return 0

    vectorizer = TfidfVectorizer()

    vectors = vectorizer.fit_transform(
        [user_answer, correct_answer]
    )

    similarity = cosine_similarity(
        vectors[0:1],
        vectors[1:2]
    )[0][0]

    score = round(similarity * 100, 2)

    return score


# ---------------- HOME ----------------

@app.route("/")
def home():
    return render_template("index.html")


# ---------------- REGISTER ----------------

@app.route("/register", methods=["GET", "POST"])
def register():

    if request.method == "POST":

        name = request.form["name"]
        email = request.form["email"]
        password = request.form["password"]

        existing_user = User.query.filter_by(
            email=email
        ).first()

        if existing_user:
            return "Email already registered!"

        user = User(
            name=name,
            email=email,
            password=password
        )

        db.session.add(user)
        db.session.commit()

        return redirect("/login")

    return render_template("register.html")


# ---------------- LOGIN ----------------

@app.route("/login", methods=["GET", "POST"])
def login():

    if request.method == "POST":

        email = request.form["email"]
        password = request.form["password"]

        user = User.query.filter_by(
            email=email,
            password=password
        ).first()

        if user:

            session["user_id"] = user.id
            session["name"] = user.name

            return redirect("/dashboard")

        return "Invalid email or password!"

    return render_template("login.html")


# ---------------- DASHBOARD ----------------

@app.route("/dashboard")
def dashboard():

    if "user_id" not in session:
        return redirect("/login")

    return render_template(
        "dashboard.html",
        name=session["name"]
    )


# ---------------- INTERVIEW ----------------

@app.route("/interview", methods=["GET", "POST"])
def interview():

    if "user_id" not in session:
        return redirect("/login")

    if request.method == "POST":

        domain = request.form["domain"]

        session["domain"] = domain

        return render_template(
            "interview.html",
            questions=questions[domain],
            domain=domain
        )

    return render_template(
        "interview.html",
        questions=[],
        domain=""
    )


# ---------------- RESULT ----------------

@app.route("/result", methods=["POST"])
def result():
  
    domain = request.form["domain"]

    total_score = 0

    q_list = questions[domain]

    for i, q in enumerate(q_list):

        user_answer = request.form.get(
            f"answer{i}",
            ""
        )

        score = evaluate_answer(
            user_answer,
            q["answer"]
        )

        total_score += score

    final_score = round(
        total_score / len(q_list),
        2
    )

    result_data = Result(
        user_id=session["user_id"],
        domain=domain,
        score=final_score
    )

    db.session.add(result_data)
    db.session.commit()

    return render_template(
        "result.html",
        score=final_score,
        domain=domain
    )
# ---------------- HISTORY ----------------
@app.route("/history")
def history():
    if "user_id" not in session:
        return redirect("/login")

    results = Result.query.filter_by(user_id=session["user_id"]).all()

    return render_template("history.html", results=results)

# ---------------- LOGOUT ----------------

@app.route("/logout")
def logout():

    session.clear()

    return redirect("/")


# ---------------- DATABASE CREATE ----------------

with app.app_context():
    db.create_all()


# ---------------- RUN ----------------

if __name__ == "__main__":
    app.run(debug=True)