from flask import Flask, jsonify, request, Response
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
import time
from urllib.parse import unquote
import base64

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

# Simple in-memory cache for historical data
# Cache structure: {cache_key: {'data': result, 'timestamp': time.time()}}
historical_cache = {}
CACHE_TTL = 300  # 5 minutes cache TTL

# Add card cache for frequently accessed cards
card_cache = {}
CARD_CACHE_TTL = 60  # 1 minute cache TTL for individual cards

def get_cached_or_query(cache_key, query_func):
    """Get data from cache or execute query and cache result"""
    current_time = time.time()
    
    # Check if we have cached data that's still valid
    if cache_key in historical_cache:
        cached_item = historical_cache[cache_key]
        if current_time - cached_item['timestamp'] < CACHE_TTL:
            return cached_item['data']
        else:
            # Remove expired cache entry
            del historical_cache[cache_key]
    
    # Execute query and cache result
    result = query_func()
    historical_cache[cache_key] = {
        'data': result,
        'timestamp': current_time
    }
    
    # Clean up old cache entries periodically (simple cleanup)
    if len(historical_cache) > 100:  # Arbitrary limit
        expired_keys = [
            key for key, value in historical_cache.items()
            if current_time - value['timestamp'] > CACHE_TTL
        ]
        for key in expired_keys:
            del historical_cache[key]
    
    return result

def get_cached_card(card_name, query_func):
    """Get card from cache or execute query and cache result"""
    current_time = time.time()
    cache_key = f"card_{card_name.lower()}"
    
    # Check if we have cached data that's still valid
    if cache_key in card_cache:
        cached_item = card_cache[cache_key]
        if current_time - cached_item['timestamp'] < CARD_CACHE_TTL:
            return cached_item['data']
        else:
            # Remove expired cache entry
            del card_cache[cache_key]
    
    # Execute query and cache result
    result = query_func()
    card_cache[cache_key] = {
        'data': result,
        'timestamp': current_time
    }
    
    # Clean up old cache entries periodically
    if len(card_cache) > 200:  # Higher limit for card cache
        expired_keys = [
            key for key, value in card_cache.items()
            if current_time - value['timestamp'] > CARD_CACHE_TTL
        ]
        for key in expired_keys:
            del card_cache[key]
    
    return result

logging.basicConfig(level=logging.INFO)

# Function to create necessary indexes for performance
def create_indexes():
    """Create database indexes for better performance"""
    try:
        # Indexes for cards collection
        db.cards.create_index([("name", 1)])
        db.cards.create_index([("set", 1)])
        db.cards.create_index([("colors", 1)])
        db.cards.create_index([("type", 1)])
        db.cards.create_index([("facedown", 1)])
        db.cards.create_index([("archetypes", 1)])
        db.cards.create_index([("custom", 1)])
        
        # Compound indexes for common queries
        db.cards.create_index([("set", 1), ("facedown", 1)])
        db.cards.create_index([("colors", 1), ("facedown", 1)])
        db.cards.create_index([("name", "text"), ("text", "text")])  # Text search index
        
        # Indexes for card_history collection (critical for historic mode performance)
        db.card_history.create_index([("card_id", 1)])
        db.card_history.create_index([("timestamp", -1)])
        db.card_history.create_index([("version_data.set", 1)])
        
        # Compound indexes for card_history
        db.card_history.create_index([("card_id", 1), ("timestamp", -1)])
        db.card_history.create_index([("card_id", 1), ("version_data.set", 1), ("timestamp", -1)])
        db.card_history.create_index([("version_data.set", 1), ("timestamp", -1)])
        
        # Indexes for other collections
        db.tokens.create_index([("name", 1)])
        db.tokens.create_index([("colors", 1)])
        db.archetypes.create_index([("name", 1)])
        db.comments.create_index([("cardId", 1)])
        db.comments.create_index([("createdAt", -1)])
        db.users.create_index([("username", 1)], unique=True)
        
        logging.info("Database indexes created successfully")
    except Exception as e:
        logging.error(f"Error creating database indexes: {e}")

# Initialize Flask app
app = Flask(__name__)


app.config["SECRET_KEY"] = os.getenv(
    "SECRET_KEY", "dev_secret_key_change_in_production"
)
app.config["JWT_SECRET_KEY"] = os.getenv(
    "JWT_SECRET_KEY", "jwt_secret_key_change_in_production"
)
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=24)

# Configure CORS to allow specific origins and credentials
CORS(
    app,
    resources={
        r"/api/*": {
            "origins": [
                "https://netn10-custom-cube-885947dcd6aa.herokuapp.com",
                "http://localhost:3000"  # For local development
            ],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
            "supports_credentials": True,
            "expose_headers": ["Authorization"]
        }
    }
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
            return jsonify({"error": "Authentication token is missing!"}), 401

        try:
            # Decode token
            data = jwt.decode(token, app.config["JWT_SECRET_KEY"], algorithms=["HS256"])
            current_user = db.users.find_one({"_id": ObjectId(data["user_id"])})

            if not current_user:
                return jsonify({"error": "User not found!"}), 401

            # Check if user is admin
            if not current_user.get("is_admin", False):
                return jsonify({"error": "Admin privileges required!"}), 403

        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired!"}), 401
        except jwt.InvalidTokenError:
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


# Health check
@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({"status": "ok"}), 200

# Auth routes
@app.route("/api/auth/register", methods=["POST"])
def register():
    """Register a new user"""
    data = request.get_json()

    # Validate required fields
    if not data or not data.get("username") or not data.get("password"):
        return jsonify({"error": "Missing username or password"}), 400

    # Check if username already exists
    if db.users.find_one({"username": data["username"]}):
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
        return jsonify({"error": "Missing username or password"}), 400

    # Check if user exists
    user = db.users.find_one({"username": data["username"]})
    if not user or not check_password_hash(user["password"], data["password"]):
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
        return jsonify({"error": "Authentication token is missing!"}), 401

    try:
        # Decode token
        data = jwt.decode(token, app.config["JWT_SECRET_KEY"], algorithms=["HS256"])
        current_user = db.users.find_one({"_id": ObjectId(data["user_id"])})

        if not current_user:
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
        return jsonify({"error": "Token expired!"}), 401
    except jwt.InvalidTokenError:
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
                "/api/health",
            ]
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
    )
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
    historic_mode = request.args.get("historic_mode", "").lower() == "true"
    
    # Optimize for single card lookups (common case for card detail pages)
    if search and search.startswith('"') and search.endswith('"') and limit <= 10:
        # This is likely a single card lookup, use caching
        card_name = search[1:-1]  # Remove quotes
        return get_cached_card(card_name, lambda: get_cards_internal(
            search, body_search, colors, color_match, exclude_colorless,
            card_type, card_set, custom, facedown, include_facedown,
            page, limit, sort_by, sort_dir, historic_mode
        ))
    
    # For other queries, use the internal function directly
    return get_cards_internal(
        search, body_search, colors, color_match, exclude_colorless,
        card_type, card_set, custom, facedown, include_facedown,
        page, limit, sort_by, sort_dir, historic_mode
    )

