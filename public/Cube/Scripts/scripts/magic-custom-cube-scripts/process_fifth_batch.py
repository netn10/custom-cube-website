#!/usr/bin/env python3
"""
Automated script to process the Fifth Batch MTG cards with all operations.
This script runs the complete workflow without requiring user input.
"""

import os
from copy_images_to_folder import copy_images_to_folder
from resize_images_in_folder import resize_images_in_folder
from images_to_pdf import images_to_pdf
from single_card_per_page_pdf import images_to_single_card_pdf
from delete_duplicates import delete_duplicates


def main():
    # Define paths for Fifth Batch processing
    input_folder = r"C:\Users\netn1\Desktop\Cube\Fifth Batch"
    consolidated_folder = r"C:\Users\netn1\Desktop\Cube\Fifth Batch\Consolidated"
    resized_folder = r"C:\Users\netn1\Desktop\Cube\Fifth Batch\Resized"
    grid_pdf_path = r"C:\Users\netn1\Desktop\Cube\Fifth Batch\Fifth_Batch_Grid.pdf"
    single_pdf_path = (
        r"C:\Users\netn1\Desktop\Cube\Fifth Batch\Fifth_Batch_Single_Cards.pdf"
    )

    print("=== MTG Card Processing for Fifth Batch ===")
    print(f"Input folder: {input_folder}")
    print()

    try:
        # Step 1: Copy and consolidate images
        print("Step 1: Copying and consolidating images...")
        if os.path.exists(input_folder):
            copy_images_to_folder(input_folder, consolidated_folder)
            print("Images consolidated successfully!")
        else:
            print(f"Input folder not found: {input_folder}")
            return

        print()

        # Step 2: Resize images
        print("Step 2: Resizing images to standard MTG size...")
        resize_images_in_folder(consolidated_folder, resized_folder)
        print("Images resized successfully!")
        print()

        # Step 3: Delete duplicates (optional but recommended)
        print("Step 3: Removing duplicate images...")
        delete_duplicates(resized_folder)
        print("Duplicates removed successfully!")
        print()

        # Step 4: Create grid PDF (3x3 layout)
        print("Step 4: Creating grid PDF (9 cards per page)...")
        images_to_pdf(resized_folder, grid_pdf_path)
        print("Grid PDF created successfully!")
        print()

        # Step 5: Create single card per page PDF
        print("Step 5: Creating single card per page PDF...")
        images_to_single_card_pdf(input_folder, single_pdf_path)
        print("Single card PDF created successfully!")
        print()

        print("=== ALL OPERATIONS COMPLETED SUCCESSFULLY! ===")
        print(f"Grid PDF: {grid_pdf_path}")
        print(f"Single Card PDF: {single_pdf_path}")
        print(f"Resized images: {resized_folder}")

    except Exception as e:
        print(f"An error occurred: {e}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    main()
