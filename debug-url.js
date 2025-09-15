// Debug script to test URL construction
function constructHiltonUrl(requestData, hotelCode) {
  const baseUrl = 'https://www.hilton.com/en/book/reservation/rooms/';
  
  // Calculate departure date (day after arrival)
  const arrivalDate = new Date(requestData.arrivalDate);
  const departureDate = new Date(arrivalDate);
  departureDate.setDate(departureDate.getDate() + 1);
  
  const params = new URLSearchParams({
    'ctyhocn': hotelCode,
    'arrivalDate': requestData.arrivalDate,
    'departureDate': departureDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
    'groupCode': requestData.groupCode,
    'room1NumAdults': '1',
    'cid': 'OH,MB,APACAMEXKrisFlyerComplimentaryNight,MULTIBR,OfferCTA,Offer,Book'
  });
  
  return `${baseUrl}?${params.toString()}`;
}

const testData = {
  creditCard: "377361",
  voucherCode: "P370336ZYH", 
  destination: "Singapore",
  hotel: "SINGI",
  arrivalDate: "2025-10-15",
  voucherExpiry: "2026-07-31",
  groupCode: "ZKFA25"
};

const url = constructHiltonUrl(testData, "SINGI");
console.log("Constructed URL:", url);

// Test if the URL is valid
try {
  new URL(url);
  console.log("✅ URL is valid");
} catch (e) {
  console.log("❌ URL is invalid:", e.message);
}
