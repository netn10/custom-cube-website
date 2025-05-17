"""
Fix search implementation in app.py to ensure proper partial matching
"""

with open('app.py', 'r') as file:
    content = file.read()

# For cards endpoint - modify the search query to ensure partial matching
# 1. Update the name search
name_search_pattern = "if search:\n        query['name'] = {'$regex': search, '$options': 'i'}"
name_search_replacement = """if search:
        # Ensure partial matching for card names
        query['name'] = {'$regex': search, '$options': 'i'}"""

content = content.replace(name_search_pattern, name_search_replacement)

# 2. Update the body text search
body_search_pattern = "if body_search:\n        query['text'] = {'$regex': body_search, '$options': 'i'}"
body_search_replacement = """if body_search:
        # Ensure partial matching for card text
        query['text'] = {'$regex': body_search, '$options': 'i'}"""

content = content.replace(body_search_pattern, body_search_replacement)

# 3. Update the token name search
token_name_search_pattern = "if search:\n        query['name'] = {'$regex': search, '$options': 'i'}"
token_name_search_replacement = """if search:
        # Ensure partial matching for token names
        query['name'] = {'$regex': search, '$options': 'i'}"""

# 4. Add ability to search token abilities with partial matching
token_ability_search_pattern = "if body_search:\n        # For token abilities, we need to search differently since it's an array\n        ability_query = {'abilities': {'': body_search, '': 'i'}}\n        if 'name' in query:\n            query = {'': [{'name': query['name']}, ability_query]}\n        else:\n            query.update(ability_query)"
token_ability_search_replacement = """if body_search:
        # For token abilities, ensure partial matching in the array
        ability_query = {'abilities': {'$regex': body_search, '$options': 'i'}}
        if 'name' in query:
            query = {'$or': [{'name': query['name']}, ability_query]}
        else:
            query.update(ability_query)"""

content = content.replace(token_ability_search_pattern, token_ability_search_replacement)

# Write the updated content back to the file
with open('app.py', 'w') as file:
    file.write(content)

print("Search functionality has been updated to ensure proper partial matching")
