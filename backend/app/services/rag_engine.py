# # app/services/rag_engine.py

# import os
# from typing import Optional, List
# from fastapi import HTTPException
# from dotenv import load_dotenv
# import google.generativeai as genai
# from langchain.chains import create_history_aware_retriever, create_retrieval_chain
# from langchain.chains.combine_documents import create_stuff_documents_chain
# from langchain_core.messages import HumanMessage, SystemMessage
# from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
# from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
# from langchain_community.document_loaders import PyPDFLoader
# from langchain.text_splitter import CharacterTextSplitter
# from langchain_core.documents import Document
# from langchain_core.retrievers import BaseRetriever
# from langchain_core.callbacks import CallbackManagerForRetrieverRun
# from supabase import create_client, Client
# import uuid
# import logging
# import asyncio

# # Configure logging
# logging.basicConfig(level=logging.INFO)
# logger = logging.getLogger(__name__)

# # Load environment variables
# load_dotenv()

# # Configure Google Generative AI
# genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

# # Initialize Supabase client
# SUPABASE_URL = os.getenv("SUPABASE_URL")
# SUPABASE_KEY = os.getenv("SUPABASE_KEY")
# supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# # Initialize embeddings
# embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001")

# # Define paths
# app_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# folder_path = os.path.join(app_dir, "Freezone_Research")  # Folder containing PDFs

# # Initialize vector store in Supabase
# async def initialize_supabase_vector_store():
#     logger.info("Initializing Supabase vector store...")

#     # Ensure folder exists
#     if not os.path.exists(folder_path):
#         raise FileNotFoundError(f"The folder {folder_path} does not exist.")

#     # Load all PDF files from the folder
#     documents = []
#     pdf_files = [f for f in os.listdir(folder_path) if f.endswith('.pdf')]
    
#     if not pdf_files:
#         raise FileNotFoundError(f"No PDF files found in {folder_path}.")

#     # Process each PDF file
#     for pdf_file in pdf_files:
#         file_path = os.path.join(folder_path, pdf_file)
#         loader = PyPDFLoader(file_path)
#         documents.extend(loader.load())

#     # Split documents
#     text_splitter = CharacterTextSplitter(chunk_size=500, chunk_overlap=100)
#     docs = text_splitter.split_documents(documents)

#     logger.info(f"Number of document chunks: {len(docs)}")
#     logger.info(f"Sample chunk:\n{docs[0].page_content}\n")

#     # Store documents in Supabase (batch insert for efficiency)
#     batch = []
#     for doc in docs:
#         if not isinstance(doc.metadata, dict):
#             doc.metadata = {}
#         doc.metadata = {k: str(v) for k, v in doc.metadata.items()}
#         embedding = embeddings.embed_query(doc.page_content)
#         batch.append({
#             "content": doc.page_content,
#             "embedding": embedding,
#             "metadata": doc.metadata
#         })

#     # Insert in batches to reduce API calls
#     supabase.table("documents").insert(batch).execute()
#     logger.info("Supabase vector store initialized successfully.")

# # Custom Supabase Retriever for LangChain
# class SupabaseRetriever(BaseRetriever):
#     def _get_relevant_documents(self, query: str, *, run_manager: CallbackManagerForRetrieverRun) -> List[Document]:
#         query_embedding = embeddings.embed_query(query)
#         response = supabase.rpc("search_documents", {
#             "query_embedding": query_embedding,
#             "match_count": 3  # Match your original k=3
#         }).execute()
#         documents = [
#             Document(
#                 page_content=doc["content"],
#                 metadata=doc["metadata"] or {}
#             )
#             for doc in response.data
#         ]
#         return documents

# retriever = SupabaseRetriever()

# # Initialize LLM with gemini-2.0-flash
# llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash", google_api_key=os.getenv("GOOGLE_API_KEY"))

