from flask import Flask, jsonify, request, Response, session
import logging
from flask_cors import CORS
from pymongo import MongoClient
import os
from bson import ObjectId
from dotenv import load_dotenv
import json
import random
import re
from datetime import datetime, timedelta
import requests
import jwt
from functools import wraps
from werkzeug.security import generate_password_hash, check_password_hash

# Load environment variables
load_dotenv()

# MongoDB connection
MONGO_URI = os.getenv(
    "MONGO_URI", "mongodb+srv://username:password@cluster.mongodb.net/mtgcube"
)
try:
    client = MongoClient(MONGO_URI)
    db = client["mtgcube"]
except Exception as e:
    logging.error(f"Failed to connect to MongoDB: {e}")
    exit(1)

logging.basicConfig(level=logging.INFO)

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv(
    "SECRET_KEY", "dev_secret_key_change_in_production"
)
app.config["JWT_SECRET_KEY"] = os.getenv(
    "JWT_SECRET_KEY", "jwt_secret_key_change_in_production"
)
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=24)

# Configure CORS to allow credentials
CORS(
    app,
    resources={r"/api/*": {"origins": "*"}},
    supports_credentials=True,
    expose_headers=["Authorization"],
)


# Custom JSON encoder to handle MongoDB ObjectId
class MongoJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, ObjectId):
            return str(obj)
        return super().default(obj)


# Set the custom JSON encoder for Flask
app.json_encoder = MongoJSONEncoder


# Authentication decorator
def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None

        # Check if token is in headers
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]

        if not token:
            # card_id is not defined in this scope
            # logging.info(f"History entry added successfully for card ID: {card_id}")
            return jsonify({"error": "Authentication token is missing!"}), 401

        try:
            # Decode token
            data = jwt.decode(token, app.config["JWT_SECRET_KEY"], algorithms=["HS256"])
            current_user = db.users.find_one({"_id": ObjectId(data["user_id"])})

            if not current_user:
                # card_id is not defined in this scope
                # logging.info(f"History entry added successfully for card ID: {card_id}")
                return jsonify({"error": "User not found!"}), 401

            # Check if user is admin
            if not current_user.get("is_admin", False):
                # card_id is not defined in this scope
                # logging.info(f"History entry added successfully for card ID: {card_id}")
                return jsonify({"error": "Admin privileges required!"}), 403

        except jwt.ExpiredSignatureError:
            # card_id is not defined in this scope
            # logging.info(f"History entry added successfully for card ID: {card_id}")
            return jsonify({"error": "Token expired!"}), 401
        except jwt.InvalidTokenError:
            # card_id is not defined in this scope
            # logging.info(f"History entry added successfully for card ID: {card_id}")
            return jsonify({"error": "Invalid token!"}), 401

        return f(*args, **kwargs)

    return decorated


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
            "W": "https://i.imgur.com/KwNKcbO.png",  # White placeholder
            "U": "https://i.imgur.com/fVuTogB.png",  # Blue placeholder
            "B": "https://i.imgur.com/G2qmCPY.png",  # Black placeholder
            "R": "https://i.imgur.com/AlnmKYi.png",  # Red placeholder
            "G": "https://i.imgur.com/rBLUUDl.png",  # Green placeholder
        }
        return color_map.get(colors[0], "https://i.imgur.com/QrFDrPv.png")

    # For color pairs
    if len(colors) == 2:
        # We'll use a generic multi-color placeholder for pairs
        return "https://i.imgur.com/MNDyDPT.png"  # Example color pair placeholder

    # For 3+ colors
    return "https://i.imgur.com/MNDyDPT.png"  # Generic multicolor placeholder


# Auth routes
@app.route("/api/auth/register", methods=["POST"])
def register():
    """Register a new user"""
    data = request.get_json()

    # Validate required fields
    if not data or not data.get("username") or not data.get("password"):
        # card_id is not defined in this scope
        # logging.info(f"History entry added successfully for card ID: {card_id}")
        return jsonify({"error": "Missing username or password"}), 400

    # Check if username already exists
    if db.users.find_one({"username": data["username"]}):
        # card_id is not defined in this scope
        # logging.info(f"History entry added successfully for card ID: {card_id}")
        return jsonify({"error": "Username already exists"}), 409

    # Create new user
    new_user = {
        "username": data["username"],
        "password": generate_password_hash(data["password"]),
        "email": data.get("email"),
        "is_admin": data.get("is_admin", False),  # Default to non-admin
        "created_at": datetime.utcnow(),
    }

    # First user is automatically an admin
    if db.users.count_documents({}) == 0:
        new_user["is_admin"] = True

    user_id = db.users.insert_one(new_user).inserted_id

    return (
        jsonify({"message": "User registered successfully", "user_id": str(user_id)}),
        201,
    )


@app.route("/api/auth/login", methods=["POST"])
def login():
    """Login and get authentication token"""
    data = request.get_json()

    # Validate required fields
    if not data or not data.get("username") or not data.get("password"):
        # card_id is not defined in this scope
        # logging.info(f"History entry added successfully for card ID: {card_id}")
        return jsonify({"error": "Missing username or password"}), 400

    # Check if user exists
    user = db.users.find_one({"username": data["username"]})
    if not user or not check_password_hash(user["password"], data["password"]):
        # card_id is not defined in this scope
        # logging.info(f"History entry added successfully for card ID: {card_id}")
        return jsonify({"error": "Invalid username or password"}), 401

    # Generate JWT token
    token = jwt.encode(
        {
            "user_id": str(user["_id"]),
            "username": user["username"],
            "is_admin": user.get("is_admin", False),
            "exp": datetime.utcnow() + app.config["JWT_ACCESS_TOKEN_EXPIRES"],
        },
        app.config["JWT_SECRET_KEY"],
        algorithm="HS256",
    )

    return jsonify(
        {
            "token": token,
            "user": {
                "id": str(user["_id"]),
                "username": user["username"],
                "is_admin": user.get("is_admin", False),
            },
        }
    )


@app.route("/api/auth/profile", methods=["GET"])
def get_profile():
    """Get current user profile"""
    token = None
    auth_header = request.headers.get("Authorization")

    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]

    if not token:
        # card_id is not defined in this scope
        # logging.info(f"History entry added successfully for card ID: {card_id}")
        return jsonify({"error": "Authentication token is missing!"}), 401

    try:
        # Decode token
        data = jwt.decode(token, app.config["JWT_SECRET_KEY"], algorithms=["HS256"])
        current_user = db.users.find_one({"_id": ObjectId(data["user_id"])})

        if not current_user:
            # card_id is not defined in this scope
            # logging.info(f"History entry added successfully for card ID: {card_id}")
            return jsonify({"error": "User not found!"}), 401

        # Return user profile without password
        return jsonify(
            {
                "id": str(current_user["_id"]),
                "username": current_user["username"],
                "email": current_user.get("email"),
                "is_admin": current_user.get("is_admin", False),
                "created_at": current_user.get("created_at"),
            }
        )

    except jwt.ExpiredSignatureError:
        # card_id is not defined in this scope
        # logging.info(f"History entry added successfully for card ID: {card_id}")
        return jsonify({"error": "Token expired!"}), 401
    except jwt.InvalidTokenError:
        # card_id is not defined in this scope
        # logging.info(f"History entry added successfully for card ID: {card_id}")
        return jsonify({"error": "Invalid token!"}), 401


@app.route("/", methods=["GET"])
def index():
    """Root route that provides API information"""
    return jsonify(
        {
            "name": "Custom Cube API",
            "version": "1.0.0",
            "description": "API for Custom Cube website",
            "endpoints": [
                "/api/auth/register",
                "/api/auth/login",
                "/api/auth/profile",
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
                "/api/random-pack",
            ],
        }
    )


