from PIL import Image
import os
from fpdf import FPDF
import tempfile

# from tqdm import tqdm  # Removed for speed


def images_to_single_card_pdf(input_folder, output_pdf):
    """
    Convert all images in a folder into a single PDF, placing one card per page.
    Each card is centered on its page at 63 mm × 88 mm (standard MTG size).
    """
    if not os.path.exists(input_folder):
        raise FileNotFoundError(f"The folder {input_folder} does not exist.")

    # Supported image formats
    supported_formats = (".png", ".jpg", ".jpeg", ".bmp", ".gif", ".tiff")

    # Collect all images from the folder and subfolders
    images = []
    for root, dirs, files in os.walk(input_folder):
        for file in files:
            if file.lower().endswith(supported_formats):
                images.append(os.path.join(root, file))
    images = sorted(images)

    if not images:
        raise ValueError("No supported images found in the folder.")

    # Initialize PDF (A4 size, portrait)
    pdf = FPDF(orientation="P", unit="mm", format="A4")

    # Card dimensions in mm (actual MTG size)
    card_width = 63
    card_height = 88

    # A4 dimensions in mm
    a4_width = 210
    a4_height = 297

    # Calculate centered position for the card on A4 page
    center_x = (a4_width - card_width) / 2
    center_y = (a4_height - card_height) / 2

    print(f"Processing {len(images)} images...")
    print(
        f"Each card will be centered at {center_x:.1f}mm, {center_y:.1f}mm on A4 pages"
    )

    with tempfile.TemporaryDirectory() as temp_dir:
        # Process each image individually
        for idx, image_path in enumerate(images):
            if idx % 50 == 0:  # Progress indicator every 50 images
                print(f"Processing image {idx + 1}/{len(images)}")
            # Add a new page for each card
            pdf.add_page()

            # Create a temporary file for this image
            temp_path = os.path.join(temp_dir, f"temp_image_{idx}.jpg")

            try:
                # Try opening and converting the image (optimized for speed)
                img = Image.open(image_path)
                if img.mode == "RGBA":
                    # Convert RGBA to RGB with white background
                    background = Image.new("RGB", img.size, (255, 255, 255))
                    background.paste(img, mask=img.split()[-1])
                    img = background

                # Resize to smaller dimensions for faster processing
                img = img.resize(
                    (400, 560), Image.LANCZOS
                )  # Smaller but still readable
                img.save(temp_path, "JPEG", quality=75, optimize=True)

                # Place the card centered on the page
                pdf.image(
                    temp_path, x=center_x, y=center_y, w=card_width, h=card_height
                )

            except Exception as e:
                print(f"Warning: Could not process {image_path}: {e}")
                continue

    # Save the final PDF
    pdf.output(output_pdf)
    print(f"PDF created successfully at {output_pdf}")
    print(f"Total pages: {len(images)}")


if __name__ == "__main__":
    print("=== Single Card Per Page PDF Creator ===")
    print("This script creates a PDF with one card per page, centered on each page.")
    print()

    # Use hardcoded paths for your cube cards
    input_folder = r"C:\Users\netn1\Desktop\Cube\First Batch"
    output_pdf = r"C:\Users\netn1\Desktop\Cube\First Batch\Fixed_Single_Cards.pdf"

    print(f"Using input folder: {input_folder}")
    print(f"Output PDF will be: {output_pdf}")

    if not output_pdf.endswith(".pdf"):
        output_pdf += ".pdf"

    try:
        images_to_single_card_pdf(input_folder, output_pdf)
        print("\n✓ Success! Your single-card-per-page PDF is ready.")
    except Exception as e:
        print(f"\n✗ An error occurred: {e}")
        input("Press Enter to exit...")
