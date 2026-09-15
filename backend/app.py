from flask import Flask, request, jsonify, session
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

import requests
import re
import os
import ast
import difflib
import io
import zipfile
from werkzeug.utils import secure_filename
from datetime import datetime


# ============================================================
# FLASK APP
# ============================================================

app = Flask(__name__)

app.config["SECRET_KEY"] = os.getenv(
    "SECRET_KEY",
    "ai-code-reviewer-secret-key-change-this"
)

app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///code_reviewer.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# Production-safe CORS configuration.
# The frontend and backend are deployed on different Render origins,
# so credentials must be enabled and the frontend origin must be explicit.
FRONTEND_URL = os.getenv(
    "FRONTEND_URL",
    "https://ai-code-reviewer-1-ctee.onrender.com"
).rstrip("/")

ALLOWED_ORIGINS = [
    FRONTEND_URL,
    "https://ai-code-reviewer-1-ctee.onrender.com",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

CORS(
    app,
    supports_credentials=True,
    resources={
        r"/api/*": {
            "origins": ALLOWED_ORIGINS
        }
    }
)

# Flask session settings.
# Render runs over HTTPS, while local development normally uses HTTP.
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.config["SESSION_COOKIE_SECURE"] = (
    os.getenv("SESSION_COOKIE_SECURE", "0") == "1"
)

db = SQLAlchemy(app)


# ============================================================
# DATABASE MODELS
# ============================================================

class User(db.Model):

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    name = db.Column(
        db.String(100),
        nullable=False
    )

    email = db.Column(
        db.String(200),
        unique=True,
        nullable=False
    )

    password = db.Column(
        db.String(300),
        nullable=False
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )


class Review(db.Model):

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("user.id"),
        nullable=True
    )

    code = db.Column(
        db.Text,
        nullable=False
    )

    language = db.Column(
        db.String(50),
        nullable=False
    )

    score = db.Column(
        db.Integer,
        nullable=False
    )

    security_issues = db.Column(
        db.Integer,
        default=0
    )

    performance_issues = db.Column(
        db.Integer,
        default=0
    )

    bugs = db.Column(
        db.Integer,
        default=0
    )

    suggestions = db.Column(
        db.Integer,
        default=0
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )


