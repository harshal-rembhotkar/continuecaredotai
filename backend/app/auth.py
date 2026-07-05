"""
Lightweight user management for ContinueCare.ai

Patients self-register. Hospital doctors are provisioned from a fixed roster
(see hospital_staff.py) and may only log in with @continuecare.com emails.
"""

from __future__ import annotations

import hashlib
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import Header, HTTPException

from .hospital_staff import (
    get_hospital_doctor,
    get_hospital_doctor_by_id,
    is_hospital_email,
    list_hospital_doctors,
    verify_hospital_doctor_password,
)

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
USERS_FILE = DATA_DIR / "users.json"

_sessions: dict[str, str] = {}


def _ensure_data_dir():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if not USERS_FILE.exists():
        USERS_FILE.write_text("[]")


def _load_users() -> list[dict[str, Any]]:
    _ensure_data_dir()
    return json.loads(USERS_FILE.read_text())


def _save_users(users: list[dict[str, Any]]):
    _ensure_data_dir()
    USERS_FILE.write_text(json.dumps(users, indent=2))


def _hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def register_user(
    name: str,
    email: str,
    password: str,
    role: str,
    specialization: str | None = None,
) -> dict[str, Any]:
    """Register a new patient. Doctor self-registration is not allowed."""
    if role != "patient":
        raise HTTPException(
            403,
            "Doctor accounts are provisioned by the hospital. "
            "Please log in with your @continuecare.com email.",
        )

    if is_hospital_email(email):
        raise HTTPException(
            400,
            "Hospital staff emails cannot be used for patient registration.",
        )

    users = _load_users()

    if any(u["email"].lower() == email.lower() for u in users):
        raise HTTPException(409, "Email already registered")

    user = {
        "id": str(uuid.uuid4()),
        "name": name,
        "email": email,
        "password_hash": _hash_password(password),
        "role": "patient",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    users.append(user)
    _save_users(users)

    token = _create_session(user["id"])
    return _user_response(user, token)


def login_user(email: str, password: str) -> dict[str, Any]:
    """Authenticate hospital doctors or registered patients."""
    email = email.strip().lower()

    if is_hospital_email(email):
        doctor = get_hospital_doctor(email)
        if not doctor:
            raise HTTPException(
                401,
                "This hospital email is not on the staff roster. "
                "Contact your administrator.",
            )
        if not verify_hospital_doctor_password(password):
            raise HTTPException(401, "Invalid email or password")

        token = _create_session(doctor["id"])
        return _user_response(
            {
                "id": doctor["id"],
                "name": doctor["name"],
                "email": doctor["email"],
                "role": "doctor",
                "specialization": doctor["specialization"],
            },
            token,
        )

    users = _load_users()
    pw_hash = _hash_password(password)

    for u in users:
        if u["email"].lower() == email and u["password_hash"] == pw_hash:
            if u["role"] != "patient":
                raise HTTPException(401, "Invalid email or password")
            token = _create_session(u["id"])
            return _user_response(u, token)

    raise HTTPException(401, "Invalid email or password")


def _create_session(user_id: str) -> str:
    token = str(uuid.uuid4())
    _sessions[token] = user_id
    return token


def _user_response(user: dict, token: str) -> dict[str, Any]:
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "role": user["role"],
            "specialization": user.get("specialization"),
        },
    }


def _resolve_user(user_id: str) -> dict[str, Any] | None:
    doctor = get_hospital_doctor_by_id(user_id)
    if doctor:
        return {
            "id": doctor["id"],
            "name": doctor["name"],
            "email": doctor["email"],
            "role": "doctor",
            "specialization": doctor["specialization"],
        }

    for u in _load_users():
        if u["id"] == user_id:
            return {
                "id": u["id"],
                "name": u["name"],
                "email": u["email"],
                "role": u["role"],
                "specialization": u.get("specialization"),
            }
    return None


def get_current_user(authorization: str = Header(default="")) -> dict[str, Any]:
    """Dependency: extract the current user from the Authorization header."""
    token = authorization.replace("Bearer ", "").strip()
    if not token or token not in _sessions:
        raise HTTPException(401, "Not authenticated")

    user = _resolve_user(_sessions[token])
    if not user:
        raise HTTPException(401, "User not found")
    return user


def require_doctor(user: dict[str, Any]) -> dict[str, Any]:
    if user["role"] != "doctor":
        raise HTTPException(403, "Doctor access required")
    return user


def list_patients() -> list[dict[str, Any]]:
    """Return all registered patients (for doctor dashboard)."""
    users = _load_users()
    return [
        {
            "id": u["id"],
            "name": u["name"],
            "email": u["email"],
            "created_at": u["created_at"],
        }
        for u in users
        if u["role"] == "patient"
    ]


def get_patient_by_id(patient_id: str) -> dict[str, Any] | None:
    """Look up a registered patient by ID."""
    for u in _load_users():
        if u["id"] == patient_id and u["role"] == "patient":
            return {
                "id": u["id"],
                "name": u["name"],
                "email": u["email"],
                "created_at": u["created_at"],
            }
    return None


def require_patient_access(user: dict[str, Any], patient_id: str) -> str:
    """
    Ensure the caller may access the given patient's data.
    Patients may only access their own records; doctors may access any patient.
    """
    if user["role"] == "patient":
        if user["id"] != patient_id:
            raise HTTPException(403, "You can only access your own health records")
        return patient_id

    require_doctor(user)
    if not get_patient_by_id(patient_id):
        raise HTTPException(404, "Patient not found")
    return patient_id


def get_hospital_staff() -> list[dict[str, str]]:
    return list_hospital_doctors()
