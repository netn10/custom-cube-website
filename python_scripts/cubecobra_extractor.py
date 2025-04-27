import requests
import os
import time
import random
import argparse
import re
import uuid
from urllib.parse import urlparse
from tqdm import tqdm

def is_imgur_url(url):
    """Check if the URL is from Imgur"""
    return 'imgur.com' in url.lower()

def get_imgur_direct_url(url):
    """Convert standard Imgur URL to direct image URL if needed"""
    # If it's already a direct link, return it
    if re.search(r'\.(?:jpg|jpeg|png|gif)(?:\?.*)?$', url, re.IGNORECASE):
        return url
    
    # Extract the image ID
    match = re.search(r'imgur\.com/(?:a/)?([a-zA-Z0-9]+)', url)
    if match:
        img_id = match.group(1)
        # Return direct link
        if url.endswith('.jpeg') or url.endswith('.jpg') or url.endswith('.png') or url.endswith('.gif'):
            return url
        else:
            # Default to png if extension not specified
            return f"https://i.imgur.com/{img_id}.png"
    return url

def download_image(url, path, max_retries=5, base_delay=3):
    # Special handling for Imgur URLs
    if is_imgur_url(url):
        direct_url = get_imgur_direct_url(url)
        
        # Add a random user agent to avoid being detected as a bot
        user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36'
        ]
        headers = {
            'User-Agent': random.choice(user_agents),
            'Referer': 'https://imgur.com/',
            'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache'
        }
    else:
        direct_url = url
        headers = {}
    
    retries = 0
    while retries <= max_retries:
        try:
            response = requests.get(direct_url, stream=True, headers=headers, timeout=15)
            response.raise_for_status()
            
            # Check if we actually got an image
            content_type = response.headers.get('Content-Type', '')
            if not content_type.startswith('image/'):
                print(f"Warning: Content from {direct_url} is not an image (Content-Type: {content_type})")
                # Try alternative extension if it's imgur
                if is_imgur_url(direct_url) and '.png' in direct_url:
                    # Try jpg instead
                    direct_url = direct_url.replace('.png', '.jpg')
                    print(f"Retrying with alternative URL: {direct_url}")
                    continue
            
            with open(path, 'wb') as f:
                for chunk in response.iter_content(1024):
                    f.write(chunk)
            
            # Verify the file was downloaded correctly
            if os.path.getsize(path) < 100:  # If file is suspiciously small
                print(f"Warning: Downloaded file is very small ({os.path.getsize(path)} bytes)")
                with open(path, 'rb') as f:
                    content = f.read()
                if b'<!DOCTYPE html>' in content or b'<html' in content:
                    print("Downloaded HTML instead of an image, retrying...")
                    os.remove(path)  # Remove the bad file
                    retries += 1
                    continue
            
            return True  # Successfully downloaded
            
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 429:  # Rate limit exceeded
                wait_time = base_delay * (2 ** retries) + random.uniform(0, 1)  # Exponential backoff with jitter
                print(f"Rate limit exceeded for {direct_url}. Waiting {wait_time:.2f} seconds before retry {retries+1}/{max_retries}")
                time.sleep(wait_time)
                retries += 1
                if retries > max_retries:
                    print(f"Failed to download {direct_url} after {max_retries} retries: {e}")
                    return False
            else:
                print(f"Failed to download {direct_url}: {e}")
                # Try alternative extension if it's imgur
                if is_imgur_url(direct_url):
                    if '.png' in direct_url:
                        direct_url = direct_url.replace('.png', '.jpg')
                        print(f"Trying alternative URL: {direct_url}")
                        continue
                    elif '.jpg' in direct_url or '.jpeg' in direct_url:
                        direct_url = direct_url.replace('.jpg', '.png').replace('.jpeg', '.png')
                        print(f"Trying alternative URL: {direct_url}")
                        continue
                return False
        except (requests.exceptions.ConnectionError, requests.exceptions.Timeout) as e:
            wait_time = base_delay * (2 ** retries) + random.uniform(0, 1)
            print(f"Connection error for {direct_url}. Waiting {wait_time:.2f} seconds before retry {retries+1}/{max_retries}: {e}")
            time.sleep(wait_time)
            retries += 1
            if retries > max_retries:
                print(f"Failed to download {direct_url} after {max_retries} retries: {e}")
                return False
        except Exception as e:
            print(f"Failed to download {direct_url}: {e}")
            return False
    return False

def get_cube_id(cube_url):
    parsed = urlparse(cube_url)
    path_parts = parsed.path.strip('/').split('/')
    if 'cube' in path_parts and 'list' in path_parts:
        idx = path_parts.index('list')
        return path_parts[idx + 1]
    raise ValueError("Invalid CubeCobra URL")

def fetch_cube_cards(cube_id):
    api_url = f"https://cubecobra.com/cube/api/cubeJSON/{cube_id}"
    response = requests.get(api_url)
    response.raise_for_status()
    cube_data = response.json()
    return cube_data.get('cards', {}).get('mainboard', [])

def generate_unique_filename(output_dir, base_name, extension, is_custom=False):
    """Generate a unique filename to avoid overwriting existing files with the same name"""
    safe_name = base_name.replace('/', '_').replace('\\', '_')
    
    # Add (custom) suffix for custom cards
    if is_custom:
        safe_name = f"{safe_name} (custom)"
    
    filename = f"{safe_name}{extension}"
    filepath = os.path.join(output_dir, filename)
    
    # If file already exists, add a unique identifier
    counter = 1
    while os.path.exists(filepath):
        if counter == 1:
            # First duplicate, just add a number
            filename = f"{safe_name} ({counter}){extension}"
        else:
            # Subsequent duplicates, replace the previous number
            filename = f"{safe_name} ({counter}){extension}"
        filepath = os.path.join(output_dir, filename)
        counter += 1
    
    return filepath

