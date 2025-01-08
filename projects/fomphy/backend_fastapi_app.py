
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
    