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
CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)  # Enable CORS for all routes with proper configuration

# Custom JSON encoder to handle MongoDB ObjectId
class MongoJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, ObjectId):
            return str(obj)
        return super().default(obj)

# Set the custom JSON encoder for Flask
app.json_encoder = MongoJSONEncoder

# Function to get default image URL based on card colors
def get_default_image_for_colors(colors):
    """Return a custom placeholder image URL based on card colors"""
    # Use imgur placeholder images based on colors
    if not colors:
        # Colorless
        return "https://i.imgur.com/QrFDrPv.png"
    
    # For single colors
    if len(colors) == 1:
        color_map = {
            'W': "https://i.imgur.com/KwNKcbO.png",  # White placeholder
            'U': "https://i.imgur.com/fVuTogB.png",  # Blue placeholder
            'B': "https://i.imgur.com/G2qmCPY.png",  # Black placeholder
            'R': "https://i.imgur.com/AlnmKYi.png",  # Red placeholder
            'G': "https://i.imgur.com/rBLUUDl.png"   # Green placeholder
        }
        return color_map.get(colors[0], "https://i.imgur.com/QrFDrPv.png")
    
    # For color pairs
    if len(colors) == 2:
        # We'll use a generic multi-color placeholder for pairs
        return "https://i.imgur.com/MNDyDPT.png" # Example color pair placeholder
    
    # For 3+ colors
    return "https://i.imgur.com/MNDyDPT.png" # Generic multicolor placeholder



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
            "/api/image-proxy",
            "/api/random-pack"
        ]
    })