def get_cards_internal(search, body_search, colors, color_match, exclude_colorless,
                      card_type, card_set, custom, facedown, include_facedown,
                      page, limit, sort_by, sort_dir, historic_mode):
    """Internal function for getting cards with all the logic"""

    query = {}
    cards_to_include = set()

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
        color_query_conditions = [] 

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
            # If we have multiple color conditions, we need to use $or to combine them
            if len(color_query_conditions) > 1:
                if "$or" in query:
                    # If there's already an $or, we need to use $and to combine with our new $or
                    existing_or = query.pop("$or")
                    query["$and"] = query.get("$and", []) + [{"$or": existing_or}, {"$or": color_query_conditions}]
                else:
                    # No existing $or, just add our color conditions as $or
                    query["$or"] = color_query_conditions
            else:
                # Only one color condition, add it directly to the query
                query.update(color_query_conditions[0])

    if card_type:
        # For all card types, including "Creature", just do a simple case-insensitive search
        # This will match any card that has the type string anywhere in its type field
        query["type"] = {"$regex": card_type, "$options": "i"}

    # Handle Set filtering with historic mode if enabled
    if card_set and historic_mode:
        # In historic mode, we need to fetch cards based on their historical versions too
        # For Set 1, we show all cards currently in Set 1 plus any cards that have a historical version in Set 1
        # For Set 2, we show all cards from Set 1 and Set 2, plus cards with historical versions in Set 1 or Set 2
        # For Set 3, we show all cards from Set 1, Set 2, and Set 3, plus cards with historical versions in Set 1, Set 2, or Set 3
        # For Set 4, we show all cards from Set 1, Set 2, Set 3, and Set 4, plus cards with historical versions in Set 1, Set 2, Set 3, or Set 4

        # First, create a list of sets to include based on the selected set
        sets_to_include = []
        if card_set == "Set 1":
            sets_to_include = ["Set 1"]
        elif card_set == "Set 2":
            sets_to_include = ["Set 1", "Set 2"]
        elif card_set == "Set 3":
            sets_to_include = ["Set 1", "Set 2", "Set 3"]
        elif card_set == "Set 4":
            sets_to_include = ["Set 1", "Set 2", "Set 3", "Set 4"]
        
        # Apply the filter to show cards from the included sets
        if sets_to_include:
            query["set"] = {"$in": sets_to_include}
            
            # If we're looking at an earlier set (i.e., not showing all sets), get cards from later sets with historical versions
            if card_set != "Set 4":  # Don't need to do this for Set 4 as it already includes everything
                # Find all card_history entries for cards that have versions in the sets we're interested in
                history_query = {"version_data.set": {"$in": sets_to_include}}
                history_cards = db.card_history.find(history_query)
                
                # Collect card_ids from history that match our criteria
                for history_card in history_cards:
                    # Convert ObjectId to string if needed
                    card_id = history_card["card_id"]
                    cards_to_include.add(card_id)
    elif card_set:  # Regular set filtering (non-historic mode)
        query["set"] = card_set

    if custom:
        query["custom"] = custom.lower() == "true"

    # Prepare final query - either use the original query or expand it to include historic cards
    final_query = query.copy()
    if cards_to_include and historic_mode:
        # Create a query that gets either the cards matching our original criteria
        # OR cards whose IDs are in our list of historical cards to include
        object_ids = []
        string_ids = []
        
        # Separate ObjectIds and string IDs
        for card_id in cards_to_include:
            if isinstance(card_id, ObjectId):
                object_ids.append(card_id)
            elif isinstance(card_id, str):
                try:
                    # Try to convert string to ObjectId
                    object_ids.append(ObjectId(card_id))
                except:
                    # If conversion fails, keep as string
                    string_ids.append(card_id)
        
        # Build the combined query
        or_conditions = [query]
        
        # Add ObjectId query if we have any
        if object_ids:
            or_conditions.append({"_id": {"$in": object_ids}})
            
        # Add string ID query if we have any
        if string_ids:
            or_conditions.append({"_id": {"$in": string_ids}})
            
        # Combine with OR
        final_query = {"$or": or_conditions}

    # Get total count - this will exclude facedown cards due to the query
    # Make sure we're counting with the exact same query used for fetching
    total = db.cards.count_documents(final_query)

    # Calculate skip for pagination
    skip = (page - 1) * limit

    # If using historic mode with a set filter, we need a different approach
    # because we need to apply filtering and sorting AFTER replacing with historical data
    if historic_mode and card_set:
        # OPTIMIZED APPROACH: Use aggregation pipeline for better performance
        
        # Build aggregation pipeline for historical data
        pipeline = []
        
        # First stage: Match current cards with basic filters (excluding set filter for now)
        match_stage = {}
        if not include_facedown:
            match_stage["facedown"] = {"$ne": True}
        if search:
            match_stage["name"] = {"$regex": search, "$options": "i"}
        if body_search:
            match_stage["$or"] = [
                {"name": {"$regex": body_search, "$options": "i"}},
                {"text": {"$regex": body_search, "$options": "i"}}
            ]
        if custom:
            match_stage["custom"] = custom.lower() == "true"
        if card_type:
            match_stage["type"] = {"$regex": card_type, "$options": "i"}
            
        if match_stage:
            pipeline.append({"$match": match_stage})
        
        # Add lookup stage to get historical data in a single query
        pipeline.extend([
            # Convert _id to string for lookup
            {"$addFields": {"card_id_str": {"$toString": "$_id"}}},
            
            # Lookup historical versions
            {"$lookup": {
                "from": "card_history",
                "let": {"card_id": "$card_id_str"},
                "pipeline": [
                    {"$match": {
                        "$expr": {"$eq": ["$card_id", "$$card_id"]},
                        "version_data.set": {"$in": sets_to_include}
                    }},
                    {"$sort": {"timestamp": -1}},
                    {"$limit": 1}
                ],
                "as": "history"
            }},
            
            # Replace card data with historical version if available
            {"$addFields": {
                "final_data": {
                    "$cond": {
                        "if": {"$gt": [{"$size": "$history"}, 0]},
                        "then": {"$mergeObjects": [
                            {"$arrayElemAt": ["$history.version_data", 0]},
                            {"id": "$card_id_str", "historical_version": True}
                        ]},
                        "else": {"$mergeObjects": ["$$ROOT", {"id": "$card_id_str"}]}
                    }
                }
            }},
            
            # Replace root with final_data
            {"$replaceRoot": {"newRoot": "$final_data"}},
            
            # Remove the _id field and history field
            {"$project": {"_id": 0, "history": 0, "card_id_str": 0}}
        ])
        
        # Apply set filter and other post-historical filters
        post_filters = {}
        if sets_to_include:
            post_filters["set"] = {"$in": sets_to_include}
            
        # Apply color filters
        if colors and colors[0]:
            color_conditions = []
            
            if "colorless" in colors:
                color_conditions.append({"colors": {"$size": 0}})
                colors = [c for c in colors if c != "colorless"]
                
            if "multicolor" in colors:
                color_conditions.append({"colors": {"$exists": True, "$not": {"$size": 1}}})
                colors = [c for c in colors if c != "multicolor"]
                
            if colors:
                if color_match == "exact":
                    color_conditions.append({"colors": {"$all": colors, "$size": len(colors)}})
                elif color_match == "includes":
                    color_conditions.append({"colors": {"$all": colors}})
                elif color_match == "at-most":
                    color_conditions.append({"colors": {"$not": {"$elemMatch": {"$nin": colors}}}})
                else:
                    color_conditions.append({"colors": {"$all": colors}})
                    
            if color_conditions:
                if len(color_conditions) > 1:
                    post_filters["$or"] = color_conditions
                else:
                    post_filters.update(color_conditions[0])
        
        if post_filters:
            pipeline.append({"$match": post_filters})
        
        # Get total count with a separate pipeline
        count_pipeline = pipeline + [{"$count": "total"}]
        count_result = list(db.cards.aggregate(count_pipeline))
        total = count_result[0]["total"] if count_result else 0
        
        # Add sorting and pagination
        sort_spec = []
        sort_fields = sort_by.split(",") if sort_by else ["name"]
        sort_directions = sort_dir.split(",") if sort_dir else ["asc"]
        
        while len(sort_directions) < len(sort_fields):
            sort_directions.append("asc")
            
        for i, field in enumerate(sort_fields):
            if field:
                direction = 1 if sort_directions[i].lower() == "asc" else -1
                sort_spec.append((field, direction))
                
        if sort_spec:
            pipeline.append({"$sort": dict(sort_spec)})
            
        # Add pagination
        pipeline.extend([
            {"$skip": skip},
            {"$limit": limit}
        ])
        
        # Execute the optimized aggregation
        cards = list(db.cards.aggregate(pipeline))
        
        # Also get history-only cards that don't exist in current collection
        # (This is a smaller, separate query for cards that were completely removed)
        if total < limit:  # Only do this if we have space for more cards
            history_only_pipeline = [
                {"$match": {"version_data.set": {"$in": sets_to_include}}},
                {"$sort": {"card_id": 1, "timestamp": -1}},
                {"$group": {
                    "_id": "$card_id",
                    "latest_history": {"$first": "$$ROOT"}
                }},
                {"$lookup": {
                    "from": "cards",
                    "let": {"card_id_str": "$_id"},
                    "pipeline": [
                        {"$match": {"$expr": {"$eq": [{"$toString": "$_id"}, "$$card_id_str"]}}}
                    ],
                    "as": "current_card"
                }},
                {"$match": {"current_card": {"$size": 0}}},  # Only cards not in current collection
                {"$replaceRoot": {
                    "newRoot": {"$mergeObjects": [
                        "$latest_history.version_data",
                        {"id": "$_id", "historical_version": True}
                    ]}
                }},
                {"$project": {"_id": 0}},
                {"$limit": limit - len(cards)}  # Only get what we need
            ]
            
            # Apply the same post-filters to history-only cards
            if post_filters:
                history_only_pipeline.insert(-1, {"$match": post_filters})
                
            history_only_cards = list(db.card_history.aggregate(history_only_pipeline))
            cards.extend(history_only_cards)
            
            # Update total count to include history-only cards
            if history_only_cards:
                history_only_count_pipeline = history_only_pipeline[:-1] + [{"$count": "total"}]
                history_count_result = list(db.card_history.aggregate(history_only_count_pipeline))
                if history_count_result:
                    total += history_count_result[0]["total"]
    else:
        # Standard flow for non-historic mode
        
        # Define sort fields and directions (same as in historic mode)
        sort_fields = sort_by.split(",") if sort_by else ["name"]
        sort_directions = sort_dir.split(",") if sort_dir else ["asc"]
        
        # Create sort specification
        sort_spec = []
        for i, field in enumerate(sort_fields):
            # Skip empty fields
            if not field:
                continue
                
            # Get corresponding direction or default to asc
            direction = (
                1
                if i >= len(sort_directions) or sort_directions[i].lower() == "asc"
                else -1
            )
            sort_spec.append((field, direction))

        # Execute query with sorting
        try:
            # Make sure we have a valid sort specification
            if sort_spec:
                cursor = db.cards.find(final_query).sort(sort_spec).skip(skip).limit(limit)
            else:
                # Default sort by name if no valid sort fields
                cursor = db.cards.find(final_query).sort([("name", 1)]).skip(skip).limit(limit)
            cards = list(cursor)
        except Exception as e:
            # Log the error and fall back to a simple query without sorting
            print(f"Error executing MongoDB query with sorting: {e}")
            cursor = db.cards.find(final_query).skip(skip).limit(limit)
            cards = list(cursor)

        # Convert ObjectId to string for each card
        for card in cards:
            card["id"] = str(card.pop("_id"))
    
    # Return the cards with pagination info
    return jsonify({
        "cards": cards,
        "total": total
    })


