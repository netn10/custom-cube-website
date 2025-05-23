import os
import requests
import io
import argparse
from PIL import Image
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from pymongo import MongoClient
from dotenv import load_dotenv
from tqdm import tqdm
import tempfile
import sys

# Load environment variables
load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.dirname(__file__)), 'backend', '.env'))

# MongoDB connection
MONGO_URI = os.getenv("MONGO_URI", "mongodb+srv://username:password@cluster.mongodb.net/mtgcube")
try:
    client = MongoClient(MONGO_URI)
    db = client["mtgcube"]
    print("Connected to MongoDB successfully")
except Exception as e:
    print(f"Failed to connect to MongoDB: {e}")
    sys.exit(1)

def get_default_image_for_colors(colors):
    """Return a custom placeholder image URL based on card colors"""
    # Use imgur placeholder images based on colors
    if not colors:
        # Colorless
        return "https://i.imgur.com/QrFDrPv.png"

    # For single colors
    if len(colors) == 1:
        color_map = {
            "W": "https://i.imgur.com/KwNKcbO.png",  # White placeholder
            "U": "https://i.imgur.com/fVuTogB.png",  # Blue placeholder
            "B": "https://i.imgur.com/G2qmCPY.png",  # Black placeholder
            "R": "https://i.imgur.com/AlnmKYi.png",  # Red placeholder
            "G": "https://i.imgur.com/rBLUUDl.png",  # Green placeholder
        }
        return color_map.get(colors[0], "https://i.imgur.com/QrFDrPv.png")

    # For multicolor
    return "https://i.imgur.com/MNDyDPT.png"  # Generic multicolor placeholder

def download_image(url, max_retries=3):
    """Download an image from a URL and return it as a PIL Image object"""
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    }
    
    for attempt in range(max_retries):
        try:
            response = requests.get(url, stream=True, headers=headers, timeout=10)
            response.raise_for_status()
            
            # Check if we actually got an image
            content_type = response.headers.get('Content-Type', '')
            if not content_type.startswith('image/'):
                print(f"Warning: Content from {url} is not an image (Content-Type: {content_type})")
                if attempt < max_retries - 1:
                    continue
                return None
            
            # Open the image using PIL
            image = Image.open(io.BytesIO(response.content))
            return image
            
        except Exception as e:
            print(f"Error downloading {url} (Attempt {attempt+1}/{max_retries}): {e}")
            if attempt == max_retries - 1:
                return None
    
    return None

def create_pdf(cards, output_file="all_cards.pdf", cards_per_page=9, card_width=180, card_height=250):
    """Create a PDF with all card images"""
    # Calculate page layout
    page_width, page_height = letter
    margin = 20
    cols = 3
    rows = 3
    
    # Calculate spacing
    h_spacing = (page_width - 2 * margin - cols * card_width) / (cols - 1) if cols > 1 else 0
    v_spacing = (page_height - 2 * margin - rows * card_height) / (rows - 1) if rows > 1 else 0
    
    # Create PDF
    c = canvas.Canvas(output_file, pagesize=letter)
    
    # Track position
    current_row = 0
    current_col = 0
    
    # Create a temporary directory to store downloaded images
    temp_dir = tempfile.mkdtemp()
    print(f"Created temporary directory: {temp_dir}")
    
    # Process each card
    print(f"Creating PDF with {len(cards)} cards...")
    for i, card in enumerate(tqdm(cards, desc="Processing cards")):
        # Get image URL
        image_url = card.get('imageUrl')
        if not image_url:
            print(f"No image URL for card: {card.get('name', 'Unknown')}")
            # Use placeholder image based on card colors
            colors = card.get('colors', [])
            image_url = get_default_image_for_colors(colors)
        
        # Download image
        img = download_image(image_url)
        if img is None:
            print(f"Failed to download image for card: {card.get('name', 'Unknown')}")
            continue
        
        # Calculate position on page
        x = margin + current_col * (card_width + h_spacing)
        y = page_height - margin - (current_row + 1) * card_height - current_row * v_spacing
        
        # Convert RGBA to RGB if needed (JPEG doesn't support alpha channel)
        if img.mode == 'RGBA':
            # Create a white background
            background = Image.new('RGB', img.size, (255, 255, 255))
            # Paste the image on the background using the alpha channel as mask
            background.paste(img, mask=img.split()[3])
            img = background
        
        # Save image to temporary file
        temp_img_path = os.path.join(temp_dir, f"temp_img_{i}.jpg")
        img.save(temp_img_path, "JPEG")
        
        # Add image to PDF
        c.drawImage(temp_img_path, x, y, width=card_width, height=card_height)
        
        # Update position
        current_col += 1
        if current_col >= cols:
            current_col = 0
            current_row += 1
            
        # New page if needed
        if current_row >= rows:
            c.showPage()
            current_row = 0
            current_col = 0
        
        # Clean up temporary file
        os.remove(temp_img_path)
    
    # Save the last page if there are any cards on it
    if current_row > 0 or current_col > 0:
        c.showPage()
    
    # Save PDF
    c.save()
    
    # Clean up temporary directory
    try:
        os.rmdir(temp_dir)
    except Exception as e:
        print(f"Warning: Could not remove temporary directory {temp_dir}: {e}")
        print("This is not critical and the PDF should still be created successfully.")
    
    print(f"PDF created successfully: {output_file}")
    return output_file

def main():
    # Parse command line arguments
    parser = argparse.ArgumentParser(description="Create a PDF with all card or token images from MongoDB")
    parser.add_argument("--tokens", action="store_true", help="Download token images instead of card images")
    parser.add_argument("--output", "-o", default=None, help="Output PDF file name")
    args = parser.parse_args()
    
    # Determine collection and default output file name
    if args.tokens:
        collection = db.tokens
        default_output = "all_tokens.pdf"
        print("Downloading token images...")
    else:
        collection = db.cards
        default_output = "all_cards.pdf"
        print("Downloading card images...")
    
    # Get all items from the database
    items = list(collection.find({}))
    print(f"Found {len(items)} items in the database")
    
    # Create output directory if it doesn't exist
    output_dir = os.path.dirname(os.path.abspath(__file__))
    output_file = os.path.join(output_dir, args.output if args.output else default_output)
    
    # Create PDF with all images
    create_pdf(items, output_file)

if __name__ == "__main__":
    main()