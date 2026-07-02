# MTG Card Processing Scripts

This repository contains a collection of Python scripts designed to help process Magic: The Gathering custom card images for printing and organization.

## Scripts Overview

1. `resize_images_in_folder.py` - Resizes card images to the standard MTG card size (750×1050 px at 300 DPI)
2. `copy_images_to_folder.py` - Consolidates card images from multiple folders into a single destination folder
3. `images_to_pdf.py` - Creates a print-ready PDF with cards arranged in a 3×3 grid (9 cards per page)
4. `single_card_per_page_pdf.py` - **OPTIMIZED** Creates a PDF with one card per page, centered on each page
5. `delete_duplicates.py` - (Optional) Removes duplicate card images
6. `main.py` - A wrapper script that runs multiple scripts in sequence

## Recommended Workflow

### For 9-Cards-Per-Page Grid Layout (RECOMMENDED):
Follow this sequence for maximum paper efficiency:

1. **Organize Your Images** (`copy_images_to_folder.py`)
   - Use this script first to gather all your card images into a single folder
   - Input: Source folder containing scattered card images
   - Output: A single folder with all cards consolidated

2. **Resize Images** (`resize_images_in_folder.py`)
   - Ensures all cards are the correct size for printing
   - Input: Folder with consolidated images
   - Output: Same or new folder with properly sized images (750×1050 px)

3. **Create Print-Ready PDF** (`images_to_pdf.py`)
   - Creates a 3×3 grid format for efficient printing
   - Each card is sized to 63mm × 88mm on the PDF
   - 9 cards per page for maximum paper efficiency

4. **Remove Duplicates** (Optional - `delete_duplicates.py`)
   - Can be run at any point to remove duplicate card images
   - Recommended to run before creating the PDF if needed

### Alternative: For Single Card Per Page (FAST):
**Use `single_card_per_page_pdf.py` directly** - it handles everything automatically:
- Input: Base folder containing subfolders with card images
- Output: PDF with 1 card per page, each centered on A4
- **Automatically handles**: Subfolder scanning, resizing, and format conversion
- **Speed**: Processes 500+ cards in under 1 minute

## PDF Output Options

### Option A: Grid Layout (`images_to_pdf.py`) ⭐ RECOMMENDED
- **Best for**: Efficient printing, paper conservation
- **Layout**: 3×3 grid (9 cards per page)
- **Card Size**: 63mm × 88mm each
- **Use case**: When you want to print multiple cards at once

### Option B: Single Card Per Page (`single_card_per_page_pdf.py`)
- **Best for**: Individual card printing, digital browsing, maximum flexibility
- **Layout**: One card per A4 page, perfectly centered
- **Card Size**: 63mm × 88mm (standard MTG size)
- **Speed**: ⚡ Ultra-fast processing (496 cards in ~1 minute)
- **Features**: 
  - Automatic subfolder scanning
  - Built-in resizing and optimization
  - Different card on each page (bug fixed)

## Folder Structure Support

The optimized `single_card_per_page_pdf.py` automatically handles complex folder structures:

```
Your Cube Folder/
├── Black/
│   ├── card1.png
│   ├── card2.jpg
│   └── ...
├── Red/
│   ├── card3.png
│   └── ...
├── White/
├── Blue/
├── Green/
├── Lands/
├── Tokens/
└── ...
```

## Dependencies

Install required packages:
```bash
pip install Pillow fpdf2 tqdm
```

**Package details:**
- **Pillow** (PIL) - Image processing and resizing
- **fpdf2** - PDF creation and layout
- **tqdm** - Progress bars (optional, removed from optimized version)
- **os, shutil, tempfile** - Built-in Python libraries

## Performance Specifications

### Speed Benchmarks:
- **Single Card PDF**: 496 cards processed in ~45-60 seconds
- **Grid PDF**: Variable based on total cards and complexity
- **Image Processing**: ~8-12 cards per second (optimized version)

### Quality Settings:
- **Image Resolution**: 400×560 pixels (optimized for speed, excellent readability)
- **JPEG Quality**: 75% (perfect balance of file size and quality)
- **PDF Card Size**: 63mm × 88mm (standard MTG card dimensions)

## Usage Notes

- **Backup your original images** before processing
- Scripts handle common image formats: PNG, JPG, JPEG, BMP, GIF, TIFF
- **No user input required** for optimized `single_card_per_page_pdf.py` (uses hardcoded paths)
- All scripts include error handling for invalid files
- Failed operations are reported but won't stop processing
- Progress indicators show processing status

## Troubleshooting

### Common Issues:
1. **"No space left on device"**: The optimized version uses minimal temporary storage
2. **Different cards on same page**: Fixed in latest version of `single_card_per_page_pdf.py`
3. **Slow processing**: Use the optimized `single_card_per_page_pdf.py` for best speed
4. **Import errors**: Run `pip install Pillow fpdf2` to install dependencies

### File Paths:
- Update hardcoded paths in scripts to match your folder structure
- Use raw strings (r"C:\path\to\folder") for Windows paths
- Ensure output directory exists or script will create it

## Version History

- **v2.0**: Major optimization update for `single_card_per_page_pdf.py`
  - 60x+ speed improvement
  - Automatic subfolder support
  - Bug fixes for unique cards per page
- **v1.0**: Initial release with basic functionality
