import os
from PIL import Image
from tqdm import tqdm


def resize_images_in_folder(input_folder, output_folder=None, target_size=(750, 1050)):
    """
    Resizes all images in the specified folder to the target size (750x1050 px),
    approximating a 2.5" x 3.5" Magic: The Gathering card at 300 DPI.

    :param input_folder: Path to the folder containing the images.
    :param output_folder: Path to the folder where resized images will be saved.
                         If None, overwrites the originals.
    :param target_size: Tuple (width, height) for resizing images.
    """
    if not os.path.exists(input_folder):
        raise FileNotFoundError(f"The folder {input_folder} does not exist.")

    if output_folder and not os.path.exists(output_folder):
        os.makedirs(output_folder)

    supported_formats = (".png", ".jpg", ".jpeg", ".bmp", ".gif", ".tiff")

    # List all image files in the folder
    image_files = [
        filename
        for filename in os.listdir(input_folder)
        if filename.lower().endswith(supported_formats)
    ]

    # Use tqdm to display the progress bar while processing files
    for filename in tqdm(image_files, desc="Resizing images", unit="file"):
        image_path = os.path.join(input_folder, filename)
        try:
            with Image.open(image_path) as img:
                resized_img = img.resize(target_size, Image.LANCZOS)

                if output_folder:
                    output_path = os.path.join(output_folder, filename)
                else:
                    output_path = image_path  # Overwrite original file

                resized_img.save(output_path)
        except Exception as e:
            print(f"Failed to process {filename}: {e}")


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

    # Resize all images
    try:
        resize_images_in_folder(input_folder, output_folder)
        print("Processing completed.")
    except Exception as e:
        print(f"An error occurred: {e}")