class Team(db.Model):

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    owner_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class TeamMember(db.Model):

    id = db.Column(db.Integer, primary_key=True)
    team_id = db.Column(db.Integer, db.ForeignKey("team.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    role = db.Column(db.String(30), default="Developer")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class TeamProject(db.Model):

    id = db.Column(db.Integer, primary_key=True)
    team_id = db.Column(db.Integer, db.ForeignKey("team.id"), nullable=False)
    name = db.Column(db.String(200), nullable=False)
    language = db.Column(db.String(50), default="Python")
    code = db.Column(db.Text, default="")
    updated_by = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class GitHubReview(db.Model):

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("user.id"),
        nullable=True
    )

    repository = db.Column(
        db.String(200),
        nullable=False
    )

    pr_number = db.Column(
        db.Integer,
        nullable=False
    )

    title = db.Column(
        db.String(500)
    )

    author = db.Column(
        db.String(200)
    )

    files_changed = db.Column(
        db.Integer,
        default=0
    )

    additions = db.Column(
        db.Integer,
        default=0
    )

    deletions = db.Column(
        db.Integer,
        default=0
    )

    score = db.Column(
        db.Integer,
        default=100
    )

    issues = db.Column(
        db.Text,
        default="[]"
    )

    url = db.Column(
        db.String(500)
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )


# ============================================================
# CREATE DATABASE
# ============================================================

with app.app_context():
    db.create_all()


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def get_current_user_id():
    """
    Login hua hai to user id return karega.
    Login nahi hua to None.
    """
    return session.get("user_id")


def team_access(team_id, user_id=None):
    user_id = user_id or get_current_user_id()
    if not user_id:
        return None
    return TeamMember.query.filter_by(team_id=team_id, user_id=user_id).first()


def project_access(project_id, user_id=None):
    user_id = user_id or get_current_user_id()
    if not user_id:
        return None
    project = db.session.get(TeamProject, project_id)
    if not project or not team_access(project.team_id, user_id):
        return None
    return project


def serialize_team(team, member_count=0):
    return {"id": team.id, "name": team.name, "owner_id": team.owner_id, "member_count": member_count, "created_at": team.created_at.isoformat() if team.created_at else None}


def serialize_project(project):
    return {"id": project.id, "team_id": project.team_id, "name": project.name, "language": project.language, "code": project.code or "", "updated_by": project.updated_by, "created_at": project.created_at.isoformat() if project.created_at else None, "updated_at": project.updated_at.isoformat() if project.updated_at else None}


def clean_email(email):
    return email.strip().lower()


def calculate_score(issues):
    score = 100

    for issue in issues:

        severity = issue.get("severity")

        if severity == "HIGH":
            score -= 15

        elif severity == "MEDIUM":
            score -= 8

        elif severity == "LOW":
            score -= 3

    return max(score, 0)


def calculate_category_scores(issues):

    security_count = sum(
        1
        for issue in issues
        if issue.get("category") == "Security"
    )

    performance_count = sum(
        1
        for issue in issues
        if issue.get("category") == "Performance"
    )

    bugs_count = sum(
        1
        for issue in issues
        if issue.get("category") == "Bug"
        or issue.get("severity") == "HIGH"
    )

    suggestions_count = sum(
        1
        for issue in issues
        if issue.get("severity") == "LOW"
        or issue.get("category") == "Code Quality"
    )

    security_score = max(
        100 - security_count * 15,
        0
    )

    performance_score = max(
        100 - performance_count * 10,
        0
    )

    return (
        security_count,
        performance_count,
        bugs_count,
        suggestions_count,
        security_score,
        performance_score
    )


# ============================================================
# TEAM COLLABORATION
# ============================================================

@app.route("/api/teams", methods=["GET"])
def get_teams():
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({"success": False, "error": "Authentication required. Please login first."}), 401
    memberships = TeamMember.query.filter_by(user_id=user_id).all()
    teams = []
    for membership in memberships:
        team = db.session.get(Team, membership.team_id)
        if team:
            count = TeamMember.query.filter_by(team_id=team.id).count()
            teams.append(serialize_team(team, count))
    teams.sort(key=lambda item: item["created_at"] or "", reverse=True)
    return jsonify({"success": True, "teams": teams})


@app.route("/api/teams", methods=["POST"])
def create_team():
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({"success": False, "error": "Authentication required. Please login first."}), 401
    data = request.get_json(silent=True) or {}
    name = str(data.get("name", "")).strip()
    if not name:
        return jsonify({"success": False, "error": "Team name is required."}), 400
    if len(name) > 150:
        return jsonify({"success": False, "error": "Team name is too long."}), 400
    team = Team(name=name, owner_id=user_id)
    db.session.add(team)
    db.session.flush()
    db.session.add(TeamMember(team_id=team.id, user_id=user_id, role="Owner"))
    db.session.commit()
    return jsonify({"success": True, "team": serialize_team(team, 1)}), 201


@app.route("/api/teams/<int:team_id>", methods=["DELETE"])
def delete_team(team_id):
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({"success": False, "error": "Authentication required. Please login first."}), 401

    team = db.session.get(Team, team_id)
    if not team:
        return jsonify({"success": False, "error": "Team not found."}), 404

    # Only the team owner can permanently delete the team.
    if team.owner_id != user_id:
        return jsonify({"success": False, "error": "Only the team owner can delete this team."}), 403

    try:
        # Delete child records first because the existing SQLite schema does not
        # rely on database-level ON DELETE CASCADE rules.
        TeamProject.query.filter_by(team_id=team_id).delete(synchronize_session=False)
        TeamMember.query.filter_by(team_id=team_id).delete(synchronize_session=False)
        team_name = team.name
        db.session.delete(team)
        db.session.commit()
        return jsonify({
            "success": True,
            "message": f'Team "{team_name}" deleted successfully.'
        }), 200
    except Exception as e:
        db.session.rollback()
        print("DELETE TEAM ERROR:", e)
        return jsonify({
            "success": False,
            "error": "Unable to delete team."
        }), 500


@app.route("/api/teams/<int:team_id>", methods=["GET"])
def get_team(team_id):
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({"success": False, "error": "Authentication required. Please login first."}), 401
    if not team_access(team_id, user_id):
        return jsonify({"success": False, "error": "You are not a member of this team."}), 403
    team = db.session.get(Team, team_id)
    if not team:
        return jsonify({"success": False, "error": "Team not found."}), 404
    members = []
    for membership in TeamMember.query.filter_by(team_id=team_id).all():
        member = db.session.get(User, membership.user_id)
        if member:
            members.append({"id": member.id, "name": member.name, "email": member.email, "role": membership.role})
    projects = TeamProject.query.filter_by(team_id=team_id).order_by(TeamProject.updated_at.desc()).all()
    return jsonify({
        "success": True,
        "team": {**serialize_team(team, len(members)), "members": members},
        "projects": [serialize_project(project) for project in projects]
    })


@app.route("/api/teams/<int:team_id>/members", methods=["POST"])
def add_team_member(team_id):
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({"success": False, "error": "Authentication required. Please login first."}), 401
    team = db.session.get(Team, team_id)
    membership = team_access(team_id, user_id)
    if not team or not membership:
        return jsonify({"success": False, "error": "Team not found or access denied."}), 403
    if membership.role != "Owner":
        return jsonify({"success": False, "error": "Only the team owner can add members."}), 403
    data = request.get_json(silent=True) or {}
    email = clean_email(data.get("email", ""))
    if not email:
        return jsonify({"success": False, "error": "Member email is required."}), 400
    member = User.query.filter_by(email=email).first()
    if not member:
        return jsonify({"success": False, "error": "No registered user found with this email."}), 404
    if TeamMember.query.filter_by(team_id=team_id, user_id=member.id).first():
        return jsonify({"success": False, "error": "User is already a team member."}), 409
    db.session.add(TeamMember(team_id=team_id, user_id=member.id, role="Developer"))
    db.session.commit()
    return jsonify({"success": True, "message": "Member added successfully."}), 201


@app.route("/api/teams/<int:team_id>/projects", methods=["POST"])
def create_team_project(team_id):
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({"success": False, "error": "Authentication required. Please login first."}), 401
    if not team_access(team_id, user_id):
        return jsonify({"success": False, "error": "You are not a member of this team."}), 403
    data = request.get_json(silent=True) or {}
    name = str(data.get("name", "")).strip()
    language = str(data.get("language", "Python")).strip() or "Python"
    code = str(data.get("code", ""))
    if not name:
        return jsonify({"success": False, "error": "Project name is required."}), 400
    project = TeamProject(team_id=team_id, name=name, language=language, code=code, updated_by=user_id)
    db.session.add(project)
    db.session.commit()
    return jsonify({"success": True, "project": serialize_project(project)}), 201


@app.route("/api/projects/<int:project_id>", methods=["GET"])
def get_team_project(project_id):
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({"success": False, "error": "Authentication required. Please login first."}), 401
    project = project_access(project_id, user_id)
    if not project:
        return jsonify({"success": False, "error": "Project not found or access denied."}), 403
    return jsonify({"success": True, "project": serialize_project(project)})


@app.route("/api/projects/<int:project_id>", methods=["PUT"])
def update_team_project(project_id):
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({"success": False, "error": "Authentication required. Please login first."}), 401
    project = project_access(project_id, user_id)
    if not project:
        return jsonify({"success": False, "error": "Project not found or access denied."}), 403
    data = request.get_json(silent=True) or {}
    if "code" in data:
        project.code = str(data.get("code", ""))
    if "language" in data:
        project.language = str(data.get("language", "Python"))
    project.updated_by = user_id
    project.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({"success": True, "message": "Shared project updated.", "project": serialize_project(project)})


# ============================================================
# HOME
# ============================================================

@app.route("/", methods=["GET"])
def home():

    return jsonify({
        "success": True,
        "message": "AI Code Reviewer Backend Running",
        "status": "OK",
        "version": "2.0"
    })


# ============================================================
# AUTH - SIGNUP
# ============================================================

@app.route("/api/signup", methods=["POST"])
def signup():

    try:

        data = request.get_json(silent=True) or {}

        name = data.get("name", "").strip()

        # Username: letters and spaces only. Numbers and symbols are not allowed.
        if not name:
            return jsonify({
                "success": False,
                "error": "Username is required."
            }), 400

        if not re.fullmatch(r"[A-Za-z ]+", name):
            return jsonify({
                "success": False,
                "error": "Username must contain letters only. Numbers are not allowed."
            }), 400
        email = clean_email(
            data.get("email", "")
        )
        password = data.get("password", "")

        if not name:
            return jsonify({
                "success": False,
                "error": "Name is required"
            }), 400

        if not email:
            return jsonify({
                "success": False,
                "error": "Email is required"
            }), 400

        if not re.match(
            r"^[^@\s]+@[^@\s]+\.[^@\s]+$",
            email
        ):
            return jsonify({
                "success": False,
                "error": "Invalid email address"
            }), 400

        if not (
            len(password) >= 8
            and re.search(r"[A-Z]", password)
            and re.search(r"[a-z]", password)
            and re.search(r"[0-9]", password)
            and re.search(r"[^A-Za-z0-9]", password)
        ):
            return jsonify({
                "success": False,
                "error": "Password must be at least 8 characters and include uppercase, lowercase, number, and special character."
            }), 400

        existing_user = User.query.filter_by(
            email=email
        ).first()

        if existing_user:

            return jsonify({
                "success": False,
                "error": "Email already registered"
            }), 409

        user = User(
            name=name,
            email=email,
            password=generate_password_hash(password)
        )

        db.session.add(user)
        db.session.commit()

        session["user_id"] = user.id
        session["user_name"] = user.name
        session["user_email"] = user.email

        return jsonify({

            "success": True,

            "message": "Account created successfully",

            "user": {
                "id": user.id,
                "name": user.name,
                "email": user.email
            }

        }), 201

    except Exception as e:

        db.session.rollback()

        print("SIGNUP ERROR:", e)

        return jsonify({
            "success": False,
            "error": "Unable to create account",
            "details": str(e)
        }), 500


# ============================================================
# AUTH - LOGIN
# ============================================================

@app.route("/api/login", methods=["POST"])
def login():

    try:

        data = request.get_json(silent=True) or {}

        email = clean_email(
            data.get("email", "")
        )

        password = data.get(
            "password",
            ""
        )

        if not email or not password:

            return jsonify({
                "success": False,
                "error": "Email and password are required"
            }), 400

        user = User.query.filter_by(
            email=email
        ).first()

        if not user:

            return jsonify({
                "success": False,
                "error": "Invalid email or password"
            }), 401

        if not check_password_hash(
            user.password,
            password
        ):

            return jsonify({
                "success": False,
                "error": "Invalid email or password"
            }), 401

        session["user_id"] = user.id
        session["user_name"] = user.name
        session["user_email"] = user.email

        return jsonify({

            "success": True,

            "message": "Login successful",

            "user": {
                "id": user.id,
                "name": user.name,
                "email": user.email
            }

        }), 200

    except Exception as e:

        print("LOGIN ERROR:", e)

        return jsonify({
            "success": False,
            "error": "Unable to login",
            "details": str(e)
        }), 500


# ============================================================
# AUTH - CHANGE PASSWORD
# ============================================================

@app.route("/api/change-password", methods=["POST"])
def change_password():

    try:
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({
                "success": False,
                "error": "Authentication required. Please login first."
            }), 401

        data = request.get_json(silent=True) or {}
        current_password = data.get("current_password", "")
        new_password = data.get("new_password", "")

        if not current_password or not new_password:
            return jsonify({
                "success": False,
                "error": "Current password and new password are required."
            }), 400

        user = db.session.get(User, user_id)
        if not user:
            session.clear()
            return jsonify({
                "success": False,
                "error": "User account not found."
            }), 404

        if not check_password_hash(user.password, current_password):
            return jsonify({
                "success": False,
                "error": "Current password is incorrect."
            }), 400

        if not (
            len(new_password) >= 8
            and re.search(r"[A-Z]", new_password)
            and re.search(r"[a-z]", new_password)
            and re.search(r"[0-9]", new_password)
            and re.search(r"[^A-Za-z0-9]", new_password)
        ):
            return jsonify({
                "success": False,
                "error": "Password must be at least 8 characters and include uppercase, lowercase, number, and special character."
            }), 400

        if current_password == new_password:
            return jsonify({
                "success": False,
                "error": "New password must be different from the current password."
            }), 400

        user.password = generate_password_hash(new_password)
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Password changed successfully."
        }), 200

    except Exception as e:
        db.session.rollback()
        print("CHANGE PASSWORD ERROR:", e)
        return jsonify({
            "success": False,
            "error": "Unable to change password.",
            "details": str(e)
        }), 500


# ============================================================
# AUTH - LOGOUT
# ============================================================

@app.route("/api/logout", methods=["POST"])
def logout():

    session.clear()

    return jsonify({
        "success": True,
        "message": "Logged out successfully"
    }), 200


# ============================================================
# AUTH - CURRENT USER
# ============================================================

@app.route("/api/me", methods=["GET"])
def current_user():

    user_id = get_current_user_id()

    if not user_id:

        return jsonify({
            "success": True,
            "logged_in": False,
            "user": None
        })

    user = db.session.get(
        User,
        user_id
    )

    if not user:

        session.clear()

        return jsonify({
            "success": True,
            "logged_in": False,
            "user": None
        })

    return jsonify({

        "success": True,

        "logged_in": True,

        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email
        }

    })


# ============================================================
# REVIEW COUNT
# ============================================================

@app.route("/api/review-count", methods=["GET"])
def review_count():

    try:

        user_id = get_current_user_id()

        query = Review.query

        if user_id:
            query = query.filter_by(
                user_id=user_id
            )

        count = query.count()

        return jsonify({

            "success": True,

            "count": count

        })

    except Exception as e:

        print(
            "REVIEW COUNT ERROR:",
            e
        )

        return jsonify({

            "success": False,

            "error":
                "Unable to get review count"

        }), 500


# ============================================================
# CODE REVIEW
# ============================================================