@app.route("/api/cards/<card_id>", methods=["GET"])
def get_card(card_id):
    """Get a single card by ID or name"""
    try:
        # Use caching for better performance
        def query_card():
            # First try to find by string ID
            card = db.cards.find_one({"_id": card_id})

            # If not found, try with ObjectId
            if not card:
                try:
                    card = db.cards.find_one({"_id": ObjectId(card_id)})
                except:
                    pass

            # If still not found, try to find by name (case-insensitive)
            if not card:
                # URL decode the card_id in case it's an encoded card name
                decoded_name = unquote(card_id)
                # Try exact match first
                card = db.cards.find_one({"name": decoded_name})
                
                # If still not found, try case-insensitive search
                if not card:
                    card = db.cards.find_one({"name": {"$regex": f"^{re.escape(decoded_name)}$", "$options": "i"}})

            if card:
                # Convert ObjectId to string if needed
                if isinstance(card.get("_id"), ObjectId):
                    card["id"] = str(card.pop("_id"))
                else:
                    card["id"] = card.pop("_id")
                return card
            else:
                return None

        # Use cached lookup or execute query
        card = get_cached_card(card_id, query_card)

        if card:
            return jsonify(card)
        else:
            logging.info(f"Card not found with ID/name: {card_id}")
            return jsonify({"error": "Card not found"}), 404
    except Exception as e:
        logging.error(f"Error fetching card with ID/name {card_id}: {str(e)}")
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
            return jsonify(archetype)
        else:
            logging.info(f"Archetype not found with ID: {archetype_id}")
            return jsonify({"error": "Archetype not found"}), 404
    except Exception as e:
        logging.error(f"Error fetching archetype with ID {archetype_id}: {str(e)}")
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

        return jsonify({"cards": cards, "total": total})
    except Exception as e:
        logging.error(f"Error fetching cards for archetype {archetype_id}: {str(e)}")
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
        
        return jsonify(result)
    except Exception as e:
        logging.error(f"Error fetching random archetype cards: {str(e)}")
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
            # Create a color filter condition that combines all color conditions with OR
            color_filter = {"$or": color_query_conditions}
            
            # If there are existing query conditions, combine them with the color filter using AND
            if query:
                # Create a new AND condition that includes both the existing query and the color filter
                query = {"$and": [query, color_filter]}
            else:
                # If no other conditions, just use the color filter
                query = color_filter

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


