from pymongo import MongoClient
from bson import ObjectId
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# MongoDB connection
MONGO_URI = os.getenv("MONGO_URI", "mongodb+srv://username:password@cluster.mongodb.net/mtgcube")
client = MongoClient(MONGO_URI)
db = client["mtgcube"]

# Find the card by name
card_name = "Stealing Time"
card = db.cards.find_one({"name": card_name})

if not card:
    print(f"Card '{card_name}' not found in the database.")
else:
    print(f"Found card: {card['name']} (ID: {card['_id']}, Set: {card.get('set', 'N/A')})")
    
    # Find all history entries for this card
    history_entries = list(db.card_history.find({"card_id": str(card['_id'])}).sort("timestamp", 1))
    
    if not history_entries:
        print("No history entries found for this card.")
    else:
        print(f"\nFound {len(history_entries)} history entries:")
        for i, entry in enumerate(history_entries, 1):
            version_data = entry.get('version_data', {})
            print(f"\nEntry {i}:")
            print(f"  Timestamp: {entry.get('timestamp')}")
            print(f"  Set: {version_data.get('set', 'N/A')}")
            print(f"  Version ID: {entry.get('_id')}")
            print(f"  Card Name: {version_data.get('name', 'N/A')}")
            print(f"  Card ID in version: {version_data.get('_id')}")
            print(f"  Is current: {version_data.get('_id') == str(card['_id'])}")