@app.route("/api/review", methods=["POST"])
def review_code():

    try:

        data = request.get_json(
            silent=True
        )

        if not data:

            return jsonify({
                "success": False,
                "error": "Request body is required"
            }), 400

        code = data.get(
            "code",
            ""
        ).strip()

        language = data.get(
            "language",
            "Python"
        )

        if not code:

            return jsonify({
                "success": False,
                "error": "Code is required"
            }), 400

        issues = []

        # ====================================================
        # SECURITY
        # ====================================================

        if re.search(
            r"\beval\s*\(",
            code
        ):

            issues.append({

                "severity": "HIGH",
                "category": "Security",
                "title": "Avoid using eval()",
                "description":
                    "eval() can execute arbitrary code. "
                    "Avoid using it with untrusted input."

            })

        if re.search(
            r"\bexec\s*\(",
            code
        ):

            issues.append({

                "severity": "HIGH",
                "category": "Security",
                "title": "Avoid using exec()",
                "description":
                    "exec() can execute arbitrary code "
                    "and may create security vulnerabilities."

            })

        if re.search(
            r"(password|passwd|secret|api_key|apikey)"
            r"\s*=\s*['\"][^'\"]+['\"]",
            code,
            re.IGNORECASE
        ):

            issues.append({

                "severity": "HIGH",
                "category": "Security",
                "title": "Possible hardcoded secret",
                "description":
                    "Sensitive credentials should not be "
                    "stored directly in source code."

            })

        if re.search(
            r"(sk-[A-Za-z0-9]{20,}|"
            r"ghp_[A-Za-z0-9]{20,})",
            code
        ):

            issues.append({

                "severity": "HIGH",
                "category": "Security",
                "title": "Possible API token detected",
                "description":
                    "Move API tokens to environment "
                    "variables or a secret manager."

            })

        # ====================================================
        # PERFORMANCE
        # ====================================================

        if "while True:" in code:

            issues.append({

                "severity": "MEDIUM",
                "category": "Performance",
                "title": "Potential infinite loop",
                "description":
                    "Check whether the loop has a "
                    "proper exit condition."

            })

        if re.search(
            r"for\s+\w+\s+in\s+range\s*\(\s*len\s*\(",
            code
        ):

            issues.append({

                "severity": "LOW",
                "category": "Performance",
                "title": "Simplify iteration",
                "description":
                    "Consider iterating directly over "
                    "the collection instead of range(len(...))."

            })

        # ====================================================
        # QUALITY
        # ====================================================

        lines = code.splitlines()

        if len(lines) > 100:

            issues.append({

                "severity": "MEDIUM",
                "category": "Code Quality",
                "title": "Large source file",
                "description":
                    "Consider splitting large files into "
                    "smaller modules or functions."

            })

        if "print(" in code:

            issues.append({

                "severity": "LOW",
                "category": "Code Quality",
                "title": "Use proper logging",
                "description":
                    "Use a logging framework instead of "
                    "print() for production applications."

            })

        # ====================================================
        # PYTHON
        # ====================================================

        if language.lower() == "python":

            if "except:" in code:

                issues.append({

                    "severity": "MEDIUM",
                    "category": "Code Quality",
                    "title": "Avoid bare except",
                    "description":
                        "Catch a specific exception type "
                        "instead of every exception."

                })

            try:

                ast.parse(code)

            except SyntaxError as e:

                issues.append({

                    "severity": "HIGH",
                    "category": "Bug",
                    "title": "Python syntax error",
                    "description":
                        f"Syntax error near line "
                        f"{e.lineno}: {e.msg}"

                })

        # ====================================================
        # JAVASCRIPT
        # ====================================================

        if language.lower() in [
            "javascript",
            "js"
        ]:

            if "eval(" in code:

                issues.append({

                    "severity": "HIGH",
                    "category": "Security",
                    "title": "Avoid JavaScript eval()",
                    "description":
                        "eval() can execute arbitrary "
                        "JavaScript code."

                })

            if "console.log(" in code:

                issues.append({

                    "severity": "LOW",
                    "category": "Code Quality",
                    "title": "Remove console.log()",
                    "description":
                        "Avoid unnecessary console logging "
                        "in production code."

                })

        # ====================================================
        # SQL
        # ====================================================

        if language.lower() == "sql":

            if re.search(
                r"select\s+\*",
                code,
                re.IGNORECASE
            ):

                issues.append({

                    "severity": "LOW",
                    "category": "Performance",
                    "title": "Avoid SELECT *",
                    "description":
                        "Select only the columns that "
                        "your application actually needs."

                })

            if re.search(
                r"union\s+select",
                code,
                re.IGNORECASE
            ):

                issues.append({

                    "severity": "MEDIUM",
                    "category": "Security",
                    "title": "Review dynamic SQL",
                    "description":
                        "Use parameterized queries when "
                        "constructing SQL from user input."

                })

        # ====================================================
        # SCORE
        # ====================================================

        score = calculate_score(
            issues
        )

        (
            security_count,
            performance_count,
            bugs_count,
            suggestions_count,
            security_score,
            performance_score
        ) = calculate_category_scores(
            issues
        )

        # ====================================================
        # SAVE
        # ====================================================

        review = Review(

            user_id=get_current_user_id(),

            code=code,

            language=language,

            score=score,

            security_issues=
                security_count,

            performance_issues=
                performance_count,

            bugs=
                bugs_count,

            suggestions=
                suggestions_count

        )

        db.session.add(review)

        db.session.commit()

        return jsonify({

            "success": True,

            "review_id":
                review.id,

            "language":
                language,

            "score":
                score,

            "code_health":
                score,

            "security":
                security_score,

            "performance":
                performance_score,

            "bugs":
                bugs_count,

            "security_issues":
                security_count,

            "performance_issues":
                performance_count,

            "suggestions":
                suggestions_count,

            "total_issues":
                len(issues),

            "issues":
                issues

        }), 200

    except Exception as e:

        db.session.rollback()

        print(
            "CODE REVIEW ERROR:",
            e
        )

        return jsonify({

            "success": False,

            "error":
                "Internal server error",

            "details":
                str(e)

        }), 500


# ============================================================
# REVIEW HISTORY
# ============================================================

@app.route("/api/reviews", methods=["GET"])
def get_reviews():

    try:

        user_id = get_current_user_id()

        query = Review.query

        if user_id:

            query = query.filter_by(
                user_id=user_id
            )

        reviews = query.order_by(
            Review.created_at.desc()
        ).all()

        result = []

        for review in reviews:

            result.append({

                "id":
                    review.id,

                "language":
                    review.language,

                "code":
                    review.code,

                "score":
                    review.score,

                "security_issues":
                    review.security_issues,

                "performance_issues":
                    review.performance_issues,

                "bugs":
                    review.bugs,

                "suggestions":
                    review.suggestions,

                "created_at":
                    review.created_at.isoformat()
                    if review.created_at
                    else None

            })

        return jsonify({

            "success": True,

            "count":
                len(result),

            "reviews":
                result

        })

    except Exception as e:

        print(
            "HISTORY ERROR:",
            e
        )

        return jsonify({

            "success": False,

            "error":
                "Unable to load review history",

            "details":
                str(e)

        }), 500


# ============================================================
# DYNAMIC DASHBOARD
# ============================================================

@app.route("/api/dashboard", methods=["GET"])
def dashboard():

    try:

        user_id = get_current_user_id()

        query = Review.query

        if user_id:
            query = query.filter_by(
                user_id=user_id
            )

        reviews = query.all()

        if not reviews:

            return jsonify({

                "success": True,

                "reviews": 0,

                "code_health": 0,

                "security": 0,

                "performance": 0,

                "bugs": 0,

                "suggestions": 0

            })

        total_reviews = len(reviews)

        average_health = round(
            sum(
                r.score
                for r in reviews
            ) / total_reviews
        )

        security_scores = []

        performance_scores = []

        total_bugs = 0

        total_suggestions = 0

        for r in reviews:

            security_scores.append(
                max(
                    100 -
                    r.security_issues * 15,
                    0
                )
            )

            performance_scores.append(
                max(
                    100 -
                    r.performance_issues * 10,
                    0
                )
            )

            total_bugs += r.bugs

            total_suggestions += r.suggestions

        average_security = round(
            sum(security_scores) /
            len(security_scores)
        )

        average_performance = round(
            sum(performance_scores) /
            len(performance_scores)
        )

        return jsonify({

            "success": True,

            "reviews":
                total_reviews,

            "code_health":
                average_health,

            "security":
                average_security,

            "performance":
                average_performance,

            "bugs":
                total_bugs,

            "suggestions":
                total_suggestions

        })

    except Exception as e:

        print(
            "DASHBOARD ERROR:",
            e
        )

        return jsonify({

            "success": False,

            "error":
                "Unable to calculate dashboard",

            "details":
                str(e)

        }), 500


# ============================================================
# REALISTIC TEST GENERATOR
# ============================================================

def python_function_info(code):

    try:

        tree = ast.parse(code)

    except Exception:

        return None

    for node in ast.walk(tree):

        if isinstance(
            node,
            (
                ast.FunctionDef,
                ast.AsyncFunctionDef
            )
        ):

            arguments = []

            for arg in node.args.args:

                arguments.append(
                    arg.arg
                )

            return {
                "name": node.name,
                "arguments": arguments
            }

    return None