@app.route("/api/cards", methods=["GET"])
def get_cards():
    """Get all cards with optional filtering"""
    # Get query parameters
    search = request.args.get("search", "")
    body_search = request.args.get("body_search", "")
    colors = (
        request.args.get("colors", "").split(",") if request.args.get("colors") else []
    )
    color_match = request.args.get(
        "color_match", "includes"
    )  # 'exact', 'includes', or 'at-most'
    exclude_colorless = request.args.get("exclude_colorless", "").lower() == "true"
    card_type = request.args.get("type", "")
    card_set = request.args.get("set", "")
    custom = request.args.get("custom", "")
    facedown = request.args.get("facedown", "")
    include_facedown = request.args.get("include_facedown", "").lower() == "true"
    page = int(request.args.get("page", 1))
    limit = int(request.args.get("limit", 50))
    sort_by = request.args.get("sort_by", "name")
    sort_dir = request.args.get("sort_dir", "asc")

    # Build query using a simple approach that's less error-prone
    query = {}

    # Basic filter for facedown cards - exclude them unless include_facedown is true
    if not include_facedown:
        query["facedown"] = {"$ne": True}

    # Add name search if provided
    if search:
        query["name"] = {"$regex": search, "$options": "i"}

    # Add body text search if provided
    if body_search:
        # We need to search in both name and text fields
        body_query = {
            "$or": [
                {"name": {"$regex": body_search, "$options": "i"}},
                {"text": {"$regex": body_search, "$options": "i"}},
            ]
        }

        # If we already have a name filter, we need to preserve it
        if "name" in query:
            existing_name_filter = query["name"]
            # Remove the existing name filter as we'll include it in the $and
            del query["name"]
            # Create an $and condition that combines the name filter with the body search
            query["$and"] = [{"name": existing_name_filter}, body_query]
        else:
            # No existing name filter, just add the body query directly
            for key, value in body_query.items():
                query[key] = value

    if colors and colors[0]:  # Check if colors is not empty
        color_query_conditions = [] # Renamed to avoid conflict with outer `color_query` if it existed

        # Handle special color filters
        if "colorless" in colors:
            # Colorless means the colors array is empty
            color_query_conditions.append({"colors": {"$size": 0}})
            # Remove 'colorless' from the colors array to avoid confusion
            colors = [c for c in colors if c != "colorless"]

        if "multicolor" in colors:
            # Multicolor means the colors array has more than one color
            color_query_conditions.append({"colors": {"$exists": True, "$not": {"$size": 1}}})
            # Remove 'multicolor' from the colors array to avoid confusion
            colors = [c for c in colors if c != "multicolor"]

        # Add regular color filters if any remain
        if colors:
            if color_match == "exact":
                color_query_conditions.append({"colors": {"$all": colors, "$size": len(colors)}})
            elif color_match == "includes":
                color_query_conditions.append({"colors": {"$all": colors}})
            elif color_match == "at-most":
                color_query_conditions.append(
                    {"colors": {"$not": {"$elemMatch": {"$nin": colors}}}}
                )
            else:
                # Default to includes behavior
                color_query_conditions.append({"colors": {"$all": colors}})

        # Combine all color queries with OR if there are conditions
        if color_query_conditions:
            if "$or" in query: # If $or already exists, add to it with $and
                 query["$and"] = query.get("$and", []) + [{"$or": color_query_conditions}]
            else:
                 query["$or"] = color_query_conditions


    if card_type:
        # For all card types, including "Creature", just do a simple case-insensitive search
        # This will match any card that has the type string anywhere in its type field
        query["type"] = {"$regex": card_type, "$options": "i"}

    if card_set:
        query["set"] = card_set

    if custom:
        query["custom"] = custom.lower() == "true"

    # Get total count - this will exclude facedown cards due to the query
    # Make sure we're counting with the exact same query used for fetching
    total = db.cards.count_documents(query)

    # Calculate skip for pagination
    skip = (page - 1) * limit

    # Handle multiple sort fields
    sort_fields = sort_by.split(",") if sort_by else ["name"]
    sort_directions = sort_dir.split(",") if sort_dir else ["asc"]

    # Ensure we have a direction for each field
    while len(sort_directions) < len(sort_fields):
        sort_directions.append("asc")

    # Create sort specification
    sort_spec = []
    for i, field in enumerate(sort_fields):
        # Get corresponding direction or default to asc
        direction = (
            1
            if i >= len(sort_directions) or sort_directions[i].lower() == "asc"
            else -1
        )
        sort_spec.append((field, direction))

    # Execute query with sorting
    cursor = db.cards.find(query).sort(sort_spec).skip(skip).limit(limit)
    cards = list(cursor)

    # Convert ObjectId to string for each card
    for card in cards:
        card["id"] = str(card.pop("_id"))

    return jsonify({"cards": cards, "total": total})


@app.route("/api/cards/<card_id>", methods=["GET"])
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
            if isinstance(card.get("_id"), ObjectId):
                card["id"] = str(card.pop("_id"))
            else:
                card["id"] = card.pop("_id")
            # logging.info(f"History fetched successfully for card ID: {card_id}") # Log success before returning
            return jsonify(card)
        else:
            logging.info(f"Card not found with ID: {card_id}")
            return jsonify({"error": "Card not found"}), 404
    except Exception as e:
        # logging.error(f"Error adding history entry for card ID: {card_id}: {str(e)}") # Misplaced message
        logging.error(f"Error fetching card with ID {card_id}: {str(e)}")
        # logging.info(f"History entry added successfully for card ID: {card_id}") # Misplaced message
        return jsonify({"error": str(e)}), 500


@app.route("/api/archetypes", methods=["GET"])
def get_archetypes():
    """Get all archetypes"""
    archetypes = list(db.archetypes.find())

    # Convert ObjectId to string for each archetype
    for archetype in archetypes:
        # Convert MongoDB ObjectID to a string ID
        if "_id" in archetype:
            archetype["id"] = str(archetype["_id"])
            archetype.pop("_id")

    return jsonify(archetypes)


@app.route("/api/archetypes/<archetype_id>", methods=["GET"])
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
            if "_id" in archetype:
                archetype["id"] = str(archetype.pop("_id"))
            # logging.info(f"History fetched successfully for archetype ID: {archetype_id}") # Log success before returning
            return jsonify(archetype)
        else:
            logging.info(f"Archetype not found with ID: {archetype_id}")
            return jsonify({"error": "Archetype not found"}), 404
    except Exception as e:
        # logging.error(f"Error adding history entry for card ID: {card_id}: {str(e)}") # Misplaced
        logging.error(f"Error fetching archetype with ID {archetype_id}: {str(e)}")
        # logging.info(f"History entry added successfully for card ID: {card_id}") # Misplaced
        return jsonify({"error": str(e)}), 500


@app.route("/api/archetypes/<archetype_id>/cards", methods=["GET"])
def get_archetype_cards(archetype_id):
    """Get all cards for a specific archetype"""
    try:
        # Get pagination parameters
        page = int(request.args.get("page", 1))
        limit = int(request.args.get("limit", 50))

        # Calculate skip for pagination
        skip = (page - 1) * limit

        # Get the archetype to get its name
        archetype = db.archetypes.find_one({"_id": ObjectId(archetype_id)})
        archetype_name = archetype.get("name", "") if archetype else ""

        # Find cards that have this archetype ID OR name in their archetypes array
        # Also exclude facedown cards
        query = {
            "$and": [
                {"$or": [{"archetypes": archetype_id}, {"archetypes": archetype_name}]},
                {"$or": [{"facedown": False}, {"facedown": {"$exists": False}}]},
            ]
        }

        # Get total count
        total = db.cards.count_documents(query)

        # Get paginated cards
        cursor = db.cards.find(query).skip(skip).limit(limit)
        cards = list(cursor)

        # If the number of cards is less than the limit, get the remaining cards from the next page
        while len(cards) < limit and skip + len(cards) < total:
            # This logic for re-fetching seems complex and might be simplified or rethought
            # For now, preserving original logic, just fixing indentation if any.
            # skip += len(cards) # This skip adjustment was inside the loop condition in original thought, but should be based on already fetched
            current_fetched_count = len(cards) # Number of cards fetched in the current iteration
            skip += current_fetched_count # Adjust skip for the next fetch
            
            # Check if we actually fetched any cards in the previous step to avoid infinite loop if DB is slow or query is stuck
            if current_fetched_count == 0 and (limit - len(cards)) > 0 : # if we fetched 0 but still need cards
                 break # Avoid potential infinite loop

            if len(cards) < limit : # Only fetch more if needed
                remaining_to_fetch = limit - len(cards)
                cursor = db.cards.find(query).skip(skip).limit(remaining_to_fetch)
                cards.extend(list(cursor))


        # Convert ObjectId to string for each card
        for card in cards:
            card["id"] = str(card.pop("_id"))

        # logging.info(f"Successfully fetched cards for archetype ID: {archetype_id}")
        return jsonify({"cards": cards, "total": total})
    except Exception as e:
        # logging.error(f"Error adding history entry for card ID: {card_id}: {str(e)}") # Misplaced
        logging.error(f"Error fetching cards for archetype {archetype_id}: {str(e)}")
        # logging.info(f"History entry added successfully for card ID: {card_id}") # Misplaced
        return jsonify({"error": str(e)}), 500