# # Contextualize question prompt
# contextualize_q_system_prompt = (
#     "Given user question "
#     "formulate a standalone question which can be understood "
#     "without the chat history. Do NOT answer the question, just "
#     "reformulate it if needed and otherwise return it as is."
# )
# contextualize_q_prompt = ChatPromptTemplate.from_messages(
#     [
#         ("system", contextualize_q_system_prompt),
#         MessagesPlaceholder("chat_history"),
#         ("human", "{input}"),
#     ]
# )

# # Create history-aware retriever
# history_aware_retriever = create_history_aware_retriever(llm, retriever, contextualize_q_prompt)

# # Answer question prompt
# qa_system_prompt = (
#     "You are an AI assistant helping users with questions about UAE Freezones and business setup.\n"
#     "You will be given a context. If the context is helpful, use it to answer the question.\n"
#     "If the context is empty or irrelevant, DO NOT guess. Instead, return exactly this:\n"
#     "__NO_CONTEXT__\n"
#     "Otherwise, provide a helpful answer (max 3 sentences).\n\n"
#     "Context:\n{context}"
# )
# qa_prompt = ChatPromptTemplate.from_messages(
#     [
#         ("system", qa_system_prompt),
#         MessagesPlaceholder("chat_history"),
#         ("human", "{input}"),
#     ]
# )

# # Create question-answering and retrieval chains
# question_answer_chain = create_stuff_documents_chain(llm, qa_prompt)
# rag_chain = create_retrieval_chain(history_aware_retriever, question_answer_chain)

# chat_history = []

# async def query_rag(query: str, session_id: str = str(uuid.uuid4())) -> Optional[str]:
#     """
#     Query the RAG engine using LangChain with Gemini 2.0 Flash.

#     Args:
#         query (str): The user query to process.
#         session_id (str, optional): Unique identifier for the user session to track chat history.
#                                    Defaults to a new UUID if not provided.

#     Returns:
#         Optional[str]: The generated response or None if an error occurs.

#     Raises:
#         HTTPException: If the query is invalid or an error occurs during processing.
#     """
#     if not query or not isinstance(query, str):
#         raise HTTPException(status_code=400, detail="Invalid or empty query")

#     logger.info(f"Querying RAG with query: {query}, session_id: {session_id}")
#     try:
#         # Retrieve chat history from Supabase (commented out as per user preference)
#         # response = supabase.table("chat_history").select("*").eq("session_id", session_id).order("created_at").execute()
#         # chat_history = [
#         #     HumanMessage(content=msg["content"]) if msg["role"] == "human" else SystemMessage(content=msg["content"])
#         #     for msg in response.data
#         # ]

#         # Call the RAG chain
#         result = await rag_chain.ainvoke({"input": query, "chat_history": chat_history})
#         response = result["answer"].strip()
#         logger.info(f"RAG response: {response}")

#         # Append messages to in-memory chat history
#         chat_history.append(HumanMessage(content=query))
#         chat_history.append(SystemMessage(content=response))

#         # # Store chat history in Supabase (commented out as per user preference)
#         # supabase.table("chat_history").insert([
#         #     {"session_id": session_id, "role": "human", "content": query},
#         #     {"session_id": session_id, "role": "system", "content": response}
#         # ]).execute()

#         # # Trigger fallback if special token is returned
#         # if "__NO_CONTEXT__" in response:
#         #     logger.warning("Fallback triggered due to missing context flag from prompt.")
#         #     fallback_prompt = [
#         #         SystemMessage(content=(
#         #             "You are an AI assistant helping users decide between UAE free zones, Mainland and Offshores.\n"
#         #             "Use numbered lists only for steps or options.\n"
#         #             "And if the there is a list of steps in your response, then ask for each step one by one to make the conversion interactive.\n"
#         #             "Do not use bold (**), asterisks (*), or Markdown.\n"
#         #             "Respond only in clean plain text with no special characters or formatting.\n"
#         #             "Each point should be on a new line and start with '1.', '2.', etc.\n"
#         #             "Be professional and clear."
#         #         )),
#         #         *chat_history,
#         #         HumanMessage(content=query)
#         #     ]
#         #     fallback_response = await llm.ainvoke(fallback_prompt)
#         #     return fallback_response.content.strip()

