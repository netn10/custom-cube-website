import os
import shutil
import sys
from datetime import datetime

def update_pdf_resources():
    """
    Copy the latest PDFs from the python_scripts directory to the public/resources directory
    for the website to serve them for download.
    """
    # Get the script directory and project root
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    
    # Define source and destination paths
    source_cards_pdf = os.path.join(script_dir, "all_cards.pdf")
    source_tokens_pdf = os.path.join(script_dir, "my_tokens.pdf")
    
    dest_dir = os.path.join(project_root, "public", "resources")
    dest_cards_pdf = os.path.join(dest_dir, "all_cards.pdf")
    dest_tokens_pdf = os.path.join(dest_dir, "my_tokens.pdf")
    
    # Ensure destination directory exists
    os.makedirs(dest_dir, exist_ok=True)
    
    # Copy the PDFs
    files_copied = 0
    
    if os.path.exists(source_cards_pdf):
        print(f"Copying cards PDF to {dest_cards_pdf}")
        shutil.copy2(source_cards_pdf, dest_cards_pdf)
        files_copied += 1
    else:
        print(f"Warning: Cards PDF not found at {source_cards_pdf}")
    
    if os.path.exists(source_tokens_pdf):
        print(f"Copying tokens PDF to {dest_tokens_pdf}")
        shutil.copy2(source_tokens_pdf, dest_tokens_pdf)
        files_copied += 1
    else:
        print(f"Warning: Tokens PDF not found at {source_tokens_pdf}")
    
    # Create a timestamp file to track when the PDFs were last updated
    if files_copied > 0:
        timestamp_file = os.path.join(dest_dir, "last_updated.txt")
        with open(timestamp_file, "w") as f:
            f.write(f"Cards PDF last updated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"Tokens PDF last updated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        
        print(f"Created timestamp file at {timestamp_file}")
        print(f"Successfully copied {files_copied} PDF file(s) to resources directory")
    else:
        print("No PDF files were copied")

if __name__ == "__main__":
    update_pdf_resources()
