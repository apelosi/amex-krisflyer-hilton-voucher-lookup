-- Allow anonymous and authenticated users to read hotel data (public cache)
CREATE POLICY "Anyone can read hotel_data"
  ON public.hotel_data FOR SELECT
  TO anon, authenticated
  USING (true);