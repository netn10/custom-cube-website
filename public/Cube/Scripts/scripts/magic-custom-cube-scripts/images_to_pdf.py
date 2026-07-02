from PIL import Image
import os
from fpdf import FPDF
import tempfile


def images_to_pdf(input_folder, output_pdf):
    """
    Convert all images in a folder into a single PDF, placing 9 cards per page
    (3×3 grid), each forced to 63 mm × 88 mm.
    """
    if not os.path.exists(input_folder):
        raise FileNotFoundError(f"The folder {input_folder} does not exist.")

    # Supported image formats
    supported_formats = (".png", ".jpg", ".jpeg", ".bmp", ".gif", ".tiff")

    # Collect all images from the folder
    images = [
        os.path.join(input_folder, file)
        for file in sorted(os.listdir(input_folder))
        if file.lower().endswith(supported_formats)
    ]

    if not images:
        raise ValueError("No supported images found in the folder.")

    # Initialize PDF (A4 size, portrait)
    pdf = FPDF(orientation="P", unit="mm", format="A4")

    # Card dimensions in mm (actual MTG size)
    card_width = 63
    card_height = 88

    # Starting offsets for the first card
    offset_x = 10
    offset_y = 10

    # Gap between cards (horizontal and vertical)
    gap_x = 0  # Set to >0 for horizontal gap
    gap_y = 0  # Set to >0 for vertical gap

    # Dynamically compute card positions based on gap
    # 3 columns, 3 rows
    positions = [
        # Row 1
        (offset_x, offset_y),
        (offset_x + card_width + gap_x, offset_y),
        (offset_x + 2 * (card_width + gap_x), offset_y),
        # Row 2
        (offset_x, offset_y + card_height + gap_y),
        (offset_x + card_width + gap_x, offset_y + card_height + gap_y),
        (offset_x + 2 * (card_width + gap_x), offset_y + card_height + gap_y),
        # Row 3
        (offset_x, offset_y + 2 * (card_height + gap_y)),
        (offset_x + card_width + gap_x, offset_y + 2 * (card_height + gap_y)),
        (offset_x + 2 * (card_width + gap_x), offset_y + 2 * (card_height + gap_y)),
    ]

    # Helper to split images into chunks of up to 9
    def chunked(lst, chunk_size=9):
        for i in range(0, len(lst), chunk_size):
            yield lst[i : i + chunk_size]

    # Use a global index for naming temporary files uniquely
    global_idx = 0

    with tempfile.TemporaryDirectory() as temp_dir:
        # Process the images in groups of 9
        for group_idx, group in enumerate(chunked(images, 9)):
            pdf.add_page()

            for idx, image_path in enumerate(group):
                print(
                    f"Processing global image #{global_idx} (group {group_idx}, position {idx}): {image_path}"
                )
                temp_path = os.path.join(temp_dir, f"temp_image_{global_idx}.jpg")
                global_idx += 1

                # Try opening and converting the image
                img = Image.open(image_path)
                if img.mode == "RGBA":
                    img = img.convert("RGB")
                # Rotate if landscape
                if img.width > img.height:
                    img = img.rotate(90, expand=True)
                img.save(temp_path, "JPEG", quality=95)

                # Place each card at the correct position and size
                x, y = positions[idx]
                pdf.image(temp_path, x=x, y=y, w=card_width, h=card_height)

    # Save the final PDF
    pdf.output(output_pdf)
    print(f"PDF created successfully at {output_pdf}")


if __name__ == "__main__":
    input_folder = input("Enter the path to the folder containing images: ")
    output_pdf = input("Enter the path for the output PDF file: ")

    if not output_pdf.endswith(".pdf"):
        output_pdf += ".pdf"

    try:
        images_to_pdf(input_folder, output_pdf)
    except Exception as e:
        print(f"An error occurred: {e}")