def generate_python_tests(code):

    info = python_function_info(code)

    if not info:

        return {

            "tests": [

                {
                    "name": "Syntax validation",
                    "description":
                        "Checks whether the Python code "
                        "can be parsed successfully."
                },

                {
                    "name": "Basic execution",
                    "description":
                        "Add a function-specific test "
                        "after identifying the callable."
                },

                {
                    "name": "Edge case",
                    "description":
                        "Tests boundary and unusual input."
                }

            ],

            "test_code": """import ast


def test_python_syntax():
    source = '''
# Paste your Python source here
'''
    ast.parse(source)
"""

        }

    name = info["name"]
    args = info["arguments"]

    # --------------------------------------------------------
    # Build sensible values according to argument count
    # --------------------------------------------------------

    normal_values = []

    zero_values = []

    negative_values = []

    large_values = []

    for index, arg in enumerate(args):

        normal_values.append(
            str(index + 2)
        )

        zero_values.append(
            "0"
        )

        negative_values.append(
            str(-(index + 2))
        )

        large_values.append(
            str((index + 1) * 1000)
        )

    normal = ", ".join(
        normal_values
    )

    zeros = ", ".join(
        zero_values
    )

    negatives = ", ".join(
        negative_values
    )

    large = ", ".join(
        large_values
    )

    if len(args) == 0:

        normal = ""
        zeros = ""
        negatives = ""
        large = ""

    test_code = f"""import pytest

# Replace this import with your actual module.
# from your_module import {name}


def test_{name}_normal_case():
    result = {name}({normal})
    assert result is not None


def test_{name}_zero_case():
    result = {name}({zeros})
    assert result is not None


def test_{name}_negative_case():
    result = {name}({negatives})
    assert result is not None


def test_{name}_large_values():
    result = {name}({large})
    assert result is not None


def test_{name}_return_type():
    result = {name}({normal})
    assert result is not None
"""

    tests = [

        {
            "name":
                f"{name} normal case",

            "description":
                "Tests the function with normal values.",

            "input":
                normal
        },

        {
            "name":
                f"{name} zero case",

            "description":
                "Tests the function with zero values.",

            "input":
                zeros
        },

        {
            "name":
                f"{name} negative case",

            "description":
                "Tests behavior with negative values.",

            "input":
                negatives
        },

        {
            "name":
                f"{name} large values",

            "description":
                "Tests behavior with larger values.",

            "input":
                large
        },

        {
            "name":
                f"{name} return value",

            "description":
                "Checks that the function returns a value.",

            "input":
                normal
        }

    ]

    return {
        "tests": tests,
        "test_code": test_code
    }


def generate_javascript_tests(code):

    match = re.search(
        r"(?:function\s+([A-Za-z_$][\w$]*)|"
        r"(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*="
        r"\s*(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>)",
        code
    )

    if match:

        name = (
            match.group(1)
            or match.group(2)
        )

    else:

        name = "yourFunction"

    test_code = f"""describe("{name}", () => {{

    test("normal input", () => {{
        const result = {name}(2, 3);
        expect(result).toBeDefined();
    }});

    test("zero input", () => {{
        const result = {name}(0, 0);
        expect(result).toBeDefined();
    }});

    test("negative input", () => {{
        const result = {name}(-2, -3);
        expect(result).toBeDefined();
    }});

    test("large input", () => {{
        const result = {name}(1000, 2000);
        expect(result).toBeDefined();
    }});

    test("return value", () => {{
        const result = {name}(1, 1);
        expect(result).not.toBeUndefined();
    }});

}});
"""

    tests = [

        {
            "name": "Normal input",
            "description":
                "Tests typical positive input values."
        },

        {
            "name": "Zero input",
            "description":
                "Checks behavior with zero values."
        },

        {
            "name": "Negative input",
            "description":
                "Checks behavior with negative values."
        },

        {
            "name": "Large input",
            "description":
                "Checks behavior with larger values."
        },

        {
            "name": "Return value",
            "description":
                "Checks that a result is returned."
        }

    ]

    return {
        "tests": tests,
        "test_code": test_code
    }


def generate_java_tests(code):

    match = re.search(
        r"(?:public|private|protected)?\s*"
        r"(?:static\s+)?"
        r"[\w<>\[\]]+\s+"
        r"([A-Za-z_]\w*)\s*\(",
        code
    )

    method = (
        match.group(1)
        if match
        else "yourMethod"
    )

    test_code = f"""import static org.junit.jupiter.api.Assertions.*;
import org.junit.jupiter.api.Test;

class GeneratedTest {{

    @Test
    void testNormalCase() {{
        assertTrue(true);
    }}

    @Test
    void testZeroCase() {{
        assertTrue(true);
    }}

    @Test
    void testNegativeCase() {{
        assertTrue(true);
    }}

    @Test
    void testLargeCase() {{
        assertTrue(true);
    }}

    @Test
    void test{method.capitalize()}Result() {{
        assertTrue(true);
    }}
}}
"""

    tests = [

        {
            "name": "Normal case",
            "description":
                "Tests normal input."
        },

        {
            "name": "Zero case",
            "description":
                "Tests zero values."
        },

        {
            "name": "Negative case",
            "description":
                "Tests negative values."
        },

        {
            "name": "Large case",
            "description":
                "Tests larger values."
        },

        {
            "name": "Boundary case",
            "description":
                "Tests a boundary condition."
        }

    ]

    return {
        "tests": tests,
        "test_code": test_code
    }


def generate_cpp_tests(code):

    match = re.search(
        r"(?:int|double|float|string|bool|long|char)"
        r"\s+([A-Za-z_]\w*)\s*\(",
        code
    )

    function_name = (
        match.group(1)
        if match
        else "yourFunction"
    )

    test_code = f"""#include <cassert>
#include <iostream>

// Include your implementation here.

void testNormalCase()
{{
    assert(true);
}}

void testZeroCase()
{{
    assert(true);
}}

void testNegativeCase()
{{
    assert(true);
}}

void testLargeCase()
{{
    assert(true);
}}

int main()
{{
    testNormalCase();
    testZeroCase();
    testNegativeCase();
    testLargeCase();

    std::cout
        << "All generated tests passed."
        << std::endl;

    return 0;
}}
"""

    tests = [

        {
            "name": "Normal case",
            "description":
                "Tests normal input values."
        },

        {
            "name": "Zero case",
            "description":
                "Tests zero values."
        },

        {
            "name": "Negative case",
            "description":
                "Tests negative values."
        },

        {
            "name": "Large case",
            "description":
                "Tests large values."
        }

    ]

    return {
        "tests": tests,
        "test_code": test_code
    }


def generate_sql_tests(code):

    test_code = """-- ==========================================
-- SQL Test Cases
-- ==========================================

-- 1. Basic query execution
SELECT 1 AS test_value;


-- 2. NULL handling
SELECT
    COUNT(*) AS total_rows
FROM (
    SELECT NULL AS test_value
) AS test_data;


-- 3. Duplicate handling
SELECT
    test_value,
    COUNT(*) AS occurrences
FROM (
    SELECT 1 AS test_value
    UNION ALL
    SELECT 1 AS test_value
) AS test_data
GROUP BY test_value;


-- 4. Empty result handling
SELECT *
FROM (
    SELECT 1 AS test_value
) AS test_data
WHERE 1 = 0;
"""

    tests = [

        {
            "name": "Basic query execution",
            "description":
                "Checks whether the query executes."
        },

        {
            "name": "NULL handling",
            "description":
                "Checks NULL-related behavior."
        },

        {
            "name": "Duplicate handling",
            "description":
                "Checks duplicate rows."
        },

        {
            "name": "Empty result",
            "description":
                "Checks behavior when no rows match."
        }

    ]

    return {
        "tests": tests,
        "test_code": test_code
    }


@app.route("/api/generate-tests", methods=["POST"])
def generate_tests():

    try:

        data = request.get_json(
            silent=True
        ) or {}

        code = data.get(
            "code",
            ""
        ).strip()

        language = data.get(
            "language",
            "Python"
        )

        if not code:

            return jsonify({
                "success": False,
                "error": "Code is required"
            }), 400

        language_lower = language.lower()

        if language_lower == "python":

            result = generate_python_tests(
                code
            )

        elif language_lower in [
            "javascript",
            "js"
        ]:

            result = generate_javascript_tests(
                code
            )

        elif language_lower == "java":

            result = generate_java_tests(
                code
            )

        elif language_lower in [
            "c++",
            "cpp"
        ]:

            result = generate_cpp_tests(
                code
            )

        elif language_lower == "sql":

            result = generate_sql_tests(
                code
            )

        else:

            result = {

                "tests": [

                    {
                        "name": "Normal input",
                        "description":
                            "Tests normal input."
                    },

                    {
                        "name": "Empty input",
                        "description":
                            "Tests empty input."
                    },

                    {
                        "name": "Boundary input",
                        "description":
                            "Tests boundary conditions."
                    },

                    {
                        "name": "Invalid input",
                        "description":
                            "Tests invalid input."
                    }

                ],

                "test_code":
                    "# Add language-specific assertions here."

            }

        return jsonify({

            "success": True,

            "message":
                "Realistic test cases generated successfully",

            "language":
                language,

            "test_count":
                len(result["tests"]),

            "count":
                len(result["tests"]),

            "tests":
                result["tests"],

            "test_cases":
                result["tests"],

            "test_code":
                result["test_code"],

            "generated_tests":
                result["test_code"]

        }), 200

    except Exception as e:

        print(
            "TEST GENERATOR ERROR:",
            e
        )

        return jsonify({

            "success": False,

            "error":
                "Unable to generate test cases",

            "details":
                str(e)

        }), 500


