from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import re
from datetime import datetime

app = Flask(__name__)
CORS(app)

DATABASE = "reviews.db"


# =========================================================
# DATABASE
# =========================================================

def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()

    conn.execute("""
        CREATE TABLE IF NOT EXISTS reviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            language TEXT NOT NULL,
            code TEXT,
            score INTEGER,
            bugs INTEGER DEFAULT 0,
            security INTEGER DEFAULT 0,
            performance INTEGER DEFAULT 0,
            suggestions INTEGER DEFAULT 0,
            issues TEXT,
            created_at TEXT
        )
    """)

    conn.commit()
    conn.close()


# =========================================================
# CODE REVIEW LOGIC
# =========================================================

def analyze_code(code, language):

    bugs = 0
    security = 0
    performance = 0
    suggestions = 0

    issues = []

    code_lower = code.lower()

    # -----------------------------------------------------
    # BUG DETECTION
    # -----------------------------------------------------

    if language == "Python":

        if "print(" in code:
            suggestions += 1
            issues.append({
                "severity": "LOW",
                "title": "Print statement detected",
                "description": "Consider using proper logging instead of print() in production code."
            })

        if "except:" in code:
            bugs += 1
            issues.append({
                "severity": "MEDIUM",
                "title": "Broad exception handling",
                "description": "Avoid bare except blocks. Catch specific exceptions."
            })

        if "==" in code and "if" in code:
            suggestions += 1

    # -----------------------------------------------------
    # SECURITY
    # -----------------------------------------------------

    dangerous_patterns = [
        "eval(",
        "exec(",
        "password",
        "secret",
        "api_key",
        "apikey"
    ]

    for pattern in dangerous_patterns:
        if pattern in code_lower:
            security += 1

            issues.append({
                "severity": "HIGH",
                "title": "Potential security issue",
                "description": f"Potentially sensitive or unsafe pattern detected: {pattern}"
            })

    # -----------------------------------------------------
    # PERFORMANCE
    # -----------------------------------------------------

    if "for" in code_lower and "for" in code_lower.count("for") > 1:
        performance += 1

        issues.append({
            "severity": "MEDIUM",
            "title": "Multiple loops detected",
            "description": "Consider checking whether nested or repeated loops can be optimized."
        })

    # -----------------------------------------------------
    # SUGGESTIONS
    # -----------------------------------------------------

    if len(code.splitlines()) > 100:
        suggestions += 1

        issues.append({
            "severity": "LOW",
            "title": "Large source file",
            "description": "Consider breaking large code into smaller functions or modules."
        })

    # -----------------------------------------------------
    # SCORE
    # -----------------------------------------------------

    deductions = (
        bugs * 10
        + security * 15
        + performance * 8
        + suggestions * 3
    )

    score = max(0, min(100, 100 - deductions))

    if not issues:
        issues.append({
            "severity": "GOOD",
            "title": "No major issues detected",
            "description": "Your code looks good based on the current automated checks."
        })

    return {
        "score": score,
        "bugs": bugs,
        "security": security,
        "performance": performance,
        "suggestions": suggestions,
        "issues": issues
    }


# =========================================================
# SAVE REVIEW
# =========================================================

def save_review(language, code, result):

    conn = get_db()

    conn.execute("""
        INSERT INTO reviews
        (
            language,
            code,
            score,
            bugs,
            security,
            performance,
            suggestions,
            issues,
            created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        language,
        code,
        result["score"],
        result["bugs"],
        result["security"],
        result["performance"],
        result["suggestions"],
        str(result["issues"]),
        datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    ))

    conn.commit()
    conn.close()


# =========================================================
# REVIEW CODE API
# =========================================================

@app.route("/api/review", methods=["POST"])
def review_code():

    try:

        data = request.get_json()

        if not data:
            return jsonify({
                "error": "No data received"
            }), 400

        code = data.get("code", "").strip()
        language = data.get("language", "Python")

        if not code:
            return jsonify({
                "error": "Please enter code"
            }), 400

        result = analyze_code(code, language)

        response = {
            "language": language,
            "score": result["score"],
            "bugs": result["bugs"],
            "security": result["security"],
            "performance": result["performance"],
            "suggestions": result["suggestions"],
            "issues": result["issues"]
        }

        save_review(language, code, result)

        return jsonify(response), 200

    except Exception as e:

        print("Review error:", e)

        return jsonify({
            "error": str(e)
        }), 500


# =========================================================
# HISTORY API
# =========================================================

@app.route("/api/history", methods=["GET"])
def get_history():

    try:

        conn = get_db()

        rows = conn.execute("""
            SELECT *
            FROM reviews
            ORDER BY id DESC
        """).fetchall()

        conn.close()

        history = []

        for row in rows:

            history.append({
                "id": row["id"],
                "language": row["language"],
                "score": row["score"],
                "bugs": row["bugs"],
                "security": row["security"],
                "performance": row["performance"],
                "suggestions": row["suggestions"],
                "created_at": row["created_at"]
            })

        return jsonify(history), 200

    except Exception as e:

        print("History error:", e)

        return jsonify({
            "error": str(e)
        }), 500


# =========================================================
# DELETE HISTORY API
# =========================================================

@app.route("/api/history/<int:review_id>", methods=["DELETE"])
def delete_history(review_id):

    try:

        conn = get_db()

        cursor = conn.execute(
            "DELETE FROM reviews WHERE id = ?",
            (review_id,)
        )

        conn.commit()
        conn.close()

        if cursor.rowcount == 0:
            return jsonify({
                "error": "Review not found"
            }), 404

        return jsonify({
            "message": "Review deleted successfully"
        }), 200

    except Exception as e:

        print("Delete error:", e)

        return jsonify({
            "error": str(e)
        }), 500


# =========================================================
# GITHUB PR API
# =========================================================

@app.route("/api/github-pr", methods=["POST"])
def github_pr():

    try:

        data = request.get_json()

        if not data:
            return jsonify({
                "error": "No data received"
            }), 400

        url = data.get("url", "").strip()

        pattern = r"^https://github\.com/[^/]+/[^/]+/pull/\d+/?$"

        if not re.match(pattern, url):

            return jsonify({
                "error": "Invalid GitHub Pull Request URL"
            }), 400

        parts = url.rstrip("/").split("/")

        owner = parts[3]
        repository = parts[4]
        pull_request = parts[6]

        # Basic response for now
        # GitHub API integration can be added next.

        result = {
            "language": "GitHub PR",
            "score": 85,
            "bugs": 0,
            "security": 0,
            "performance": 0,
            "suggestions": 1,
            "issues": [
                {
                    "severity": "GOOD",
                    "title": "Pull Request loaded",
                    "description": "GitHub Pull Request URL was successfully received."
                }
            ],
            "is_github_pr": True,
            "github": {
                "owner": owner,
                "repository": repository,
                "pull_request": pull_request,
                "files_changed": 0,
                "files_analyzed": 0,
                "url": url
            }
        }

        return jsonify(result), 200

    except Exception as e:

        print("GitHub PR error:", e)

        return jsonify({
            "error": str(e)
        }), 500


# =========================================================
# TEST ROUTE
# =========================================================

@app.route("/")
def home():

    return jsonify({
        "message": "AI Code Reviewer Backend is running!",
        "status": "success"
    })


# =========================================================
# START SERVER
# =========================================================

if __name__ == "__main__":

    init_db()

    print("---------------------------------------")
    print("AI Code Reviewer Backend")
    print("Server: http://127.0.0.1:5000")
    print("---------------------------------------")

    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )