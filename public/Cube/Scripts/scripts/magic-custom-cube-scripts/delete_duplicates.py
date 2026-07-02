import os
import hashlib
from tqdm import tqdm


def calculate_hash(file_path):
    """
    Calculate the hash of a file to detect duplicates.

    :param file_path: Path to the file.
    :return: Hash of the file.
    """
    hasher = hashlib.md5()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            hasher.update(chunk)
    return hasher.hexdigest()


def delete_duplicates(input_folder):
    """
    Delete duplicate files in the folder, ignoring numbers and underscores in filenames.

    :param input_folder: Path to the folder.
    """
    if not os.path.exists(input_folder):
        raise FileNotFoundError(f"The folder {input_folder} does not exist.")

    seen_files = {}
    supported_formats = (".png", ".jpg", ".jpeg", ".bmp", ".gif", ".tiff")

    # List all files that match the supported formats for tqdm progress bar
    all_files = []
    for root, _, files in os.walk(input_folder):
        for file in files:
            if file.lower().endswith(supported_formats):
                all_files.append(os.path.join(root, file))

    # Use tqdm to display the progress bar while processing files
    for file_path in tqdm(all_files, desc="Deleting duplicates", unit="file"):
        try:
            file = os.path.basename(file_path)
            base_name = os.path.splitext(file)[0]
            normalized_name = "".join(
                filter(str.isalpha, base_name)
            )  # Remove numbers and underscores

            file_hash = calculate_hash(file_path)

            if (normalized_name, file_hash) in seen_files:
                os.remove(file_path)
                print(f"Deleted duplicate: {file_path}")
            else:
                seen_files[(normalized_name, file_hash)] = file_path
        except Exception as e:
            print(f"Failed to process {file_path}: {e}")


if __name__ == "__main__":
    # Input folder containing files
    input_folder = input("Enter the path to the folder to clean up duplicates: ")

    try:
        delete_duplicates(input_folder)
        print("Duplicate cleanup completed.")
    except Exception as e:
        print(f"An error occurred: {e}")
