// This is a temporary file to show the changes needed in the api.ts file

// For the getCards function, add the following code after line 108:
if (params?.colors && params.colors.length > 0) {
  queryParams.append('colors', params.colors.join(','));
  
  // Add color match type parameter if provided
  if (params?.color_match) {
    queryParams.append('color_match', params.color_match);
  }
}

// For the getTokens function, add the following code after line 233:
if (params?.colors && params.colors.length > 0) {
  queryParams.append('colors', params.colors.join(','));
  
  // Add color match type parameter if provided
  if (params?.color_match) {
    queryParams.append('color_match', params.color_match);
  }
}
