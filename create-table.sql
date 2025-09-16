-- Create hotel_data table for caching hotel information
CREATE TABLE IF NOT EXISTS hotel_data (
  id SERIAL PRIMARY KEY,
  data JSONB NOT NULL,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for fast lookups by last_updated
CREATE INDEX IF NOT EXISTS idx_hotel_data_updated ON hotel_data(last_updated);

-- Create index for JSONB queries if needed in the future
CREATE INDEX IF NOT EXISTS idx_hotel_data_jsonb ON hotel_data USING GIN (data);

-- Insert initial empty record to ensure we always have a record
INSERT INTO hotel_data (data, last_updated) 
VALUES ('{"destinations": [], "hotels": [], "hotelsByDestination": {}, "hotelCodes": {}}', NOW() - INTERVAL '25 hours')
ON CONFLICT DO NOTHING;