@app.route("/api/archetypes/random-cards", methods=["GET"])
def get_random_archetype_cards():
    """Get one random card from each archetype in the database"""
    try:
        # Check if we should exclude facedown cards
        exclude_facedown = (
            request.args.get("exclude_facedown", "false").lower() == "true"
        )

        # Get all archetypes from the database
        all_archetypes = list(db.archetypes.find())

        # Process all archetypes and find a random card for each
        result = []
        for archetype in all_archetypes:
            # Make sure we have a valid ID
            if "_id" in archetype:
                archetype["id"] = str(archetype["_id"])

            archetype_id = archetype.get("id")
            archetype_name = archetype.get("name", "Unknown")

            # Build the query for cards in this archetype
            query = {
                "$and": [
                    {
                        "$or": [
                            {"archetypes": archetype_id},
                            {"archetypes": archetype_name},
                        ]
                    }
                ]
            }

            # Add facedown filter if needed
            if exclude_facedown:
                query["$and"].append(
                    {"$or": [{"facedown": False}, {"facedown": {"$exists": False}}]}
                )

            # Find all cards for this archetype by checking the archetypes array
            cards = list(db.cards.find(query))

            # Debug logging
            if cards and len(cards) > 0:
                # Find cards with images first
                cards_with_images = [card for card in cards if card.get("imageUrl")]

                # If we have cards with images, use those; otherwise, use any card
                card_pool = cards_with_images if cards_with_images else cards

                # Select a random card
                random_card = random.choice(card_pool)

                # Convert ObjectId to string
                random_card["id"] = str(random_card.pop("_id"))

                # Add archetype info to the card
                random_card["archetype"] = {
                    "id": archetype_id,
                    "name": archetype_name,
                    "colors": archetype.get("colors", []),
                    "description": archetype.get("description", ""),
                }

                # Make sure archetypes is a list
                if "archetypes" not in random_card or not random_card["archetypes"]:
                    random_card["archetypes"] = [archetype_id]

                result.append(random_card)
        
        # logging.info(f"Fetched random archetype cards successfully.")
        return jsonify(result)
    except Exception as e:
        # logging.error(f"Error adding history entry for card ID: {card_id}: {str(e)}") # Misplaced
        logging.error(f"Error fetching random archetype cards: {str(e)}")
        # logging.info(f"History entry added successfully for card ID: {card_id}") # Misplaced
        return jsonify({"error": str(e)}), 500


@app.route("/api/tokens", methods=["GET"]) # This is the first /api/tokens GET route
def get_tokens():
    """Get all tokens with optional filtering"""
    # Get query parameters
    search = request.args.get("search", "")
    body_search = request.args.get("body_search", "")
    colors = (
        request.args.get("colors", "").split(",") if request.args.get("colors") else []
    )
    color_match = request.args.get(
        "color_match", "includes"
    )  # 'exact', 'includes', or 'at-most'
    page = int(request.args.get("page", 1))
    limit = int(request.args.get("limit", 20))
    sort_by = request.args.get("sort_by", "name")
    sort_dir = request.args.get("sort_dir", "asc")

    # Build query
    query = {}

    if search:
        # Ensure partial matching for card names
        query["name"] = {"$regex": search, "$options": "i"}

    if body_search:
        # Search in both name and text fields
        name_query = {"name": {"$regex": body_search, "$options": "i"}}
        text_query = {"text": {"$regex": body_search, "$options": "i"}}

        # Use $or to match either field
        if "name" in query:
            # If we already have a name filter, combine it with both queries
            query = {
                "$or": [
                    {"$and": [{"name": query["name"]}, {"text": text_query["text"]}]},
                    {"name": name_query["name"]},
                ]
            }
        else:
            # Otherwise just search in either field
            query["$or"] = [name_query, text_query]

    if colors and colors[0]:  # Check if colors is not empty
        color_query_conditions = [] # Renamed

        # Handle special color filters
        if "colorless" in colors:
            # Colorless means the colors array is empty
            color_query_conditions.append({"colors": {"$size": 0}})
            # Remove 'colorless' from the colors array to avoid confusion
            colors = [c for c in colors if c != "colorless"]

        if "multicolor" in colors:
            # Multicolor means the colors array has more than one color
            color_query_conditions.append({"colors": {"$exists": True, "$not": {"$size": 1}}})
            # Remove 'multicolor' from the colors array to avoid confusion
            colors = [c for c in colors if c != "multicolor"]

        # Add regular color filters if any remain
        if colors:
            if color_match == "exact":
                color_query_conditions.append({"colors": {"$all": colors, "$size": len(colors)}})
            elif color_match == "includes":
                color_query_conditions.append({"colors": {"$all": colors}})
            elif color_match == "at-most":
                color_query_conditions.append(
                    {"colors": {"$not": {"$elemMatch": {"$nin": colors}}}}
                )
            else:
                # Default to includes behavior
                color_query_conditions.append({"colors": {"$all": colors}})

        # Combine all color queries with OR
        if color_query_conditions:
            if "$or" in query: # If $or already exists from body_search, nest it
                existing_or = query["$or"]
                query["$and"] = query.get("$and", []) + [{"$or": existing_or}]
                query["$or"] = color_query_conditions # This new $or is for colors
            else:
                query["$or"] = color_query_conditions


    # Get total count
    total = db.tokens.count_documents(query)

    # Calculate skip for pagination
    skip = (page - 1) * limit

    # Execute query with pagination and sorting

    # Handle multiple sort fields
    sort_fields = sort_by.split(",") if sort_by else ["name"]
    sort_directions = sort_dir.split(",") if sort_dir else ["asc"]

    # Ensure we have a direction for each field
    while len(sort_directions) < len(sort_fields):
        sort_directions.append("asc")

    # Create sort specification
    sort_spec = []
    for i, field in enumerate(sort_fields):
        # Get corresponding direction or default to asc
        direction = (
            1
            if i >= len(sort_directions) or sort_directions[i].lower() == "asc"
            else -1
        )
        sort_spec.append((field, direction))

    # Execute query with sorting
    tokens = list(db.tokens.find(query).sort(sort_spec).skip(skip).limit(limit))

    # Convert ObjectId to string for each token
    for token in tokens:
        token["id"] = str(token.pop("_id"))

    return jsonify({"tokens": tokens, "total": total})


# This route conflicts with the one above if not distinguished by query params logic in Flask.
# Typically, more specific routes (like /api/tokens/<name>) are defined before general ones,
# or they use different HTTP methods or distinct path structures.
# For query param based dispatch, it would require logic within a single route handler.
# Assuming this is intended to be a separate endpoint that *might* be shadowed.
@app.route("/api/tokens", methods=["GET"]) # This is the second /api/tokens GET route
def get_token_by_query():
    """Get a single token by name using query parameter"""
    try:
        token_name = request.args.get("name")
        if not token_name:
            # logging.info(f"History entry added successfully for card ID: {card_id}") # card_id undefined
            return jsonify({"error": "Token name not provided in query parameter"}), 400

        # logging.info(f"History fetched successfully for token: {token_name}")
        return get_token_by_name(token_name)
    except Exception as e:
        # logging.error(f"Error adding history entry for card ID: {card_id}: {str(e)}") # Misplaced
        logging.error(f"Error fetching token by query: {str(e)}")
        # logging.info(f"History entry added successfully for card ID: {card_id}") # Misplaced
        return jsonify({"error": str(e)}), 500