@app.route('/api/cards', methods=['GET'])
def get_cards():
    """Get all cards with optional filtering"""
    # Get query parameters
    search = request.args.get('search', '')
    body_search = request.args.get('body_search', '')
    colors = request.args.get('colors', '').split(',') if request.args.get('colors') else []
    color_match = request.args.get('color_match', 'includes')  # 'exact', 'includes', or 'at-most'
    card_type = request.args.get('type', '')
    card_set = request.args.get('set', '')
    custom = request.args.get('custom', '')
    facedown = request.args.get('facedown', '')
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 50))
    sort_by = request.args.get('sort_by', 'name')
    sort_dir = request.args.get('sort_dir', 'asc')
    
    print(f"API Request - /api/cards with params: search='{search}', body_search='{body_search}', colors={colors}, color_match='{color_match}', type='{card_type}', set='{card_set}', custom='{custom}', facedown='{facedown}', page={page}, limit={limit}, sort_by='{sort_by}', sort_dir='{sort_dir}')")
    
    # Build query using a simple approach that's less error-prone
    query = {}
    
    # Basic filter for facedown cards - exclude them
    query['facedown'] = {'$ne': True}
    
    # Add name search if provided
    if search:
        query['name'] = {'$regex': search, '$options': 'i'}
    
    # Add body text search if provided
    if body_search:
        # We need to search in both name and text fields
        body_query = {
            '$or': [
                {'name': {'$regex': body_search, '$options': 'i'}},
                {'text': {'$regex': body_search, '$options': 'i'}}
            ]
        }
        
        # If we already have a name filter, we need to preserve it
        if 'name' in query:
            existing_name_filter = query['name']
            # Remove the existing name filter as we'll include it in the $and
            del query['name']
            # Create an $and condition that combines the name filter with the body search
            query['$and'] = [
                {'name': existing_name_filter},
                body_query
            ]
        else:
            # No existing name filter, just add the body query directly
            for key, value in body_query.items():
                query[key] = value
    
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
            if color_match == 'exact':
                color_query.append({'colors': {'$all': colors, '$size': len(colors)}})
            elif color_match == 'includes':
                color_query.append({'colors': {'$all': colors}})
            elif color_match == 'at-most':
                color_query.append({'colors': {'$not': {'$elemMatch': {'$nin': colors}}}})
            else:
                # Default to includes behavior
                color_query.append({'colors': {'$all': colors}})
        
        # Combine all color queries with OR
        if color_query:
            query['$or'] = color_query
    
    if card_type:
        print(f"Searching for card type: {card_type}")
        
        # For all card types, including "Creature", just do a simple case-insensitive search
        # This will match any card that has the type string anywhere in its type field
        query['type'] = {'$regex': card_type, '$options': 'i'}
        print(f"Using simple regex query for type: {query['type']}")
        
    if card_set:
        query['set'] = card_set
        
    if custom:
        query['custom'] = custom.lower() == 'true'
    
    # Get total count - this will exclude facedown cards due to the query
    # Make sure we're counting with the exact same query used for fetching
    total = db.cards.count_documents(query)
    print(f"Total cards matching query: {total}")
    
    # Calculate skip for pagination
    skip = (page - 1) * limit
    
    # Execute query with pagination and sorting
    print("The query is:", query)
    
    # Handle multiple sort fields
    sort_fields = sort_by.split(',') if sort_by else ['name']
    sort_directions = sort_dir.split(',') if sort_dir else ['asc']
    
    # Ensure we have a direction for each field
    while len(sort_directions) < len(sort_fields):
        sort_directions.append('asc')
    
    # Create sort specification
    sort_spec = []
    for i, field in enumerate(sort_fields):
        # Get corresponding direction or default to asc
        direction = 1 if i >= len(sort_directions) or sort_directions[i].lower() == 'asc' else -1
        sort_spec.append((field, direction))
    
    print(f"Sorting with: {sort_spec}")
    
    # Execute query with sorting
    cursor = db.cards.find(query).sort(sort_spec).skip(skip).limit(limit)
    cards = list(cursor)
    
    # Ensure we have exactly 'limit' cards per page (except for the last page)
    cards_count = len(cards)
    print(f"Retrieved {cards_count} cards for page {page} with limit {limit}")
    
    # Debug: Print the first few cards
    if cards:
        print(f"Found {len(cards)} cards. First few cards:")
        for card in cards[:3]:
            print(f"  - {card.get('name')}, Type: {card.get('type', '')}")
    else:
        print("No cards found matching the query.")
    
    # Convert ObjectId to string for each card
    for card in cards:
        card['id'] = str(card.pop('_id'))
    
    return jsonify({
        "cards": cards,
        "total": total
    })

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
        # Convert MongoDB ObjectID to a string ID
        if '_id' in archetype:
            archetype['id'] = str(archetype['_id'])
            archetype.pop('_id')
    
    print(f"Returning {len(archetypes)} archetypes")
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
        # Get pagination parameters
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 50))
        
        # Calculate skip for pagination
        skip = (page - 1) * limit
        
        # Get the archetype to get its name
        archetype = db.archetypes.find_one({"_id": ObjectId(archetype_id)})
        archetype_name = archetype.get('name', '') if archetype else ''
        
        # Find cards that have this archetype ID OR name in their archetypes array
        # Also exclude facedown cards
        query = {
            "$and": [
                {"$or": [{"archetypes": archetype_id}, {"archetypes": archetype_name}]},
                {"$or": [{'facedown': False}, {'facedown': {'$exists': False}}]}
            ]
        }
        
        # Get total count
        total = db.cards.count_documents(query)
        
        # Get paginated cards
        cursor = db.cards.find(query).skip(skip).limit(limit)
        cards = list(cursor)
        
        # If the number of cards is less than the limit, get the remaining cards from the next page
        while len(cards) < limit and skip + len(cards) < total:
            skip += len(cards)
            cursor = db.cards.find(query).skip(skip).limit(limit - len(cards))
            cards.extend(list(cursor))
        
        # Debug info
        print(f"Retrieved {len(cards)} cards for archetype page {page} with limit {limit}")
        
        # Convert ObjectId to string for each card
        for card in cards:
            card['id'] = str(card.pop('_id'))
            
        return jsonify({
            "cards": cards,
            "total": total
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/archetypes/random-cards', methods=['GET'])
def get_random_archetype_cards():
    """Get one random card from each archetype in the database"""
    try:
        # Get all archetypes from the database
        all_archetypes = list(db.archetypes.find())
        print(f"Found {len(all_archetypes)} total archetypes in database")
        
        # Process all archetypes and find a random card for each
        result = []
        for archetype in all_archetypes:
            # Make sure we have a valid ID
            if '_id' in archetype:
                archetype['id'] = str(archetype['_id'])
            
            archetype_id = archetype.get('id')
            archetype_name = archetype.get('name', 'Unknown')
            
            # Find all cards for this archetype by checking the archetypes array
            # We need to check for both the archetype ID and name since some cards might use either
            # Also exclude facedown cards
            cards = list(db.cards.find({
                "$and": [
                    {"$or": [{"archetypes": archetype_id}, {"archetypes": archetype_name}]},
                    {"$or": [{"facedown": False}, {"facedown": {"$exists": False}}]}
                ]
            }))
            
            # Debug logging
            print(f"Archetype: {archetype_name} (ID: {archetype_id}), Found {len(cards)} cards")
            
            if cards and len(cards) > 0:
                # Find cards with images first
                cards_with_images = [card for card in cards if card.get('imageUrl')]
                
                # If we have cards with images, use those; otherwise, use any card
                card_pool = cards_with_images if cards_with_images else cards
                
                # Select a random card
                random_card = random.choice(card_pool)
                
                # Convert ObjectId to string
                random_card['id'] = str(random_card.pop('_id'))
                
                # Add archetype info to the card
                random_card['archetype'] = {
                    'id': archetype_id,
                    'name': archetype_name,
                    'colors': archetype.get('colors', []),
                    'description': archetype.get('description', '')
                }
                
                # Make sure archetypes is a list
                if 'archetypes' not in random_card or not random_card['archetypes']:
                    random_card['archetypes'] = [archetype_id]
                
                result.append(random_card)
                print(f"Added random card for archetype {archetype_name}: {random_card['name']}")
        
        print(f"Returning {len(result)} random cards for {len(all_archetypes)} archetypes")
        return jsonify(result)
    except Exception as e:
        print(f"Error in get_random_archetype_cards: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/tokens', methods=['GET'])
def get_tokens():
    """Get all tokens with optional filtering"""
    # Get query parameters
    search = request.args.get('search', '')
    body_search = request.args.get('body_search', '')
    colors = request.args.get('colors', '').split(',') if request.args.get('colors') else []
    color_match = request.args.get('color_match', 'includes')  # 'exact', 'includes', or 'at-most'
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 20))
    sort_by = request.args.get('sort_by', 'name')
    sort_dir = request.args.get('sort_dir', 'asc')
    
    print(f"API Request - /api/tokens with params: search='{search}', body_search='{body_search}', colors={colors}, color_match='{color_match}', page={page}, limit={limit}, sort_by='{sort_by}', sort_dir='{sort_dir}')")
    
    # Build query
    query = {}
    
    if search:
        # Ensure partial matching for card names
        query['name'] = {'$regex': search, '$options': 'i'}

    if body_search:
        # Search in both name and text fields
        name_query = {'name': {'$regex': body_search, '$options': 'i'}}
        text_query = {'text': {'$regex': body_search, '$options': 'i'}}
        
        # Use $or to match either field
        if 'name' in query:
            # If we already have a name filter, combine it with both queries
            query = {'$or': [{'$and': [{'name': query['name']}, {'text': text_query['text']}]}, 
                              {'name': name_query['name']}]}
        else:
            # Otherwise just search in either field
            query['$or'] = [name_query, text_query]
    
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
            if color_match == 'exact':
                color_query.append({'colors': {'$all': colors, '$size': len(colors)}})
            elif color_match == 'includes':
                color_query.append({'colors': {'$all': colors}})
            elif color_match == 'at-most':
                color_query.append({'colors': {'$not': {'$elemMatch': {'$nin': colors}}}})
            else:
                # Default to includes behavior
                color_query.append({'colors': {'$all': colors}})
        
        # Combine all color queries with OR
        if color_query:
            query['$or'] = color_query
    
    # Get total count
    total = db.tokens.count_documents(query)
    
    # Calculate skip for pagination
    skip = (page - 1) * limit
    
    # Execute query with pagination and sorting
    print("The query is:", query)
    
    # Handle multiple sort fields
    sort_fields = sort_by.split(',') if sort_by else ['name']
    sort_directions = sort_dir.split(',') if sort_dir else ['asc']
    
    # Ensure we have a direction for each field
    while len(sort_directions) < len(sort_fields):
        sort_directions.append('asc')
    
    # Create sort specification
    sort_spec = []
    for i, field in enumerate(sort_fields):
        # Get corresponding direction or default to asc
        direction = 1 if i >= len(sort_directions) or sort_directions[i].lower() == 'asc' else -1
        sort_spec.append((field, direction))
    
    print(f"Sorting with: {sort_spec}")
    
    # Execute query with sorting
    tokens = list(db.tokens.find(query).sort(sort_spec).skip(skip).limit(limit))
    
    # Convert ObjectId to string for each token
    for token in tokens:
        token['id'] = str(token.pop('_id'))
    
    return jsonify({
        "tokens": tokens,
        "total": total
    })

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
        # Get pagination parameters
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 50))
        
        # Calculate skip for pagination
        skip = (page - 1) * limit
        
        # Get total count
        total = db.suggestions.count_documents({})
        
        # Get paginated suggestions
        suggestions = list(db.suggestions.find().skip(skip).limit(limit))
        
        # Convert ObjectId to string for each suggestion
        for suggestion in suggestions:
            suggestion['id'] = str(suggestion.pop('_id'))
            
        return jsonify({
            "suggestions": suggestions,
            "total": total
        })
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
                    'Access-Control-Allow-Credentials': 'true',
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
                'Access-Control-Allow-Credentials': 'true',
                'Cache-Control': 'public, max-age=86400'
            }
        )
    except Exception as e:
        print(f"Error in image proxy: {str(e)}")
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
                'Access-Control-Allow-Credentials': 'true',
                'Cache-Control': 'public, max-age=86400'
            }
        )

