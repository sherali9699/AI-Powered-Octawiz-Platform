# app/main.py
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router as api_router
# from app.services.rag_engine import initialize_supabase_vector_store, supabase
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Octowize RAG API")

origins_str = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,https://ai-powered-octawiz-platform.vercel.app")
allowed_origins = [origin.strip() for origin in origins_str.split(',')]

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# @app.on_event("startup")
# async def startup_event():
#     logger.info("Checking Supabase documents table...")
#     try:
#         # Check if documents exist in Supabase; initialize if empty
#         response = supabase.table("documents").select("id").limit(1).execute()
#         if not response.data:
#             logger.info("Documents table is empty. Initializing Supabase vector store...")
#             await initialize_supabase_vector_store()
#         else:
#             logger.info("Documents table already populated. Skipping initialization.")
#     except Exception as e:
#         logger.error(f"Error during startup: {str(e)}")
#         raise

app.include_router(api_router, prefix="/api")