@app.route("/api/tokens/<string:token_name>", methods=["GET"])
def get_token(token_name):
    """Get a single token by name"""
    try:
        # URL decode the token name
        import urllib.parse

        token_name = urllib.parse.unquote(token_name).strip()
        # logging.info(f"History fetched successfully for token: {token_name}")
        return get_token_by_name(token_name)
    except Exception as e:
        # logging.error(f"Error adding history entry for card ID: {card_id}: {str(e)}") # Misplaced
        logging.error(f"Error fetching token '{token_name}': {str(e)}")
        # logging.info(f"History entry added successfully for card ID: {card_id}") # Misplaced
        return jsonify({"error": str(e)}), 500


def get_token_by_name(token_name):
    """Helper function to get token by name - used by both routes"""

    # Find token by name (case-insensitive)
    # Using exact match rather than regex to avoid issues with special characters
    token = db.tokens.find_one(
        {"name": {"$regex": f"^{re.escape(token_name)}$", "$options": "i"}}
    )

    if not token:
        logging.info(f"Token not found: {token_name}")
        return jsonify({"error": f"Token not found: {token_name}"}), 404

    # Convert ObjectId to string
    token["id"] = str(token.pop("_id"))

    # Find cards that create this token
    creator_cards = list(
        db.cards.find(
            {"relatedTokens": {"$regex": f"^{re.escape(token_name)}$", "$options": "i"}}
        )
    )

    # If no exact match found, try a more flexible search
    if not creator_cards:
        creator_cards = list(
            db.cards.find(
                {"relatedTokens": {"$regex": re.escape(token_name), "$options": "i"}}
            )
        )

    for card in creator_cards:
        card["id"] = str(card.pop("_id"))

    # Add the creator cards to the token response
    token["creatorCards"] = creator_cards

    return jsonify(token)


@app.route("/api/tokens/add", methods=["POST"])
@admin_required
def add_token():
    """Add a new token to the database"""
    try:
        # Get token data from request
        token_data = request.get_json()

        # Validate required fields
        if not token_data.get("name"):
            # logging.info(f"History entry added successfully for card ID: {card_id}") # card_id undefined
            return jsonify({"error": "Token name is required"}), 400
        if not token_data.get("type"):
            # logging.info(f"History entry added successfully for card ID: {card_id}") # card_id undefined
            return jsonify({"error": "Token type is required"}), 400
        if token_data.get("colors") is not None and not isinstance(
            token_data.get("colors"), list
        ):
            # logging.info(f"History entry added successfully for card ID: {card_id}") # card_id undefined
            return jsonify({"error": "Colors must be provided as an array"}), 400

        # Ensure colors is an array even if not provided (colorless token)
        if "colors" not in token_data or token_data.get("colors") is None:
            token_data["colors"] = []

        # Prepare token document
        new_token = {
            "name": token_data.get("name"),
            "type": token_data.get("type"),
            "colors": token_data.get("colors", []),
            "power": token_data.get("power"),
            "toughness": token_data.get("toughness"),
            "abilities": token_data.get("abilities", []),
            "imageUrl": token_data.get("imageUrl"),
            "artist": token_data.get("artist"),
        }

        # Insert token into database
        result = db.tokens.insert_one(new_token)

        # Get the inserted token with its ID
        inserted_token = db.tokens.find_one({"_id": result.inserted_id})
        inserted_token["id"] = str(inserted_token.pop("_id"))

        # logging.info(f"Token {inserted_token['name']} added successfully.")
        return jsonify(inserted_token), 201
    except Exception as e:
        # logging.error(f"Error adding history entry for card ID: {card_id}: {str(e)}") # Misplaced
        logging.error(f"Error adding token: {str(e)}")
        # logging.info(f"History entry added successfully for card ID: {card_id}") # Misplaced
        return jsonify({"error": str(e)}), 500


@app.route("/api/draft/pack", methods=["GET"])
def get_draft_pack():
    """Generate a random draft pack of 15 unique cards, excluding facedown cards"""
    try:
        # Get all cards from the database that are not facedown
        all_cards = list(db.cards.find({"facedown": {"$ne": True}}))

        # Convert ObjectIds to strings
        for card in all_cards:
            card["id"] = str(card.pop("_id"))

        # Ensure we have enough cards
        if len(all_cards) < 15:
            return (
                jsonify(
                    {
                        "error": "Not enough visible cards in database to create a draft pack"
                    }
                ),
                400,
            )

        # Shuffle the cards and take 15 for the pack
        random.shuffle(all_cards)
        pack = all_cards[:15]

        # logging.info(f"Draft pack generated successfully.")
        return jsonify(pack)
    except Exception as e:
        # logging.error(f"Error adding history entry for card ID: {card_id}: {str(e)}") # Misplaced
        logging.error(f"Error generating draft pack: {str(e)}")
        # logging.info(f"History entry added successfully for card ID: {card_id}") # Misplaced
        return jsonify({"error": str(e)}), 500


@app.route("/api/draft/packs", methods=["GET"])
def get_multiple_draft_packs():
    """Generate multiple random draft packs in a single request with no duplicate cards across all packs, excluding facedown cards"""
    try:
        # Get the count parameter (default to 1 if not provided)
        count = request.args.get("count", default=1, type=int)

        # Limit the maximum number of packs to avoid abuse
        if count > 50:
            count = 50

        # Get all cards from the database once, excluding facedown cards
        all_cards = list(db.cards.find({"facedown": {"$ne": True}}))

        # Convert ObjectIds to strings
        for card in all_cards:
            card["id"] = str(card.pop("_id"))

        # Calculate total cards needed (15 cards per pack)
        total_cards_needed = count * 15

        # Ensure we have enough unique cards in the database
        if len(all_cards) < total_cards_needed:
            return (
                jsonify(
                    {
                        "error": f"Not enough unique visible cards in database. Have {len(all_cards)}, need {total_cards_needed}"
                    }
                ),
                400,
            )

        # Shuffle all cards once
        random.shuffle(all_cards)

        # Generate the requested number of packs without duplicates
        packs = []
        for i in range(count):
            # Take the next 15 cards for this pack
            start_idx = i * 15
            end_idx = start_idx + 15
            pack = all_cards[start_idx:end_idx]
            packs.append(pack)

        # logging.info(f"Generated {count} draft packs successfully.")
        return jsonify(packs)
    except Exception as e:
        # logging.error(f"Error adding history entry for card ID: {card_id}: {str(e)}") # Misplaced
        logging.error(f"Error generating multiple draft packs: {str(e)}")
        # logging.info(f"History entry added successfully for card ID: {card_id}") # Misplaced
        return jsonify({"error": str(e)}), 500


@app.route("/api/draft/bot-pick", methods=["POST"])
def bot_draft_pick():
    """Make a bot draft pick based on card evaluation and color preferences"""
    try:
        data = request.json
        if not data:
            # logging.info(f"History entry added successfully for card ID: {card_id}") # card_id undefined
            return jsonify({"error": "No JSON data received"}), 400

        available_cards = data.get("availableCards", [])
        bot_colors = data.get("botColors", [])
        pack_number = data.get("packNumber", 1)
        pick_number = data.get("pickNumber", 1)

        if not available_cards:
            # logging.info(f"History entry added successfully for card ID: {card_id}") # card_id undefined
            return jsonify({"error": "No cards available"}), 400

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
            if "Creature" in card.get("type", ""):
                score += 5  # Creatures are important

                # Power/toughness bonus
                # Handle cases where power or toughness might be '*' (variable values)
                power_val = card.get("power", "0")
                toughness_val = card.get("toughness", "0")
                
                # Convert to int, handling special cases
                try:
                    power = int(power_val) if power_val and power_val != '*' else 0
                except (ValueError, TypeError):
                    power = 0
                    
                try:
                    toughness = int(toughness_val) if toughness_val and toughness_val != '*' else 0
                except (ValueError, TypeError):
                    toughness = 0
                    
                # Cards with '*' in power/toughness are often powerful
                if power_val == '*' or toughness_val == '*':
                    score += 3  # Give a bonus for variable stats as they're usually strong
                else:
                    score += min(power + toughness, 8) / 2

            elif "Instant" in card.get("type", "") or "Sorcery" in card.get("type", ""):
                score += 4  # Spells are good but not as essential as creatures

            # Bonus for rarity
            rarity_bonus = {"Common": 0, "Uncommon": 1, "Rare": 2, "Mythic Rare": 3}
            score += rarity_bonus.get(card.get("rarity", "Common"), 0)

            # Color preference
            card_colors = card.get("colors", [])

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

            scored_cards.append({"card": card, "score": score})

        # Sort by score and pick the highest
        scored_cards.sort(key=lambda x: x["score"], reverse=True)
        picked_card = scored_cards[0]["card"]

        # If bot doesn't have colors yet and this is an early pick, set colors based on the pick
        if (
            not bot_colors
            and pack_number == 1
            and pick_number <= 2
            and picked_card.get("colors")
        ):
            bot_colors = picked_card.get("colors")

        # logging.info(f"Bot picked card: {picked_card.get('name')}")
        return jsonify({"pickedCard": picked_card, "botColors": bot_colors})
    except Exception as e:
        # logging.error(f"Error adding history entry for card ID: {card_id}: {str(e)}") # Misplaced
        logging.error(f"Error in bot draft pick: {str(e)}")
        # logging.info(f"History entry added successfully for card ID: {card_id}") # Misplaced
        return jsonify({"error": str(e)}), 500