#         # return response

#                 # Trigger fallback if special token is returned
#         if "__NO_CONTEXT__" in response:
#             logger.warning("Fallback triggered due to missing context flag from prompt.")
#             fallback_prompt = [
#                 SystemMessage(content=(
#                     "You are an AI assistant helping users to open business in UAE free zones, Mainland and Offshores.\n"
#                     "Use numbered lists only for steps or options.\n"
#                     "If your response includes multiple steps, present them as a numbered list starting with '1.', '2.', etc. and ask those steps one bu one.\n"
#                     "Do not use bold (**), asterisks (*), or Markdown.\n"
#                     "Respond only in clean plain text with no special characters or formatting.\n"
#                     "Be professional and clear."
#                 )),
#                 *chat_history,
#                 HumanMessage(content=query)
#             ]
#             fallback_response = await llm.ainvoke(fallback_prompt)
#             response = fallback_response.content.strip()
#             lines = [line.strip() for line in response.split('\n') if line.strip()]
#             if lines and lines[0].startswith('1.'):
#                 if not hasattr(query_rag, 'step_index'):
#                     query_rag.step_index = 0
#                     query_rag.steps = lines
#                 if query_rag.step_index < len(query_rag.steps):
#                     response = query_rag.steps[query_rag.step_index]
#                     query_rag.step_index += 1
#                     if query_rag.step_index < len(query_rag.steps):
#                         response += "\nPlease provide your answer to this question."
#                     else:
#                         response += "\nPlease provide your answer to complete the process."
#                 else:
#                     response = "Thank you for your answers. Please let me know how else I can assist."
#             return response

#         return response

#     except Exception as e:
#         logger.error(f"Error in query_rag: {str(e)}")
#         raise HTTPException(status_code=500, detail="Failed to process query")







# --------------------------------- current actual code --------------------------------






# app/services/rag_engine.py

import os
from typing import Optional, List
from fastapi import HTTPException
from dotenv import load_dotenv
import google.generativeai as genai
from langchain.chains import create_history_aware_retriever, create_retrieval_chain, LLMChain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain_chroma import Chroma
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import CharacterTextSplitter
import uuid
from uuid import uuid4
import time
from tenacity import retry, stop_after_attempt, wait_fixed, retry_if_exception_type
import logging
from chromadb.utils import embedding_functions  # Import Chroma embedding functions
from langchain_community.vectorstores import LanceDB
from supabase import create_client, Client



# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Configure Google Generative AI
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

# Initialize Supabase client
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Initialize embeddings
embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001")

# Define paths
app_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
persistent_directory = os.path.join(app_dir, "db", "lancedb")
folder_path = os.path.join(app_dir, "Freezone_Research")  # Folder containing PDFs

# Initialize vector store
if not os.path.exists(persistent_directory):
    logger.info("Persistent directory does not exist. Initializing LanceDB vector store...")

    # Ensure folder exists
    if not os.path.exists(folder_path):
        raise FileNotFoundError(f"The folder {folder_path} does not exist.")

    # Load all PDF files from the folder
    documents = []
    pdf_files = [f for f in os.listdir(folder_path) if f.endswith('.pdf')]
    
    if not pdf_files:
        raise FileNotFoundError(f"No PDF files found in {folder_path}.")

    # Process each PDF file
    for pdf_file in pdf_files:
        file_path = os.path.join(folder_path, pdf_file)
        loader = PyPDFLoader(file_path)
        documents.extend(loader.load())

    # Split documents
    text_splitter = CharacterTextSplitter(chunk_size=500, chunk_overlap=100)
    docs = text_splitter.split_documents(documents)

    logger.info(f"Number of document chunks: {len(docs)}")
    logger.info(f"Sample chunk:\n{docs[0].page_content}\n")

    # Sanitize metadata
    for doc in docs:
        if not isinstance(doc.metadata, dict):
            doc.metadata = {}
        doc.metadata = {k: str(v) for k, v in doc.metadata.items()}

    # Initialize LanceDB
    logger.info("Creating new LanceDB table...")
    vector_store = LanceDB.from_documents(
        documents=docs,
        embedding=embeddings,
        uri=persistent_directory,
        table_name="example_collection"
    )
    logger.info("LanceDB vector store initialized successfully.")
