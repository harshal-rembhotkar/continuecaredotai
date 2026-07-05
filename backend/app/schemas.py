"""Request and response models for the API."""

from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel, Field


# ─── Patient Companion ───


class PatientMessage(BaseModel):
    message: str
    patient_id: Optional[str] = None
    session_id: Optional[str] = None


class MemoryEvidence(BaseModel):
    content: str
    relevance: Optional[float] = None
    source: Optional[str] = None


class CompanionResponse(BaseModel):
    response: str
    memories_used: list[MemoryEvidence] = Field(default_factory=list)
    entities_extracted: list[dict[str, Any]] = Field(default_factory=list)
    memory_status: str = "updated"


# ─── Doctor Brief ───


class DoctorBriefRequest(BaseModel):
    patient_id: str


class Citation(BaseModel):
    claim: str
    source_memory: str
    confidence: Optional[float] = None


class DoctorBriefResponse(BaseModel):
    brief: str
    citations: list[Citation] = Field(default_factory=list)
    generated_at: str = ""
    memory_count: int = 0


# ─── Memory Management ───


class ForgetRequest(BaseModel):
    patient_id: Optional[str] = None
    target: str = "dataset"
    dataset: Optional[str] = None


class ForgetResponse(BaseModel):
    status: str
    message: str
    details: dict[str, Any] = Field(default_factory=dict)


class MemoryNode(BaseModel):
    id: str
    label: str
    type: str
    properties: dict[str, Any] = Field(default_factory=dict)


class MemoryEdge(BaseModel):
    source: str
    target: str
    relationship: str


class MemoryGraphResponse(BaseModel):
    nodes: list[MemoryNode] = Field(default_factory=list)
    edges: list[MemoryEdge] = Field(default_factory=list)


class MemoryInventoryItem(BaseModel):
    type: str
    count: int
    sample_names: list[str] = Field(default_factory=list)
    relationships: list[str] = Field(default_factory=list)


class MemoryInventoryResponse(BaseModel):
    inventory: list[MemoryInventoryItem] = Field(default_factory=list)
    total_entities: int = 0


class ImproveRequest(BaseModel):
    patient_id: Optional[str] = None


class ImproveResponse(BaseModel):
    status: str
    message: str