@app.route("/api/tokens", methods=["GET"]) # This is the second /api/tokens GET route
def get_token_by_query():
    """Get a single token by name using query parameter"""
    try:
        token_name = request.args.get("name")
        if not token_name:
            return jsonify({"error": "Token name not provided in query parameter"}), 400

        return get_token_by_name(token_name)
    except Exception as e:
        logging.error(f"Error fetching token by query: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/tokens/<string:token_name>", methods=["GET"])
def get_token(token_name):
    """Get a single token by name"""
    try:
        # URL decode the token name
        import urllib.parse

        token_name = urllib.parse.unquote(token_name).strip()
        return get_token_by_name(token_name)
    except Exception as e:
        logging.error(f"Error fetching token '{token_name}': {str(e)}")
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
            return jsonify({"error": "Token name is required"}), 400
        if not token_data.get("type"):
            return jsonify({"error": "Token type is required"}), 400
        if token_data.get("colors") is not None and not isinstance(
            token_data.get("colors"), list
        ):
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

        return jsonify(inserted_token), 201
    except Exception as e:
        logging.error(f"Error adding token: {str(e)}")
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

        return jsonify(pack)
    except Exception as e:
        logging.error(f"Error generating draft pack: {str(e)}")
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

        return jsonify(packs)
    except Exception as e:
        logging.error(f"Error generating multiple draft packs: {str(e)}")
        return jsonify({"error": str(e)}), 500


def _parse_power_toughness(power_val, toughness_val):
    """Parse power and toughness values, handling special cases like '*'"""
    try:
        power = int(power_val) if power_val and power_val != '*' else 0
    except (ValueError, TypeError):
        power = 0
        
    try:
        toughness = int(toughness_val) if toughness_val and toughness_val != '*' else 0
    except (ValueError, TypeError):
        toughness = 0
        
    return power, toughness

def _calculate_base_score(card):
    """Calculate base score for a card based on type and stats"""
    score = 0
    card_type = card.get("type", "")
    
    if "Creature" in card_type:
        score += 5  # Creatures are important
        
        power_val = card.get("power", "0")
        toughness_val = card.get("toughness", "0")
        power, toughness = _parse_power_toughness(power_val, toughness_val)
        
        # Cards with '*' in power/toughness are often powerful
        if power_val == '*' or toughness_val == '*':
            score += 3
        else:
            score += min(power + toughness, 8) / 2
            
    elif "Instant" in card_type or "Sorcery" in card_type:
        score += 4  # Spells are good but not as essential as creatures
    
    # Bonus for rarity
    rarity_bonus = {"Common": 0, "Uncommon": 1, "Rare": 2, "Mythic Rare": 3}
    score += rarity_bonus.get(card.get("rarity", "Common"), 0)
    
    return score

def _calculate_color_score(card, bot_colors, pick_number):
    """Calculate color preference score for a card"""
    score = 0
    card_colors = card.get("colors", [])
    
    if not bot_colors:
        return score
    
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
    
    return score

def _score_card(card, bot_colors, pack_number, pick_number):
    """Score a single card for bot drafting"""
    score = _calculate_base_score(card)
    score += _calculate_color_score(card, bot_colors, pick_number)
    
    # Early picks favor strong cards regardless of color
    if pack_number == 1 and pick_number <= 3:
        score += 2
    
    # Add some randomness to simulate different bot preferences
    score += random.uniform(0, 2)
    
    return score

