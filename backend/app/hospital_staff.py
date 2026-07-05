"""
Hospital staff roster — only these doctors may log in.
Doctors cannot self-register; accounts are provisioned by the hospital.
"""

from __future__ import annotations

import os

# Shared password for hospital staff (override in .env for production demos)
HOSPITAL_DOCTOR_PASSWORD = os.getenv("HOSPITAL_DOCTOR_PASSWORD", "continuecare")
HOSPITAL_EMAIL_DOMAIN = "@continuecare.com"

HOSPITAL_DOCTORS: list[dict[str, str]] = [
    {
        "id": "a1000001-0000-4000-8000-000000000001",
        "name": "Dr. John Multispecialist",
        "email": "john@continuecare.com",
        "specialization": "Multispecialist",
    },
    {
        "id": "a1000001-0000-4000-8000-000000000002",
        "name": "Dr. Sarah Chen",
        "email": "sarah.chen@continuecare.com",
        "specialization": "Cardiology",
    },
    {
        "id": "a1000001-0000-4000-8000-000000000003",
        "name": "Dr. Michael Patel",
        "email": "michael.patel@continuecare.com",
        "specialization": "Neurology",
    },
    {
        "id": "a1000001-0000-4000-8000-000000000004",
        "name": "Dr. Emily Rivera",
        "email": "emily.rivera@continuecare.com",
        "specialization": "Pediatrics",
    },
    {
        "id": "a1000001-0000-4000-8000-000000000005",
        "name": "Dr. David Okonkwo",
        "email": "david.okonkwo@continuecare.com",
        "specialization": "Internal Medicine",
    },
]

_DOCTORS_BY_EMAIL = {d["email"].lower(): d for d in HOSPITAL_DOCTORS}
_DOCTORS_BY_ID = {d["id"]: d for d in HOSPITAL_DOCTORS}


def is_hospital_email(email: str) -> bool:
    return email.lower().endswith(HOSPITAL_EMAIL_DOMAIN)


def get_hospital_doctor(email: str) -> dict[str, str] | None:
    return _DOCTORS_BY_EMAIL.get(email.lower())


def get_hospital_doctor_by_id(user_id: str) -> dict[str, str] | None:
    return _DOCTORS_BY_ID.get(user_id)


def list_hospital_doctors() -> list[dict[str, str]]:
    """Public roster for the login screen (no passwords)."""
    return [
        {
            "name": d["name"],
            "email": d["email"],
            "specialization": d["specialization"],
        }
        for d in HOSPITAL_DOCTORS
    ]


def verify_hospital_doctor_password(password: str) -> bool:
    return password == HOSPITAL_DOCTOR_PASSWORD
