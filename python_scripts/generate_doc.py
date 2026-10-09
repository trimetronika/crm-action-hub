import sys
import json
import argparse
from docx import Document
import os

def replace_text_in_paragraphs(paragraphs, replacements):
    for p in paragraphs:
        for key, value in replacements.items():
            if key in p.text:
                # docx runs can split text, so a simple replace might not always work perfectly if the key is split across runs.
                # For a robust replacement, we just replace the text of the paragraph and clear other runs.
                # But a simple inline replace on runs works if the template doesn't split the placeholder.
                # Let's do a simple replace on the full text, and reconstruct.
                inline = p.runs
                for i in range(len(inline)):
                    if key in inline[i].text:
                        inline[i].text = inline[i].text.replace(key, value)

def replace_text_in_tables(tables, replacements):
    for table in tables:
        for row in table.rows:
            for cell in row.cells:
                replace_text_in_paragraphs(cell.paragraphs, replacements)
                replace_text_in_tables(cell.tables, replacements)

def generate_doc(template_path, output_path, data):
    try:
        doc = Document(template_path)
        
        replacements = {
            "{{NAMA_PERUSAHAAN}}": data.get("nama_perusahaan", ""),
            "{{NAMA_PIC}}": data.get("pic", ""),
            "{{TELEPON}}": data.get("telepon", ""),
            "{{NILAI_DEAL}}": data.get("nilai_deal", ""),
            "{{LAYANAN}}": data.get("layanan", "")
        }
        
        replace_text_in_paragraphs(doc.paragraphs, replacements)
        replace_text_in_tables(doc.tables, replacements)
        
        doc.save(output_path)
        return True, output_path
    except Exception as e:
        return False, str(e)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--template", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--data", required=True)
    args = parser.parse_args()
    
    data = json.loads(args.data)
    success, result = generate_doc(args.template, args.output, data)
    
    if success:
        print(json.dumps({"success": True, "file": result}))
    else:
        print(json.dumps({"success": False, "error": result}))