@app.route("/api/draft/bot-pick", methods=["POST"])
def bot_draft_pick():
    """Make a bot draft pick based on card evaluation and color preferences"""
    try:
        data = request.json
        if not data:
            return jsonify({"error": "No JSON data received"}), 400

        available_cards = data.get("availableCards", [])
        bot_colors = data.get("botColors", [])
        pack_number = data.get("packNumber", 1)
        pick_number = data.get("pickNumber", 1)

        if not available_cards:
            return jsonify({"error": "No cards available"}), 400

        # Score all available cards
        scored_cards = [
            {"card": card, "score": _score_card(card, bot_colors, pack_number, pick_number)}
            for card in available_cards
        ]

        # Sort by score and pick the highest
        scored_cards.sort(key=lambda x: x["score"], reverse=True)
        picked_card = scored_cards[0]["card"]

        # Set bot colors based on early picks if not already set
        if (not bot_colors and pack_number == 1 and pick_number <= 2 
            and picked_card.get("colors")):
            bot_colors = picked_card.get("colors")

        return jsonify({"pickedCard": picked_card, "botColors": bot_colors})
    except Exception as e:
        logging.error(f"Error in bot draft pick: {str(e)}")
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

        return jsonify({"suggestions": suggestions, "total": total})
    except Exception as e:
        logging.error(f"Error fetching card suggestions: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/suggestions", methods=["POST"])
def add_suggestion():
    """Add a new card suggestion"""
    try:
        data = request.json

        # Validate required fields
        if not data.get("name"):
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
        return jsonify(created_suggestion), 201
    except Exception as e:
        logging.error(f"Error adding card suggestion: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/suggestions/upload", methods=["POST"])
def upload_suggestion_image():
    """Upload an image for a card suggestion"""
    try:
        if "image" not in request.files:
            return jsonify({"error": "No image file provided"}), 400

        image_file = request.files["image"]

        if image_file.filename == "":
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
        logging.error(f"Error uploading suggestion image: {str(e)}")
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
        
        return jsonify(cards)
    except Exception as e:
        logging.error(f"Error fetching ChatGPT cards: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/chatgpt_response", methods=["POST"])
def get_chatgpt_response():
    """Simulate a ChatGPT response for a given prompt"""
    try:
        data = request.get_json()

        if not data or "prompt" not in data:
            return jsonify({"error": "No prompt provided"}), 400

        prompt = data["prompt"]

        # For demo purposes, we'll just return a fixed response
        # In a real app, you would call the ChatGPT API here
        response = {
            "response": f"This is a simulated response to: {prompt}",
            "timestamp": datetime.now().isoformat(),
        }
        
        return jsonify(response)
    except Exception as e:
        logging.error(f"Error generating ChatGPT response: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/gemini/response", methods=["POST"])
def get_gemini_response():
    """Get a response from Google's Gemini API for a given prompt"""
    try:
        data = request.get_json()

        if not data or "prompt" not in data:
            return jsonify({"error": "No prompt provided"}), 400

        prompt = data["prompt"]

        # Get API key from environment variables
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            return jsonify({"error": "Gemini API key not configured"}), 500

        # Call Gemini API
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}"

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

        return jsonify(result)
    except requests.exceptions.HTTPError as http_err:
        logging.error(f"Gemini API HTTP error: {http_err} - Response: {http_err.response.text}")
        return jsonify({"error": f"Gemini API error: {http_err.response.status_code}", "details": http_err.response.text}), 500
    except Exception as e:
        logging.error(f"Error fetching Gemini response: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/image-proxy", methods=["GET"])
def image_proxy():
    """Proxy for images to avoid CORS issues"""
    try:
        # Get the image URL from the query parameter
        image_url = request.args.get("url")
        if not image_url:
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
    """Generate a random pack: 2 cards of each color (W, U, B, R, G), rest multicolor/colorless/lands, no duplicates"""
    try:
        pack_size = request.args.get("size", default=15, type=int)
        min_size = request.args.get("min_size", default=1, type=int)
        exclude_facedown = (
            request.args.get("exclude_facedown", "false").lower() == "true"
        )
        # Build query to filter cards
        query = {}
        if exclude_facedown:
            query["$or"] = [{"facedown": False}, {"facedown": {"$exists": False}}]

        all_cards = list(db.cards.find(query))
        total_cards = len(all_cards)
        if total_cards < pack_size:
            if total_cards < min_size:
                return (
                    jsonify({
                        "error": f"Not enough cards in database. Found {total_cards}, minimum required is {min_size}"
                    }),
                    400,
                )
            pack_size = total_cards

        # Helper to get color identity
        def card_colors(card):
            return card.get("colors", []) or []
        def is_land(card):
            return "land" in card.get("type", "").lower()
        def is_multicolor(card):
            return len(card_colors(card)) > 1
        def is_colorless(card):
            return len(card_colors(card)) == 0

        # Color codes
        color_codes = ["W", "U", "B", "R", "G"]
        chosen_ids = set()
        pack = []
        rng = random.Random()
        # 1. Pick 2 cards of each color
        for color in color_codes:
            color_pool = [c for c in all_cards if color in card_colors(c) and len(card_colors(c)) == 1]
            rng.shuffle(color_pool)
            selected = []
            for card in color_pool:
                if card.get("_id") not in chosen_ids and len(selected) < 2:
                    selected.append(card)
                    chosen_ids.add(card.get("_id"))
                if len(selected) == 2:
                    break
            pack.extend(selected)
        # 2. Fill the rest with multicolor, colorless, or lands
        needed = pack_size - len(pack)
        # Exclude already chosen
        def not_chosen(card):
            return card.get("_id") not in chosen_ids
        multi_color_pool = [c for c in all_cards if (is_multicolor(c) or is_colorless(c) or is_land(c)) and not_chosen(c)]
        rng.shuffle(multi_color_pool)
        pack.extend(multi_color_pool[:needed])
        # 3. If still not enough, fill with any remaining not-chosen cards
        if len(pack) < pack_size:
            leftovers = [c for c in all_cards if not_chosen(c)]
            rng.shuffle(leftovers)
            pack.extend(leftovers[:(pack_size - len(pack))])
        # 4. Shuffle final pack
        rng.shuffle(pack)
        # 5. Convert ObjectIds to strings for JSON serialization
        for card in pack:
            card["id"] = str(card.pop("_id"))
        response = {
            "pack": pack[:pack_size],
            "metadata": {
                "requested_size": int(request.args.get("size", 15)),
                "actual_size": len(pack[:pack_size]),
                "total_cards_in_database": total_cards,
                "exclude_facedown": exclude_facedown,
                "timestamp": datetime.now().isoformat(),
            },
        }
        return jsonify(response)
    except Exception as e:
        logging.error(f"Error generating random pack: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/cards/add", methods=["POST"])
