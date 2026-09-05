const axios = require('axios');



const getFashionShops = async (req, res) => {
  let { lat, long, searchquery, radius } = req.query;
  console.log("Received request with lat:", lat, "lng:", long, "searchquery:", searchquery, "radius:", radius,);
  try {
    if (isNaN(radius) || radius < 1 || radius > 80000) {
      radius = 50000;
    }
    console.log("Sending request with lat:", lat, "lng:", long, "searchquery:", searchquery, "radius:", radius,);
    const requestBody = {
      textQuery: `${searchquery ? `${searchquery}, ` : ''}zero waste,green products, natural, sustainable,`,
      location_bias: {
        circle: {
          center: {
            latitude: lat,
            longitude: long
          },
          radius: radius
        }
      }
    };

    // 2. Log the complete request being sent to the API
    console.log("Google Places API Request:", {
      url: 'https://places.googleapis.com/v1/places:searchText',
      body: requestBody,
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': process.env.GOOGLE_API_KEY,
        'X-Goog-FieldMask': '*'
      }
    });

    const response = await axios.post(
      'https://places.googleapis.com/v1/places:searchText',
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': process.env.GOOGLE_API_KEY,
          'X-Goog-FieldMask': '*'
        }
      }
    );

    // 3.  Log the raw response from the API
    console.log("Google Places API Response:", response.data);

    const rawPlaces = response?.data?.places || [];

    const places = rawPlaces.map(place => ({
      name: place.displayName?.text || '',
      address: place.formattedAddress || '',
      rating: place.rating || null,
      location: place.location || null,
      image: place.photos,
      google_map_uri: place.googleMapsUri,
      google_map_links: place.googleMapsLinks

    }));


    return res.response({
      success: true,
      message: rawPlaces.length > 0 ? 'Shops fetched successfully' : 'No shops found matching the criteria',
      data: places,
    }).code(200);

  } catch (err) {
    // 5. Enhanced Error Handling
    console.error('Google Places API Error:', err.response ? err.response.data : err.message);
    return res.response({
      success: false,
      message: err.message || 'Something went wrong',
      error: err.response ? err.response.data : { message: err.message }, // Include more error details
    }).code(500);
  }
};








module.exports = {
  getFashionShops,
}