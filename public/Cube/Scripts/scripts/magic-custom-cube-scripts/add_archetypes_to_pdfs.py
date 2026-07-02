#!/usr/bin/env python3
"""
Script to add archetypes.jpg to the end of both Fifth Batch PDFs.
"""

from PIL import Image
from fpdf import FPDF
import os
import tempfile


def add_image_to_pdf(pdf_path, image_path, output_path):
    """
    Add an image to the end of an existing PDF.

    :param pdf_path: Path to the existing PDF
    :param image_path: Path to the image to add
    :param output_path: Path for the new PDF with image added
    """
    if not os.path.exists(pdf_path):
        print(f"PDF not found: {pdf_path}")
        return False

    if not os.path.exists(image_path):
        print(f"Image not found: {image_path}")
        return False

    # Initialize PDF
    pdf = FPDF(orientation="P", unit="mm", format="A4")

    # Read the existing PDF pages (we'll recreate it with the image added)
    # For simplicity, we'll create a new PDF with the image as the last page

    # Add the image as a new page
    pdf.add_page()

    # Calculate image dimensions to fit nicely on A4
    a4_width = 210  # mm
    a4_height = 297  # mm
    margin = 20  # mm margin

    # Load and resize the image to fit on the page with margins
    with Image.open(image_path) as img:
        # Convert to RGB if needed
        if img.mode != "RGB":
            img = img.convert("RGB")

        # Calculate scaling to fit within margins
        img_width_mm = (
            a4_width - 2 * margin
        ) * 3.779527559  # Convert mm to pixels (approximately)
        img_height_mm = (a4_height - 2 * margin) * 3.779527559

        # Maintain aspect ratio
        img_ratio = img.width / img.height
        target_ratio = img_width_mm / img_height_mm

        if img_ratio > target_ratio:
            # Image is wider, scale by width
            new_width = int(img_width_mm)
            new_height = int(img_width_mm / img_ratio)
        else:
            # Image is taller, scale by height
            new_height = int(img_height_mm)
            new_width = int(img_height_mm * img_ratio)

        # Resize the image
        img = img.resize((new_width, new_height), Image.LANCZOS)

        # Save to temporary file
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as temp_file:
            temp_path = temp_file.name
            img.save(temp_path, "JPEG", quality=95)

        # Calculate position to center the image
        img_width_mm_final = new_width / 3.779527559  # Convert back to mm
        img_height_mm_final = new_height / 3.779527559

        center_x = (a4_width - img_width_mm_final) / 2
        center_y = (a4_height - img_height_mm_final) / 2

        # Add the image to the PDF
        pdf.image(
            temp_path,
            x=center_x,
            y=center_y,
            w=img_width_mm_final,
            h=img_height_mm_final,
        )

        # Clean up temp file
        os.unlink(temp_path)

    # Save the new PDF
    pdf.output(output_path)
    print(f"Added archetypes image to PDF: {output_path}")
    return True


def main():
    # Define paths
    archetypes_image = r"C:\Users\netn1\Desktop\Cube\Scripts\scripts\magic-custom-cube-scripts\archetypes.jpg"
    grid_pdf_original = r"C:\Users\netn1\Desktop\Cube\Fifth Batch\Fifth_Batch_Grid.pdf"
    single_pdf_original = (
        r"C:\Users\netn1\Desktop\Cube\Fifth Batch\Fifth_Batch_Single_Cards.pdf"
    )

    # Create backup paths
    grid_pdf_backup = (
        r"C:\Users\netn1\Desktop\Cube\Fifth Batch\Fifth_Batch_Grid_backup.pdf"
    )
    single_pdf_backup = (
        r"C:\Users\netn1\Desktop\Cube\Fifth Batch\Fifth_Batch_Single_Cards_backup.pdf"
    )

    print("=== Adding Archetypes Image to Fifth Batch PDFs ===")
    print()

    try:
        # Check if archetypes image exists
        if not os.path.exists(archetypes_image):
            print(f"Error: Archetypes image not found at {archetypes_image}")
            return

        # Process Grid PDF
        print("Step 1: Adding archetypes to Grid PDF...")
        if os.path.exists(grid_pdf_original):
            # Create backup
            import shutil

            shutil.copy2(grid_pdf_original, grid_pdf_backup)
            print(f"Created backup: {grid_pdf_backup}")

            # Add image to grid PDF
            if add_image_to_pdf(grid_pdf_original, archetypes_image, grid_pdf_original):
                print("Grid PDF updated successfully!")
            else:
                print("Failed to update Grid PDF")
        else:
            print(f"Grid PDF not found: {grid_pdf_original}")

        print()

        # Process Single Card PDF
        print("Step 2: Adding archetypes to Single Card PDF...")
        if os.path.exists(single_pdf_original):
            # Create backup
            shutil.copy2(single_pdf_original, single_pdf_backup)
            print(f"Created backup: {single_pdf_backup}")

            # Add image to single card PDF
            if add_image_to_pdf(
                single_pdf_original, archetypes_image, single_pdf_original
            ):
                print("Single Card PDF updated successfully!")
            else:
                print("Failed to update Single Card PDF")
        else:
            print(f"Single Card PDF not found: {single_pdf_original}")

        print()
        print("=== OPERATION COMPLETED! ===")
        print(
            "Backups created with '_backup' suffix in case you need to restore the original files."
        )

    except Exception as e:
        print(f"An error occurred: {e}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    main()
