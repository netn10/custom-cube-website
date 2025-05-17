"""
Fix body_search functionality in app.py to search in both name and text fields
"""

with open('app.py', 'r') as file:
    content = file.read()

# Find and replace the body_search implementation to search in both name and text
body_search_pattern = """    if body_search:
        # For token abilities, ensure partial matching in the array
        ability_query = {'abilities': {'$regex': body_search, '$options': 'i'}}
        if 'name' in query:
            query = {'$or': [{'name': query['name']}, ability_query]}
        else:
            query.update(ability_query)"""

body_search_replacement = """    if body_search:
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
            query['$or'] = [name_query, text_query]"""

content = content.replace(body_search_pattern, body_search_replacement)

# Write the updated content back to the file
with open('app.py', 'w') as file:
    file.write(content)

print("Body search functionality has been updated to search in both name and text fields")
