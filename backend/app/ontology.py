"""
Healthcare ontology for Cognee knowledge graph extraction.

Defines DataPoint subclasses that constrain how Cognee's LLM extraction
builds the knowledge graph from patient conversations. Each class becomes
a node type, and DataPoint-typed fields become edges.

Graph structure:
    HealthRecord ──symptoms──► Symptom
                 ──medications──► Medication ──treats──► Symptom
                 ──mood──► MoodEntry
                 ──observations──► Observation
"""

from __future__ import annotations

from typing import List, Optional

from . import config as _config  # noqa: F401 — load .env before cognee

from cognee.low_level import DataPoint


# ─── Type nodes (used for graph categorization / traversal) ───


class SymptomType(DataPoint):
    name: str = "Symptom"


class MedicationType(DataPoint):
    name: str = "Medication"


class MoodType(DataPoint):
    name: str = "Mood"


class ObservationType(DataPoint):
    name: str = "Observation"


class HealthRecordType(DataPoint):
    name: str = "HealthRecord"


# ─── Entity nodes ───


class Symptom(DataPoint):
    name: str
    severity: Optional[str] = None
    body_location: Optional[str] = None
    duration: Optional[str] = None
    frequency: Optional[str] = None
    is_type: SymptomType = SymptomType()
    metadata: dict = {"index_fields": ["name", "severity", "body_location"]}


class Medication(DataPoint):
    name: str
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    purpose: Optional[str] = None
    side_effects: Optional[str] = None
    effectiveness: Optional[str] = None
    treats: Optional[List[Symptom]] = None
    is_type: MedicationType = MedicationType()
    metadata: dict = {"index_fields": ["name", "dosage", "purpose"]}


class MoodEntry(DataPoint):
    name: str
    intensity: Optional[str] = None
    triggers: Optional[str] = None
    associated_symptoms: Optional[List[Symptom]] = None
    is_type: MoodType = MoodType()
    metadata: dict = {"index_fields": ["name", "intensity", "triggers"]}


class Observation(DataPoint):
    name: str
    value: Optional[str] = None
    category: Optional[str] = None
    is_type: ObservationType = ObservationType()
    metadata: dict = {"index_fields": ["name", "value", "category"]}


# ─── Root extraction model ───


class HealthRecord(DataPoint):
    """
    Top-level graph model passed to cognee.remember(graph_model=HealthRecord).

    The LLM extracts one HealthRecord per patient entry. Its typed fields
    (symptoms, medications, mood, observations) become edges to the
    corresponding entity nodes, building a connected graph over time.
    """
    name: str
    date: Optional[str] = None
    symptoms: Optional[List[Symptom]] = None
    medications: Optional[List[Medication]] = None
    mood: Optional[MoodEntry] = None
    observations: Optional[List[Observation]] = None
    is_type: HealthRecordType = HealthRecordType()
    metadata: dict = {"index_fields": ["name", "date"]}