# ============================================================
# LEARNING MODE
# ============================================================

@app.route("/api/learning", methods=["POST"])
def learning_mode():

    try:

        data = request.get_json(
            silent=True
        ) or {}

        issue = data.get(
            "issue",
            ""
        ).strip()

        category = data.get(
            "category",
            ""
        )

        if not issue:

            return jsonify({
                "success": False,
                "error": "Issue is required"
            }), 400

        issue_lower = issue.lower()

        explanation = {
            "why":
                "This issue can make your code harder "
                "to maintain or less secure.",

            "fix":
                "Review the affected code and replace "
                "the problematic pattern with a safer "
                "and clearer implementation.",

            "example":
                "Use explicit validation, clear "
                "functions and specific error handling."
        }

        if "eval" in issue_lower:

            explanation = {

                "why":
                    "eval() can execute dynamically "
                    "provided Python expressions. "
                    "If the input is controlled by a user, "
                    "malicious code may be executed.",

                "fix":
                    "Avoid eval(). Use explicit parsing "
                    "or a safe mapping of allowed values.",

                "example":
                    """# Unsafe
value = eval(user_input)

# Safer approach
allowed = {
    "one": 1,
    "two": 2
}

value = allowed.get(user_input)"""

            }

        elif "exec" in issue_lower:

            explanation = {

                "why":
                    "exec() executes dynamically generated "
                    "Python code and can introduce serious "
                    "security problems.",

                "fix":
                    "Replace dynamic execution with normal "
                    "functions, dictionaries or explicit "
                    "control flow.",

                "example":
                    """# Prefer normal functions

def add(a, b):
    return a + b"""

            }

        elif (
            "password" in issue_lower
            or "secret" in issue_lower
            or "token" in issue_lower
        ):

            explanation = {

                "why":
                    "Hardcoded credentials can accidentally "
                    "be committed to Git repositories.",

                "fix":
                    "Use environment variables or a "
                    "dedicated secret manager.",

                "example":
                    """import os

password = os.getenv("APP_PASSWORD")"""

            }

        elif "bare except" in issue_lower:

            explanation = {

                "why":
                    "A bare except catches almost every "
                    "exception, including errors that your "
                    "program may not be prepared to handle.",

                "fix":
                    "Catch the specific exception that "
                    "you expect.",

                "example":
                    """try:
    number = int(value)
except ValueError:
    print("Invalid number")"""

            }

        elif "print" in issue_lower:

            explanation = {

                "why":
                    "print() is useful during development "
                    "but provides limited control over "
                    "production logging.",

                "fix":
                    "Use Python's logging module.",

                "example":
                    """import logging

logging.basicConfig(level=logging.INFO)

logging.info("Application started")"""

            }

        elif "select *" in issue_lower:

            explanation = {

                "why":
                    "SELECT * retrieves every column, "
                    "which can increase data transfer and "
                    "make queries less explicit.",

                "fix":
                    "Select only the columns your application "
                    "needs.",

                "example":
                    """SELECT id, name, email
FROM users;"""

            }

        return jsonify({

            "success": True,

            "issue":
                issue,

            "category":
                category,

            "lesson":
                explanation,

            "why":
                explanation["why"],

            "how_to_fix":
                explanation["fix"],

            "example":
                explanation["example"]

        })

    except Exception as e:

        print(
            "LEARNING ERROR:",
            e
        )

        return jsonify({

            "success": False,

            "error":
                "Learning mode failed",

            "details":
                str(e)

        }), 500


# ============================================================
# GITHUB HELPERS
# ============================================================

def github_headers():

    headers = {

        "Accept":
            "application/vnd.github+json",

        "User-Agent":
            "AI-Code-Reviewer"

    }

    token = os.getenv(
        "GITHUB_TOKEN"
    )

    if token:

        headers["Authorization"] = (
            f"Bearer {token}"
        )

    return headers


def analyze_diff_patch(patch, filename):

    issues = []

    if not patch:

        return issues

    added_lines = []

    for line in patch.splitlines():

        if line.startswith("+"):

            if not line.startswith("+++"):

                added_lines.append(
                    line[1:]
                )

    added_code = "\n".join(
        added_lines
    )

    # --------------------------------------------------------
    # SECURITY
    # --------------------------------------------------------

    if re.search(
        r"\beval\s*\(",
        added_code
    ):

        issues.append({

            "severity": "HIGH",
            "category": "Security",
            "title":
                f"eval() detected in {filename}",
            "description":
                "The PR adds eval(), which can execute "
                "arbitrary code."

        })

    if re.search(
        r"\bexec\s*\(",
        added_code
    ):

        issues.append({

            "severity": "HIGH",
            "category": "Security",
            "title":
                f"exec() detected in {filename}",
            "description":
                "The PR adds exec(), which can execute "
                "dynamic code."

        })

    if re.search(
        r"(password|secret|api_key|apikey|token)"
        r"\s*[:=]\s*['\"][^'\"]+['\"]",
        added_code,
        re.IGNORECASE
    ):

        issues.append({

            "severity": "HIGH",
            "category": "Security",
            "title":
                f"Possible hardcoded secret in {filename}",
            "description":
                "The changed code appears to contain "
                "a hardcoded credential or secret."

        })

    # --------------------------------------------------------
    # PERFORMANCE
    # --------------------------------------------------------

    if "while True:" in added_code:

        issues.append({

            "severity": "MEDIUM",
            "category": "Performance",
            "title":
                f"Potential infinite loop in {filename}",
            "description":
                "Review the new loop and make sure "
                "it has a valid exit condition."

        })

    if re.search(
        r"for\s+\w+\s+in\s+range\s*\(\s*len\s*\(",
        added_code
    ):

        issues.append({

            "severity": "LOW",
            "category": "Performance",
            "title":
                f"range(len(...)) pattern in {filename}",
            "description":
                "Consider direct iteration over "
                "the collection."

        })

    # --------------------------------------------------------
    # QUALITY
    # --------------------------------------------------------

    if "print(" in added_code:

        issues.append({

            "severity": "LOW",
            "category": "Code Quality",
            "title":
                f"print() added in {filename}",
            "description":
                "Consider using structured logging "
                "instead of print()."

        })

    if len(added_lines) > 200:

        issues.append({

            "severity": "MEDIUM",
            "category": "Code Quality",
            "title":
                f"Large change in {filename}",
            "description":
                "This file contains a large number "
                "of added lines. Consider smaller PRs."

        })

    # --------------------------------------------------------
    # PYTHON
    # --------------------------------------------------------

    if filename.endswith(".py"):

        try:

            ast.parse(
                added_code
            )

        except Exception:
            pass

    return issues


# ============================================================
# GITHUB PULL REQUEST REVIEW
# ============================================================

