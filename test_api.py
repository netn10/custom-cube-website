import requests
import json

def test_random_cards_api():
    """Test the random cards API endpoint"""
    try:
        response = requests.get('http://127.0.0.1:5000/api/archetypes/random-cards')
        
        if response.status_code == 200:
            data = response.json()
            print(f"API returned {len(data)} cards")
            
            for i, card in enumerate(data):
                print(f"Card {i+1}:")
                print(f"  Name: {card.get('name')}")
                print(f"  Type: {card.get('type')}")
                print(f"  Archetype: {card.get('archetype', {}).get('name')}")
                print()
                
            return data
        else:
            print(f"API error: {response.status_code}")
            print(response.text)
            return None
    except Exception as e:
        print(f"Error testing API: {str(e)}")
        return None

if __name__ == "__main__":
    print("Testing random cards API...")
    cards = test_random_cards_api()
    
    if cards:
        # Save the response to a file for inspection
        with open('random_cards_response.json', 'w') as f:
            json.dump(cards, f, indent=2)
        print(f"Saved response to random_cards_response.json")