# Card Suggestions API
@app.route("/api/suggestions", methods=["GET"])
def get_suggestions():
    """Get all card suggestions"""
    try:
        # Get pagination parameters
        page = int(request.args.get("page", 1))
        limit = int(request.args.get("limit", 50))

        # Calculate skip for pagination
        skip = (page - 1) * limit

        # Get total count
        total = db.suggestions.count_documents({})

        # Get paginated suggestions
        suggestions = list(db.suggestions.find().skip(skip).limit(limit))

        # Convert ObjectId to string for each suggestion
        for suggestion in suggestions:
            suggestion["id"] = str(suggestion.pop("_id"))

        # logging.info(f"Fetched card suggestions successfully.")
        return jsonify({"suggestions": suggestions, "total": total})
    except Exception as e:
        # logging.error(f"Error adding history entry for card ID: {card_id}: {str(e)}") # Misplaced
        logging.error(f"Error fetching card suggestions: {str(e)}")
        # logging.info(f"History entry added successfully for card ID: {card_id}") # Misplaced
        return jsonify({"error": str(e)}), 500


@app.route("/api/suggestions", methods=["POST"])
def add_suggestion():
    """Add a new card suggestion"""
    try:
        data = request.json

        # Validate required fields
        if not data.get("name"):
            # logging.info(f"History entry added successfully for card ID: {card_id}") # card_id undefined
            return jsonify({"error": "Card name is required"}), 400

        # Create suggestion document
        suggestion = {
            "name": data.get("name"),
            "description": data.get("description", ""),
            "imageUrl": data.get("imageUrl", ""),
            "createdBy": data.get("createdBy", "Anonymous"),
            "submittedAt": datetime.now(),
            "status": "pending",  # pending, approved, rejected
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
            "status": suggestion["status"],
        }
        # logging.info(f"Card suggestion '{created_suggestion['name']}' added successfully.")
        return jsonify(created_suggestion), 201
    except Exception as e:
        # logging.error(f"Error adding history entry for card ID: {card_id}: {str(e)}") # Misplaced
        logging.error(f"Error adding card suggestion: {str(e)}")
        # logging.info(f"History entry added successfully for card ID: {card_id}") # Misplaced
        return jsonify({"error": str(e)}), 500


@app.route("/api/suggestions/upload", methods=["POST"])
def upload_suggestion_image():
    """Upload an image for a card suggestion"""
    try:
        if "image" not in request.files:
            # logging.info(f"History entry added successfully for card ID: {card_id}") # card_id undefined
            return jsonify({"error": "No image file provided"}), 400

        image_file = request.files["image"]

        if image_file.filename == "":
            # logging.info(f"History entry added successfully for card ID: {card_id}") # card_id undefined
            return jsonify({"error": "No image selected"}), 400

        # For simplicity, we'll store the image in a base64 format
        # In a production environment, you would likely use cloud storage
        import base64

        image_data = base64.b64encode(image_file.read()).decode("utf-8")

        # Return the image data to be stored with the suggestion
        # logging.info(f"Image uploaded successfully for suggestion.")
        return (
            jsonify(
                {
                    "imageUrl": f"data:image/{image_file.filename.split('.')[-1]};base64,{image_data}"
                }
            ),
            200,
        )
    except Exception as e:
        # logging.error(f"Error adding history entry for card ID: {card_id}: {str(e)}") # Misplaced
        logging.error(f"Error uploading suggestion image: {str(e)}")
        # logging.info(f"History entry added successfully for card ID: {card_id}") # Misplaced
        return jsonify({"error": str(e)}), 500


@app.route("/api/chatgpt_cards", methods=["GET"])
def get_chatgpt_cards():
    """Get cards that instruct users to ask ChatGPT for something"""
    try:
        # Find cards that have a 'prompt' field
        query = {"prompt": {"$exists": True}}

        # Execute query
        cards = list(db.cards.find(query))

        # Convert ObjectId to string for each card
        for card in cards:
            card["id"] = str(card.pop("_id"))
        
        # logging.info(f"Fetched ChatGPT cards successfully.")
        return jsonify(cards)
    except Exception as e:
        # logging.error(f"Error adding history entry for card ID: {card_id}: {str(e)}") # Misplaced
        logging.error(f"Error fetching ChatGPT cards: {str(e)}")
        # logging.info(f"History entry added successfully for card ID: {card_id}") # Misplaced
        return jsonify({"error": str(e)}), 500


@app.route("/api/chatgpt_response", methods=["POST"])
def get_chatgpt_response():
    """Simulate a ChatGPT response for a given prompt"""
    try:
        data = request.get_json()

        if not data or "prompt" not in data:
            # logging.info(f"History entry added successfully for card ID: {card_id}") # card_id undefined
            return jsonify({"error": "No prompt provided"}), 400

        prompt = data["prompt"]

        # For demo purposes, we'll just return a fixed response
        # In a real app, you would call the ChatGPT API here
        response = {
            "response": f"This is a simulated response to: {prompt}",
            "timestamp": datetime.now().isoformat(),
        }
        
        # logging.info(f"Generated simulated ChatGPT response for prompt: {prompt}")
        return jsonify(response)
    except Exception as e:
        # logging.error(f"Error adding history entry for card ID: {card_id}: {str(e)}") # Misplaced
        logging.error(f"Error generating ChatGPT response: {str(e)}")
        # logging.info(f"History entry added successfully for card ID: {card_id}") # Misplaced
        return jsonify({"error": str(e)}), 500


@app.route("/api/gemini/response", methods=["POST"])
def get_gemini_response():
    """Get a response from Google's Gemini API for a given prompt"""
    try:
        data = request.get_json()

        if not data or "prompt" not in data:
            # logging.info(f"History entry added successfully for card ID: {card_id}") # card_id undefined
            return jsonify({"error": "No prompt provided"}), 400

        prompt = data["prompt"]

        # Get API key from environment variables
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            # logging.info(f"History entry added successfully for card ID: {card_id}") # card_id undefined
            return jsonify({"error": "Gemini API key not configured"}), 500

        # Call Gemini API
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}"
        # Corrected model name if 'gemini-2.0-flash' isn't standard; common ones are 'gemini-pro' or 'gemini-1.5-flash-latest'
        # Using 'gemini-1.5-flash-latest' as a likely candidate for a general purpose flash model
        # url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key={api_key}"


        headers = {"Content-Type": "application/json"}

        payload = {"contents": [{"parts": [{"text": prompt}]}]}

        response = requests.post(url, headers=headers, json=payload)
        response.raise_for_status() # Will raise an HTTPError if the HTTP request returned an unsuccessful status code
        
        data = response.json()

        # Extract the text from the response
        # Check for 'candidates' and then access parts safely
        gemini_response = "Error: Could not parse Gemini response." # Default error message
        if data.get("candidates") and len(data["candidates"]) > 0:
            candidate = data["candidates"][0]
            if candidate.get("content") and candidate["content"].get("parts") and len(candidate["content"]["parts"]) > 0:
                gemini_response = candidate["content"]["parts"][0].get("text", gemini_response)


        result = {"response": gemini_response, "timestamp": datetime.now().isoformat()}

        # logging.info(f"Fetched Gemini response successfully for prompt: {prompt}")
        return jsonify(result)
    except requests.exceptions.HTTPError as http_err:
        logging.error(f"Gemini API HTTP error: {http_err} - Response: {http_err.response.text}")
        return jsonify({"error": f"Gemini API error: {http_err.response.status_code}", "details": http_err.response.text}), 500
    except Exception as e:
        # logging.error(f"Error adding history entry for card ID: {card_id}: {str(e)}") # Misplaced
        logging.error(f"Error fetching Gemini response: {str(e)}")
        # logging.info(f"History entry added successfully for card ID: {card_id}") # Misplaced
        return jsonify({"error": str(e)}), 500