@app.route("/api/github-pr", methods=["POST"])
def github_pr():

    try:

        data = request.get_json(
            silent=True
        ) or {}

        url = data.get(
            "url",
            ""
        ).strip()

        if not url:

            return jsonify({

                "success": False,

                "error":
                    "GitHub PR URL is required"

            }), 400

        pattern = (
            r"^https?://github\.com/"
            r"([^/]+)/([^/]+)/pull/(\d+)/?$"
        )

        match = re.match(
            pattern,
            url
        )

        if not match:

            return jsonify({

                "success": False,

                "error":
                    "Invalid GitHub Pull Request URL"

            }), 400

        owner = match.group(1)

        repo = match.group(2)

        pr_number = int(
            match.group(3)
        )

        headers = github_headers()

        # ====================================================
        # PR INFORMATION
        # ====================================================

        api_url = (
            f"https://api.github.com/repos/"
            f"{owner}/{repo}/pulls/"
            f"{pr_number}"
        )

        response = requests.get(
            api_url,
            headers=headers,
            timeout=20
        )

        if response.status_code != 200:

            return jsonify({

                "success": False,

                "error":
                    "GitHub Pull Request not found",

                "status":
                    response.status_code

            }), response.status_code

        pr = response.json()

        # ====================================================
        # ACTUAL CHANGED FILES
        # ====================================================

        files_url = (
            f"https://api.github.com/repos/"
            f"{owner}/{repo}/pulls/"
            f"{pr_number}/files"
        )

        files_response = requests.get(
            files_url,
            headers=headers,
            timeout=20
        )

        if files_response.status_code != 200:

            return jsonify({

                "success": False,

                "error":
                    "Unable to fetch PR changed files",

                "status":
                    files_response.status_code

            }), files_response.status_code

        files = files_response.json()

        all_issues = []

        file_results = []

        total_additions = 0
        total_deletions = 0

        # ====================================================
        # ANALYZE EVERY CHANGED FILE
        # ====================================================

        for file in files:

            filename = file.get(
                "filename",
                "unknown"
            )

            status = file.get(
                "status",
                "modified"
            )

            additions = file.get(
                "additions",
                0
            )

            deletions = file.get(
                "deletions",
                0
            )

            patch = file.get(
                "patch",
                ""
            )

            total_additions += additions

            total_deletions += deletions

            file_issues = analyze_diff_patch(
                patch,
                filename
            )

            all_issues.extend(
                file_issues
            )

            file_results.append({

                "filename":
                    filename,

                "status":
                    status,

                "additions":
                    additions,

                "deletions":
                    deletions,

                "changes":
                    file.get(
                        "changes",
                        additions + deletions
                    ),

                "issues":
                    file_issues,

                "patch_available":
                    bool(patch),

                "url":
                    file.get(
                        "blob_url"
                    )

            })

        # ====================================================
        # PR SCORE
        # ====================================================

        score = calculate_score(
            all_issues
        )

        (
            security_count,
            performance_count,
            bugs_count,
            suggestions_count,
            security_score,
            performance_score
        ) = calculate_category_scores(
            all_issues
        )

        # ====================================================
        # SAVE GITHUB REVIEW
        # ====================================================

        github_review = GitHubReview(

            user_id=
                get_current_user_id(),

            repository=
                f"{owner}/{repo}",

            pr_number=
                pr_number,

            title=
                pr.get("title"),

            author=
                (
                    pr.get(
                        "user",
                        {}
                    ).get(
                        "login"
                    )
                    if pr.get("user")
                    else None
                ),

            files_changed=
                pr.get(
                    "changed_files",
                    len(files)
                ),

            additions=
                total_additions,

            deletions=
                total_deletions,

            score=
                score,

            issues=
                str(all_issues),

            url=
                pr.get("html_url")

        )

        db.session.add(
            github_review
        )

        db.session.commit()

        return jsonify({

            "success": True,

            "repository":
                f"{owner}/{repo}",

            "pr_number":
                pr_number,

            "title":
                pr.get("title"),

            "author":
                (
                    pr.get(
                        "user",
                        {}
                    ).get(
                        "login"
                    )
                    if pr.get("user")
                    else None
                ),

            "files_changed":
                pr.get(
                    "changed_files",
                    len(files)
                ),

            "additions":
                total_additions,

            "deletions":
                total_deletions,

            "url":
                pr.get("html_url"),

            "state":
                pr.get("state"),

            "merged":
                pr.get(
                    "merged",
                    False
                ),

            # =================================================
            # NEW ACTUAL REVIEW DATA
            # =================================================

            "score":
                score,

            "code_health":
                score,

            "security":
                security_score,

            "performance":
                performance_score,

            "bugs":
                bugs_count,

            "suggestions":
                suggestions_count,

            "total_issues":
                len(all_issues),

            "issues":
                all_issues,

            "files":
                file_results

        }), 200

    except requests.exceptions.Timeout:

        return jsonify({

            "success": False,

            "error":
                "GitHub request timed out"

        }), 504

    except requests.exceptions.RequestException as e:

        db.session.rollback()

        print(
            "GITHUB REQUEST ERROR:",
            e
        )

        return jsonify({

            "success": False,

            "error":
                "Unable to connect to GitHub",

            "details":
                str(e)

        }), 500

    except Exception as e:

        db.session.rollback()

        print(
            "GITHUB PR ERROR:",
            e
        )

        return jsonify({

            "success": False,

            "error":
                "GitHub PR analysis failed",

            "details":
                str(e)

        }), 500


# ============================================================
# GITHUB REVIEW HISTORY
# ============================================================

@app.route("/api/github-reviews", methods=["GET"])
def github_reviews():

    try:

        user_id = get_current_user_id()

        query = GitHubReview.query

        if user_id:

            query = query.filter_by(
                user_id=user_id
            )

        reviews = query.order_by(
            GitHubReview.created_at.desc()
        ).all()

        result = []

        for review in reviews:

            result.append({

                "id":
                    review.id,

                "repository":
                    review.repository,

                "pr_number":
                    review.pr_number,

                "title":
                    review.title,

                "author":
                    review.author,

                "files_changed":
                    review.files_changed,

                "additions":
                    review.additions,

                "deletions":
                    review.deletions,

                "score":
                    review.score,

                "url":
                    review.url,

                "created_at":
                    review.created_at.isoformat()
                    if review.created_at
                    else None

            })

        return jsonify({

            "success": True,

            "count":
                len(result),

            "reviews":
                result

        })

    except Exception as e:

        print(
            "GITHUB HISTORY ERROR:",
            e
        )

        return jsonify({

            "success": False,

            "error":
                "Unable to load GitHub history",

            "details":
                str(e)

        }), 500


# ============================================================
# LEARNING FROM REVIEW
# ============================================================

@app.route("/api/learning/review/<int:review_id>", methods=["GET"])
def learning_from_review(review_id):

    try:

        review = db.session.get(
            Review,
            review_id
        )

        if not review:

            return jsonify({

                "success": False,

                "error":
                    "Review not found"

            }), 404

        explanations = []

        # ----------------------------------------------------
        # SECURITY
        # ----------------------------------------------------

        if review.security_issues > 0:

            explanations.append({

                "topic":
                    "Security",

                "explanation":
                    "Security issues can expose "
                    "your application to attacks.",

                "tip":
                    "Never hardcode secrets and avoid "
                    "unsafe dynamic code execution."

            })

        # ----------------------------------------------------
        # PERFORMANCE
        # ----------------------------------------------------

        if review.performance_issues > 0:

            explanations.append({

                "topic":
                    "Performance",

                "explanation":
                    "Performance issues can make "
                    "applications slower.",

                "tip":
                    "Use efficient algorithms and "
                    "avoid unnecessary loops or work."

            })

        # ----------------------------------------------------
        # BUGS
        # ----------------------------------------------------

        if review.bugs > 0:

            explanations.append({

                "topic":
                    "Bugs",

                "explanation":
                    "Bugs can cause incorrect results "
                    "or application failures.",

                "tip":
                    "Validate inputs and write tests "
                    "for normal and edge cases."

            })

        # ----------------------------------------------------
        # SUGGESTIONS
        # ----------------------------------------------------

        if review.suggestions > 0:

            explanations.append({

                "topic":
                    "Code Quality",

                "explanation":
                    "Clean code is easier to understand "
                    "and maintain.",

                "tip":
                    "Use meaningful names, small functions "
                    "and proper logging."

            })

        return jsonify({

            "success":
                True,

            "review_id":
                review.id,

            "score":
                review.score,

            "lessons":
                explanations

        })

    except Exception as e:

        print(
            "LEARNING REVIEW ERROR:",
            e
        )

        return jsonify({

            "success": False,

            "error":
                "Unable to generate learning content",

            "details":
                str(e)

        }), 500


# ============================================================
# DELETE REVIEW
# ============================================================

@app.route(
    "/api/reviews/<int:review_id>",
    methods=["DELETE"]
)
def delete_review(review_id):

    try:

        review = db.session.get(
            Review,
            review_id
        )

        if not review:

            return jsonify({

                "success": False,

                "error":
                    "Review not found"

            }), 404

        user_id = get_current_user_id()

        if (
            user_id
            and review.user_id
            and review.user_id != user_id
        ):

            return jsonify({

                "success": False,

                "error":
                    "Unauthorized"

            }), 403

        db.session.delete(
            review
        )

        db.session.commit()

        return jsonify({

            "success":
                True,

            "message":
                "Review deleted successfully"

        })

    except Exception as e:

        db.session.rollback()

        print(
            "DELETE REVIEW ERROR:",
            e
        )

        return jsonify({

            "success": False,

            "error":
                "Unable to delete review",

            "details":
                str(e)

        }), 500


# ============================================================
# DATABASE INFO
# ============================================================

@app.route("/api/database-status", methods=["GET"])
def database_status():

    try:

        users = User.query.count()

        reviews = Review.query.count()

        github_reviews_count = (
            GitHubReview.query.count()
        )

        return jsonify({

            "success":
                True,

            "database":
                "SQLite",

            "status":
                "Connected",

            "users":
                users,

            "reviews":
                reviews,

            "github_reviews":
                github_reviews_count

        })

    except Exception as e:

        return jsonify({

            "success":
                False,

            "database":
                "SQLite",

            "status":
                "Error",

            "error":
                str(e)

        }), 500


# ============================================================
# AUTO-FIX / FILE UPLOAD / DETAILED EXPLANATION
# ============================================================

SUPPORTED_SOURCE_EXTENSIONS = {
    ".py": "Python",
    ".js": "JavaScript",
    ".jsx": "JavaScript",
    ".ts": "JavaScript",
    ".tsx": "JavaScript",
    ".java": "Java",
    ".c": "C++",
    ".h": "C++",
    ".cpp": "C++",
    ".cc": "C++",
    ".cxx": "C++",
    ".hpp": "C++",
    ".sql": "SQL",
}


