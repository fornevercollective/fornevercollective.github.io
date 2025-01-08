from fastapi import FastAPI
import uvicorn
import os

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

# Function to check if a PDF file exists
def pdf_exists(doc_id: str, section_name: str) -> bool:
    pdf_path = f"/path/to/pdfs/{doc_id}/{section_name}.pdf"
    return os.path.isfile(pdf_path)

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
        if pdf_exists(doc_id, section_name):
            return {"content": document_data[doc_id][section_name]}
        return {"error": "PDF file not found"}
    return {"error": "Section not found"}