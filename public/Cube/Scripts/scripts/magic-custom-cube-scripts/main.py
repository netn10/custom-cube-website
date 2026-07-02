# Use this fill to activate all three scripts in sequence.

from images_to_pdf import images_to_pdf
from copy_images_to_folder import copy_images_to_folder
from resize_images_in_folder import resize_images_in_folder

if __name__ == "__main__":
    # Input folder containing images
    input_folder = input("Enter the path to the folder containing images: ")

    # Output folder (optional, press Enter to overwrite original images)
    output_folder = (
        input(
            "Enter the path to the output folder (or press Enter to overwrite originals): "
        ).strip()
        or None
    )

    output_pdf = input("Enter the path for the output PDF file: ")

    if not output_pdf.endswith(".pdf"):
        output_pdf += ".pdf"

    copy_images_to_folder(input_folder=input_folder, output_folder=output_folder)
    resize_images_in_folder(input_folder=input_folder, output_folder=output_folder)
    images_to_pdf(input_folder=output_folder, output_pdf=output_pdf)
