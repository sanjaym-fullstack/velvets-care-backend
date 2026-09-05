const axios = require('axios');

const getAddressFromCoordinates = async (lat, lng) => {
  try {
    const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
      params: {
        latlng: `${lat},${lng}`,  // Pass the latitude and longitude
        key: process.env.GOOGLE_API_KEY,  // Your Google API Key
      }
    });
      // console.log(response.data, "response-loaction");
    // Check if the response contains results
    if (response.data.results.length > 0) {
      const address = response?.data?.results?.[0]?.formatted_address;
      console.log(address, "-address-main");
      return address;  // Return the first address result
    } else {
      throw new Error('No address found for the given coordinates');
    }
  } catch (error) {
    console.error('Error in reverse geocoding:', error.message);
    throw new Error('Failed to retrieve address from coordinates');
  }
};

const getAddress = async (req, res) => {
  try {
    const {lat, long} = req.query;
    const address = getAddressFromCoordinates(lat, long)
    return res.response({
      success: true,
      message: 'Address fetched successfully',
      data: address,  
    }).code(200);
    
  } catch (error) {
    console.log(error);
    return res.response({
      success: false,
      message: error.message || 'Something went wrong',
      error: error,
  }).code(200);

  }
}

module.exports = { 
    getAddressFromCoordinates,
    getAddress
};
