# ContinueCare.ai

A healthcare memory system powered by [Cognee](https://www.cognee.ai/) that demonstrates
the complete memory lifecycle: remembering, recalling, improving, discovering relationships,
and forgetting.

Patients record symptoms, medications, mood, and observations through a conversational
companion. The system builds a structured knowledge graph that evolves over time, enabling
doctors to generate evidence-backed pre-visit summaries.

---

## Architecture

```
┌─────────────────────┐       ┌────────────────────────────────┐
│   React Frontend    │──────▶│       FastAPI Backend          │
│                     │       │                                │
│ • Patient Companion │       │  ┌──────────────────────────┐  │
│ • Doctor Brief      │       │  │   Cognee Memory Engine   │  │
│ • Memory Explorer   │       │  │                          │  │
│ • Knowledge Graph   │       │  │  remember() → KG build   │  │
│                     │       │  │  recall()   → retrieval   │  │
└─────────────────────┘       │  │  improve()  → enrichment  │  │
                              │  │  forget()   → deletion    │  │
                              │  └──────────┬───────────────┘  │
                              │             │                  │
                              │  ┌──────────▼───────────────┐  │
                              │  │  Healthcare Ontology      │  │
                              │  │  (DataPoint subclasses)   │  │
                              │  │                          │  │
                              │  │  HealthRecord            │  │
                              │  │  ├── Symptom             │  │
                              │  │  ├── Medication ─treats─▶│  │
                              │  │  ├── MoodEntry           │  │
                              │  │  └── Observation         │  │
                              │  └──────────────────────────┘  │
                              └────────────────────────────────┘
```

### Cognee Features Used

| Feature | How It's Used |
|---------|---------------|
| `remember()` with `graph_model` | Extracts structured health entities (symptoms, medications, mood, observations) from patient messages into the knowledge graph |
| `recall()` with `GRAPH_COMPLETION` | Generates contextual companion responses grounded in stored memory |
| `recall()` multi-query | Decomposes doctor brief generation into focused sub-queries for comprehensive summaries |
| `improve()` | Enriches the knowledge graph with new relationships and builds global context index |
| `forget()` | Removes patient data from graph and vector stores, proving true deletion |
| Custom `DataPoint` ontology | Healthcare-specific schema constraining LLM extraction to domain entities |
| Session memory | Stores conversation context for short-term retrieval |
| `SearchType.CHUNKS` | Raw chunk retrieval for knowledge graph visualization |
| `get_schema_inventory()` | Memory inventory showing entity types and counts |

### Healthcare Ontology

The custom ontology (defined as `DataPoint` subclasses) constrains how Cognee's LLM
extraction builds the knowledge graph:

- **HealthRecord** — root extraction node, connects to all entity types
- **Symptom** — name, severity, body location, duration, frequency
- **Medication** — name, dosage, frequency, purpose; `treats` → Symptom (edge)
- **MoodEntry** — emotional state, intensity, triggers; `associated_symptoms` → Symptom
- **Observation** — measurable findings with category (vital sign, lab result, etc.)

---

## Hospital Access Model

ContinueCare.ai is built as a hospital product with role-based access:

| Role | How to access | Can access |
|------|-------------|------------|
| **Patient** | Self-register on the login screen | Own health companion, own memory only |
| **Doctor** | Staff login with `@continuecare.com` email (hospital-provisioned) | All registered patients, briefs, memory graphs |

### Hospital staff (login only — cannot register)

| Doctor | Specialization | Email | Default password |
|--------|----------------|-------|------------------|
| Dr. John Multispecialist | Multispecialist | john@continuecare.com | `continuecare` |
| Dr. Sarah Chen | Cardiology | sarah.chen@continuecare.com | `continuecare` |
| Dr. Michael Patel | Neurology | michael.patel@continuecare.com | `continuecare` |
| Dr. Emily Rivera | Pediatrics | emily.rivera@continuecare.com | `continuecare` |
| Dr. David Okonkwo | Internal Medicine | david.okonkwo@continuecare.com | `continuecare` |

Override the staff password with `HOSPITAL_DOCTOR_PASSWORD` in `backend/.env`.

### How it works

1. **Patient registers** at the login screen → logs symptoms, medications, mood via the companion
2. Data is stored in Cognee under that patient's unique ID (`patient_{uuid}`)
3. **Doctor registers** with specialization → sees a **Patients** list of everyone who registered
4. Doctor selects a patient → generates a **Doctor Brief** or views their **Memory Explorer**
5. Patients cannot see other patients' data; doctors cannot impersonate a patient

Auth uses session tokens (`Authorization: Bearer <token>`). User accounts are stored in `backend/data/users.json`.

### Demo flow

```bash
# Terminal 1 — register as patient in browser, log a few symptoms
# Terminal 2 — register as doctor, open Patients tab, select that patient, Generate Brief
```

---

## Setup

### Prerequisites

- Python 3.10+
- Node.js 18+
- Google Gemini API key ([get one here](https://aistudio.google.com/apikey))

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Configure API key
cp .env.example .env
# Edit .env and add your Gemini API key
```

### Frontend

```bash
cd frontend
npm install
```

---

## Running

Start both servers (in separate terminals):

```bash
# Terminal 1: Backend
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000

# Terminal 2: Frontend
cd frontend
npm run dev
```

Open http://localhost:5173

---

## Demo Walkthrough

### 1. Patient Companion — Building Memory

Record several health entries to build the knowledge graph:

> "I've been having headaches for the past 3 days, mostly in the morning. The pain is moderate, around the temples."

> "I started taking ibuprofen 400mg twice daily for the headaches."

> "My mood has been low lately. I've been feeling stressed about work deadlines and not sleeping well."

> "I noticed my blood pressure was 140/90 when I checked at the pharmacy yesterday."

> "The headaches seem worse on days when I sleep less than 6 hours."

Each message extracts entities into the knowledge graph. The companion references
past entries when responding.

### 2. Ask About History

> "What symptoms have I reported?"

> "Is there any pattern between my sleep and headaches?"

> "What medications am I currently taking?"

The system recalls from the knowledge graph, demonstrating semantic retrieval
beyond simple keyword matching.

### 3. Doctor Brief — Evidence-Based Summary

Switch to the Doctor Brief tab and generate a summary. The brief includes:
- Symptom progression with timeline
- Medication history with effectiveness
- Mood trends and correlations
- Citations linking each finding to stored memory

### 4. Memory Explorer — Graph Visualization

View the knowledge graph to see how entities are connected:
- Symptom nodes (red)
- Medication nodes (blue)
- Mood nodes (purple)
- Observation nodes (green)
- HealthRecord nodes (amber)

Use "Improve Memory" to trigger Cognee's enrichment pipeline.

### 5. Forgetting — Proving Deletion

Click "Forget All" in the Memory Explorer. Then return to the companion
and ask about previous symptoms — the system will no longer remember them.
This proves that `cognee.forget()` truly removes data from the graph and
vector stores, not just hiding it.

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/patient/message` | Send a patient message, extract entities, recall response |
| POST | `/api/doctor/brief` | Generate a pre-visit clinical summary |
| POST | `/api/memory/improve` | Trigger knowledge graph enrichment |
| POST | `/api/memory/forget` | Delete memory (all or by dataset) |
| GET | `/api/memory/graph` | Retrieve graph nodes and edges for visualization |
| GET | `/api/memory/inventory` | Get entity type counts and samples |
| GET | `/api/health` | Health check |

---

## Technology Choices

| Technology | Justification |
|------------|---------------|
| **Cognee v1.2** | Core memory engine — knowledge graph, semantic retrieval, memory lifecycle |
| **FastAPI** | Async Python framework matching Cognee's async API |
| **React + TypeScript** | Type-safe component architecture for complex UI |
| **Tailwind CSS v4** | Utility-first styling for rapid, consistent UI development |
| **react-force-graph-2d** | Interactive knowledge graph visualization |
| **LanceDB** (via Cognee) | Default embedded vector store — zero-config |
| **Kuzu** (via Cognee) | Default embedded graph database — zero-config |
