import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, CreditCard, MapPin, Building, Search, CheckCircle, XCircle, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface HotelData {
  destinations: string[];
  hotels: string[];
  hotelsByDestination: Record<string, string[]>;
  hotelCodes: Record<string, string>;
  success: boolean;
}

interface AvailabilityResult {
  date: string;
  available: boolean;
  roomCount?: number;
  bookingUrl?: string;
}
export function VoucherForm() {
  const [creditCard, setCreditCard] = useState("");
  const [voucherCode, setVoucherCode] = useState("");
  const [destination, setDestination] = useState<string | undefined>(undefined);
  const [hotel, setHotel] = useState<string | undefined>(undefined);
  const [voucherExpiry, setVoucherExpiry] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<AvailabilityResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [hotelData, setHotelData] = useState<HotelData>({
    destinations: [],
    hotels: [],
    hotelsByDestination: {},
    hotelCodes: {},
    success: false
  });
  const [isLoadingHotelData, setIsLoadingHotelData] = useState(true);
  
  const {
    toast
  } = useToast();
  
  // Fetch hotel data on component mount
  useEffect(() => {
    const fetchHotelData = async () => {
      try {
        setIsLoadingHotelData(true);
        console.log('Fetching hotel data...');
        
        const { data, error } = await supabase.functions.invoke('fetch-hotel-data');
        
        if (error) {
          console.error('Error fetching hotel data:', error);
          toast({
            title: "Error",
            description: "Failed to load hotel data from AMEX KrisFlyer. Please try again later.",
            variant: "destructive",
          });
          setHotelData({
            destinations: [],
            hotels: [],
            hotelsByDestination: {},
            hotelCodes: {},
            success: false
          });
        } else {
          console.log('Successfully fetched hotel data:', data);
          setHotelData(data);
        }
      } catch (error) {
        console.error('Error in fetchHotelData:', error);
        toast({
          title: "Error",
          description: "Failed to load hotel data from AMEX KrisFlyer. Please try again later.",
          variant: "destructive",
        });
        setHotelData({
          destinations: [],
          hotels: [],
          hotelsByDestination: {},
          hotelCodes: {},
          success: false
        });
      } finally {
        setIsLoadingHotelData(false);
      }
    };

    fetchHotelData();
  }, [toast]);
  
  const isFormValid = creditCard.length === 6 && voucherCode.length === 10 && destination && destination !== 'Select Destination' && hotel && hotel !== 'Select Hotel' && voucherExpiry;
  const canShowDestination = creditCard.length === 6 && voucherCode.length === 10 && voucherExpiry;
  const availableHotels = (destination && destination !== 'Select Destination') ? hotelData.hotelsByDestination[destination] || [] : hotelData.hotels;

  const getBookingUrl = (result: AvailabilityResult) => {
    // Use the real booking URL from the browser automation result if available
    return result.bookingUrl || generateBookingUrl(result.date);
  };


  const generateBookingUrl = (date: string) => {
    // Generate booking URL with real AMEX KrisFlyer parameters
    const arrivalDate = date;
    const departureDate = new Date(date);
    departureDate.setDate(departureDate.getDate() + 1);
    const departureDateStr = departureDate.toISOString().split('T')[0];
    
    // Get the hotel code from the dynamic data
    const hotelCode = hotelData.hotelCodes[hotel] || hotel.slice(0, 5).toUpperCase().replace(/[^A-Z]/g, '');
    
    const params = new URLSearchParams({
      ctyhocn: hotelCode,
      arrivalDate: arrivalDate,
      departureDate: departureDateStr,
      groupCode: 'AMEXKF',
      room1NumAdults: '1',
      cid: 'OH,MB,APACAMEXKrisFlyerComplimentaryNight,MULTIBR,OfferCTA,Offer,Book'
    });
    
    return `https://www.hilton.com/en/book/reservation/rooms/?${params.toString()}`;
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) {
      toast({
        title: "Form Incomplete",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }
    setIsLoading(true);
    try {
      // Call our Supabase Edge Function to check real availability
      const { data, error } = await supabase.functions.invoke('check-hotel-availability', {
        body: {
          creditCard,
          voucherCode,
          destination,
          hotel,
          arrivalDate: new Date().toISOString().split('T')[0], // Start from today
          voucherExpiry
        }
      });

      if (error) {
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to check availability');
      }

      setResults(data.availability || []);
      setShowResults(true);
      toast({
        title: "Search Complete",
        description: `Found availability results for ${data.availability?.length || 0} dates.`
      });
    } catch (error) {
      console.error('Availability check error:', error);
      toast({
        title: "Search Failed",
        description: error.message || "Unable to check availability. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  return <div className="space-y-8">
      <Card className="bg-gradient-card shadow-luxury border-0">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">
            Verify Your Details
          </CardTitle>
          <p className="text-muted-foreground">
            Enter your credit card and voucher information to check availability
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="space-y-2">
              <Label htmlFor="creditCard" className="text-sm font-semibold flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                Credit Card
              </Label>
              <Input id="creditCard" value={creditCard} onChange={e => setCreditCard(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="Enter first 6 digits" maxLength={6} className="font-mono tracking-wider" />
              <p className="text-xs text-muted-foreground">
                Enter the first 6 character of your American Express Singapore Airlines KrisFlyer Ascend Credit Card
              </p>
              {creditCard.length > 0 && creditCard.length < 6 && <p className="text-xs text-warning">You've provided an incorrect entry. Please try again.</p>}
            </div>

            
            <div className="space-y-2">
              <Label htmlFor="voucherCode" className="text-sm font-semibold">
                Voucher Code
              </Label>
              <Input id="voucherCode" value={voucherCode} onChange={e => setVoucherCode(e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 10))} placeholder="Enter 10 character code" maxLength={10} className="font-mono tracking-wider" />
              <p className="text-xs text-muted-foreground">Enter the 10 character code printed on your voucher*</p>
              <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-xs text-yellow-800 dark:text-yellow-200">
                  *Booking must be made with a valid voucher code for the complimentary 1-night stay. Booking may be cancelled, revoked or charged if found to be made through an invalid manner.
                </p>
              </div>
              
              {voucherCode.length > 0 && voucherCode.length < 10 && <p className="text-xs text-warning">You've provided an incorrect entry. Please try again.</p>}
            </div>

            
            <div className="space-y-2">
              <Label htmlFor="voucherExpiry" className="text-sm font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Voucher Expiry Date
              </Label>
              <Input id="voucherExpiry" type="date" value={voucherExpiry} onChange={e => setVoucherExpiry(e.target.value)} min={new Date().toISOString().split('T')[0]} />
              <p className="text-xs text-muted-foreground">
                We'll check availability from today through when your voucher expires
              </p>
            </div>

            
            {canShowDestination && <div className="space-y-2">
                <Label htmlFor="destination" className="text-sm font-semibold flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  Destination
                </Label>
                <Select value={destination} onValueChange={(value) => {
                  setDestination(value);
                  // Clear hotel selection if "Select Destination" is chosen
                  if (value === 'Select Destination') {
                    setHotel(undefined);
                  }
                }}>
                  <SelectTrigger id="destination">
                    <SelectValue placeholder="Select Destination" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Select Destination">Select Destination</SelectItem>
                    {hotelData.destinations.map(dest => <SelectItem key={dest} value={dest}>
                        {dest}
                      </SelectItem>)}
                  </SelectContent>
                </Select>
              </div>}

            {canShowDestination && <div className="space-y-2">
                <Label htmlFor="hotel" className="text-sm font-semibold flex items-center gap-2">
                  <Building className="h-4 w-4 text-primary" />
                  Hotel
                </Label>
                <Select value={hotel} onValueChange={setHotel} disabled={isLoadingHotelData}>
                  <SelectTrigger id="hotel">
                    <SelectValue placeholder={isLoadingHotelData ? "Loading hotels..." : "Select Hotel"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Select Hotel">Select Hotel</SelectItem>
                    {availableHotels.map(hotelName => <SelectItem key={hotelName} value={hotelName}>
                        {hotelName}
                      </SelectItem>)}
                  </SelectContent>
                </Select>
              </div>}

            
            <Button type="submit" variant="luxury" className="w-full" disabled={!isFormValid || isLoading}>
              {isLoading ? <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Checking Availability...
                </> : <>
                  <Search className="h-4 w-4" />
                  Check Availability
                </>}
            </Button>
          </form>
        </CardContent>
      </Card>

      
      {showResults && <Card className="bg-gradient-card shadow-luxury border-0">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-primary flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Availability Results
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Showing availability for {hotel} from today through {formatDate(voucherExpiry)}
            </p>
            <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-xs text-yellow-800 dark:text-yellow-200 italic">
                If I choose to view rooms, I acknowledge that I will be redirected to the Hilton reservation page to redeem 1 complimentary Standard Room night stay. Any additional night bookings will be chargeable. To book any additional nights, please proceed to Hilton.com. Booking may be cancelled, revoked or charged if found to be made through an invalid manner.
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {results.map(result => <div key={result.date} className={`p-3 rounded-lg border flex items-center justify-between transition-all duration-200 ${result.available ? "bg-success/10 border-success/20 hover:bg-success/20" : "bg-muted/50 border-border hover:bg-muted"}`}>
                  <div className="flex items-center gap-3">
                    {result.available ? <CheckCircle className="h-5 w-5 text-success" /> : <XCircle className="h-5 w-5 text-muted-foreground" />}
                    <span className="font-medium">
                      {formatDate(result.date)}
                    </span>
                  </div>
                  <div className="text-right">
                    <a href={getBookingUrl(result)} target="_blank" rel="noopener noreferrer" className={`${result.available ? "text-success font-semibold underline hover:no-underline" : "text-muted-foreground text-sm underline hover:no-underline"}`}>
                      {result.available ? `${result.roomCount} room${result.roomCount !== 1 ? 's' : ''} available` : "View rooms"}
                    </a>
                  </div>
                </div>)}
            </div>
            
            {results.length > 0 && <div className="mt-4 p-3 bg-accent/50 rounded-lg">
                <p className="text-sm text-foreground">
                  <strong>Summary:</strong> {results.filter(r => r.available).length} available dates out of {results.length} checked with {results.reduce((sum, r) => sum + (r.roomCount || 0), 0)} total available rooms.
                </p>
              </div>}
          </CardContent>
        </Card>}
    </div>;
}
