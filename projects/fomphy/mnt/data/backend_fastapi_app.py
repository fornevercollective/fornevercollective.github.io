from fastapi import FastAPI
import uvicorn

# FastAPI app instance
app = FastAPI()

# Define parsed_documents
parsed_documents = {
    "Document_1": {
        "Introduction": "Introduction content...",
        "QCD": "QCD content..."
    }
}

# In-memory storage for the parsed documents
document_data = parsed_documents

# API endpoint to get sections for a document
@app.get("/documents/{doc_id}")
def get_document_sections(doc_id: str):
    if doc_id in document_data:
        return {"sections": list(document_data[doc_id].keys())}
    return {"error": "Document not found"}

# API endpoint to get content for a specific section
@app.get("/documents/{doc_id}/sections/{section_name}")
def get_section_content(doc_id: str, section_name: str):
    if doc_id in document_data and section_name in document_data[doc_id]:
        return {"content": document_data[doc_id][section_name]}
    return {"error": "Section not found"}

# Save backend logic to a Python script
backend_script_path = "/mnt/data/backend_fastapi_app.py"
with open(backend_script_path, "w") as backend_script:
    backend_script.write("""
from fastapi import FastAPI

app = FastAPI()

# In-memory storage for parsed document data (simplified for demonstration)
document_data = {
    "Document_1": {
        "Introduction": "Introduction content...",
        "QCD": "QCD content..."
    }
}

@app.get("/documents/{doc_id}")
def get_document_sections(doc_id: str):
    if doc_id in document_data:
        return {"sections": list(document_data[doc_id].keys())}
    return {"error": "Document not found"}

@app.get("/documents/{doc_id}/sections/{section_name}")
def get_section_content(doc_id: str, section_name: str):
    if doc_id in document_data and section_name in document_data[doc_id]:
        return {"content": document_data[doc_id][section_name]}
    return {"error": "Section not found"}
    """)

backend_script_path