@app.route("/api/image-proxy", methods=["GET"])
def image_proxy():
    """Proxy for images to avoid CORS issues"""
    try:
        # Get the image URL from the query parameter
        image_url = request.args.get("url")
        if not image_url:
            # logging.info(f"History entry added successfully for card ID: {card_id}") # card_id undefined
            return jsonify({"error": "No URL provided"}), 400

        # Add headers to avoid rate limiting and mimic a browser
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            "Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Referer": "https://scryfall.com/", # Example referer
        }

        # Make a request to the image URL with a longer timeout
        response = requests.get(
            image_url, stream=True, headers=headers, timeout=15, verify=True # verify=True is default, good practice
        )

        # Check if the request was successful
        if response.status_code != 200:
            # Return a placeholder image instead of an error
            placeholder_svg = """
            <svg xmlns="http://www.w3.org/2000/svg" width="265" height="370" viewBox="0 0 265 370">
                <rect width="265" height="370" fill="#eee"/>
                <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="14" text-anchor="middle" fill="#888">
                    Image Not Available
                </text>
            </svg>
            """
            return Response(
                placeholder_svg,
                content_type="image/svg+xml",
                headers={
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Credentials": "true",
                    "Cache-Control": "public, max-age=86400", # Cache for 1 day
                },
            )

        # Get the content type from the response
        content_type = response.headers.get("Content-Type", "image/jpeg")
        # Return the image with the correct content type
        # logging.info(f"Image proxied successfully from URL: {image_url}")
        return Response(
            response.content, # Use response.content for non-streamed complete data or iterate response.iter_content for stream=True
            content_type=content_type,
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Credentials": "true",
                "Cache-Control": "public, max-age=86400", # Cache for 1 day
            },
        )
    except Exception as e:
        # logging.error(f"Error adding history entry for card ID: {card_id}: {str(e)}") # Misplaced
        logging.error(f"Error proxying image: {str(e)}")
        # Return a placeholder image instead of an error
        placeholder_svg = """
        <svg xmlns="http://www.w3.org/2000/svg" width="265" height="370" viewBox="0 0 265 370">
            <rect width="265" height="370" fill="#eee"/>
            <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="14" text-anchor="middle" fill="#888">
                Error Loading Image
            </text>
        </svg>
        """
        return Response(
            placeholder_svg,
            content_type="image/svg+xml",
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Credentials": "true",
                "Cache-Control": "public, max-age=86400", # Cache placeholder too
            },
        )


@app.route("/api/random-pack", methods=["GET"])
def get_random_pack():
    """Generate a random pack of cards from the database where each card has equal probability of appearing"""
    try:
        # Get pack size from query parameters, default to 15 cards
        pack_size = request.args.get("size", default=15, type=int)
        min_size = request.args.get("min_size", default=1, type=int)
        exclude_facedown = (
            request.args.get("exclude_facedown", "false").lower() == "true"
        )
        # Build query to filter cards
        query = {}
        if exclude_facedown:
            query["$or"] = [{"facedown": False}, {"facedown": {"$exists": False}}]

        # Get filtered cards from the database
        all_cards = list(db.cards.find(query))
        total_cards = len(all_cards)

        # If we don't have enough cards, adjust the pack size
        if total_cards < pack_size:
            if total_cards < min_size:
                return (
                    jsonify(
                        {
                            "error": f"Not enough cards in database. Found {total_cards}, minimum required is {min_size}"
                        }
                    ),
                    400,
                )
            pack_size = total_cards # Adjust pack_size if not enough cards but more than min_size

        # Shuffle the cards to randomize
        random.shuffle(all_cards)

        # Take the first 'pack_size' cards for the pack
        pack = all_cards[:pack_size]

        # Convert ObjectIds to strings for JSON serialization
        for card in pack:
            card["id"] = str(card.pop("_id"))

        # Create response with pack and metadata
        response = {
            "pack": pack,
            "metadata": {
                "requested_size": int(request.args.get("size", 15)), # Original requested size
                "actual_size": len(pack),
                "total_cards_in_database": total_cards,
                "exclude_facedown": exclude_facedown,
                "timestamp": datetime.now().isoformat(),
            },
        }
        # logging.info(f"Generated random pack of size {len(pack)} successfully.")
        return jsonify(response)
    except Exception as e:
        # logging.error(f"Error adding history entry for card ID: {card_id}: {str(e)}") # Misplaced
        logging.error(f"Error generating random pack: {str(e)}")
        # logging.info(f"History entry added successfully for card ID: {card_id}") # Misplaced
        return jsonify({"error": str(e)}), 500


@app.route("/api/cards/add", methods=["POST"])
@admin_required
def add_card():
    """Add a new card to the database"""
    try:
        data = request.json

        # Validate required fields
        if not data.get("name"):
            # logging.info(f"History entry added successfully for card ID: {card_id}") # card_id undefined
            return jsonify({"error": "Card name is required"}), 400
        if not data.get("manaCost"):
            # logging.info(f"History entry added successfully for card ID: {card_id}") # card_id undefined
            return jsonify({"error": "Mana cost is required"}), 400
        if not data.get("type"):
            # logging.info(f"History entry added successfully for card ID: {card_id}") # card_id undefined
            return jsonify({"error": "Card type is required"}), 400
        if not data.get("text"): # Text can sometimes be empty for vanilla creatures. Consider if this is a strict req.
            # logging.info(f"History entry added successfully for card ID: {card_id}") # card_id undefined
            return jsonify({"error": "Card text is required"}), 400
        if data.get("colors") is not None and not isinstance(data.get("colors"), list):
            # logging.info(f"History entry added successfully for card ID: {card_id}") # card_id undefined
            return jsonify({"error": "Card colors must be provided as a list"}), 400

        # Ensure colors is an array even if not provided (colorless card)
        if "colors" not in data or data.get("colors") is None:
            data["colors"] = []

        # Create card document with MongoDB ObjectId
        card = {
            "_id": ObjectId(), # Generate new ObjectId
            "name": data.get("name"),
            "manaCost": data.get("manaCost"),
            "type": data.get("type"),
            "rarity": data.get("rarity", "Common"),
            "text": data.get("text"),
            "power": data.get("power") if data.get("power") else None,
            "toughness": data.get("toughness") if data.get("toughness") else None,
            "loyalty": data.get("loyalty"),
            "colors": data.get("colors", []),
            "custom": data.get("custom", True),
            "archetypes": data.get("archetypes", []),
            "imageUrl": data.get("imageUrl", ""),
            "flavorText": data.get("flavorText", ""),
            "artist": data.get("artist", ""),
            "set": data.get("set", "Custom Cube 1"),
            "notes": data.get("notes", ""),
            "relatedTokens": data.get("relatedTokens", []),
            "relatedFace": data.get("relatedFace"),
        }

        # Insert into database
        db.cards.insert_one(card)

        # Return the created card with properly serialized ID
        card_id_str = str(card["_id"]) # Use a different variable name
        # card.pop("_id") # No need to pop, just add 'id' field for response
        card_response = card.copy()
        card_response["id"] = card_id_str
        del card_response["_id"] # Remove ObjectId from response if desired

        # logging.info(f"Card '{card_response['name']}' added successfully with ID: {card_id_str}")
        return jsonify(card_response), 201
    except Exception as e:
        # logging.error(f"Error adding history entry for card ID: {card_id}: {str(e)}") # Misplaced
        logging.error(f"Error adding card: {str(e)}")
        # logging.info(f"History entry added successfully for card ID: {card_id}") # Misplaced
        return jsonify({"error": str(e)}), 500