@app.route('/api/random-pack', methods=['GET'])
def get_random_pack():
    """Generate a random pack of cards from the database where each card has equal probability of appearing"""
    try:
        # Get pack size from query parameters, default to 15 cards
        pack_size = request.args.get('size', default=15, type=int)
        min_size = request.args.get('min_size', default=1, type=int)
        
        # Get all cards from the database
        all_cards = list(db.cards.find())
        total_cards = len(all_cards)
        
        print(f"Found {total_cards} cards in database")
        
        # If we don't have enough cards, adjust the pack size
        if total_cards < pack_size:
            if total_cards < min_size:
                return jsonify({"error": f"Not enough cards in database. Found {total_cards}, minimum required is {min_size}"}), 400
            
            print(f"Adjusting pack size from {pack_size} to {total_cards} due to limited cards in database")
            pack_size = total_cards
        
        # Shuffle the cards to randomize
        random.shuffle(all_cards)
        
        # Take the first 'pack_size' cards for the pack
        pack = all_cards[:pack_size]
        
        # Convert ObjectIds to strings for JSON serialization
        for card in pack:
            card['id'] = str(card.pop('_id'))
        
        # Create response with pack and metadata
        response = {
            "pack": pack,
            "metadata": {
                "requested_size": int(request.args.get('size', 15)),
                "actual_size": len(pack),
                "total_cards_in_database": total_cards,
                "timestamp": datetime.now().isoformat()
            }
        }
        
        print(f"Generated random pack with {len(pack)} cards out of {total_cards} total cards")
        return jsonify(response)
    except Exception as e:
        print(f"Error generating random pack: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/cards/add', methods=['POST'])
def add_card():
    """Add a new card to the database"""
    try:
        data = request.json
        
        # Validate required fields
        if not data.get('name'):
            return jsonify({"error": "Card name is required"}), 400
        if not data.get('manaCost'):
            return jsonify({"error": "Mana cost is required"}), 400
        if not data.get('type'):
            return jsonify({"error": "Card type is required"}), 400
        if not data.get('text'):
            return jsonify({"error": "Card text is required"}), 400
        if not data.get('colors') or not isinstance(data.get('colors'), list):
            return jsonify({"error": "Card colors must be provided as a list"}), 400
            
        # Create card document with MongoDB ObjectId
        card = {
            "_id": ObjectId(),
            "name": data.get('name'),
            "manaCost": data.get('manaCost'),
            "type": data.get('type'),
            "rarity": data.get('rarity', 'Common'),
            "text": data.get('text'),
            "power": data.get('power') if data.get('power') else None,
            "toughness": data.get('toughness') if data.get('toughness') else None,
            "loyalty": data.get('loyalty'),
            "colors": data.get('colors', []),
            "custom": data.get('custom', True),
            "archetypes": data.get('archetypes', []),
            "imageUrl": data.get('imageUrl', ''),
            "flavorText": data.get('flavorText', ''),
            "artist": data.get('artist', ''),
            "set": data.get('set', 'Custom Cube 1'),
            "notes": data.get('notes', ''),
            "relatedTokens": data.get('relatedTokens', []),
            "relatedFace": data.get('relatedFace')
        }
        
        # Insert into database
        db.cards.insert_one(card)
        
        # Return the created card with properly serialized ID
        card_id = str(card["_id"])
        card.pop("_id")
        card["id"] = card_id
        
        return jsonify(card), 201
        
    except Exception as e:
        print(f"Error adding card: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/cards/update/<card_id>', methods=['PUT'])
def update_card(card_id):
    """Update an existing card in the database"""
    try:
        data = request.json
        
        # Validate required fields
        if not data.get('name'):
            return jsonify({"error": "Card name is required"}), 400
        if not data.get('manaCost'):
            return jsonify({"error": "Mana cost is required"}), 400
        if not data.get('type'):
            return jsonify({"error": "Card type is required"}), 400
        if not data.get('text'):
            return jsonify({"error": "Card text is required"}), 400
        if not data.get('colors') or not isinstance(data.get('colors'), list):
            return jsonify({"error": "Card colors must be provided as a list"}), 400
        
        # Try to find the card by string ID first
        existing_card = db.cards.find_one({"_id": card_id})
        
        # If not found, try to find by ObjectId
        if not existing_card:
            try:
                existing_card = db.cards.find_one({"_id": ObjectId(card_id)})
            except:
                return jsonify({"error": "Card not found"}), 404
        
        if not existing_card:
            return jsonify({"error": "Card not found"}), 404
        
        # Create update document
        update_data = {
            "name": data.get('name'),
            "manaCost": data.get('manaCost'),
            "type": data.get('type'),
            "rarity": data.get('rarity', 'Common'),
            "text": data.get('text'),
            "power": data.get('power') if data.get('power') else None,
            "toughness": data.get('toughness') if data.get('toughness') else None,
            "loyalty": data.get('loyalty'),
            "colors": data.get('colors', []),
            "custom": data.get('custom', True),
            "archetypes": data.get('archetypes', []),
            "imageUrl": data.get('imageUrl', ''),
            "flavorText": data.get('flavorText', ''),
            "artist": data.get('artist', ''),
            "set": data.get('set', 'Custom Cube 1'),
            "notes": data.get('notes', ''),
            "relatedTokens": data.get('relatedTokens', []),
            "relatedFace": data.get('relatedFace')
        }
        
        # Update in database
        result = db.cards.update_one(
            {"_id": ObjectId(card_id) if not isinstance(existing_card["_id"], str) else card_id},
            {"$set": update_data}
        )
        
        if result.modified_count == 0:
            return jsonify({"warning": "No changes were made to the card"}), 200
        
        # Return the updated card
        updated_card = db.cards.find_one({"_id": ObjectId(card_id) if not isinstance(existing_card["_id"], str) else card_id})
        if updated_card:
            updated_card["id"] = str(updated_card.pop("_id"))
            return jsonify(updated_card), 200
        else:
            return jsonify({"message": "No changes made to the card"}), 200
    except Exception as e:
        print(f"Error updating card: {str(e)}")
        return jsonify({"error": str(e)}), 500

# Get cube statistics
@app.route('/api/statistics', methods=['GET'])
def get_statistics():
    """Get overall cube statistics"""
    try:
        # Get total number of cards
        total_cards = db.cards.count_documents({})
        
        # Get total number of archetypes
        total_archetypes = db.archetypes.count_documents({})
        
        # Calculate percentage of custom cards
        custom_cards = db.cards.count_documents({"custom": True})
        custom_percentage = round((custom_cards / total_cards * 100)) if total_cards > 0 else 0
        
        # Recommended players (currently hardcoded but could be made dynamic)
        recommended_players = 8
        
        # Return the statistics
        return jsonify({
            "totalCards": total_cards,
            "totalArchetypes": total_archetypes,
            "customCardPercentage": custom_percentage,
            "recommendedPlayers": recommended_players
        })
    except Exception as e:
        print(f"Error getting statistics: {str(e)}")
        return jsonify({
            "totalCards": 360,
            "totalArchetypes": 10,
            "customCardPercentage": 60,
            "recommendedPlayers": 8
        }), 200  # Return default values even if there's an error

if __name__ == '__main__':
    app.run(debug=True, port=5000)
