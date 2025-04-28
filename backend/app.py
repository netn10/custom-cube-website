from flask import Flask, jsonify, request, Response
from flask_cors import CORS
from pymongo import MongoClient
import os
from bson import ObjectId
from dotenv import load_dotenv
import json
import random
from datetime import datetime
import requests

# Load environment variables
load_dotenv()

# MongoDB connection
MONGO_URI = os.getenv("MONGO_URI", "mongodb+srv://username:password@cluster.mongodb.net/mtgcube")
print(f"Connecting to MongoDB with URI: {MONGO_URI.split('@')[0]}@...")  # Log URI but hide credentials
try:
    client = MongoClient(MONGO_URI)
    # Test the connection
    db = client["mtgcube"]
    db_info = client.server_info()
    print(f"MongoDB connection successful. Server version: {db_info.get('version', 'unknown')}")
    print(f"Available databases: {client.list_database_names()}")
    print(f"Collections in mtgcube: {db.list_collection_names()}")
except Exception as e:
    print(f"MongoDB connection error: {str(e)}")
    # Don't raise the exception, allow the app to start even with DB issues

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})  # Enable CORS for all routes with proper configuration

# Custom JSON encoder to handle MongoDB ObjectId
class MongoJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, ObjectId):
            return str(obj)
        return super().default(obj)

# Set the custom JSON encoder for Flask
app.json_encoder = MongoJSONEncoder

@app.route('/', methods=['GET'])
def index():
    """Root route that provides API information"""
    return jsonify({
        "name": "Custom Cube API",
        "version": "1.0.0",
        "description": "API for Custom Cube website",
        "endpoints": [
            "/api/cards",
            "/api/cards/<card_id>",
            "/api/archetypes",
            "/api/archetypes/<archetype_id>",
            "/api/archetypes/<archetype_id>/cards",
            "/api/archetypes/random-cards",
            "/api/tokens",
            "/api/draft/pack",
            "/api/draft/bot-pick",
            "/api/suggestions",
            "/api/chatgpt/cards",
            "/api/chatgpt/response",
            "/api/gemini/response",
            "/api/image-proxy"
        ]
    })

@app.route('/api/cards', methods=['GET'])
def get_cards():
    """Get all cards with optional filtering"""
    # Get query parameters
    search = request.args.get('search', '')
    colors = request.args.get('colors', '').split(',') if request.args.get('colors') else []
    card_type = request.args.get('type', '')
    custom = request.args.get('custom', '')
    
    # Build query
    query = {}
    
    if search:
        query['name'] = {'$regex': search, '$options': 'i'}
    
    if colors and colors[0]:  # Check if colors is not empty
        color_query = []
        
        # Handle special color filters
        if 'colorless' in colors:
            # Colorless means the colors array is empty
            color_query.append({'colors': {'$size': 0}})
            # Remove 'colorless' from the colors array to avoid confusion
            colors = [c for c in colors if c != 'colorless']
        
        if 'multicolor' in colors:
            # Multicolor means the colors array has more than one color
            color_query.append({'colors': {'$exists': True, '$not': {'$size': 1}}})
            # Remove 'multicolor' from the colors array to avoid confusion
            colors = [c for c in colors if c != 'multicolor']
        
        # Add regular color filters if any remain
        if colors:
            color_query.append({'colors': {'$in': colors}})
        
        # Combine all color queries with OR
        if color_query:
            query['$or'] = color_query
    
    if card_type:
        query['type'] = {'$regex': card_type, '$options': 'i'}
    
    if custom:
        query['custom'] = custom.lower() == 'true'
    
    # Execute query
    cards = list(db.cards.find(query))
    
    # Convert ObjectId to string for each card
    for card in cards:
        card['id'] = str(card.pop('_id'))
    
    return jsonify(cards)