else:
    logger.info("Loading existing LanceDB vector store...")
    vector_store = LanceDB(
        uri=persistent_directory,
        embedding=embeddings,
        table_name="example_collection"
    )

retriever = vector_store.as_retriever(search_type="similarity", search_kwargs={"k": 3})


# Initialize LLM with gemini-2.0-flash
llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash", google_api_key=os.getenv("GOOGLE_API_KEY"))

# Contextualize question prompt
contextualize_q_system_prompt = (
    "Given user question "
    "formulate a standalone question which can be understood "
    "without the chat history. Do NOT answer the question, just "
    "reformulate it if needed and otherwise return it as is."
)
contextualize_q_prompt = ChatPromptTemplate.from_messages(
    [
        ("system", contextualize_q_system_prompt),
        MessagesPlaceholder("chat_history"),
        ("human", "{input}"),
    ]
)


# Create history-aware retriever
history_aware_retriever = create_history_aware_retriever(llm, retriever, contextualize_q_prompt)

# Answer question prompt
qa_system_prompt = (
    "You are an AI assistant helping users with questions about UAE Freezones and business setup.\n"
    "You will be given a context. If the context is helpful, use it to answer the question.\n"
    "If the context is empty or irrelevant, DO NOT guess. Instead, return exactly this:\n"
    "__NO_CONTEXT__\n"
    "Otherwise, provide a helpful answer (max 3 sentences).\n\n"
    "Context:\n{context}"
)
qa_prompt = ChatPromptTemplate.from_messages(
    [
        ("system", qa_system_prompt),
        MessagesPlaceholder("chat_history"),
        ("human", "{input}"),
    ]
)


# Create question-answering and retrieval chains
question_answer_chain = create_stuff_documents_chain(llm, qa_prompt)

rag_chain = create_retrieval_chain(history_aware_retriever, question_answer_chain)

chat_history = []

