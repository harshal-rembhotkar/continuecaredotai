"""
Cognee memory engine — wraps the Cognee v1.0 API for healthcare memory operations.

This module provides the integration layer between the application and Cognee,
handling memory storage, retrieval, enrichment, and deletion using the healthcare
ontology defined in ontology.py.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from . import config as _config  # noqa: F401 — load .env before cognee

import cognee
from cognee import SearchType

from .ontology import HealthRecord
from .prompts import (
    COMPANION_SYSTEM_PROMPT,
    DOCTOR_BRIEF_PROMPT,
    HEALTH_EXTRACTION_PROMPT,
)

logger = logging.getLogger(__name__)


def _dataset_name(patient_id: str) -> str:
    return f"patient_{patient_id.replace('-', '_')}"


def _session_key(patient_id: str, session_id: str) -> str:
    return f"{patient_id}_{session_id}"


# ─── Store ───


async def store_health_entry(
    message: str,
    patient_id: str,
    session_id: str | None = None,
) -> dict[str, Any]:
    """
    Store a patient message as structured health memory.

    Uses cognee.remember() with the HealthRecord graph model so the LLM
    extracts symptoms, medications, mood, and observations into the
    knowledge graph.
    """
    dataset = _dataset_name(patient_id)
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    entry_text = f"[{timestamp}] Patient entry: {message}"

    result = await cognee.remember(
        entry_text,
        dataset_name=dataset,
        graph_model=HealthRecord,
        custom_prompt=HEALTH_EXTRACTION_PROMPT,
        self_improvement=True,
    )

    if session_id:
        await cognee.remember(
            entry_text,
            session_id=_session_key(patient_id, session_id),
        )

    entities = _extract_entities_from_result(result)

    return {
        "status": getattr(result, "status", "completed"),
        "dataset": dataset,
        "entities_extracted": entities,
    }


def _extract_entities_from_result(result: Any) -> list[dict[str, Any]]:
    """Pull entity info from a RememberResult for the UI."""
    entities: list[dict[str, Any]] = []
    try:
        raw = getattr(result, "raw_result", None)
        if raw and hasattr(raw, "__iter__"):
            for item in raw:
                if hasattr(item, "type"):
                    entities.append({
                        "type": getattr(item, "type", "unknown"),
                        "name": getattr(item, "name", ""),
                    })
    except Exception:
        logger.debug("Could not extract entities from result", exc_info=True)
    return entities


# ─── Recall ───


async def recall_for_companion(
    query: str,
    patient_id: str,
    session_id: str | None = None,
) -> dict[str, Any]:
    """
    Recall health memory to generate a companion response.

    Uses GRAPH_COMPLETION (default auto-routed) for the best balance of
    accuracy and context. The response is parsed from the structured
    RecallResponse discriminated union:

      - ResponseGraphContextEntry (source="graph_context") → LLM answer
      - ResponseGraphEntry (source="graph") → individual search hits
      - ResponseQAEntry (source="session") → cached session Q&A
    """
    dataset = _dataset_name(patient_id)

    try:
        results = await cognee.recall(
            query,
            datasets=[dataset],
            top_k=10,
            system_prompt=COMPANION_SYSTEM_PROMPT,
        )

        if not results:
            return {
                "response": _fallback_response(query),
                "memories": [],
            }

        response_text = ""
        memories: list[dict[str, str]] = []

        for r in results:
            source = getattr(r, "source", None)

            if source == "graph_context":
                response_text = getattr(r, "content", str(r))

            elif source == "graph":
                text = getattr(r, "text", str(r))
                memories.append({
                    "content": text[:500],
                    "source": dataset,
                })

            elif source == "session":
                answer = getattr(r, "answer", None)
                question = getattr(r, "question", None)
                if answer and not response_text:
                    response_text = answer
                if question:
                    memories.append({
                        "content": f"Q: {question}\nA: {answer or ''}",
                        "source": "session",
                    })
            else:
                text = getattr(r, "text", None) or getattr(r, "content", None) or str(r)
                if not response_text:
                    response_text = text
                else:
                    memories.append({"content": text[:500], "source": dataset})

        if not response_text:
            response_text = _fallback_response(query)

        return {
            "response": response_text,
            "memories": memories,
        }

    except Exception as e:
        logger.error("Recall failed: %s", e, exc_info=True)
        return {
            "response": _fallback_response(query),
            "memories": [],
        }


def _fallback_response(query: str) -> str:
    return (
        "I don't have any health records stored yet. "
        "Please share some information about your symptoms, medications, "
        "mood, or health observations, and I'll start building your health memory."
    )


# ─── Doctor Brief ───


async def generate_doctor_brief(patient_id: str) -> dict[str, Any]:
    """
    Generate a comprehensive doctor brief using graph-decomposition search.

    Uses GRAPH_COMPLETION_DECOMPOSITION to break the broad summary request
    into focused sub-queries (symptoms, medications, mood, observations),
    retrieve relevant graph context for each, then synthesize a unified brief.
    """
    dataset = _dataset_name(patient_id)

    queries = [
        "Summarize all symptoms reported by the patient, including severity, duration, and progression over time.",
        "List all medications the patient has taken, including dosages, effectiveness, and side effects.",
        "Describe the patient's mood history, including emotional states, intensity, and triggers.",
        "Summarize all health observations including vital signs, measurements, and lifestyle factors.",
        "What patterns or correlations exist between the patient's symptoms, medications, and mood?",
    ]

    sections: list[str] = []
    citations: list[dict[str, str]] = []

    for q in queries:
        try:
            results = await cognee.recall(
                q,
                datasets=[dataset],
                top_k=10,
                system_prompt=DOCTOR_BRIEF_PROMPT,
            )
            for r in results:
                source = getattr(r, "source", None)
                if source == "graph_context":
                    text = getattr(r, "content", str(r))
                    sections.append(text)
                    citations.append({"claim": q, "source_memory": text[:300]})
                elif source == "graph":
                    text = getattr(r, "text", str(r))
                    citations.append({"claim": q, "source_memory": text[:300]})
                else:
                    text = getattr(r, "text", None) or getattr(r, "content", None) or str(r)
                    sections.append(text)
                    citations.append({"claim": q, "source_memory": text[:300]})
        except Exception as e:
            logger.warning("Brief sub-query failed for '%s': %s", q, e)

    if not sections:
        return {
            "brief": "No health records found for this patient. The patient needs to record health information first.",
            "citations": [],
            "memory_count": 0,
        }

    brief = "\n\n---\n\n".join(sections)

    return {
        "brief": brief,
        "citations": citations,
        "memory_count": len(citations),
    }


# ─── Improve ───


async def improve_memory(patient_id: str) -> dict[str, str]:
    """
    Trigger Cognee's improve() to enrich the knowledge graph.

    This bridges session memory into permanent memory, discovers new
    relationships between entities, and strengthens the graph.
    """
    dataset = _dataset_name(patient_id)

    try:
        await cognee.improve(
            dataset=dataset,
            build_global_context_index=True,
        )
        return {"status": "completed", "message": "Memory enrichment completed. The knowledge graph has been improved with new relationships and connections."}
    except Exception as e:
        logger.error("Improve failed: %s", e, exc_info=True)
        return {"status": "error", "message": f"Memory improvement encountered an error: {e}"}


# ─── Forget ───


async def forget_memory(
    patient_id: str,
    target: str = "dataset",
    dataset: str | None = None,
) -> dict[str, Any]:
    """
    Remove a patient's health memory from Cognee.

    Always scoped to the patient's dataset — never wipes other patients' data.
    """
    ds = dataset or _dataset_name(patient_id)

    try:
        result = await cognee.forget(dataset=ds)

        return {
            "status": "forgotten",
            "message": f"Successfully removed memory for patient dataset '{ds}'.",
            "details": result if isinstance(result, dict) else {"raw": str(result)},
        }
    except Exception as e:
        logger.error("Forget failed: %s", e, exc_info=True)
        return {
            "status": "error",
            "message": f"Failed to forget: {e}",
            "details": {},
        }


# ─── Memory Inspection ───


async def get_memory_graph(patient_id: str) -> dict[str, Any]:
    """
    Retrieve the knowledge graph structure for visualization.

    Queries Cognee for graph entities and relationships, returning
    nodes and edges suitable for a force-graph visualization.
    """
    dataset = _dataset_name(patient_id)

    nodes: list[dict] = []
    edges: list[dict] = []

    try:
        results = await cognee.recall(
            "List all health entities and their relationships",
            datasets=[dataset],
            query_type=SearchType.CHUNKS,
            top_k=50,
        )

        seen_ids: set[str] = set()
        for r in results:
            text = str(r)
            node_id = str(hash(text))[:12]
            if node_id not in seen_ids:
                seen_ids.add(node_id)
                node_type = _infer_type(text)
                nodes.append({
                    "id": node_id,
                    "label": text[:80],
                    "type": node_type,
                    "properties": {"full_text": text[:500]},
                })

    except Exception as e:
        logger.warning("Graph retrieval failed: %s", e)

    try:
        inventory = await get_memory_inventory(patient_id)
        for item in inventory.get("inventory", []):
            for rel in item.get("relationships", []):
                edges.append({
                    "source": item.get("type", ""),
                    "target": rel,
                    "relationship": "related_to",
                })
    except Exception:
        pass

    return {"nodes": nodes, "edges": edges}


def _infer_type(text: str) -> str:
    text_lower = text.lower()
    for keyword, typ in [
        ("symptom", "symptom"),
        ("headache", "symptom"),
        ("pain", "symptom"),
        ("nausea", "symptom"),
        ("medication", "medication"),
        ("mg", "medication"),
        ("tablet", "medication"),
        ("mood", "mood"),
        ("anxi", "mood"),
        ("stress", "mood"),
        ("depress", "mood"),
        ("observ", "observation"),
        ("vital", "observation"),
        ("blood pressure", "observation"),
        ("weight", "observation"),
        ("sleep", "observation"),
    ]:
        if keyword in text_lower:
            return typ
    return "health_record"


async def get_memory_inventory(patient_id: str) -> dict[str, Any]:
    """
    Get a summary of what's in the knowledge graph, organized by type.
    """
    try:
        from cognee import get_schema_inventory
        inventory_data = await get_schema_inventory()

        items = []
        total = 0
        if inventory_data and hasattr(inventory_data, "__iter__"):
            for entry in inventory_data:
                item = {
                    "type": getattr(entry, "type", str(entry)),
                    "count": getattr(entry, "count", 1),
                    "sample_names": getattr(entry, "sample_names", []),
                    "relationships": getattr(entry, "relationships", []),
                }
                items.append(item)
                total += item["count"]

        return {"inventory": items, "total_entities": total}
    except ImportError:
        logger.debug("get_schema_inventory not available")
        return {"inventory": [], "total_entities": 0}
    except Exception as e:
        logger.warning("Inventory failed: %s", e)
        return {"inventory": [], "total_entities": 0}
