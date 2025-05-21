#!/usr/bin/env python3
# This script patches the app.py file to allow colorless cards and tokens
# by modifying the validation logic for both add_card and add_token functions

import re

# Load the app.py file
with open('app.py', 'r') as f:
    content = f.read()

# Fix for add_card function
card_pattern = r"if not data\.get\('colors'\) or not isinstance\(data\.get\('colors'\), list\):\s+return jsonify\({\"error\": \"Card colors must be provided as a list\"\}\), 400"
card_replacement = """if data.get('colors') is not None and not isinstance(data.get('colors'), list):
            return jsonify({"error": "Card colors must be provided as a list"}), 400
            
        # Ensure colors is an array even if not provided (colorless card)
        if 'colors' not in data or data.get('colors') is None:
            data['colors'] = []"""

# Fix for add_token function
token_pattern = r"if not token_data\.get\('colors'\) or not isinstance\(token_data\.get\('colors'\), list\):\s+return jsonify\({'error': 'Colors must be provided as an array'\}\), 400"
token_replacement = """if token_data.get('colors') is not None and not isinstance(token_data.get('colors'), list):
            return jsonify({'error': 'Colors must be provided as an array'}), 400
        
        # Ensure colors is an array even if not provided (colorless token)
        if 'colors' not in token_data or token_data.get('colors') is None:
            token_data['colors'] = []"""

# Apply the fixes
modified_content = re.sub(card_pattern, card_replacement, content)
modified_content = re.sub(token_pattern, token_replacement, modified_content)

# Write the modified content back
with open('app.py', 'w') as f:
    f.write(modified_content)

print("Successfully patched app.py to support colorless cards and tokens!")