@app.route("/api/cards/update/<card_id>", methods=["PUT"])
@admin_required
def update_card(card_id):
    """Update an existing card in the database"""
    try:
        data = request.json

        # Validate required fields
        if not data.get("name"):
            # logging.info(f"Attempted to update card ID {card_id} with missing name.")
            return jsonify({"error": "Card name is required"}), 400
        if not data.get("manaCost"):
            # logging.info(f"Attempted to update card ID {card_id} with missing manaCost.")
            return jsonify({"error": "Mana cost is required"}), 400
        if not data.get("type"):
            # logging.info(f"Attempted to update card ID {card_id} with missing type.")
            return jsonify({"error": "Card type is required"}), 400
        if not data.get("text"): # Consider if text can be empty
            # logging.info(f"Attempted to update card ID {card_id} with missing text.")
            return jsonify({"error": "Card text is required"}), 400
        if data.get("colors") is not None and not isinstance(data.get("colors"), list):
            # logging.info(f"Attempted to update card ID {card_id} with invalid colors format.")
            return jsonify({"error": "Card colors must be provided as a list"}), 400

        # Ensure colors is an array even if not provided (colorless card)
        if "colors" not in data or data.get("colors") is None:
            data["colors"] = []

        # Try to find the card by string ID first
        existing_card_obj_id = None
        try:
            existing_card_obj_id = ObjectId(card_id)
            existing_card = db.cards.find_one({"_id": existing_card_obj_id})
        except: # Invalid ObjectId format
            existing_card = db.cards.find_one({"_id": card_id}) # Try as string
            if existing_card: # if found as string, its _id is a string
                existing_card_obj_id = card_id


        if not existing_card:
            logging.error(f"Card not found for ID: {card_id} during update.")
            # logging.info(f"History entry added successfully for card ID: {card_id}") # Misplaced text
            return jsonify({"error": "Card not found"}), 404

        # Create update document
        update_data = {
            "name": data.get("name"),
            "manaCost": data.get("manaCost"),
            "type": data.get("type"),
            "rarity": data.get("rarity", "Common"),
            "text": data.get("text"),
            "power": data.get("power") if data.get("power") else None,
            "toughness": data.get("toughness") if data.get("toughness") else None,
            "loyalty": data.get("loyalty"),
            "colors": data.get("colors", []),
            "custom": data.get("custom", True),
            "archetypes": data.get("archetypes", []),
            "imageUrl": data.get("imageUrl", ""),
            "flavorText": data.get("flavorText", ""),
            "artist": data.get("artist", ""),
            "set": data.get("set", "Custom Cube 1"),
            "notes": data.get("notes", ""),
            "relatedTokens": data.get("relatedTokens", []),
            "relatedFace": data.get("relatedFace"),
        }

        # Store the current version in card_history before updating
        history_version_data = existing_card.copy()
        # Ensure _id in history_version_data is a string for consistency if it's ObjectId
        if isinstance(history_version_data.get("_id"), ObjectId):
             history_version_data["_id"] = str(history_version_data["_id"])

        history_entry = {
            "card_id": str(existing_card["_id"]), # Use the string version of the card's actual _id
            "timestamp": datetime.utcnow(),
            "version_data": history_version_data
        }
        
        db.card_history.insert_one(history_entry)

        # Update in database using the determined existing_card_obj_id
        result = db.cards.update_one(
            {"_id": existing_card_obj_id},
            {"$set": update_data},
        )

        if result.modified_count == 0:
            # logging.info(f"No changes were made to the card ID: {card_id}")
            return jsonify({"warning": "No changes were made to the card", "card_id": card_id}), 200

        # Return the updated card
        updated_card = db.cards.find_one({"_id": existing_card_obj_id})
        if updated_card:
            updated_card["id"] = str(updated_card.pop("_id"))
            # logging.info(f"Card ID: {card_id} updated successfully.")
            return jsonify(updated_card), 200
        else:
            # This state (modified_count > 0 but card not found) should be rare.
            logging.error(f"Card ID: {card_id} not found after update, despite modification count > 0.")
            return jsonify({"error": "Card not found after update"}), 404 # Or 500
    except Exception as e:
        # logging.error(f"Error adding history entry for card ID: {card_id}: {str(e)}") # Misplaced
        logging.error(f"Error updating card ID {card_id}: {str(e)}")
        # logging.info(f"History entry added successfully for card ID: {card_id}") # Misplaced
        return jsonify({"error": str(e)}), 500


# Comments API
@app.route("/api/comments/card/<card_id>", methods=["GET"])
def get_card_comments(card_id):
    """Get all comments for a specific card"""
    try:
        # Get comments for the card
        comments = list(db.comments.find({"cardId": card_id}).sort("createdAt", -1))
        
        if not comments:
            return jsonify([]), 200
            
        # Format the comments for the response
        formatted_comments = []
        for comment in comments:
            formatted_comments.append({
                "id": str(comment["_id"]),
                "cardId": comment["cardId"],
                "userId": comment.get("userId", "guest"),
                "username": comment.get("username", "Guest"),
                "content": comment["content"],
                "createdAt": comment.get("createdAt", datetime.utcnow().isoformat()) # Default if missing
            })
            
        # logging.info(f"Fetched comments for card ID: {card_id} successfully.")
        return jsonify(formatted_comments), 200
    except Exception as e:
        # logging.error(f"Error adding history entry for card ID: {card_id}: {str(e)}") # Misplaced
        logging.error(f"Error fetching comments for card ID {card_id}: {str(e)}")
        # logging.info(f"History entry added successfully for card ID: {card_id}") # Misplaced
        return jsonify({"error": str(e)}), 500

@app.route("/api/comments/card/<card_id>", methods=["POST"])
def add_authenticated_comment(card_id):
    """Add a new comment for a card (authenticated user)"""
    try:
        # Get the comment data from the request
        data = request.get_json()
        
        if not data or not data.get("content"):
            # logging.info(f"Attempted to add comment for card {card_id} with no content.")
            return jsonify({"error": "Comment content is required"}), 400
            
        # Verify authentication
        token = None
        auth_header = request.headers.get("Authorization")
        
        if not auth_header or not auth_header.startswith("Bearer "):
            # logging.info(f"Missing auth token for adding comment to card {card_id}.")
            return jsonify({"error": "Authentication token is missing"}), 401
            
        token = auth_header.split(" ")[1]
        
        try:
            # Decode token
            decoded = jwt.decode(token, app.config["JWT_SECRET_KEY"], algorithms=["HS256"])
            user_id = decoded["user_id"]
            username = decoded["username"]
        except jwt.ExpiredSignatureError:
            # logging.info(f"Expired token for adding comment to card {card_id}.")
            return jsonify({"error": "Token expired"}), 401
        except jwt.InvalidTokenError:
            # logging.info(f"Invalid token for adding comment to card {card_id}.")
            return jsonify({"error": "Invalid token"}), 401
            
        # Create the comment
        new_comment = {
            "cardId": card_id,
            "userId": user_id,
            "username": username,
            "content": data["content"],
            "createdAt": datetime.utcnow().isoformat()
        }
        
        # Insert the comment into the database
        result = db.comments.insert_one(new_comment)
        
        # Return the created comment
        created_comment = {
            "id": str(result.inserted_id),
            "cardId": new_comment["cardId"],
            "userId": new_comment["userId"],
            "username": new_comment["username"],
            "content": new_comment["content"],
            "createdAt": new_comment["createdAt"]
        }
        
        # logging.info(f"Authenticated comment added to card {card_id} by user {username}.")
        return jsonify(created_comment), 201
    except Exception as e:
        # logging.error(f"Error adding history entry for card ID: {card_id}: {str(e)}") # Misplaced
        logging.error(f"Error adding authenticated comment for card {card_id}: {str(e)}")
        # logging.info(f"History entry added successfully for card ID: {card_id}") # Misplaced
        return jsonify({"error": str(e)}), 500