async def query_rag(query: str, session_id: str = str(uuid.uuid4())) -> Optional[str]:
    """
    Query the RAG engine using LangChain with Gemini 2.0 Flash.

    Args:
        query (str): The user query to process.
        session_id (str, optional): Unique identifier for the user session to track chat history.
                                   Defaults to a new UUID if not provided.

    Returns:
        Optional[str]: The generated response or None if an error occurs.

    Raises:
        HTTPException: If the query is invalid or an error occurs during processing.
    """
    if not query or not isinstance(query, str):
        raise HTTPException(status_code=400, detail="Invalid or empty query")

    logger.info(f"Querying RAG with data: query='{query}', session_id='{session_id}'")
    logger.info(f"Querying RAG with query: {query}")
    logger.info(f"chat_history before: {chat_history}")

    try:
        # Retrieve chat history from Supabase (commented out for now)
        # response = supabase_client.table("chat_history").select("*").eq("session_id", session_id).execute()
        # chat_history = [HumanMessage(content=msg["content"]) if msg["role"] == "human" else SystemMessage(content=msg["content"]) 
        #                 for msg in response.data] if response.data else []

        # Call the RAG chain
        result = await rag_chain.ainvoke({"input": query, "chat_history": chat_history})
        response = result["answer"].strip()
        logger.info(f"RAG response: {response}")

        # Append messages locally (for fallback purposes)
        chat_history.append(HumanMessage(content=query))
        

        # Trigger fallback if special token is returned
        if "__NO_CONTEXT__" in response:
            logger.warning("Fallback triggered due to missing context flag from prompt.")
            fallback_prompt = [
                SystemMessage(content=(
                "You are an AI assistant helping users decide between UAE free zones.\n"
                "Use numbered lists only for steps or options.\n"
                "Do not use bold (**), asterisks (*), or Markdown.\n"
                "Respond only in clean plain text with no special characters or formatting.\n"
                "Each point should be on a new line and start with '1.', '2.', etc.\n"
                "Be professional and clear."
                "While answering keep the chat history in mind which I am giving along with the query.\n"
            )),
                *chat_history,
                HumanMessage(content=query)
            ]
            fallback_response = await llm.ainvoke(fallback_prompt)
            
            logger.info(f'Fallback response: {fallback_response.content.strip()}')


            fallback_prompt2 = [
                SystemMessage(content=(
                    "If the reponse contains multiple steps, present them as a numbered list starting with '1.', '2.', etc. and ask those steps one by one.\n"
                    "Otherwise just retuen the response as is."
                    "Also remove any special characters, bold text, asterisks, or Markdown formatting.\n"
            )),
                *chat_history,
                HumanMessage(content=fallback_response.content.strip())
            ]
            fallback_response2 = await llm.ainvoke(fallback_prompt2)

            logger.info(f'Appending Fall back response into chat history: {fallback_response2.content.strip()}')
            chat_history.append(SystemMessage(content=fallback_response2.content.strip()))

            return fallback_response2.content.strip()


        logger.info(f"Appending normal response into chat history: {response}")

        chat_history.append(SystemMessage(content=response))
        # Return normal RAG response

        logger.info(f"chat_history After: {chat_history}")
        

        return response

    except Exception as e:
        logger.error(f"Error in query_rag: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to process query")





# ----------------------------------------------- Running Prev Code ----------------------------------------------



# --------------------------------new clude code -----------------------------------------------------------------

# app/services/rag_engine.py

# import os
# from typing import Optional, List, Dict, Any
# from fastapi import HTTPException
# from dotenv import load_dotenv
# import google.generativeai as genai
# from langchain.chains import create_history_aware_retriever, create_retrieval_chain, LLMChain
# from langchain.chains.combine_documents import create_stuff_documents_chain
# from langchain_chroma import Chroma
# from langchain_core.messages import HumanMessage, SystemMessage
# from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
# from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
# from langchain_community.document_loaders import PyPDFLoader
# from langchain.text_splitter import CharacterTextSplitter
# import uuid
# from uuid import uuid4
# import time
# from tenacity import retry, stop_after_attempt, wait_fixed, retry_if_exception_type
# import logging
# from chromadb.utils import embedding_functions  # Import Chroma embedding functions
# from langchain_community.vectorstores import LanceDB
# from supabase import create_client, Client
# import re
# import json

# # Configure logging
# logging.basicConfig(level=logging.INFO)
# logger = logging.getLogger(__name__)

# # Load environment variables
# load_dotenv()

# # Configure Google Generative AI
# genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

# # Initialize Supabase client
# SUPABASE_URL = os.getenv("SUPABASE_URL")
# SUPABASE_KEY = os.getenv("SUPABASE_KEY")
# supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# # Initialize embeddings
# embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001")

# # Define paths
# app_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# persistent_directory = os.path.join(app_dir, "db", "lancedb")
# folder_path = os.path.join(app_dir, "Freezone_Research")  # Folder containing PDFs

# # Session storage for conversation states
# conversation_states = {}

# # Initialize vector store
# if not os.path.exists(persistent_directory):
#     logger.info("Persistent directory does not exist. Initializing LanceDB vector store...")

#     # Ensure folder exists
#     if not os.path.exists(folder_path):
#         raise FileNotFoundError(f"The folder {folder_path} does not exist.")

#     # Load all PDF files from the folder
#     documents = []
#     pdf_files = [f for f in os.listdir(folder_path) if f.endswith('.pdf')]
    