@admin_required
def add_card():
    """Add a new card to the database"""
    try:
        data = request.json

        # Validate required fields
        if not data.get("name"):
            return jsonify({"error": "Card name is required"}), 400
        if not data.get("manaCost"):
            return jsonify({"error": "Mana cost is required"}), 400
        if not data.get("type"):
            return jsonify({"error": "Card type is required"}), 400
        if not data.get("text"): # Text can sometimes be empty for vanilla creatures. Consider if this is a strict req.
            return jsonify({"error": "Card text is required"}), 400
        if data.get("colors") is not None and not isinstance(data.get("colors"), list):
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
        logging.error(f"Error adding card: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/cards/update/<card_id>", methods=["PUT"])
@admin_required
def update_card(card_id):
    """Update an existing card in the database"""
    try:
        data = request.json

        # Validate required fields
        if not data.get("name"):
            return jsonify({"error": "Card name is required"}), 400
        if not data.get("manaCost"):
            return jsonify({"error": "Mana cost is required"}), 400
        if not data.get("type"):
            return jsonify({"error": "Card type is required"}), 400
        if not data.get("text"): # Consider if text can be empty
            return jsonify({"error": "Card text is required"}), 400
        if data.get("colors") is not None and not isinstance(data.get("colors"), list):
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
            if existing_card:
                existing_card_obj_id = card_id

        if not existing_card:
            logging.error(f"Card not found for ID: {card_id} during update.")
            return jsonify({"error": "Card not found"}), 404

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

        # Check for noHistory param in query string
        no_history = request.args.get('noHistory') == '1'

        # Store the current version in card_history before updating, unless noHistory is set
        if not no_history:
            history_version_data = existing_card.copy()
            if isinstance(history_version_data.get("_id"), ObjectId):
                history_version_data["_id"] = str(history_version_data["_id"])
            history_entry = {
                "card_id": str(existing_card["_id"]),
                "timestamp": datetime.utcnow(),
                "version_data": history_version_data
            }
            db.card_history.insert_one(history_entry)

        result = db.cards.update_one(
            {"_id": existing_card_obj_id},
            {"$set": update_data},
        )

        if result.modified_count == 0:
            return jsonify({"warning": "No changes were made to the card", "card_id": card_id}), 200

        updated_card = db.cards.find_one({"_id": existing_card_obj_id})
        if updated_card:
            updated_card["id"] = str(updated_card.pop("_id"))
            cache_key = f"card_{updated_card['name'].lower()}"
            if cache_key in card_cache:
                del card_cache[cache_key]
            return jsonify(updated_card), 200
        else:
            logging.error(f"Card ID: {card_id} not found after update, despite modification count > 0.")
            return jsonify({"error": "Card not found after update"}), 404
    except Exception as e:
        logging.error(f"Error updating card ID {card_id}: {str(e)}")
        return jsonify({"error": str(e)}), 500


# Comments API
@app.route("/api/comments/card/<card_id>", methods=["GET"])
def get_card_comments(card_id):
    """Get all comments for a specific card"""
    try:
        # Use caching for comments
        cache_key = f"comments_{card_id}"
        return get_cached_or_query(cache_key, lambda: get_card_comments_internal(card_id))
    except Exception as e:
        logging.error(f"Error fetching comments for card ID {card_id}: {str(e)}")
        return jsonify({"error": str(e)}), 500

def get_card_comments_internal(card_id):
    """Internal function for getting card comments"""
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
            
        return jsonify(formatted_comments), 200
    except Exception as e:
        logging.error(f"Error in get_card_comments_internal for card ID {card_id}: {str(e)}")
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
        logging.error(f"Error adding authenticated comment for card {card_id}: {str(e)}")
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
        logging.error(f"Error adding guest comment for card {card_id}: {str(e)}")
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
        except Exception as e:
            logging.error(f"Error converting comment ID {comment_id} to ObjectId: {str(e)}")
            return jsonify({"error": "Invalid comment ID format"}), 400
            
        if not comment:
            return jsonify({"error": "Comment not found"}), 404
            
        # Check if user is the comment owner or an admin
        if comment.get("userId") != user_id and not is_admin:
            return jsonify({"error": "You are not authorized to delete this comment"}), 403
            
        # Delete the comment
        result = db.comments.delete_one({"_id": comment_obj_id})
        
        if result.deleted_count == 0:
            # This case should be rare if find_one succeeded unless a race condition.
            return jsonify({"error": "Failed to delete comment"}), 500
            
        return jsonify({"message": "Comment deleted successfully"}), 200
    except Exception as e:
        logging.error(f"Error deleting comment {comment_id}: {str(e)}")
        return jsonify({"error": str(e)}), 500

# Card History API
@app.route("/api/cards/<card_id>/history", methods=["GET"])
def get_card_history(card_id):
    """Get the history of a card's iterations"""
    try:
        # Use caching for history (shorter TTL since history changes less frequently)
        cache_key = f"history_{card_id}_{request.args.get('page', 1)}_{request.args.get('limit', 10)}"
        return get_cached_or_query(cache_key, lambda: get_card_history_internal(card_id))
    except Exception as e:
        logging.error(f"Error fetching history for card ID {card_id}: {str(e)}")
        return jsonify({"error": str(e)}), 500

def get_card_history_internal(card_id):
    """Internal function for getting card history"""
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
        
        return jsonify({
            "history": formatted_entries,
            "total": total_entries,
            "page": page,
            "limit": limit
        })
    except Exception as e:
        logging.error(f"Error in get_card_history_internal for card ID {card_id}: {str(e)}")
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
        except Exception as e:
            logging.error(f"Error converting card ID {card_id} to ObjectId: {str(e)}")
             # Try as string ID if ObjectId conversion failed
            card = db.cards.find_one({"_id": card_id})
            if card:
                card_obj_id_to_find = card_id # card_id is already the string _id

        if not card:
            logging.error(f"Card not found for ID: {card_id} when trying to add manual history.")
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
        logging.error(f"Error manually adding history for card ID {card_id}: {str(e)}")
        return jsonify({"error": str(e)}), 500