@app.route("/api/comments/card/<card_id>/guest", methods=["POST"])
def add_guest_comment(card_id):
    """Add a new comment for a card (guest user)"""
    try:
        # Get the comment data from the request
        data = request.get_json()
        
        if not data or not data.get("content"):
            # logging.info(f"Attempted to add guest comment for card {card_id} with no content.")
            return jsonify({"error": "Comment content is required"}), 400
            
        # Validate guest username
        if not data.get("username"):
            # logging.info(f"Attempted to add guest comment for card {card_id} with no username.")
            return jsonify({"error": "Guest username is required"}), 400
            
        # Create the comment
        new_comment = {
            "cardId": card_id,
            "userId": "guest", # Specific ID for guest
            "username": data["username"],
            "content": data["content"],
            "createdAt": datetime.utcnow().isoformat()
        }
        
        # Insert the comment into the database
        result = db.comments.insert_one(new_comment)
        
        # Return the created comment
        created_comment = {
            "id": str(result.inserted_id),
            "cardId": new_comment["cardId"],
            "userId": new_comment["userId"],
            "username": new_comment["username"],
            "content": new_comment["content"],
            "createdAt": new_comment["createdAt"]
        }
        
        # logging.info(f"Guest comment added to card {card_id} by {new_comment['username']}.")
        return jsonify(created_comment), 201
    except Exception as e:
        # logging.error(f"Error adding history entry for card ID: {card_id}: {str(e)}") # Misplaced
        logging.error(f"Error adding guest comment for card {card_id}: {str(e)}")
        # logging.info(f"History entry added successfully for card ID: {card_id}") # Misplaced
        return jsonify({"error": str(e)}), 500

@app.route("/api/comments/<comment_id>", methods=["DELETE"])
def delete_comment(comment_id):
    """Delete a comment (only for comment owner or admin)"""
    try:
        # Verify authentication
        token = None
        auth_header = request.headers.get("Authorization")
        
        if not auth_header or not auth_header.startswith("Bearer "):
            # logging.info(f"Missing auth token for deleting comment {comment_id}.")
            return jsonify({"error": "Authentication token is missing"}), 401
            
        token = auth_header.split(" ")[1]
        
        try:
            # Decode token
            decoded = jwt.decode(token, app.config["JWT_SECRET_KEY"], algorithms=["HS256"])
            user_id = decoded["user_id"]
            is_admin = decoded.get("is_admin", False)
        except jwt.ExpiredSignatureError:
            # logging.info(f"Expired token for deleting comment {comment_id}.")
            return jsonify({"error": "Token expired"}), 401
        except jwt.InvalidTokenError:
            # logging.info(f"Invalid token for deleting comment {comment_id}.")
            return jsonify({"error": "Invalid token"}), 401
            
        # Find the comment
        comment_obj_id = None
        try:
            comment_obj_id = ObjectId(comment_id)
            comment = db.comments.find_one({"_id": comment_obj_id})
        except: # Invalid ObjectId
            # logging.info(f"Comment ID {comment_id} is not a valid ObjectId format for delete.")
            return jsonify({"error": "Invalid comment ID format"}), 400
            
        if not comment:
            # logging.info(f"Comment {comment_id} not found for deletion.")
            return jsonify({"error": "Comment not found"}), 404
            
        # Check if user is the comment owner or an admin
        if comment.get("userId") != user_id and not is_admin:
            # logging.info(f"User {user_id} not authorized to delete comment {comment_id}.")
            return jsonify({"error": "You are not authorized to delete this comment"}), 403
            
        # Delete the comment
        result = db.comments.delete_one({"_id": comment_obj_id})
        
        if result.deleted_count == 0:
            # This case should be rare if find_one succeeded unless a race condition.
            # logging.info(f"Failed to delete comment {comment_id}, though it was found.")
            return jsonify({"error": "Failed to delete comment"}), 500
            
        # logging.info(f"Comment {comment_id} deleted successfully by user {user_id}.")
        return jsonify({"message": "Comment deleted successfully"}), 200
    except Exception as e:
        # logging.error(f"Error adding history entry for card ID: {card_id}: {str(e)}") # Misplaced (card_id undefined)
        logging.error(f"Error deleting comment {comment_id}: {str(e)}")
        # logging.info(f"History entry added successfully for card ID: {card_id}") # Misplaced (card_id undefined)
        return jsonify({"error": str(e)}), 500

# Card History API
@app.route("/api/cards/<card_id>/history", methods=["GET"])
def get_card_history(card_id):
    logging.info(f"Fetching history for card ID: {card_id}")
    """Get the history of a card's iterations"""
    try:
        # Get pagination parameters
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 10))
        skip = (page - 1) * limit
        
        # Query the card_history collection - card_id in history is stored as string
        history_entries = list(db.card_history.find(
            {"card_id": card_id} # Assuming card_id param is string, and history stores it as string
        ).sort("timestamp", -1).skip(skip).limit(limit))
        
        # Count total entries for pagination
        total_entries = db.card_history.count_documents({"card_id": card_id})
        
        # Format the response
        formatted_entries = []
        for entry in history_entries:
            # Convert ObjectId of the history entry itself to string
            entry["_id"] = str(entry["_id"])
            # Format timestamp
            if isinstance(entry.get("timestamp"), datetime):
                entry["timestamp"] = entry["timestamp"].isoformat()
            formatted_entries.append(entry)
        
        # logging.info(f"History fetched successfully for card ID: {card_id}")
        return jsonify({
            "history": formatted_entries,
            "total": total_entries,
            "page": page,
            "limit": limit
        })
    except Exception as e:
        # logging.error(f"Error adding history entry for card ID: {card_id}: {str(e)}") # Misplaced message
        logging.error(f"Error fetching history for card ID {card_id}: {str(e)}")
        # logging.info(f"History entry added successfully for card ID: {card_id}") # Misplaced message
        return jsonify({"error": str(e)}), 500

@app.route("/api/cards/<card_id>/history", methods=["POST"])
@admin_required
def add_card_history(card_id):
    logging.info(f"Adding history entry for card ID: {card_id}")
    """Manually add a history entry for a card (admin only)"""
    try:
        # Verify the card exists
        card = None
        card_obj_id_to_find = None
        try:
            # Try as ObjectId first
            card_obj_id_to_find = ObjectId(card_id)
            card = db.cards.find_one({"_id": card_obj_id_to_find})
        except:
             # Try as string ID if ObjectId conversion failed
            card = db.cards.find_one({"_id": card_id})
            if card:
                card_obj_id_to_find = card_id # card_id is already the string _id

        if not card:
            logging.error(f"Card not found for ID: {card_id} when trying to add manual history.")
            # logging.info(f"History entry added successfully for card ID: {card_id}") # Misplaced message
            return jsonify({"error": "Card not found"}), 404
        
        # Use the string version of the card's actual _id for history's card_id field
        actual_card_id_str = str(card["_id"])

        # Check if custom card data is provided in the request body
        if request.json and request.json.get("custom_card_data"):
            # Use the provided custom card data
            version_data = request.json.get("custom_card_data")
            # Ensure the ID in version_data matches the card's actual ID (as string)
            version_data["_id"] = actual_card_id_str 
            # 'id' field is often used for frontend, so add it too if not present or make it consistent
            version_data["id"] = actual_card_id_str 
        else:
            # Get the current card data to use as version data
            version_data = card.copy()
            # Convert ObjectId to string if it's an ObjectId, otherwise it's already a string
            if isinstance(version_data.get("_id"), ObjectId):
                version_data["_id"] = str(version_data["_id"])
            # Add 'id' field if it's not present
            if "id" not in version_data:
                 version_data["id"] = str(version_data["_id"])

        
        # Create history entry
        history_entry = {
            "card_id": actual_card_id_str, # Store the string ID of the card
            "timestamp": datetime.utcnow(),
            "version_data": version_data,
            "note": request.json.get("note", "Manual history entry") if request.json else "Manual history entry",
            "manual_entry": True
        }
        
        # Insert into card_history collection
        result = db.card_history.insert_one(history_entry)
        
        # Return success response
        logging.info(f"Manual history entry added successfully for card ID: {actual_card_id_str}")
        return jsonify({
            "message": "History entry added successfully",
            "entry_id": str(result.inserted_id)
        }), 201
    except Exception as e:
        # logging.error(f"Error adding history entry for card ID: {card_id}: {str(e)}") # Original log was too generic
        logging.error(f"Error manually adding history for card ID {card_id}: {str(e)}")
        # logging.info(f"History entry added successfully for card ID: {card_id}") # Misplaced message
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    # Consider using Gunicorn or another WSGI server for production
    app.run(debug=True, host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))