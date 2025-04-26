from flask import Flask, jsonify, request
from flask_cors import CORS
from pymongo import MongoClient
import os
from bson import ObjectId
from dotenv import load_dotenv
import json
import random
from datetime import datetime

# Load environment variables
load_dotenv()

# MongoDB connection
MONGO_URI = os.getenv("MONGO_URI", "mongodb+srv://username:password@cluster.mongodb.net/mtgcube")
client = MongoClient(MONGO_URI)
db = client["mtgcube"]  # Corrected database name

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
        card = db.cards.find_one({"_id": ObjectId(card_id)})
        if card:
            # Convert ObjectId to string
            card['id'] = str(card.pop('_id'))
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

@app.route('/api/cards/chatgpt', methods=['GET'])
def get_chatgpt_cards():
    """Get cards that instruct users to ask ChatGPT for something"""
    try:
        # Find cards with text containing "ask ChatGPT" or similar phrases
        query = {
            "$or": [
                {"text": {"$regex": "ask ChatGPT", "$options": "i"}},
                {"text": {"$regex": "ask AI", "$options": "i"}},
                {"text": {"$regex": "prompt ChatGPT", "$options": "i"}},
                {"text": {"$regex": "ask an AI", "$options": "i"}},
                {"oracle_text": {"$regex": "ask ChatGPT", "$options": "i"}},
                {"oracle_text": {"$regex": "ask AI", "$options": "i"}},
                {"oracle_text": {"$regex": "prompt ChatGPT", "$options": "i"}},
                {"oracle_text": {"$regex": "ask an AI", "$options": "i"}}
            ]
        }
        
        # Execute query
        cards = list(db.cards.find(query))
        
        # If no cards found with the query, create some sample cards for demonstration
        if not cards:
            sample_cards = [
                {
                    "_id": ObjectId(),
                    "name": "AI Consultation",
                    "manaCost": "{2}{U}",
                    "type": "Instant",
                    "text": "Ask ChatGPT to create a unique magical creature with three special abilities.",
                    "colors": ["U"],
                    "rarity": "Rare",
                    "imageUrl": "https://via.placeholder.com/265x370/0066cc/ffffff?text=AI+Consultation",
                    "prompt": "Create a unique magical creature with three special abilities. Describe its appearance and explain each of its abilities in detail."
                },
                {
                    "_id": ObjectId(),
                    "name": "Creative Spark",
                    "manaCost": "{1}{R}",
                    "type": "Sorcery",
                    "text": "Ask ChatGPT to write a short story about a planeswalker's first encounter with a dragon.",
                    "colors": ["R"],
                    "rarity": "Uncommon",
                    "imageUrl": "https://via.placeholder.com/265x370/cc3300/ffffff?text=Creative+Spark",
                    "prompt": "Write a short story (250 words or less) about a planeswalker's first encounter with a dragon. Include details about the setting, the planeswalker's reaction, and how the encounter ends."
                },
                {
                    "_id": ObjectId(),
                    "name": "Wisdom of the Ages",
                    "manaCost": "{3}{W}{W}",
                    "type": "Enchantment",
                    "text": "Whenever a creature enters the battlefield under your control, ask ChatGPT for a wise quote about that creature's type.",
                    "colors": ["W"],
                    "rarity": "Mythic Rare",
                    "imageUrl": "https://via.placeholder.com/265x370/ffffcc/000000?text=Wisdom+of+the+Ages",
                    "prompt": "Provide a wise or philosophical quote about [CREATURE_TYPE]. The quote can be real or invented, but should sound profound and match the flavor of Magic: The Gathering."
                },
                {
                    "_id": ObjectId(),
                    "name": "Diabolic Riddle",
                    "manaCost": "{2}{B}{B}",
                    "type": "Sorcery",
                    "text": "Ask ChatGPT to create a riddle with a dark or macabre theme. Your opponent must solve it or lose 5 life.",
                    "colors": ["B"],
                    "rarity": "Rare",
                    "imageUrl": "https://via.placeholder.com/265x370/333333/ffffff?text=Diabolic+Riddle",
                    "prompt": "Create a challenging riddle with a dark or macabre theme in the style of Magic: The Gathering black mana flavor. The answer should be something found in a typical Magic: The Gathering setting."
                },
                {
                    "_id": ObjectId(),
                    "name": "Nature's Inspiration",
                    "manaCost": "{2}{G}",
                    "type": "Instant",
                    "text": "Ask ChatGPT to describe a new land type that combines elements of two existing basic lands.",
                    "colors": ["G"],
                    "rarity": "Uncommon",
                    "imageUrl": "https://via.placeholder.com/265x370/00cc66/ffffff?text=Nature's+Inspiration",
                    "prompt": "Describe a new Magic: The Gathering land type that combines elements of two existing basic lands (choose any two from Plains, Island, Swamp, Mountain, or Forest). Explain its physical appearance, what mana it would produce, and what kind of creatures might inhabit it."
                }
            ]
            
            # Insert sample cards into database
            db.cards.insert_many(sample_cards)
            cards = sample_cards
        
        # Convert ObjectId to string for each card
        for card in cards:
            card['id'] = str(card.pop('_id'))
            
        return jsonify(cards)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/chatgpt/response', methods=['POST'])
