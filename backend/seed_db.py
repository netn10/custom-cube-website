from pymongo import MongoClient
import os
from dotenv import load_dotenv
import json

# Load environment variables
load_dotenv()

# MongoDB connection
MONGO_URI = os.getenv("MONGO_URI", "mongodb+srv://username:password@cluster.mongodb.net/mtgcube")
client = MongoClient(MONGO_URI)
db = client.get_database("mtgcube")

# Clear existing collections
db.cards.delete_many({})
db.archetypes.delete_many({})
db.tokens.delete_many({})

# Seed archetypes
archetypes = [
    {
        "id": "wu-storm",
        "name": "Storm",
        "colors": ["W", "U"],
        "description": "Cast multiple spells in a turn to trigger powerful effects.",
    },
    {
        "id": "ub-broken-cipher",
        "name": "Broken Cipher",
        "colors": ["U", "B"],
        "description": "Encode secrets onto creatures and gain value when they deal combat damage.",
    },
    {
        "id": "br-token-collection",
        "name": "Token Collection",
        "colors": ["B", "R"],
        "description": "Create and collect various token types for different synergies.",
    },
    {
        "id": "rg-control",
        "name": "Control",
        "colors": ["R", "G"],
        "description": "An unusual take on control using red and green to dominate the board.",
    },
    {
        "id": "gw-vehicles",
        "name": "Vehicles",
        "colors": ["G", "W"],
        "description": "Crew powerful artifact vehicles with your creatures for strong attacks.",
    },
    {
        "id": "wb-blink",
        "name": "Blink/ETB/Value",
        "colors": ["W", "B"],
        "description": "Flicker creatures in and out of the battlefield to trigger powerful enter-the-battlefield effects.",
    },
    {
        "id": "bg-artifacts",
        "name": "Artifacts",
        "colors": ["B", "G"],
        "description": "Leverage artifacts for value and synergy in an unusual color combination.",
    },
    {
        "id": "ur-enchantments",
        "name": "Enchantments",
        "colors": ["U", "R"],
        "description": "Use enchantments to control the game and generate value over time.",
    },
    {
        "id": "rw-self-mill",
        "name": "Self-mill",
        "colors": ["R", "W"],
        "description": "Put cards from your library into your graveyard for value and synergy.",
    },
    {
        "id": "gu-prowess",
        "name": "Prowess",
        "colors": ["G", "U"],
        "description": "Cast non-creature spells to trigger bonuses on your creatures.",
    },
]

db.archetypes.insert_many(archetypes)
print(f"Inserted {len(archetypes)} archetypes")

# Generate sample cards
cards = []
card_types = ["Creature", "Instant", "Sorcery", "Enchantment", "Artifact", "Land", "Planeswalker"]
rarities = ["Common", "Uncommon", "Rare", "Mythic Rare"]
token_types = ["Goblin", "Soldier", "Zombie", "Elemental", "Spirit", "Thopter", "Treasure", "Food", "Clue"]

# Generate 10 cards for each archetype
for archetype in archetypes:
    archetype_id = archetype["id"]
    colors = archetype["colors"]
    
    for i in range(10):
        card_type = card_types[i % len(card_types)]
        power = str(i % 5 + 1) if card_type == "Creature" else None
        toughness = str(i % 4 + 1) if card_type == "Creature" else None
        loyalty = i % 5 + 1 if card_type == "Planeswalker" else None
        
        card = {
            "name": f"{archetype['name']} {card_type} {i+1}",
            "manaCost": f"{{{i % 3 + 1}}}{colors[0]}{colors[1]}",
            "type": f"{card_type} — {archetype['name']}",
            "rarity": rarities[i % len(rarities)],
            "text": f"This card supports the {archetype['name']} archetype.\nWhen you cast this spell, do something related to {archetype['name'].lower()}.",
            "power": power,
            "toughness": toughness,
            "loyalty": loyalty,
            "colors": colors,
            "custom": i % 3 == 0,  # Every third card is a custom card
            "archetypes": [archetype_id],  # Store as string ID
            "imageUrl": f"/placeholder-{archetype_id}-{i}.jpg",
            "flavorText": f"A flavor text related to {archetype['name']}.",
            "artist": "AI Generated" if i % 2 == 0 else "Custom Artist",
            "set": f"Custom Cube {i % 3 + 1}",
            "notes": f"Design notes for {archetype['name']} {card_type}. This card was created to support the {archetype['name']} archetype." if i % 4 == 0 else None,
            "relatedTokens": [token_types[i % len(token_types)]] if i % 3 == 0 else None,
            "relatedFace": None,
        }
        cards.append(card)

