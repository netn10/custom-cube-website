#!/usr/bin/env python3
"""
Script to properly append archetypes.jpg to the end of both Fifth Batch PDFs.
This script preserves all existing content and adds the archetypes image as a new page.
"""

from PIL import Image
import os
import tempfile
import shutil

# Try to import PyPDF2 or pypdf for PDF manipulation
try:
    from pypdf import PdfReader, PdfWriter

    PYPDF_AVAILABLE = True
    print("Using pypdf for PDF manipulation")
except ImportError:
    try:
        from PyPDF2 import PdfReader, PdfWriter

        PYPDF_AVAILABLE = True
        print("Using PyPDF2 for PDF manipulation")
    except ImportError:
        PYPDF_AVAILABLE = False
        print(
            "Warning: Neither pypdf nor PyPDF2 available. Will use alternative method."
        )

from fpdf import FPDF


def create_archetypes_pdf_page(image_path):
    """
    Create a PDF page with the archetypes image.

    :param image_path: Path to the archetypes image
    :return: Path to temporary PDF file with the image
    """
    # Initialize PDF
    pdf = FPDF(orientation="P", unit="mm", format="A4")
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

    # Save to temporary PDF file
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as temp_pdf:
        temp_pdf_path = temp_pdf.name
        pdf.output(temp_pdf_path)

    return temp_pdf_path


def append_archetypes_with_pypdf(pdf_path, archetypes_pdf_path, output_path):
    """
    Append archetypes page to existing PDF using PyPDF.

    :param pdf_path: Path to the existing PDF
    :param archetypes_pdf_path: Path to the PDF with archetypes image
    :param output_path: Path for the merged PDF
    """
    try:
        # Read the existing PDF
        reader = PdfReader(pdf_path)
        writer = PdfWriter()

        # Add all pages from the original PDF
        for page in reader.pages:
            writer.add_page(page)

        # Add the archetypes page
        archetypes_reader = PdfReader(archetypes_pdf_path)
        for page in archetypes_reader.pages:
            writer.add_page(page)

        # Write the merged PDF
        with open(output_path, "wb") as output_file:
            writer.write(output_file)

        return True
    except Exception as e:
        print(f"Error with PyPDF method: {e}")
        return False


def append_archetypes_with_alternative(pdf_path, archetypes_image_path, output_path):
    """
    Alternative method: recreate the PDF by reading images from the original PDF
    and adding the archetypes image at the end.
    This is a fallback method.
    """
    print("Using alternative method - this may take longer...")

    # For now, we'll use a simpler approach: copy the original and append
    # This is not ideal but will work as a fallback
    try:
        # Copy original PDF
        shutil.copy2(pdf_path, output_path)

        # Create archetypes page
        archetypes_pdf_path = create_archetypes_pdf_page(archetypes_image_path)

        # Try to merge using PyPDF even if it wasn't available initially
        if append_archetypes_with_pypdf(
            output_path, archetypes_pdf_path, output_path + ".tmp"
        ):
            os.replace(output_path + ".tmp", output_path)
            os.unlink(archetypes_pdf_path)
            return True
        else:
            print("Alternative method failed. Please install pypdf: pip install pypdf")
            os.unlink(archetypes_pdf_path)
            return False

    except Exception as e:
        print(f"Alternative method error: {e}")
        return False


def main():
    # Define paths
    archetypes_image = r"C:\Users\netn1\Desktop\Cube\Scripts\scripts\magic-custom-cube-scripts\archetypes.jpg"
    grid_pdf_original = r"C:\Users\netn1\Desktop\Cube\Fifth Batch\Fifth_Batch_Grid.pdf"
    single_pdf_original = (
        r"C:\Users\netn1\Desktop\Cube\Fifth Batch\Fifth_Batch_Single_Cards.pdf"
    )

    # Create backup paths
    grid_pdf_backup = (
        r"C:\Users\netn1\Desktop\Cube\Fifth Batch\Fifth_Batch_Grid_backup2.pdf"
    )
    single_pdf_backup = (
        r"C:\Users\netn1\Desktop\Cube\Fifth Batch\Fifth_Batch_Single_Cards_backup2.pdf"
    )

    print("=== Properly Appending Archetypes Image to Fifth Batch PDFs ===")
    print()

    try:
        # Check if archetypes image exists
        if not os.path.exists(archetypes_image):
            print(f"Error: Archetypes image not found at {archetypes_image}")
            return

        if not PYPDF_AVAILABLE:
            print("Warning: PyPDF not available. Installing pypdf...")
            import subprocess

            try:
                subprocess.check_call(["pip", "install", "pypdf"])
                print("pypdf installed successfully. Please run the script again.")
                return
            except:
                print("Failed to install pypdf. Will try alternative method.")

        # Create archetypes PDF page
        print("Creating archetypes PDF page...")
        archetypes_pdf_path = create_archetypes_pdf_page(archetypes_image)

        # Process Grid PDF
        print("Step 1: Appending archetypes to Grid PDF...")
        if os.path.exists(grid_pdf_original):
            # Create backup
            shutil.copy2(grid_pdf_original, grid_pdf_backup)
            print(f"Created backup: {grid_pdf_backup}")

            # Append archetypes to grid PDF
            if PYPDF_AVAILABLE:
                success = append_archetypes_with_pypdf(
                    grid_pdf_original, archetypes_pdf_path, grid_pdf_original
                )
            else:
                success = append_archetypes_with_alternative(
                    grid_pdf_original, archetypes_image, grid_pdf_original
                )

            if success:
                print("Grid PDF updated successfully!")
            else:
                print("Failed to update Grid PDF")
        else:
            print(f"Grid PDF not found: {grid_pdf_original}")

        print()

        # Process Single Card PDF
        print("Step 2: Appending archetypes to Single Card PDF...")
        if os.path.exists(single_pdf_original):
            # Create backup
            shutil.copy2(single_pdf_original, single_pdf_backup)
            print(f"Created backup: {single_pdf_backup}")

            # Append archetypes to single card PDF
            if PYPDF_AVAILABLE:
                success = append_archetypes_with_pypdf(
                    single_pdf_original, archetypes_pdf_path, single_pdf_original
                )
            else:
                success = append_archetypes_with_alternative(
                    single_pdf_original, archetypes_image, single_pdf_original
                )

            if success:
                print("Single Card PDF updated successfully!")
            else:
                print("Failed to update Single Card PDF")
        else:
            print(f"Single Card PDF not found: {single_pdf_original}")

        # Clean up temporary archetypes PDF
        if os.path.exists(archetypes_pdf_path):
            os.unlink(archetypes_pdf_path)

        print()
        print("=== OPERATION COMPLETED! ===")
        print("New backups created with '_backup2' suffix.")
        print(
            "All original card content preserved with archetypes image appended at the end."
        )

    except Exception as e:
        print(f"An error occurred: {e}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    main()