def get_chatgpt_response():
    """Simulate a ChatGPT response for a given prompt"""
    try:
        data = request.json
        prompt = data.get('prompt')
        
        if not prompt:
            return jsonify({"error": "Prompt is required"}), 400
            
        # In a real implementation, this would call the OpenAI API
        # For now, we'll return predefined responses based on keywords in the prompt
        
        responses = {
            "creature": "I've created the Luminous Leviathan, a massive aquatic creature with translucent skin that glows with inner light. It has three abilities:\n\n1. Bioluminescent Burst: Once per day, it can release a blinding flash of light that temporarily blinds nearby creatures.\n\n2. Depth Adaptation: It can survive at any ocean depth, adjusting its body pressure automatically.\n\n3. Memory Absorption: When it touches another creature, it can absorb and store their memories, which it can later project as vivid illusions.",
            "story": "The air crackled with energy as Nissa stepped through the planar portal. The scorched mountains of Shiv stretched before her, a landscape she'd only heard of in tales. A deafening roar shook the ground beneath her feet.\n\nShe turned to see an enormous dragon with scales like burnished copper swooping down. Heat rippled from its body, distorting the air.\n\n\"Planeswalker,\" the dragon rumbled, landing with surprising grace. \"You smell of forests and growth. Strange to find such in Shiv.\"\n\nNissa stood her ground, though her heart hammered. \"I seek knowledge of elemental binding.\"\n\nThe dragon's laugh sent sparks dancing. \"Then you've found the right teacher.\" Its eyes glinted with ancient wisdom. \"But my lessons never come free.\"",
            "quote": "\"In the shadow of wings greater than mountains, even the mightiest warrior learns the virtue of humility.\" — Ancient Draconic Proverb",
            "riddle": "I am born in darkness, yet I illuminate truth. The more you feed me, the hungrier I become for secrets untold. In life I bring death, in death I bring life. What am I?\n\n(Answer: A black mana flame)",
            "land": "The Mistmarsh is a haunting terrain where the boundaries between Island and Swamp blur into a beautiful yet treacherous landscape. Perpetual fog hangs over dark waters that reflect an opalescent sheen. The land produces both blue and black mana, drawing power from both the calculating intellect of the Islands and the decaying abundance of the Swamps.\n\nCrystalline formations rise from the murky depths, while twisted mangroves create labyrinthine passages through the water. Creatures here have adapted uniquely - many are amphibious with both gills and lungs, while others have developed bioluminescence to navigate the eternal mist."
        }
        
        # Determine which response to return based on keywords in the prompt
        for key, response in responses.items():
            if key.lower() in prompt.lower():
                return jsonify({"response": response})
                
        # Default response if no keywords match
        return jsonify({"response": "After careful consideration of your request, I've crafted a response that blends creativity with the mystical elements of the multiverse. The magic you seek manifests in unexpected ways, revealing patterns that connect across planes of existence. May this insight serve you well in your arcane pursuits."})
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