# Deck Builder Utility Functions
def build_deck(card_pool, draft_id=None, bot_id=None):
    """
    Convert a 45-card pool into a playable 40-card deck.
    Returns: {
        'bot_id': str,
        'lands': List[Card],
        'non_lands': List[Card], 
        'full_deck': List[Card]
    }
    """
    if len(card_pool) != 45:
        raise ValueError(f"Expected 45 cards in pool, got {len(card_pool)}")
    
    # Set deterministic seed for reproducible results
    seed_value = hash(f"{draft_id}_{bot_id}_{len(card_pool)}") % (2**32)
    random.seed(seed_value)
    
    # Separate lands and non-lands
    lands = [card for card in card_pool if is_land(card)]
    non_lands = [card for card in card_pool if not is_land(card)]
    non_basic_lands = [card for card in lands if not is_basic_land(card)]
    
    # Determine primary colors from non-land cards
    color_counts = {}
    for card in non_lands:
        for color in card.get('colors', []):
            color_counts[color] = color_counts.get(color, 0) + 1
    
    # Get top 2 colors, or single color if mono-color
    sorted_colors = sorted(color_counts.items(), key=lambda x: x[1], reverse=True)
    primary_colors = [color for color, count in sorted_colors[:2] if count > 0]
    
    # If no clear colors, default to most common
    if not primary_colors and sorted_colors:
        primary_colors = [sorted_colors[0][0]]
    
    # Select 22-24 non-land cards (prefer cards in primary colors)
    selected_non_lands = select_deck_spells(non_lands, primary_colors, non_basic_lands)
    
    # Calculate lands needed (aim for 40 total cards)
    lands_needed = 40 - len(selected_non_lands)
    
    # Generate basic lands based on color requirements
    basic_lands = generate_basic_lands(selected_non_lands, primary_colors, lands_needed - len(non_basic_lands))
    
    # Combine all lands
    deck_lands = non_basic_lands + basic_lands
    
    # Return structured deck
    full_deck = selected_non_lands + deck_lands
    
    # Calculate sideboard (cards not in the main deck)
    all_non_lands = [card for card in card_pool if not is_land(card)]
    sideboard = [card for card in all_non_lands if card not in selected_non_lands]
    
    return {
        'bot_id': str(bot_id) if bot_id else 'unknown',
        'lands': deck_lands,
        'non_lands': selected_non_lands,
        'full_deck': full_deck,
        'sideboard': sideboard,
        'colors': primary_colors
    }

def is_land(card):
    """Check if a card is a land"""
    type_line = card.get('type', '').lower()
    return 'land' in type_line

def is_basic_land(card):
    """Check if a card is a basic land"""
    type_line = card.get('type', '').lower()
    name = card.get('name', '').lower()
    basic_names = ['plains', 'island', 'swamp', 'mountain', 'forest']
    return 'basic' in type_line or any(basic in name for basic in basic_names)

def select_deck_spells(non_lands, primary_colors, non_basic_lands):
    """Select 22-24 non-land cards for the deck"""
    target_spells = min(24, max(22, 40 - 16 - len(non_basic_lands)))
    
    # Score cards based on color matching and power level
    scored_cards = []
    for card in non_lands:
        score = calculate_card_score(card, primary_colors)
        scored_cards.append((card, score))
    
    # Sort by score and select top cards
    scored_cards.sort(key=lambda x: x[1], reverse=True)
    selected = [card for card, score in scored_cards[:target_spells]]
    
    return selected

def calculate_card_score(card, primary_colors):
    """Calculate a score for how good a card is for the deck"""
    score = 0
    card_colors = card.get('colors', [])
    
    # Base score from power level (placeholder - could be enhanced)
    score += 50
    
    # Color matching bonus
    if not card_colors:  # Colorless cards
        score += 10
    else:
        matching_colors = len(set(card_colors) & set(primary_colors))
        off_colors = len(set(card_colors) - set(primary_colors))
        
        score += matching_colors * 30  # Bonus for on-color
        score -= off_colors * 20       # Penalty for off-color
    
    # CMC curve considerations (prefer 2-4 mana cards)
    cmc = card.get('cmc', 0)
    if 2 <= cmc <= 4:
        score += 10
    elif cmc == 1 or cmc == 5:
        score += 5
    elif cmc >= 6:
        score -= 5
    
    return score

def generate_basic_lands(non_lands, primary_colors, basic_lands_needed):
    """Generate appropriate basic lands for the deck"""
    if basic_lands_needed <= 0:
        return []
    
    if not primary_colors:
        # Default to Plains if no colors
        primary_colors = ['W']
    
    # Calculate color requirements from selected spells
    color_requirements = {}
    for card in non_lands:
        for color in card.get('colors', []):
            color_requirements[color] = color_requirements.get(color, 0) + 1
    
    # Distribute basic lands proportionally
    total_requirements = sum(color_requirements.values()) or 1
    basic_lands = []
    
    for color in primary_colors:
        if color in color_requirements:
            proportion = color_requirements[color] / total_requirements
            lands_for_color = max(1, int(basic_lands_needed * proportion))
            
            # Create basic land cards
            land_name = get_basic_land_name(color)
            for _ in range(min(lands_for_color, basic_lands_needed - len(basic_lands))):
                basic_land = create_basic_land_card(land_name, color)
                basic_lands.append(basic_land)
    
    # Fill remaining slots with the primary color
    while len(basic_lands) < basic_lands_needed and primary_colors:
        main_color = primary_colors[0]
        land_name = get_basic_land_name(main_color)
        basic_land = create_basic_land_card(land_name, main_color)
        basic_lands.append(basic_land)
    
    return basic_lands

def get_basic_land_name(color):
    """Get the basic land name for a color"""
    land_names = {
        'W': 'Plains',
        'U': 'Island', 
        'B': 'Swamp',
        'R': 'Mountain',
        'G': 'Forest'
    }
    return land_names.get(color, 'Plains')

