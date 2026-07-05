"""
ContinueCare.ai — FastAPI Backend

Provides API endpoints for:
  - Auth: patient/doctor registration and login
  - Patient Companion: conversational health tracking with memory
  - Doctor Brief: pre-visit summary generation from stored knowledge
  - Memory Management: inspection, improvement, and deletion
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from . import config as _config  # noqa: F401 — load .env before cognee

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .auth import (
    get_current_user,
    get_hospital_staff,
    list_patients,
    login_user,
    register_user,
    require_doctor,
    require_patient_access,
)
from .config import configure_cognee
from .memory import (
    forget_memory,
    generate_doctor_brief,
    get_memory_graph,
    get_memory_inventory,
    improve_memory,
    recall_for_companion,
    store_health_entry,
)
from .schemas import (
    Citation,
    CompanionResponse,
    DoctorBriefRequest,
    DoctorBriefResponse,
    ForgetRequest,
    ForgetResponse,
    ImproveRequest,
    ImproveResponse,
    MemoryEvidence,
    PatientMessage,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Configuring Cognee...")
    configure_cognee()
    logger.info("Cognee configured — ready to serve")
    yield


app = FastAPI(
    title="ContinueCare.ai",
    description="Healthcare memory system powered by Cognee",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Auth ───


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


@app.get("/api/auth/hospital-doctors")
async def hospital_doctors():
    """Public list of hospital staff who may log in."""
    return {"doctors": get_hospital_staff()}


@app.post("/api/auth/register")
async def register(req: RegisterRequest):
    return register_user(
        name=req.name,
        email=req.email,
        password=req.password,
        role="patient",
    )


@app.post("/api/auth/login")
async def login(req: LoginRequest):
    return login_user(email=req.email, password=req.password)


@app.get("/api/auth/me")
async def me(user=Depends(get_current_user)):
    return {"user": user}


# ─── Health Check ───


@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "continuecare-ai"}


# ─── Doctor: Patient List ───


@app.get("/api/doctor/patients")
async def doctor_patients(user=Depends(get_current_user)):
    require_doctor(user)
    return {"patients": list_patients()}


# ─── Patient Companion ───


@app.post("/api/patient/message", response_model=CompanionResponse)
async def patient_message(req: PatientMessage, user=Depends(get_current_user)):
    """
    Process a patient message: extract health entities into the knowledge graph,
    then recall relevant memory to generate a contextual response.
    """
    patient_id = _resolve_patient_id(user, req.patient_id)

    try:
        store_result = await store_health_entry(
            message=req.message,
            patient_id=patient_id,
            session_id=req.session_id,
        )

        recall_result = await recall_for_companion(
            query=req.message,
            patient_id=patient_id,
            session_id=req.session_id,
        )

        memories = [
            MemoryEvidence(content=m["content"], source=m.get("source"))
            for m in recall_result.get("memories", [])
        ]

        return CompanionResponse(
            response=recall_result["response"],
            memories_used=memories,
            entities_extracted=store_result.get("entities_extracted", []),
            memory_status=store_result.get("status", "updated"),
        )

    except Exception as e:
        logger.error("Patient message failed: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ─── Doctor Brief ───


@app.post("/api/doctor/brief", response_model=DoctorBriefResponse)
async def doctor_brief(req: DoctorBriefRequest, user=Depends(get_current_user)):
    """Generate a pre-visit clinical summary from stored patient memory."""
    patient_id = require_patient_access(user, req.patient_id)

    try:
        result = await generate_doctor_brief(patient_id=patient_id)

        citations_raw = result.get("citations", [])
        citations = [
            Citation(claim=c["claim"], source_memory=c["source_memory"])
            for c in citations_raw
        ]

        return DoctorBriefResponse(
            brief=result["brief"],
            citations=citations,
            generated_at=datetime.now(timezone.utc).isoformat(),
            memory_count=result.get("memory_count", 0),
        )

    except Exception as e:
        logger.error("Doctor brief failed: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ─── Memory Management ───


@app.post("/api/memory/improve", response_model=ImproveResponse)
async def improve(req: ImproveRequest, user=Depends(get_current_user)):
    patient_id = _resolve_patient_id(user, req.patient_id)
    result = await improve_memory(patient_id=patient_id)
    return ImproveResponse(**result)


@app.post("/api/memory/forget", response_model=ForgetResponse)
async def forget(req: ForgetRequest, user=Depends(get_current_user)):
    patient_id = _resolve_patient_id(user, req.patient_id)
    result = await forget_memory(
        patient_id=patient_id,
        target=req.target,
        dataset=req.dataset,
    )
    return ForgetResponse(**result)


@app.get("/api/memory/graph")
async def memory_graph(patient_id: str | None = None, user=Depends(get_current_user)):
    pid = _resolve_patient_id(user, patient_id)
    return await get_memory_graph(patient_id=pid)


@app.get("/api/memory/inventory")
async def memory_inventory(patient_id: str | None = None, user=Depends(get_current_user)):
    pid = _resolve_patient_id(user, patient_id)
    return await get_memory_inventory(patient_id=pid)


# ─── Helpers ───


def _resolve_patient_id(user: dict, explicit_id: str | None = None) -> str:
    """
    Patients always use their own ID.
    Doctors must specify which registered patient they're viewing.
    """
    if user["role"] == "patient":
        return user["id"]
    if not explicit_id:
        raise HTTPException(400, "Doctor must specify a patient_id")
    return require_patient_access(user, explicit_id)