#     if not pdf_files:
#         raise FileNotFoundError(f"No PDF files found in {folder_path}.")

#     # Process each PDF file
#     for pdf_file in pdf_files:
#         file_path = os.path.join(folder_path, pdf_file)
#         loader = PyPDFLoader(file_path)
#         documents.extend(loader.load())

#     # Split documents
#     text_splitter = CharacterTextSplitter(chunk_size=500, chunk_overlap=100)
#     docs = text_splitter.split_documents(documents)

#     logger.info(f"Number of document chunks: {len(docs)}")
#     logger.info(f"Sample chunk:\n{docs[0].page_content}\n")

#     # Sanitize metadata
#     for doc in docs:
#         if not isinstance(doc.metadata, dict):
#             doc.metadata = {}
#         doc.metadata = {k: str(v) for k, v in doc.metadata.items()}

#     # Initialize LanceDB
#     logger.info("Creating new LanceDB table...")
#     vector_store = LanceDB.from_documents(
#         documents=docs,
#         embedding=embeddings,
#         uri=persistent_directory,
#         table_name="example_collection"
#     )
#     logger.info("LanceDB vector store initialized successfully.")
# else:
#     logger.info("Loading existing LanceDB vector store...")
#     vector_store = LanceDB(
#         uri=persistent_directory,
#         embedding=embeddings,
#         table_name="example_collection"
#     )

# retriever = vector_store.as_retriever(search_type="similarity", search_kwargs={"k": 3})

# # Initialize LLM with gemini-2.0-flash
# llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash", google_api_key=os.getenv("GOOGLE_API_KEY"))

# # Contextualize question prompt
# contextualize_q_system_prompt = (
#     "Given user question "
#     "formulate a standalone question which can be understood "
#     "without the chat history. Do NOT answer the question, just "
#     "reformulate it if needed and otherwise return it as is."
# )
# contextualize_q_prompt = ChatPromptTemplate.from_messages(
#     [
#         ("system", contextualize_q_system_prompt),
#         MessagesPlaceholder("chat_history"),
#         ("human", "{input}"),
#     ]
# )

# # Create history-aware retriever
# history_aware_retriever = create_history_aware_retriever(llm, retriever, contextualize_q_prompt)

# # Answer question prompt
# qa_system_prompt = (
#     "You are an AI assistant helping users with questions about UAE Freezones, Mainland and Offshore business setup.\n"
#     "You will be given a context. If the context is helpful, use it to answer the question.\n"
#     "If the context is empty or irrelevant, DO NOT guess. Instead, return exactly this:\n"
#     "__NO_CONTEXT__\n"
#     "Otherwise, provide a helpful answer (max 3 sentences).\n\n"
#     "Context:\n{context}"
# )
# qa_prompt = ChatPromptTemplate.from_messages(
#     [
#         ("system", qa_system_prompt),
#         MessagesPlaceholder("chat_history"),
#         ("human", "{input}"),
#     ]
# )

# # Create question-answering and retrieval chains
# question_answer_chain = create_stuff_documents_chain(llm, qa_prompt)
# rag_chain = create_retrieval_chain(history_aware_retriever, question_answer_chain)

# chat_history = []

# def detect_numbered_list(text: str) -> bool:
#     """
#     Detect if text contains numbered lists (1., 2., 3., etc.)
#     """
#     pattern = r'^\d+\.\s'
#     lines = text.strip().split('\n')
#     numbered_lines = sum(1 for line in lines if re.match(pattern, line.strip()))
#     return numbered_lines >= 2  # At least 2 numbered items

# def extract_questions_from_list(text: str) -> List[str]:
#     """
#     Extract questions from numbered list format
#     """
#     questions = []
#     pattern = r'^\d+\.\s(.+?)(?=\s*\d+\.|$)'
#     matches = re.findall(pattern, text, re.MULTILINE | re.DOTALL)
    
#     for match in matches:
#         question = match.strip()
#         if question:
#             questions.append(question)
    
#     return questions

