import { ClimateData } from "@/models/climateData";
import countryData from '../../public/data/country_coordinates.json'

export const getClimateData = async (): Promise<any> => {

    try{
        const response = await fetch('http://localhost:5000/api/get-climate-data-parallel', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify({ 
                coordinates: countryData.map(country => ({
                    latitude: country.latitude,
                    longitude: country.longitude
                })) 
            }),
          });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to send message');
        }
        return await response.json();
      
    }
    catch(error){
        console.error("Error on performItemComparison:", error);
        return {
            error: error instanceof Error ? error.message : 'Failed to send message'
        }
    }
}