def create_basic_land_card(name, color):
    """Create a basic land card object"""
    # High-quality Scryfall images for basic lands - using well-known stable URLs
    scryfall_basic_land_images = {
        'Plains': 'https://cards.scryfall.io/large/front/9/d/9dd2d666-7c6b-48ce-93dc-c004ebdd1fe9.jpg?1748706876',
        'Island': 'https://cards.scryfall.io/large/front/b/9/b92ec9f6-a56d-40c6-aee2-7d5e1524c985.jpg?1749278110',
        'Swamp': 'https://cards.scryfall.io/large/front/1/1/1176ebbf-4130-4e4e-ad49-65101a7357b4.jpg?1748707608',
        'Mountain': 'https://cards.scryfall.io/large/front/a/1/a18ef64b-a9de-4548-b4d5-168758442db7.jpg?1748706910',
        'Forest': 'https://cards.scryfall.io/large/front/2/0/2036f825-ef57-4a40-b45f-0668d9c8ec6a.jpg?1748707608'
    }
    
    image_url = scryfall_basic_land_images.get(name, scryfall_basic_land_images['Plains'])
    logging.info(f"Creating basic land {name} with imageUrl: {image_url}")
    
    return {
        'id': f"basic_{name.lower()}_{random.randint(1000, 9999)}",
        'name': name,
        'type': f'Basic Land — {name}',
        'colors': [],
        'cmc': 0,
        'imageUrl': image_url,
        'isBasicLand': True
    }

# Show Decks API Endpoint
@app.route("/api/show-decks", methods=["POST"])
def show_decks():
    """
    Build and return 40-card decks for all bots from their 45-card pools.
    Expects: {
        'draft_id': str,
        'bots': [{'id': int, 'name': str, 'picks': [Card]}]
    }
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        draft_id = data.get('draft_id', 'unknown')
        bots = data.get('bots', [])
        
        if not bots:
            return jsonify({"error": "No bots provided"}), 400
        
        constructed_decks = []
        
        for bot in bots:
            bot_id = bot.get('id')
            bot_name = bot.get('name', f'Bot {bot_id}')
            picks = bot.get('picks', [])
            
            try:
                # Build deck for this bot
                deck = build_deck(picks, draft_id, bot_id)
                deck['bot_name'] = bot_name
                constructed_decks.append(deck)
                
                logging.info(f"Built deck for {bot_name}: {len(deck['full_deck'])} cards")
                
            except Exception as e:
                logging.error(f"Error building deck for bot {bot_name}: {str(e)}")
                # Return error deck for this bot
                constructed_decks.append({
                    'bot_id': str(bot_id),
                    'bot_name': bot_name,
                    'error': str(e),
                    'lands': [],
                    'non_lands': picks[:24] if len(picks) >= 24 else picks,
                    'full_deck': picks[:40] if len(picks) >= 40 else picks,
                    'colors': []
                })
        
        return jsonify({
            'draft_id': draft_id,
            'decks': constructed_decks
        }), 200
        
    except Exception as e:
        logging.error(f"Error in show_decks endpoint: {str(e)}")
        return jsonify({"error": str(e)}), 500

# Health check endpoint
@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy"}), 200

@app.route("/api/gemini-analyze-card", methods=["POST"])
def gemini_analyze_card():
    """Analyze a card image using Gemini AI and return generated card JSON."""
    try:
        if 'image' not in request.files:
            return jsonify({"error": "No image file provided"}), 400
        image_file = request.files['image']
        image_bytes = image_file.read()

        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            return jsonify({"error": "Gemini API key not configured"}), 500

        # Gemini multimodal endpoint (v1beta)
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
        headers = {"Content-Type": "application/json"}

        # Encode image as base64
        import base64
        image_b64 = base64.b64encode(image_bytes).decode('utf-8')

        # Prompt for card extraction
        prompt = (
            "You are an expert at extracting Magic: The Gathering card data from images. "
            "Given the following card image, extract all relevant card information and return it as a JSON object with fields: "
            "name, manaCost, type, rarity, text, power, toughness, loyalty, colors, flavorText, artist, set, imageUrl, archetypes. "
            "For colors, use the standard Magic: The Gathering color codes: W (White), U (Blue), B (Black), R (Red), G (Green). "
            "Return colors as an array of these single-letter codes (e.g., ['W', 'U'] for Azorius). "
            "For archetypes, try to match the card to one of these cube archetypes based on the card's abilities and colors: "
            "WU Storm, UB Cipher, BR Token Collection, RG Control, GW Vehicles, WB ETB/Death Value, BG Artifacts, UR Enchantments, RW Self-Mill, GU Prowess. "
            "Return archetypes as an array of matching archetype names. "
            "Set imageUrl to an empty string (it will be filled later). "
            "set 'set' to 'Set 4', always. "
            "Try to figure out if the card is custom or not. The field name is 'custom' and should be set to true or false. "
            "If a field is not present, use an empty string or null."
        )

        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": prompt},
                        {
                            "inline_data": {
                                "mime_type": image_file.mimetype,
                                "data": image_b64
                            }
                        }
                    ]
                }
            ]
        }

        response = requests.post(url, headers=headers, json=payload)
        response.raise_for_status()
        data = response.json()

        # Extract the JSON from Gemini's response (assume it's in the text)
        card_json = None
        if data.get("candidates") and len(data["candidates"]) > 0:
            candidate = data["candidates"][0]
            if candidate.get("content") and candidate["content"].get("parts") and len(candidate["content"]["parts"]) > 0:
                text = candidate["content"]["parts"][0].get("text", "")
                # Try to extract JSON from the text
                import re, json as pyjson
                match = re.search(r'\{[\s\S]*\}', text)
                if match:
                    try:
                        card_json = pyjson.loads(match.group(0))
                    except Exception:
                        card_json = text  # fallback: return raw text
                else:
                    card_json = text
        if card_json is None:
            return jsonify({"error": "Could not extract card JSON from Gemini response."}), 500
        return jsonify(card_json)
    except requests.exceptions.HTTPError as http_err:
        logging.error(f"Gemini API HTTP error: {http_err} - Response: {http_err.response.text}")
        return jsonify({"error": f"Gemini API error: {http_err.response.status_code}", "details": http_err.response.text}), 500
    except Exception as e:
        logging.error(f"Error in gemini_analyze_card: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    # Create database indexes for better performance
    create_indexes()
    
    # Consider using Gunicorn or another WSGI server for production
    app.run(debug=True, host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))