# Add some multi-archetype cards
for i in range(20):
    archetype1 = archetypes[i % len(archetypes)]
    archetype2 = archetypes[(i + 3) % len(archetypes)]
    
    shared_colors = list(set(archetype1["colors"]) & set(archetype2["colors"]))
    all_colors = list(set(archetype1["colors"] + archetype2["colors"]))
    
    card_type = card_types[i % len(card_types)]
    power = str(i % 5 + 2) if card_type == "Creature" else None
    toughness = str(i % 4 + 2) if card_type == "Creature" else None
    
    card = {
        "name": f"Dual Archetype {card_type} {i+1}",
        "manaCost": f"{{{i % 2 + 2}}}{all_colors[0]}{all_colors[-1]}",
        "type": f"{card_type} — Hybrid",
        "rarity": rarities[min(i % len(rarities) + 1, len(rarities) - 1)],
        "text": f"This card supports both {archetype1['name']} and {archetype2['name']} archetypes.\nIt has synergy with both strategies.",
        "power": power,
        "toughness": toughness,
        "colors": all_colors,
        "custom": True,  # All dual archetype cards are custom
        "archetypes": [archetype1["id"], archetype2["id"]],  # Store as string IDs
        "imageUrl": f"/placeholder-dual-{i}.jpg",
        "flavorText": f"A card that bridges {archetype1['name']} and {archetype2['name']}.",
        "artist": "Custom Artist",
        "set": "Custom Cube Special",
        "notes": f"This card was designed to bridge the {archetype1['name']} and {archetype2['name']} archetypes." if i % 2 == 0 else None,
        "relatedTokens": [token_types[i % len(token_types)], token_types[(i+1) % len(token_types)]] if i % 3 == 0 else None,
        "relatedFace": None,
    }
    cards.append(card)

# Insert cards into the database
result = db.cards.insert_many(cards)
print(f"Inserted {len(cards)} cards")

# Add some double-faced cards
double_faced_cards = []
for i in range(5):
    # Create front face
    archetype = archetypes[i % len(archetypes)]
    colors = archetype["colors"]
    front_id = f"double-faced-front-{i}"
    back_id = f"double-faced-back-{i}"
    
    front_card = {
        "name": f"Double-Faced Front {i+1}",
        "manaCost": f"{{{i % 2 + 1}}}{colors[0]}",
        "type": "Creature — Transformer",
        "rarity": "Rare",
        "text": f"This card transforms into its back face.\n{i+1}/Day — When this condition is met, transform this card.",
        "power": str(i % 3 + 1),
        "toughness": str(i % 3 + 1),
        "colors": [colors[0]],
        "custom": True,
        "archetypes": [archetype["id"]],
        "imageUrl": f"/placeholder-double-faced-front-{i}.jpg",
        "flavorText": "The front face of a transforming card.",
        "artist": "Custom Artist",
        "set": "Custom Cube Transformers",
        "notes": "This is part of a double-faced card pair.",
        "relatedTokens": None,
        "relatedFace": back_id,
        "_id": front_id
    }
    
    # Create back face
    back_card = {
        "name": f"Double-Faced Back {i+1}",
        "manaCost": "",  # Back faces don't have mana costs
        "type": "Creature — Transformed",
        "rarity": "Rare",
        "text": f"This is the transformed version of Double-Faced Front {i+1}.\nWhen this card transforms, do something powerful.",
        "power": str(i % 3 + 3),  # Stronger on the back
        "toughness": str(i % 3 + 3),
        "colors": [colors[1]],  # Different color on back
        "custom": True,
        "archetypes": [archetype["id"]],
        "imageUrl": f"/placeholder-double-faced-back-{i}.jpg",
        "flavorText": "The back face reveals its true nature.",
        "artist": "Custom Artist",
        "set": "Custom Cube Transformers",
        "notes": "This is the back face of a double-faced card pair.",
        "relatedTokens": None,
        "relatedFace": front_id,
        "_id": back_id
    }
    
    double_faced_cards.append(front_card)
    double_faced_cards.append(back_card)

# Insert double-faced cards
if double_faced_cards:
    db.cards.insert_many(double_faced_cards)
    print(f"Inserted {len(double_faced_cards)} double-faced cards")

# Verify that cards were inserted with the correct archetypes
for archetype in archetypes:
    archetype_id = archetype["id"]
    count = db.cards.count_documents({"archetypes": archetype_id})
    print(f"Archetype {archetype_id} has {count} cards")

# Generate tokens
tokens = []

for i in range(20):
    token_type = token_types[i % len(token_types)]
    colors_index = i % len(archetypes)
    colors = archetypes[colors_index]["colors"] if i % 3 != 0 else [archetypes[colors_index]["colors"][0]]
    
    power = str(i % 3 + 1) if token_type not in ["Treasure", "Food", "Clue"] else None
    toughness = str(i % 3 + 1) if token_type not in ["Treasure", "Food", "Clue"] else None
    
    abilities = []
    if i % 5 == 0:
        abilities.append("Flying")
    if i % 7 == 0:
        abilities.append("First strike")
    if i % 11 == 0:
        abilities.append("Trample")
    
    token = {
        "name": f"{token_type} Token",
        "type": "Token " + ("Creature" if token_type not in ["Treasure", "Food", "Clue"] else "Artifact"),
        "colors": colors,
        "power": power,
        "toughness": toughness,
        "abilities": abilities,
        "imageUrl": f"/token-{token_type.lower()}.jpg",
    }
    tokens.append(token)

db.tokens.insert_many(tokens)
print(f"Inserted {len(tokens)} tokens")

print("Database seeded successfully!")
