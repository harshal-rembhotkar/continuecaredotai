import os
from dotenv import load_dotenv

load_dotenv()

# Must be set before cognee is imported (Cognee reads this at import time)
os.environ.setdefault("ENABLE_BACKEND_ACCESS_CONTROL", "false")

# Google Gemini (Google AI Studio)
LLM_API_KEY = os.getenv("LLM_API_KEY", "")
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "gemini")
LLM_MODEL = os.getenv("LLM_MODEL", "gemini/gemini-2.0-flash")

EMBEDDING_PROVIDER = os.getenv("EMBEDDING_PROVIDER", "gemini")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "gemini/gemini-embedding-001")
EMBEDDING_API_KEY = os.getenv("EMBEDDING_API_KEY", LLM_API_KEY)
EMBEDDING_DIMENSIONS = int(os.getenv("EMBEDDING_DIMENSIONS", "768"))

DEFAULT_PATIENT_ID = "patient-demo"
DEFAULT_DATASET = "patient_memory"


def configure_cognee():
    """Initialize Cognee with Gemini LLM, embeddings, and storage settings."""
    import cognee

    os.environ["LLM_PROVIDER"] = LLM_PROVIDER
    os.environ["LLM_MODEL"] = LLM_MODEL
    os.environ["LLM_API_KEY"] = LLM_API_KEY

    os.environ["EMBEDDING_PROVIDER"] = EMBEDDING_PROVIDER
    os.environ["EMBEDDING_MODEL"] = EMBEDDING_MODEL
    os.environ["EMBEDDING_API_KEY"] = EMBEDDING_API_KEY
    os.environ["EMBEDDING_DIMENSIONS"] = str(EMBEDDING_DIMENSIONS)

    cognee.config.set_llm_provider(LLM_PROVIDER)
    cognee.config.set_llm_api_key(LLM_API_KEY)
    cognee.config.set_llm_model(LLM_MODEL)

    cognee.config.set_embedding_provider(EMBEDDING_PROVIDER)
    cognee.config.set_embedding_model(EMBEDDING_MODEL)
    cognee.config.set_embedding_dimensions(EMBEDDING_DIMENSIONS)
    cognee.config.set_embedding_api_key(EMBEDDING_API_KEY)

    # Use Cognee defaults: ladybug graph + lancedb vectors (embedded, zero-config)
    cognee.config.set_vector_db_provider("lancedb")