@app.route('/api/cards/<card_id>', methods=['GET'])
def get_card(card_id):
    """Get a single card by ID"""
    try:
        # First try to find by string ID
        card = db.cards.find_one({"_id": card_id})
        
        # If not found, try with ObjectId
        if not card:
            try:
                card = db.cards.find_one({"_id": ObjectId(card_id)})
            except:
                pass
            
        if card:
            # Convert ObjectId to string if needed
            if isinstance(card.get('_id'), ObjectId):
                card['id'] = str(card.pop('_id'))
            else:
                card['id'] = card.pop('_id')
            return jsonify(card)
        return jsonify({"error": "Card not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/archetypes', methods=['GET'])
def get_archetypes():
    """Get all archetypes"""
    archetypes = list(db.archetypes.find())
    
    # Convert ObjectId to string for each archetype
    for archetype in archetypes:
        # Use the string ID field directly instead of the MongoDB ObjectID
        if '_id' in archetype:
            # Remove the MongoDB ObjectID as we'll use the string ID
            archetype.pop('_id')
    
    return jsonify(archetypes)

@app.route('/api/archetypes/<archetype_id>', methods=['GET'])
def get_archetype(archetype_id):
    """Get a single archetype by ID"""
    try:
        # Try to find by ObjectId first
        try:
            archetype = db.archetypes.find_one({"_id": ObjectId(archetype_id)})
        except:
            # If not a valid ObjectId, try to find by string id
            archetype = db.archetypes.find_one({"id": archetype_id})
            
        if archetype:
            # Convert ObjectId to string if present
            if '_id' in archetype:
                archetype['id'] = str(archetype.pop('_id'))
            return jsonify(archetype)
        return jsonify({"error": "Archetype not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/archetypes/<archetype_id>/cards', methods=['GET'])
def get_archetype_cards(archetype_id):
    """Get all cards for a specific archetype"""
    try:
        # Find cards that have this archetype ID in their archetypes array
        cards = list(db.cards.find({"archetypes": archetype_id}))
        
        # Convert ObjectId to string for each card
        for card in cards:
            card['id'] = str(card.pop('_id'))
            
        return jsonify(cards)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/archetypes/random-cards', methods=['GET'])
def get_random_archetype_cards():
    """Get one random card from each archetype"""
    try:
        archetypes = list(db.archetypes.find())
        result = []
        
        for archetype in archetypes:
            # Use the string ID directly
            archetype_id = archetype.get('id')
            
            # Find all cards for this archetype
            cards = list(db.cards.find({"archetypes": archetype_id}))
            
            # Debug logging
            print(f"Archetype: {archetype_id}, Found {len(cards)} cards")
            
            if cards and len(cards) > 0:
                # Select a random card
                random_card = random.choice(cards)
                
                # Convert ObjectId to string
                random_card['id'] = str(random_card.pop('_id'))
                
                # Add archetype info to the card
                random_card['archetype'] = {
                    'id': archetype_id,
                    'name': archetype.get('name', ''),
                    'colors': archetype.get('colors', []),
                    'description': archetype.get('description', '')
                }
                
                # Make sure archetypes is a list
                if 'archetypes' not in random_card or not random_card['archetypes']:
                    random_card['archetypes'] = [archetype_id]
                
                result.append(random_card)
                print(f"Added random card for archetype {archetype_id}: {random_card['name']}")
            else:
                # No cards found for this archetype, add debug info
                print(f"No cards found for archetype: {archetype_id}")
                
                # Add a placeholder card for this archetype
                placeholder_card = {
                    'id': f'placeholder-{archetype_id}',
                    'name': f'Sample {archetype.get("name", "")} Card',
                    'type': 'Creature',
                    'manaCost': '{1}' + ''.join(archetype.get('colors', [])),
                    'rarity': 'Common',
                    'text': f'This is a sample card for the {archetype.get("name", "")} archetype.',
                    'colors': archetype.get('colors', []),
                    'archetypes': [archetype_id],
                    'archetype': {
                        'id': archetype_id,
                        'name': archetype.get('name', ''),
                        'colors': archetype.get('colors', []),
                        'description': archetype.get('description', '')
                    }
                }
                result.append(placeholder_card)
                print(f"Added placeholder card for archetype {archetype_id}")
        
        print(f"Returning {len(result)} random cards")
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/tokens', methods=['GET'])
def get_tokens():
    """Get all tokens with optional filtering"""
    # Get query parameters
    search = request.args.get('search', '')
    colors = request.args.get('colors', '').split(',') if request.args.get('colors') else []
    
    # Build query
    query = {}
    
    if search:
        query['name'] = {'$regex': search, '$options': 'i'}
    
    if colors and colors[0]:  # Check if colors is not empty
        color_query = []
        
        # Handle special color filters
        if 'colorless' in colors:
            # Colorless means the colors array is empty
            color_query.append({'colors': {'$size': 0}})
            # Remove 'colorless' from the colors array to avoid confusion
            colors = [c for c in colors if c != 'colorless']
        
        if 'multicolor' in colors:
            # Multicolor means the colors array has more than one color
            color_query.append({'colors': {'$exists': True, '$not': {'$size': 1}}})
            # Remove 'multicolor' from the colors array to avoid confusion
            colors = [c for c in colors if c != 'multicolor']
        
        # Add regular color filters if any remain
        if colors:
            color_query.append({'colors': {'$in': colors}})
        
        # Combine all color queries with OR
        if color_query:
            query['$or'] = color_query
    
    # Execute query
    tokens = list(db.tokens.find(query))
    
    # Convert ObjectId to string for each token
    for token in tokens:
        token['id'] = str(token.pop('_id'))
    
    return jsonify(tokens)

@app.route('/api/draft/pack', methods=['GET'])
def get_draft_pack():
    """Generate a random draft pack of 15 cards"""
    try:
        # Get all cards from the database
        all_cards = list(db.cards.find())
        
        # Convert ObjectIds to strings
        for card in all_cards:
            card['id'] = str(card.pop('_id'))
        
        # Ensure we have enough cards
        if len(all_cards) < 15:
            return jsonify({"error": "Not enough cards in database to create a draft pack"}), 400
        
        # Shuffle the cards and take 15 for the pack
        random.shuffle(all_cards)
        pack = all_cards[:15]
        
        print(f"Generated draft pack with {len(pack)} cards")
        return jsonify(pack)
    except Exception as e:
        print(f"Error generating draft pack: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/draft/bot-pick', methods=['POST'])
def bot_draft_pick():
    """Make a bot draft pick based on card evaluation and color preferences"""
    try:
        print("Bot draft pick API called")
        data = request.json
        if not data:
            print("No JSON data received")
            return jsonify({"error": "No JSON data received"}), 400
            
        print(f"Received data: {data}")
        available_cards = data.get('availableCards', [])
        bot_colors = data.get('botColors', [])
        pack_number = data.get('packNumber', 1)
        pick_number = data.get('pickNumber', 1)
        
        if not available_cards:
            print("No cards available")
            return jsonify({"error": "No cards available"}), 400
        
        print(f"Processing {len(available_cards)} cards for bot pick")
        # Bot draft strategy
        # Early picks (pack 1, picks 1-3): Take the strongest card
        # Middle picks: Prefer cards in bot's colors, but can still take strong cards
        # Late picks: Strongly prefer cards in bot's colors
        
        # Assign scores to cards
        scored_cards = []
        for card in available_cards:
            score = 0
            
            # Base score from 1-10 based on card attributes
            # In a real implementation, this would be more sophisticated
            if 'Creature' in card.get('type', ''):
                score += 5  # Creatures are important
                
                # Power/toughness bonus
                power = int(card.get('power', 0) or 0)
                toughness = int(card.get('toughness', 0) or 0)
                score += min(power + toughness, 8) / 2
            
            elif 'Instant' in card.get('type', '') or 'Sorcery' in card.get('type', ''):
                score += 4  # Spells are good but not as essential as creatures
            
            # Bonus for rarity
            rarity_bonus = {
                'Common': 0,
                'Uncommon': 1,
                'Rare': 2,
                'Mythic Rare': 3
            }
            score += rarity_bonus.get(card.get('rarity', 'Common'), 0)
            
            # Color preference
            card_colors = card.get('colors', [])
            
            # If bot has colors, prefer cards in those colors
            if bot_colors:
                matching_colors = len(set(card_colors) & set(bot_colors))
                if matching_colors > 0:
                    # Bonus for color match, higher in later picks
                    color_bonus = matching_colors * (1 + (pick_number / 5))
                    score += color_bonus
                elif len(card_colors) == 0:
                    # Colorless cards are always playable
                    score += 1
                else:
                    # Penalty for off-color cards, higher in later picks
                    score -= min(pick_number / 3, 3)
            
            # Early picks favor strong cards regardless of color
            if pack_number == 1 and pick_number <= 3:
                # Reduce the color penalty for early picks
                score += 2
            
            # Add some randomness to simulate different bot preferences
            score += random.uniform(0, 2)
            
            scored_cards.append({
                'card': card,
                'score': score
            })
        
        # Sort by score and pick the highest
        scored_cards.sort(key=lambda x: x['score'], reverse=True)
        picked_card = scored_cards[0]['card']
        
        # If bot doesn't have colors yet and this is an early pick, set colors based on the pick
        if not bot_colors and pack_number == 1 and pick_number <= 2 and picked_card.get('colors'):
            bot_colors = picked_card.get('colors')
        
        return jsonify({
            'pickedCard': picked_card,
            'botColors': bot_colors
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Card Suggestions API
@app.route('/api/suggestions', methods=['GET'])
def get_suggestions():
    """Get all card suggestions"""
    try:
        suggestions = list(db.suggestions.find())
        
        # Convert ObjectId to string for each suggestion
        for suggestion in suggestions:
            suggestion['id'] = str(suggestion.pop('_id'))
            
        return jsonify(suggestions)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/suggestions', methods=['POST'])
def add_suggestion():
    """Add a new card suggestion"""
    try:
        data = request.json
        
        # Validate required fields
        if not data.get('name'):
            return jsonify({"error": "Card name is required"}), 400
            
        # Create suggestion document
        suggestion = {
            "name": data.get('name'),
            "description": data.get('description', ''),
            "imageUrl": data.get('imageUrl', ''),
            "createdBy": data.get('createdBy', 'Anonymous'),
            "submittedAt": datetime.now(),
            "status": "pending"  # pending, approved, rejected
        }
        
        # Insert into database
        result = db.suggestions.insert_one(suggestion)
        
        # Return the created suggestion with properly serialized ID
        created_suggestion = {
            "id": str(result.inserted_id),
            "name": suggestion["name"],
            "description": suggestion["description"],
            "imageUrl": suggestion["imageUrl"],
            "createdBy": suggestion["createdBy"],
            "submittedAt": suggestion["submittedAt"].isoformat(),
            "status": suggestion["status"]
        }
        return jsonify(created_suggestion), 201
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/suggestions/upload', methods=['POST'])
def upload_suggestion_image():
    """Upload an image for a card suggestion"""
    try:
        if 'image' not in request.files:
            return jsonify({"error": "No image file provided"}), 400
            
        image_file = request.files['image']
        
        if image_file.filename == '':
            return jsonify({"error": "No image selected"}), 400
            
        # For simplicity, we'll store the image in a base64 format
        # In a production environment, you would likely use cloud storage
        import base64
        image_data = base64.b64encode(image_file.read()).decode('utf-8')
        
        # Return the image data to be stored with the suggestion
        return jsonify({"imageUrl": f"data:image/{image_file.filename.split('.')[-1]};base64,{image_data}"}), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/chatgpt_cards', methods=['GET'])
def get_chatgpt_cards():
    """Get cards that instruct users to ask ChatGPT for something"""
    try:
        # Find cards that have a 'prompt' field
        query = {
            "prompt": {"$exists": True}
        }
        
        # Execute query
        cards = list(db.cards.find(query))
        
        # Convert ObjectId to string for each card
        for card in cards:
            card['id'] = str(card.pop('_id'))
            
        return jsonify(cards)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/chatgpt_response', methods=['POST'])
def get_chatgpt_response():
    """Simulate a ChatGPT response for a given prompt"""
    try:
        data = request.get_json()
        
        if not data or 'prompt' not in data:
            return jsonify({"error": "No prompt provided"}), 400
            
        prompt = data['prompt']
        
        # For demo purposes, we'll just return a fixed response
        # In a real app, you would call the ChatGPT API here
        response = {
            "response": f"This is a simulated response to: {prompt}",
            "timestamp": datetime.now().isoformat()
        }
        
        return jsonify(response)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/gemini/response', methods=['POST'])
def get_gemini_response():
    """Get a response from Google's Gemini API for a given prompt"""
    try:
        data = request.get_json()
        
        if not data or 'prompt' not in data:
            return jsonify({"error": "No prompt provided"}), 400
            
        prompt = data['prompt']
        
        # Get API key from environment variables
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            return jsonify({"error": "Gemini API key not configured"}), 500
        
        # Call Gemini API
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}"
        
        headers = {
            "Content-Type": "application/json"
        }
        
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": prompt}
                    ]
                }
            ]
        }
        
        response = requests.post(url, headers=headers, json=payload)
        response.raise_for_status()
        data = response.json()
        
        # Extract the text from the response
        gemini_response = data['candidates'][0]['content']['parts'][0]['text']
        
        result = {
            "response": gemini_response,
            "timestamp": datetime.now().isoformat()
        }
        
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/image-proxy', methods=['GET'])
def image_proxy():
    """Proxy for images to avoid CORS issues"""
    try:
        # Get the image URL from the query parameter
        image_url = request.args.get('url')
        if not image_url:
            print("No URL provided to image proxy")
            return jsonify({"error": "No URL provided"}), 400
        
        print(f"Proxying image request for: {image_url}")
            
        # Add headers to avoid rate limiting and mimic a browser
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': 'https://scryfall.com/'
        }
            
        # Make a request to the image URL with a longer timeout
        print(f"Sending request to: {image_url}")
        response = requests.get(image_url, stream=True, headers=headers, timeout=15, verify=True)
        
        # Check if the request was successful
        if response.status_code != 200:
            print(f"Failed to fetch image: {response.status_code} - {image_url}")
            # Return a placeholder image instead of an error
            placeholder_svg = '''
            <svg xmlns="http://www.w3.org/2000/svg" width="265" height="370" viewBox="0 0 265 370">
                <rect width="265" height="370" fill="#eee"/>
                <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="14" text-anchor="middle" fill="#888">
                    Image Not Available
                </text>
            </svg>
            '''
            return Response(
                placeholder_svg,
                content_type='image/svg+xml',
                headers={
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'public, max-age=86400'
                }
            )
            
        # Get the content type from the response
        content_type = response.headers.get('Content-Type', 'image/jpeg')
        
        print(f"Successfully proxied image: {image_url} with content type: {content_type}")
        
        # Return the image with the correct content type
        return Response(
            response.content,
            content_type=content_type,
            headers={
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=86400',  # Cache for 24 hours
                'X-Content-Type-Options': 'nosniff'
            }
        )
    except requests.exceptions.SSLError as ssl_err:
        print(f"SSL Error in image proxy: {str(ssl_err)} - {image_url}")
        # Try again without SSL verification
        try:
            response = requests.get(image_url, stream=True, headers=headers, timeout=15, verify=False)
            if response.status_code == 200:
                content_type = response.headers.get('Content-Type', 'image/jpeg')
                print(f"Successfully proxied image after SSL bypass: {image_url}")
                return Response(
                    response.content,
                    content_type=content_type,
                    headers={
                        'Access-Control-Allow-Origin': '*',
                        'Cache-Control': 'public, max-age=86400'
                    }
                )
        except Exception as retry_err:
            print(f"Retry failed after SSL error: {str(retry_err)}")
            
        # If we get here, both attempts failed
        placeholder_svg = '''
        <svg xmlns="http://www.w3.org/2000/svg" width="265" height="370" viewBox="0 0 265 370">
            <rect width="265" height="370" fill="#eee"/>
            <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="14" text-anchor="middle" fill="#888">
                SSL Error Loading Image
            </text>
        </svg>
        '''
        return Response(
            placeholder_svg,
            content_type='image/svg+xml',
            headers={
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=86400'
            }
        )
    except requests.exceptions.Timeout as timeout_err:
        print(f"Timeout in image proxy: {str(timeout_err)} - {image_url}")
        placeholder_svg = '''
        <svg xmlns="http://www.w3.org/2000/svg" width="265" height="370" viewBox="0 0 265 370">
            <rect width="265" height="370" fill="#eee"/>
            <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="14" text-anchor="middle" fill="#888">
                Image Request Timed Out
            </text>
        </svg>
        '''
        return Response(
            placeholder_svg,
            content_type='image/svg+xml',
            headers={
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=86400'
            }
        )
    except Exception as e:
        print(f"Error in image proxy: {str(e)} - {image_url}")
        # Return a placeholder image instead of an error
        placeholder_svg = '''
        <svg xmlns="http://www.w3.org/2000/svg" width="265" height="370" viewBox="0 0 265 370">
            <rect width="265" height="370" fill="#eee"/>
            <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="14" text-anchor="middle" fill="#888">
                Error Loading Image
            </text>
        </svg>
        '''
        return Response(
            placeholder_svg,
            content_type='image/svg+xml',
            headers={
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=86400'
            }
        )

if __name__ == '__main__':
    app.run(debug=True, port=5000)