# def get_conversation_state(session_id: str) -> Dict[str, Any]:
#     """
#     Get conversation state for a session
#     """
#     if session_id not in conversation_states:
#         conversation_states[session_id] = {
#             "questions": [],
#             "current_question_index": 0,
#             "collected_info": {},
#             "original_query": ""
#         }
#     return conversation_states[session_id]

# def save_conversation_state(session_id: str, state: Dict[str, Any]):
#     """
#     Save conversation state for a session
#     """
#     conversation_states[session_id] = state

# async def handle_interactive_fallback(query: str, session_id: str) -> str:
#     """
#     Handle interactive fallback with step-by-step questioning
#     """
#     state = get_conversation_state(session_id)
    
#     # Check if user is answering a previous question
#     if state["questions"] and state["current_question_index"] < len(state["questions"]):
#         # Store the user's answer
#         current_q_index = state["current_question_index"]
#         state["collected_info"][f"answer_{current_q_index}"] = query
#         state["current_question_index"] += 1
        
#         # Check if we have more questions
#         if state["current_question_index"] < len(state["questions"]):
#             next_question = state["questions"][state["current_question_index"]]
#             save_conversation_state(session_id, state)
#             return next_question
#         else:
#             # All questions answered, provide final response
#             return await generate_final_response(state, session_id)
    
#     # Initial fallback - generate questions
#     fallback_prompt = [
#         SystemMessage(content=(
#             "You are a helpful UAE business advisor. The user needs help with business setup.\n"
#             "If your response have to include multiple question, then ask the questions in the given format"
#             "Generate 4-5 SHORT, simple questions to understand their needs.\n"
#             "REQUIREMENTS:\n"
#             "- Each question should be numbered (1., 2., 3., etc.)\n"
#             "- Keep questions brief (max 10 words each)\n"
#             "- Ask only essential info: business type, activities, target market, budget, timeline\n"
#             "- No explanations or additional text\n"
#             "- No bold text or special formatting\n"
#             "- Plain text only\n"
#             "Example format:\n"
#             "1. What type of business do you want to start?\n"
#             "2. What activities will your business do?\n"
#             "3. Who is your target market?\n"
#             "4. What is your budget range?\n"
#             "5. When do you want to launch?"
#             "Otherwise you can just answer the question as is."
#         )),
#         *chat_history,
#         HumanMessage(content=query)
#     ]

#     logger.info(f"Fallback prompt: {fallback_prompt}")
    
#     fallback_response = await llm.ainvoke(fallback_prompt)
#     response_text = fallback_response.content.strip()
    
#     # Check if response contains numbered list
#     if detect_numbered_list(response_text):
#         questions = extract_questions_from_list(response_text)
        
#         if questions:
#             # Store questions and state
#             state["questions"] = questions
#             state["current_question_index"] = 0
#             state["original_query"] = query
#             state["collected_info"] = {}
#             save_conversation_state(session_id, state)
            
#             # Return first question with intro
#             intro = "I'd be happy to help you with your UAE business setup. Let me ask you a few questions to provide the best guidance."
#             first_question = questions[0]
#             return f"{intro}\n\n{first_question}"
    
#     # If no numbered list detected, return original response
#     return response_text

# async def generate_final_response(state: Dict[str, Any], session_id: str) -> str:
#     """
#     Generate final comprehensive response based on collected information
#     """
#     # Compile collected information
#     info_summary = []
#     for i, question in enumerate(state["questions"]):
#         answer_key = f"answer_{i}"
#         if answer_key in state["collected_info"]:
#             info_summary.append(f"Q: {question}")
#             info_summary.append(f"A: {state['collected_info'][answer_key]}")
    
#     compiled_info = "\n".join(info_summary)
    