def main(cube_url, output_dir="cube_images", retry_failed=False, specific_urls=None):
    os.makedirs(output_dir, exist_ok=True)
    
    success_count = 0
    failed_count = 0
    skipped_count = 0
    
    # Create a file to track failed downloads
    failed_log = os.path.join(output_dir, "failed_downloads.txt")
    failed_urls = set()
    
    # Process specific URLs if provided
    if specific_urls:
        print(f"Processing {len(specific_urls)} specific URLs...")
        for url_info in tqdm(specific_urls, desc="Downloading specific images"):
            parts = url_info.strip().split(',', 1)
            if len(parts) != 2:
                print(f"Invalid format for URL info: {url_info}")
                continue
                
            image_url, card_name = parts
            is_custom = is_imgur_url(image_url)
            
            # Get file extension from URL
            extension = os.path.splitext(image_url)[1].lower()
            if not extension or extension not in ['.jpg', '.jpeg', '.png', '.gif']:
                extension = '.jpg'  # Default to jpg if no valid extension
                
            filepath = generate_unique_filename(output_dir, card_name, extension, is_custom)
            
            if os.path.exists(filepath) and not retry_failed:
                skipped_count += 1
                continue
                
            success = download_image(image_url, filepath)
            if success:
                success_count += 1
            else:
                failed_count += 1
                # Log the failed URL
                with open(failed_log, 'a') as f:
                    f.write(f"{image_url},{card_name}\n")
            
            # Add variable delay between requests to avoid rate limiting
            delay = random.uniform(1.5, 3.0)  # Longer delay for Imgur
            time.sleep(delay)
        
        print(f"Download complete: {success_count} successful, {failed_count} failed, {skipped_count} skipped.")
        print(f"All images downloaded into '{output_dir}'.")
        return
    
    # Regular cube download process
    cube_id = get_cube_id(cube_url)
    print(f"Fetching cube '{cube_id}'...")

    cards = fetch_cube_cards(cube_id)
    print(f"Found {len(cards)} cards.")
    
    # Load previously failed URLs if retrying
    if retry_failed and os.path.exists(failed_log):
        with open(failed_log, 'r') as f:
            failed_urls = {line.strip().split(',')[0] for line in f if line.strip()}
        print(f"Loaded {len(failed_urls)} previously failed URLs to retry")
    
    # Clear the failed log if we're starting fresh
    if not retry_failed and os.path.exists(failed_log):
        os.remove(failed_log)
    
    for card in tqdm(cards, desc="Downloading custom art"):
        image_url = card.get('imgUrl') or card.get('details', {}).get('image_normal')
        card_name = card.get('details', {}).get('name', 'unknown_card')

        if image_url:
            is_custom = is_imgur_url(image_url)
            
            # Get file extension from URL
            extension = os.path.splitext(image_url)[1].lower()
            if not extension or extension not in ['.jpg', '.jpeg', '.png', '.gif']:
                extension = '.jpg'  # Default to jpg if no valid extension
                
            filepath = generate_unique_filename(output_dir, card_name, extension, is_custom)
            
            # Skip if file already exists and we're not specifically retrying this URL
            if os.path.exists(filepath) and (not retry_failed or image_url not in failed_urls):
                skipped_count += 1
                continue
                
            # Use a longer delay for Imgur URLs
            if is_imgur_url(image_url):
                delay_factor = 2.0
            else:
                delay_factor = 1.0
                
            success = download_image(image_url, filepath)
            if success:
                success_count += 1
                # Remove from failed list if it was there
                if image_url in failed_urls:
                    failed_urls.remove(image_url)
            else:
                failed_count += 1
                # Log the failed URL
                with open(failed_log, 'a') as f:
                    f.write(f"{image_url},{card_name}\n")
                
            # Add variable delay between requests to avoid rate limiting
            delay = random.uniform(0.7, 1.5) * delay_factor
            time.sleep(delay)

    print(f"Download complete: {success_count} successful, {failed_count} failed, {skipped_count} skipped.")
    print(f"All images downloaded into '{output_dir}'.")
    
    if failed_count > 0:
        print(f"Failed downloads were logged to {failed_log}")
        print("To retry failed downloads, run with the --retry-failed flag")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Download card images from CubeCobra")
    parser.add_argument("cube_url", nargs='?', help="CubeCobra URL (e.g., https://cubecobra.com/cube/list/...)")
    parser.add_argument("--output-dir", "-o", default="cube_images", help="Directory to save images (default: cube_images)")
    parser.add_argument("--retry-failed", "-r", action="store_true", help="Retry previously failed downloads")
    parser.add_argument("--from-file", "-f", help="File containing specific URLs to download in format 'url,name' per line")
    
    args = parser.parse_args()
    
    specific_urls = None
    if args.from_file:
        with open(args.from_file, 'r') as f:
            specific_urls = [line.strip() for line in f if line.strip()]
    elif not args.cube_url and not args.retry_failed:
        parser.error("Either cube_url, --retry-failed, or --from-file is required")
    
    main(args.cube_url, args.output_dir, args.retry_failed, specific_urls)
