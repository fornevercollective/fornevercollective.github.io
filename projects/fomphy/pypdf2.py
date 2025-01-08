from PyPDF2 import PdfReader

# Paths to the uploaded PDFs
pdf_paths = [
    "/mnt/data/Metaphysics of frequency in human bodies their connections to piezoelectricity zero point field harmonic spins in super computers.pdf",
    "/mnt/data/Metaphysics of frequency in human bodies their connections to piezoelectricity zero point field harmonic spins in super computers-1.pdf",
    "/mnt/data/Metaphysics of frequency in human bodies their connections to piezoelectricity zero point field harmonic spins in super computers-2.pdf",
    "/mnt/data/Metaphysics of frequency in human bodies their connections to piezoelectricity zero point field harmonic spins in super computers-3.pdf"
]

# Extract content from PDFs
pdf_contents = {}
for idx, pdf_path in enumerate(pdf_paths, start=1):
    reader = PdfReader(pdf_path)
    text = []
    for page in reader.pages:
        text.append(page.extract_text())
    pdf_contents[f"Document_{idx}"] = "\n".join(text)

# Return the structure of extracted text (keys and summary of content length)
{key: len(content) for key, content in pdf_contents.items()}
