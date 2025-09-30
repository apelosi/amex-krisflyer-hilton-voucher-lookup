import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, CreditCard, MapPin, Building, Search, CheckCircle, XCircle, Calendar, Loader2 } from "lucide-react";
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
  available: boolean | null; // null means "unknown - check manually"
  roomCount?: number | null;
  bookingUrl?: string;
  groupCode?: string;
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
  const [currentMonthOffset, setCurrentMonthOffset] = useState(0);
  const [searchProgress, setSearchProgress] = useState({ current: 0, total: 0, isSearching: false });
  const [hotelData, setHotelData] = useState<HotelData>({
    destinations: [],
    hotels: [],
    hotelsByDestination: {},
    hotelCodes: {},
    success: false
  });
  const [isLoadingHotelData, setIsLoadingHotelData] = useState(true);
  const [error, setError] = useState<string>("");
  
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
  // Get available hotels as codes (keys) instead of names
  const availableHotelCodes = (destination && destination !== 'Select Destination') 
    ? Object.entries(hotelData.hotelCodes || {})
        .filter(([code, name]) => hotelData.hotelsByDestination[destination]?.includes(name))
        .map(([code]) => code)
    : Object.keys(hotelData.hotelCodes || {});

  const getBookingUrl = (result: AvailabilityResult) => {
    // Use the real booking URL from the browser automation result if available
    return result.bookingUrl || generateBookingUrl(result.date, result.groupCode);
  };


  const generateBookingUrl = (date: string, groupCode: string) => {
    // Generate booking URL with real AMEX KrisFlyer parameters
    const arrivalDate = date;
    const departureDate = new Date(date);
    departureDate.setDate(departureDate.getDate() + 1);
    const departureDateStr = departureDate.toISOString().split('T')[0];

    // Hotel is already the hotel code
    const hotelCode = hotel;

    if (!hotelCode) {
      throw new Error(`Hotel code not found for selected hotel: ${hotel}`);
    }

    const params = new URLSearchParams({
      ctyhocn: hotelCode,
      arrivalDate: arrivalDate,
      departureDate: departureDateStr,
      groupCode: groupCode,
      room1NumAdults: '1',
      cid: 'OH,MB,APACAMEXKrisFlyerComplimentaryNight,MULTIBR,OfferCTA,Offer,Book'
    });

    return `https://www.hilton.com/en/book/reservation/rooms/?${params.toString()}`;
  };

  // Calendar helper functions
  const getCalendarForMonth = (monthOffset: number) => {
    const today = new Date();
    const targetDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay(); // 0 = Sunday

    const days = [];

    // Add padding for days before month starts
    for (let i = 0; i < startPadding; i++) {
      days.push(null);
    }

    // Add all days in month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      days.push(date);
    }

    return { year, month, days };
  };

  const getResultForDate = (date: Date | null) => {
    if (!date) return null;
    // Format date as YYYY-MM-DD in local timezone to avoid UTC conversion issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    return results.find(r => r.date === dateStr);
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); // Clear any previous errors
    if (!isFormValid) {
      setError("Please fill in all required fields.");
      return;
    }
    setIsLoading(true);
    try {
      // Step 1: Validate voucher first
      console.log('Validating voucher:', { creditCard, voucherCode });
      const { data: validationData, error: validationError } = await supabase.functions.invoke('validate-voucher', {
        body: {
          creditCard,
          voucherCode
        }
      });

      if (validationError) {
        throw new Error(`Voucher validation failed: ${validationError.message}`);
      }

      if (!validationData.success || !validationData.valid) {
        throw new Error(validationData.error || 'Invalid voucher details. Please check your credit card number and voucher code.');
      }

      console.log('Voucher validation successful, proceeding with hotel availability check...');

      // Step 2: Generate date range and show clickable links (skip automation for now)
      const dynamicGroupCode = "ZKFA25";
      console.log('Using hardcoded groupCode:', dynamicGroupCode);

      if (!hotel) {
        throw new Error(`Hotel code not found for selected hotel: ${hotel}`);
      }

      // Generate date range from today until voucher expiry
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset to midnight local time
      const expiryDate = new Date(voucherExpiry);
      expiryDate.setHours(0, 0, 0, 0); // Reset to midnight local time
      const dateRange = [];

      for (let d = new Date(today); d <= expiryDate; d.setDate(d.getDate() + 1)) {
        // Format in local timezone to avoid UTC conversion issues
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        dateRange.push(`${year}-${month}-${day}`);
      }

      console.log(`Generated ${dateRange.length} dates from ${dateRange[0]} to ${dateRange[dateRange.length - 1]}`);

      // Set up progress tracking
      setSearchProgress({ current: 0, total: dateRange.length, isSearching: true });

      // Create results with "?" for availability (user will check manually)
      const allResults = dateRange.map(date => ({
        date,
        available: null, // null means "unknown - user needs to check"
        roomCount: null,
        bookingUrl: generateBookingUrl(date, dynamicGroupCode),
        groupCode: dynamicGroupCode
      }));

      setResults(allResults);
      setShowResults(true);
      setCurrentMonthOffset(0); // Reset to current month

      // Mark search as complete immediately (since we're not actually searching)
      setSearchProgress({ current: dateRange.length, total: dateRange.length, isSearching: false });
    } catch (error) {
      console.error('Availability check error:', error);
      
      // Provide specific error messages based on the actual failure
      let errorMessage = "";
      
      if (error.message?.includes('Gateway Timeout') || error.message?.includes('504') || error.message?.includes('timeout')) {
        errorMessage = "Hotel availability check timed out. This can happen when checking many dates. Please try with a smaller date range or try again later.";
      } else if (error.message?.includes('CORS') || error.message?.includes('Failed to send a request')) {
        errorMessage = "Network error while checking hotel availability. Please check your internet connection and try again.";
      } else if (error.message?.includes('hotel') || error.message?.includes('availability')) {
        errorMessage = "There was an issue checking hotel availability. Please try again in a few minutes or contact support.";
      } else if (error.message?.includes('voucher details') || error.message?.includes('AMEX KrisFlyer')) {
        errorMessage = "We couldn't verify your voucher details. Please double-check your voucher code and credit card number (first 6 digits). If the issue persists, please contact support for assistance.";
      } else {
        errorMessage = "An unexpected error occurred while checking availability. Please try again. If the problem continues, contact support.";
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      setIsCheckingAvailability(false);
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
              <Input id="voucherExpiry" name="voucherExpiry" type="date" value={voucherExpiry} onChange={e => setVoucherExpiry(e.target.value)} min={new Date().toISOString().split('T')[0]} />
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
                    {availableHotelCodes.map(hotelCode => (
                      <SelectItem key={hotelCode} value={hotelCode}>
                        {hotelData.hotelCodes?.[hotelCode] || hotelCode}
                      </SelectItem>
                    ))}
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
            
            {/* Error message display */}
            {error && (
              <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive">
                  {error.includes('contact support') ? (
                    <>
                      {error.split('contact support')[0]}
                      contact{' '}
                      <a 
                        href="https://vibez.ventures" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-destructive underline hover:no-underline font-medium"
                      >
                        Vibez Ventures
                      </a>
                      {error.includes('for assistance') ? ' for assistance' : ''}.
                    </>
                  ) : (
                    error
                  )}
                </p>
              </div>
            )}
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
              {hotelData.hotelCodes?.[hotel || ''] || hotel}
            </p>
            <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-xs text-yellow-800 dark:text-yellow-200 italic">
                Click any date to check availability. You'll be redirected to Hilton to redeem 1 complimentary Standard Room night stay. Additional nights are chargeable.
              </p>
            </div>
          </CardHeader>
          <CardContent>
            {(() => {
              const calendar1 = getCalendarForMonth(currentMonthOffset);
              const calendar2 = getCalendarForMonth(currentMonthOffset + 1);
              const today = new Date();
              const expiryDate = new Date(voucherExpiry);

              // Calculate min and max month offsets
              const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
              const expiryMonth = new Date(expiryDate.getFullYear(), expiryDate.getMonth(), 1);
              const viewingMonth1 = new Date(calendar1.year, calendar1.month, 1);
              const viewingMonth2 = new Date(calendar2.year, calendar2.month, 1);

              const canGoPrevious = viewingMonth1 > currentMonth;
              const canGoNext = viewingMonth2 < expiryMonth;

              const renderCalendar = (calendar: ReturnType<typeof getCalendarForMonth>, showNav: 'left' | 'right' | 'both' | 'none' = 'none') => {
                const calendarMonth = new Date(calendar.year, calendar.month, 1);
                const canGoPrev = (showNav === 'left' || showNav === 'both') && calendarMonth > currentMonth;
                const canGoNext = (showNav === 'right' || showNav === 'both') && calendarMonth < expiryMonth;

                return (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      {(showNav === 'left' || showNav === 'both') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentMonthOffset(currentMonthOffset - 1)}
                          disabled={!canGoPrev}
                        >
                          ← Previous
                        </Button>
                      )}
                      {showNav === 'right' && <div className="w-20" />}
                      <h3 className="text-sm font-semibold text-center flex-1">
                        {monthNames[calendar.month]} {calendar.year}
                      </h3>
                      {(showNav === 'right' || showNav === 'both') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentMonthOffset(currentMonthOffset + 1)}
                          disabled={!canGoNext}
                        >
                          Next →
                        </Button>
                      )}
                      {showNav === 'left' && <div className="w-20" />}
                    </div>
                    {/* Calendar grid */}
                    <div className="grid grid-cols-7 gap-1">
                    {/* Day headers */}
                    {dayNames.map(day => (
                      <div key={day} className="text-center text-xs font-medium text-muted-foreground p-2">
                        {day}
                      </div>
                    ))}

                    {/* Calendar days */}
                    {calendar.days.map((date, idx) => {
                      const result = getResultForDate(date);
                      const hasResult = !!result;

                      if (!date) {
                        return <div key={`empty-${idx}`} className="aspect-square" />;
                      }

                      return (
                        <div
                          key={date.toISOString()}
                          className="aspect-square border rounded p-1 text-center relative"
                        >
                          <div className="text-xs text-muted-foreground mb-1">
                            {date.getDate()}
                          </div>
                          {hasResult ? (
                            <a
                              href={getBookingUrl(result)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary text-sm font-semibold hover:underline"
                            >
                              ?
                            </a>
                          ) : (
                            <div className="text-xs text-muted-foreground">-</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            };

              return (
                <div>
                  {/* Progress indicator */}
                  {searchProgress.total > 0 && (
                    <div className="mb-4 p-3 bg-accent/50 rounded-lg flex items-center gap-2">
                      {searchProgress.isSearching ? (
                        <Loader2 className="h-3 w-3 animate-spin text-primary" />
                      ) : (
                        <CheckCircle className="h-3 w-3 text-green-600" />
                      )}
                      <p className="text-xs text-foreground">
                        <strong>{searchProgress.current} of {searchProgress.total}</strong> dates searched
                      </p>
                    </div>
                  )}

                  {/* Calendar grid - 2 columns on desktop, 1 on mobile */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="lg:hidden">
                      {renderCalendar(calendar1, 'both')}
                    </div>
                    <div className="hidden lg:block">
                      {renderCalendar(calendar1, 'left')}
                    </div>
                    <div className="hidden lg:block">
                      {renderCalendar(calendar2, 'right')}
                    </div>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>}
    </div>;
}