def analyze_uploaded_code(code, language):
    """Lightweight analysis used for uploaded files without creating a DB row."""
    issues = []
    language_lower = str(language or "Python").lower()

    if re.search(r"\beval\s*\(", code):
        issues.append({
            "severity": "HIGH",
            "category": "Security",
            "title": "Avoid using eval()",
            "description": "eval() can execute arbitrary code. Avoid it with untrusted input.",
        })

    if re.search(r"\bexec\s*\(", code):
        issues.append({
            "severity": "HIGH",
            "category": "Security",
            "title": "Avoid using exec()",
            "description": "exec() can execute arbitrary code and may create security vulnerabilities.",
        })

    if re.search(r"(password|passwd|secret|api_key|apikey)\s*=\s*['\"][^'\"]+['\"]", code, re.IGNORECASE):
        issues.append({
            "severity": "HIGH",
            "category": "Security",
            "title": "Possible hardcoded secret",
            "description": "Sensitive credentials should not be stored directly in source code.",
        })

    if re.search(r"(sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{20,})", code):
        issues.append({
            "severity": "HIGH",
            "category": "Security",
            "title": "Possible API token detected",
            "description": "Move API tokens to environment variables or a secret manager.",
        })

    if "while True:" in code:
        issues.append({
            "severity": "MEDIUM",
            "category": "Performance",
            "title": "Potential infinite loop",
            "description": "Check whether the loop has a proper exit condition.",
        })

    if re.search(r"for\s+\w+\s+in\s+range\s*\(\s*len\(", code):
        issues.append({
            "severity": "LOW",
            "category": "Performance",
            "title": "Simplify iteration",
            "description": "Consider iterating directly over the collection instead of range(len(...)).",
        })

    if language_lower == "python":
        if re.search(r"except\s*:", code):
            issues.append({
                "severity": "LOW",
                "category": "Code Quality",
                "title": "Avoid bare except",
                "description": "Catch a specific exception type instead of every exception.",
            })
        try:
            ast.parse(code)
        except SyntaxError as e:
            issues.append({
                "severity": "HIGH",
                "category": "Bug",
                "title": "Python syntax error",
                "description": f"Syntax error near line {e.lineno}: {e.msg}",
            })

    if language_lower in {"javascript", "js"}:
        if re.search(r"eval\s*\(", code):
            issues.append({
                "severity": "HIGH",
                "category": "Security",
                "title": "Avoid JavaScript eval()",
                "description": "eval() can execute arbitrary JavaScript code.",
            })
        if "console.log(" in code:
            issues.append({
                "severity": "LOW",
                "category": "Code Quality",
                "title": "Remove console.log()",
                "description": "Avoid unnecessary console logging in production code.",
            })

    if language_lower == "sql":
        if re.search(r"select\s+\*", code, re.IGNORECASE):
            issues.append({
                "severity": "LOW",
                "category": "Performance",
                "title": "Avoid SELECT *",
                "description": "Select only the columns that your application actually needs.",
            })
        if re.search(r"union\s+select", code, re.IGNORECASE):
            issues.append({
                "severity": "MEDIUM",
                "category": "Security",
                "title": "Review dynamic SQL",
                "description": "Use parameterized queries when constructing SQL from user input.",
            })

    score = calculate_score(issues)
    return {
        "language": language,
        "score": score,
        "code_health": score,
        "total_issues": len(issues),
        "bugs": sum(1 for x in issues if x.get("category") == "Bug" or x.get("severity") == "HIGH"),
        "security_issues": sum(1 for x in issues if x.get("category") == "Security"),
        "performance_issues": sum(1 for x in issues if x.get("category") == "Performance"),
        "suggestions": sum(1 for x in issues if x.get("severity") == "LOW" or x.get("category") == "Code Quality"),
        "issues": issues,
    }


@app.route("/api/auto-fix", methods=["POST"])
def auto_fix_code():
    try:
        data = request.get_json(silent=True) or {}
        code = str(data.get("code", "")).strip()
        language = data.get("language", "Python")
        if not code:
            return jsonify({"success": False, "error": "Code is required"}), 400

        fixed = code
        changes = []
        unfixed = []
        lang = str(language).lower()

        if lang == "python" and re.search(r"\beval\s*\(", fixed):
            new_fixed = re.sub(r"\beval\s*\(", "ast.literal_eval(", fixed)
            if new_fixed != fixed:
                fixed = new_fixed
                if "import ast" not in fixed:
                    fixed = "import ast\n\n" + fixed
                changes.append({
                    "title": "Replaced Python eval()",
                    "description": "Used ast.literal_eval() for safer literal parsing. Verify the expected input format.",
                })

        secret_pattern = re.compile(r"((?:password|passwd|secret|api_key|apikey)\s*=\s*)['\"]([^'\"]+)['\"]", re.IGNORECASE)
        if secret_pattern.search(fixed):
            fixed = secret_pattern.sub(lambda m: m.group(1) + "os.getenv(\"" + re.sub(r"\W+", "_", m.group(1).split("=")[0].strip()).upper() + "\")", fixed)
            if "import os" not in fixed:
                fixed = "import os\n" + fixed
            changes.append({
                "title": "Moved hardcoded secret to environment variable",
                "description": "The value is now read from an environment variable. Set the variable before running the program.",
            })

        if lang in {"javascript", "js"} and "console.log(" in fixed:
            fixed = re.sub(r"^\s*console\.log\([^\n]*\);?\s*$\n?", "", fixed, flags=re.MULTILINE)
            changes.append({
                "title": "Removed console.log()",
                "description": "Removed standalone debug logging lines from the JavaScript source.",
            })

        if re.search(r"\bexec\s*\(", code):
            unfixed.append("exec() usage")
        if "while True:" in code:
            unfixed.append("while True loop")
        if lang == "sql" and re.search(r"select\s+\*", code, re.IGNORECASE):
            unfixed.append("SELECT * (column names are required for a safe automatic replacement)")

        return jsonify({
            "success": True,
            "language": language,
            "original_code": code,
            "fixed_code": fixed,
            "changes": changes,
            "unfixed": unfixed,
            "changed": fixed != code,
            "message": "Safe automatic fixes generated. Review the result before using it in production." if changes else "No safe automatic fix was available for the detected issues.",
        }), 200
    except Exception as e:
        print("AUTO-FIX ERROR:", e)
        return jsonify({"success": False, "error": "Unable to generate automatic fix", "details": str(e)}), 500


@app.route("/api/explain-issue", methods=["POST"])
def explain_issue():
    try:
        data = request.get_json(silent=True) or {}
        issue = data.get("issue") or {}
        title = str(issue.get("title", "Code issue"))
        category = str(issue.get("category", "Code Quality"))
        severity = str(issue.get("severity", "INFO"))
        description = str(issue.get("description", "Review this section of code."))

        explanations = {
            "Avoid using eval()": (
                "eval() executes a string as code, so untrusted input can become executable code.",
                "An attacker may supply unexpected expressions and gain code execution in the application's process.",
                "Prefer normal parsing. In Python, use ast.literal_eval() when you only need Python literals; otherwise validate and parse the expected format explicitly.",
                "import ast\nvalue = ast.literal_eval(user_text)",
            ),
            "Avoid using exec()": (
                "exec() turns a string into executable code at runtime.",
                "If the string is influenced by a user or external source, arbitrary code can run with the application's permissions.",
                "Remove dynamic execution and replace it with explicit functions, mappings, or a safe parser.",
                "handlers = {\"sum\": calculate_sum}\nresult = handlers[action](a, b)",
            ),
            "Possible hardcoded secret": (
                "A credential is written directly into source code.",
                "Anyone who gets the repository, build artifact, screenshot, or logs may obtain the secret. Secrets can also be accidentally committed to Git.",
                "Read secrets from environment variables or a secret manager and rotate any credential that was already exposed.",
                "import os\nAPI_KEY = os.getenv(\"API_KEY\")",
            ),
            "Potential infinite loop": (
                "while True creates a loop with no visible termination condition.",
                "The process can consume CPU indefinitely or hang a request if the exit condition is never reached.",
                "Add a clear break condition, a bounded loop, or a timeout appropriate for the task.",
                "while condition:\n    work()\n    if finished:\n        break",
            ),
            "Avoid bare except": (
                "A bare except catches almost every exception, including errors you may not intend to hide.",
                "It can mask real bugs and make debugging and monitoring much harder.",
                "Catch the specific exception types you expect and handle or log them deliberately.",
                "try:\n    value = int(text)\nexcept ValueError:\n    value = 0",
            ),
            "Remove console.log()": (
                "console.log() is normally used for temporary debugging output.",
                "Leaving debug logs in production can expose internal information and create noisy browser or server logs.",
                "Remove unnecessary logs or replace them with a controlled logging system with appropriate levels.",
                "const logger = { info: (message) => sendToLogger(message) };",
            ),
            "Avoid SELECT *": (
                "SELECT * requests every column from a table.",
                "It can transfer unnecessary data, increase query cost, and make code fragile when the table schema changes.",
                "Select only the columns the application needs.",
                "SELECT id, name, email\nFROM users;",
            ),
        }

        if title in explanations:
            what, why, how, example = explanations[title]
        else:
            what = description
            why = f"This {category.lower()} issue has {severity.lower()} severity and should be reviewed before production use."
            how = "Inspect the affected code, validate inputs, handle errors explicitly, and apply the recommendation shown by the code review."
            example = "Review the affected line and replace the risky pattern with an explicit, validated implementation."

        return jsonify({
            "success": True,
            "title": title,
            "category": category,
            "severity": severity,
            "what": what,
            "why": why,
            "how": how,
            "example": example,
        }), 200
    except Exception as e:
        print("EXPLANATION ERROR:", e)
        return jsonify({"success": False, "error": "Unable to generate explanation", "details": str(e)}), 500