#     # Generate comprehensive response
#     final_prompt = [
#         SystemMessage(content=(
#             "You are a helpful UAE business setup advisor. Based on the user's answers, provide a brief, conversational response.\n"
#             "IMPORTANT RULES:\n"
#             "- Keep it concise (maximum 3-4 sentences)\n"
#             "- Be conversational and friendly\n"
#             "- Give ONE specific recommendation\n"
#             "- No bold text, bullets, or complex formatting\n"
#             "- No numbered lists or sections\n"
#             "- Write in plain text only\n"
#             "- Sound like you're talking to a friend\n"
#             "- End with an offer to help with next steps"
#         )),
#         HumanMessage(content=f"Original Query: {state['original_query']}\n\nUser's Answers:\n{compiled_info}\n\nGive a brief, friendly recommendation.")
#     ]
    
#     final_response = await llm.ainvoke(final_prompt)
    
#     # Clear conversation state after final response
#     if session_id in conversation_states:
#         del conversation_states[session_id]
    
#     return final_response.content.strip()

# async def query_rag(query: str, session_id: str = str(uuid.uuid4())) -> Optional[str]:
#     """
#     Query the RAG engine using LangChain with Gemini 2.0 Flash.
#     Enhanced with interactive fallback logic.

#     Args:
#         query (str): The user query to process.
#         session_id (str, optional): Unique identifier for the user session to track chat history.
#                                    Defaults to a new UUID if not provided.

#     Returns:
#         Optional[str]: The generated response or None if an error occurs.

#     Raises:
#         HTTPException: If the query is invalid or an error occurs during processing.
#     """
#     if not query or not isinstance(query, str):
#         raise HTTPException(status_code=400, detail="Invalid or empty query")

#     logger.info(f"Querying RAG with data: query='{query}', session_id='{session_id}'")
#     logger.info(f"chat_history: {chat_history}")

#     try:
#         # Check if user is in middle of interactive conversation
#         state = get_conversation_state(session_id)
#         if state["questions"] and state["current_question_index"] < len(state["questions"]):
#             # User is answering questions, handle interactively
#             return await handle_interactive_fallback(query, session_id)
        
#         # Normal RAG flow
#         result = await rag_chain.ainvoke({"input": query, "chat_history": chat_history})
#         response = result["answer"].strip()
#         logger.info(f"RAG response: {response}")

#         # Append messages locally (for fallback purposes)
#         chat_history.append(HumanMessage(content=query))
#         chat_history.append(SystemMessage(content=response))

#         # Trigger fallback if special token is returned
#         if "__NO_CONTEXT__" in response:
#             logger.warning("Fallback triggered due to missing context flag from prompt.")
#             fall_back_resp = await handle_interactive_fallback(query, session_id)
#             chat_history.append(SystemMessage(content=fall_back_resp))
#             return fall_back_resp

#         # Return normal RAG response
#         return response

#     except Exception as e:
#         logger.error(f"Error in query_rag: {str(e)}")
#         raise HTTPException(status_code=500, detail="Failed to process query")

# # Additional utility functions for session management
# def reset_conversation_state(session_id: str):
#     """
#     Reset conversation state for a specific session
#     """
#     if session_id in conversation_states:
#         del conversation_states[session_id]

# def get_conversation_progress(session_id: str) -> Dict[str, Any]:
#     """
#     Get conversation progress for debugging/monitoring
#     """
#     state = get_conversation_state(session_id)
#     return {
#         "total_questions": len(state["questions"]),
#         "current_question": state["current_question_index"],
#         "questions_answered": state["current_question_index"],
#         "questions_remaining": len(state["questions"]) - state["current_question_index"]
#     }






# # app/services/rag_engine.py

# import google.generativeai as genai
# from app.cors.config import GOOGLE_API_KEY

# genai.configure(api_key=GOOGLE_API_KEY)

# async def query_rag(query: str) -> str:
#     try:
#         model = genai.GenerativeModel(model_name="models/gemini-2.0-flash")
#         response = model.generate_content([{"role": "user", "parts": [query]}])
#         return response.text
#     except Exception as e:
#         print("Gemini API Error:", str(e))
#         return "Sorry, I couldn't get a response from the AI model."
