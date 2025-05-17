import requests

def generate_content(prompt: str) -> dict:
    url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyDVfwdIuCaxkg7BCmJy0rezyi8chyZYeAg"
    
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
    
    # Extract just the text part cleanly
    return data['candidates'][0]['content']['parts'][0]['text']

# Example usage
if __name__ == "__main__":
    text = generate_content("Give me exactly one option for three abilities for my magic the gathering 3 mana charm, nothing else")
    print(text)