@app.route("/api/upload-review", methods=["POST"])
def upload_review():
    try:
        uploaded = request.files.get("file")
        if not uploaded or not uploaded.filename:
            return jsonify({"success": False, "error": "Please select a source file or ZIP file."}), 400

        filename = secure_filename(uploaded.filename)
        if not filename:
            return jsonify({"success": False, "error": "Invalid filename."}), 400

        raw = uploaded.read()
        if len(raw) > 5 * 1024 * 1024:
            return jsonify({"success": False, "error": "File is too large. Maximum size is 5 MB."}), 413

        files = []
        if filename.lower().endswith(".zip"):
            try:
                with zipfile.ZipFile(io.BytesIO(raw)) as zf:
                    members = [m for m in zf.infolist() if not m.is_dir()]
                    source_members = []
                    for member in members:
                        safe_name = member.filename.replace("\\", "/")
                        if safe_name.startswith("__MACOSX/") or "/node_modules/" in f"/{safe_name}" or "/.git/" in f"/{safe_name}":
                            continue
                        ext = os.path.splitext(safe_name)[1].lower()
                        if ext in SUPPORTED_SOURCE_EXTENSIONS:
                            source_members.append(member)
                    if len(source_members) > 20:
                        return jsonify({"success": False, "error": "ZIP may contain at most 20 source files."}), 400
                    total_uncompressed = 0
                    for member in source_members:
                        if member.file_size > 1024 * 1024:
                            continue
                        total_uncompressed += member.file_size
                        if total_uncompressed > 5 * 1024 * 1024:
                            break
                        try:
                            text = zf.read(member).decode("utf-8")
                        except UnicodeDecodeError:
                            continue
                        ext = os.path.splitext(member.filename)[1].lower()
                        files.append({
                            "filename": member.filename,
                            "language": SUPPORTED_SOURCE_EXTENSIONS[ext],
                            "code": text,
                        })
            except zipfile.BadZipFile:
                return jsonify({"success": False, "error": "The uploaded ZIP file is invalid."}), 400
        else:
            ext = os.path.splitext(filename)[1].lower()
            if ext not in SUPPORTED_SOURCE_EXTENSIONS:
                return jsonify({"success": False, "error": "Unsupported file type."}), 400
            try:
                text = raw.decode("utf-8")
            except UnicodeDecodeError:
                return jsonify({"success": False, "error": "The source file must be UTF-8 text."}), 400
            files.append({"filename": filename, "language": SUPPORTED_SOURCE_EXTENSIONS[ext], "code": text})

        if not files:
            return jsonify({"success": False, "error": "No supported source files were found."}), 400

        analyzed = []
        for item in files:
            result = analyze_uploaded_code(item["code"], item["language"])
            analyzed.append({
                "filename": item["filename"],
                "language": item["language"],
                "score": result["score"],
                "total_issues": result["total_issues"],
                "issues": result["issues"],
            })

        first = files[0]
        first_result = analyze_uploaded_code(first["code"], first["language"])
        return jsonify({
            "success": True,
            "message": f"Analyzed {len(analyzed)} source file(s) successfully.",
            "files_analyzed": len(analyzed),
            "files": analyzed,
            "code": first["code"] if len(analyzed) == 1 else "",
            "language": first["language"] if len(analyzed) == 1 else "Python",
            "review": first_result if len(analyzed) == 1 else None,
        }), 200
    except Exception as e:
        print("UPLOAD REVIEW ERROR:", e)
        return jsonify({"success": False, "error": "Unable to analyze uploaded file", "details": str(e)}), 500


# ============================================================
# ERROR HANDLERS
# ============================================================

@app.errorhandler(404)
def not_found(error):

    return jsonify({

        "success":
            False,

        "error":
            "API endpoint not found"

    }), 404


@app.errorhandler(405)
def method_not_allowed(error):

    return jsonify({

        "success":
            False,

        "error":
            "HTTP method not allowed"

    }), 405


# ============================================================
# RUN SERVER
# ============================================================

if __name__ == "__main__":

    print("=" * 60)
    print("AI CODE REVIEWER BACKEND")
    print("=" * 60)
    print("Server: http://127.0.0.1:5000")
    print("Database: SQLite")
    print("Code Review: ENABLED")
    print("Test Generator: ENABLED")
    print("Learning Mode: ENABLED")
    print("Dashboard: ENABLED")
    print("GitHub PR Review: ENABLED")
    print("Login/Signup: ENABLED")
    print("=" * 60)

    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )

# ============================================================
# AI CHAT ASSISTANT
# ============================================================

@app.route("/api/ai-chat", methods=["POST"])
def ai_chat():
    """AI coding assistant. Uses an OpenAI-compatible API when configured,
    with a useful local fallback when no API key is available."""
    try:
        data = request.get_json(silent=True) or {}
        message = str(data.get("message", "")).strip()
        language = str(data.get("language", "Python"))
        code = str(data.get("code", ""))
        review = data.get("review") or {}
        history = data.get("history") or []

        if not message:
            return jsonify({"success": False, "error": "Please enter a message."}), 400
        if len(message) > 4000:
            return jsonify({"success": False, "error": "Message is too long. Maximum 4000 characters."}), 400

        api_key = os.getenv("OPENAI_API_KEY", "").strip()
        api_url = os.getenv("OPENAI_API_URL", "https://api.openai.com/v1/chat/completions").strip()
        model = os.getenv("OPENAI_MODEL", "gpt-4o-mini").strip()

        system_prompt = """You are CodeReviewerAI Assistant, a helpful software-engineering tutor and code-review assistant.
Give accurate, practical answers. Prefer concise explanations with examples.
When reviewing code, discuss bugs, security, performance, readability and testing.
Never claim that code was executed unless it actually was. If the user asks for a fix, provide corrected code when possible.
"""

        context_parts = [f"Selected language: {language}"]
        if code:
            context_parts.append("Current code:\n" + code[:12000])
        if review:
            context_parts.append("Latest review result:\n" + str(review)[:10000])
        context = "\n\n".join(context_parts)

        if api_key:
            messages = [{"role": "system", "content": system_prompt + "\n\nContext:\n" + context}]
            for item in history[-10:]:
                role = item.get("role") if isinstance(item, dict) else None
                content = item.get("content") if isinstance(item, dict) else None
                if role in {"user", "assistant"} and content:
                    messages.append({"role": role, "content": str(content)[:6000]})
            if not messages or messages[-1].get("content") != message:
                messages.append({"role": "user", "content": message})

            api_response = requests.post(
                api_url,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": model,
                    "messages": messages,
                    "temperature": 0.2,
                },
                timeout=60,
            )
            if not api_response.ok:
                try:
                    error_data = api_response.json()
                    error_message = error_data.get("error", {}).get("message", "AI provider request failed")
                except Exception:
                    error_message = "AI provider request failed"
                return jsonify({"success": False, "error": error_message}), 502

            result = api_response.json()
            reply = result.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
            if not reply:
                return jsonify({"success": False, "error": "The AI provider returned an empty response."}), 502
            return jsonify({"success": True, "reply": reply, "provider": "AI"}), 200

        # Local fallback: useful even before an external AI key is configured.
        lower = message.lower()
        reply = None
        if "eval" in lower or "eval(" in code:
            reply = ("`eval()` can execute dynamically supplied code and is risky with untrusted input. "
                     "For Python literals, prefer `ast.literal_eval()`; for other input, validate and parse the expected format explicitly.")
        elif "security" in lower or "secure" in lower:
            reply = ("For security, check hardcoded secrets, dynamic execution (`eval`/`exec`), unvalidated input, SQL construction, "
                     "authentication and authorization. I can review your current code if you paste it into Code Review.")
        elif "test" in lower:
            reply = (f"For {language}, start with normal cases, boundary values, invalid input and failure cases. "
                     "You can also open Test Generator and generate test cases directly from your current function.")
        elif "explain" in lower and code:
            lines = len(code.splitlines())
            reply = (f"Your current {language} code has about {lines} lines. I can explain it section-by-section. "
                     "For a detailed issue explanation, use Code Review and open Detailed Explanation on the detected issue.")
        elif "fix" in lower and code:
            reply = ("I can help fix the current code. For safe automatic fixes, open Code Review and use Auto-Fix Code; "
                     "then review the generated result before using it in production.")
        else:
            reply = ("I’m ready to help with coding, debugging, security, performance, testing and learning. "
                     "For the strongest answer, include the relevant code and tell me what you want to achieve.")

        return jsonify({
            "success": True,
            "reply": reply,
            "provider": "Local Assistant",
            "note": "Set OPENAI_API_KEY to enable full AI-powered chat responses.",
        }), 200
    except requests.RequestException as e:
        print("AI CHAT PROVIDER ERROR:", e)
        return jsonify({"success": False, "error": "Unable to reach the AI provider."}), 502
    except Exception as e:
        print("AI CHAT ERROR:", e)
        return jsonify({"success": False, "error": "Unable to process AI Chat", "details": str(e)}), 500
