import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, CreditCard, MapPin, Building, Search, CheckCircle, XCircle, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Mock destination and hotel data based on typical Hilton properties in APAC
const destinations = [
  "Singapore",
  "Bangkok, Thailand", 
  "Tokyo, Japan",
  "Hong Kong",
  "Kuala Lumpur, Malaysia",
  "Sydney, Australia",
  "Seoul, South Korea",
  "Manila, Philippines",
  "Jakarta, Indonesia",
  "Mumbai, India"
];

const hotelsByDestination: Record<string, string[]> = {
  "Singapore": [
    "Conrad Centennial Singapore",
    "Hilton Singapore Orchard",
    "DoubleTree by Hilton Singapore"
  ],
  "Bangkok, Thailand": [
    "Conrad Bangkok",
    "Hilton Bangkok",
    "DoubleTree by Hilton Bangkok"
  ],
  "Tokyo, Japan": [
    "Conrad Tokyo",
    "Hilton Tokyo",
    "Hilton Tokyo Bay"
  ],
  "Hong Kong": [
    "Conrad Hong Kong",
    "Hilton Hong Kong"
  ],
  "Kuala Lumpur, Malaysia": [
    "Hilton Kuala Lumpur",
    "DoubleTree by Hilton Kuala Lumpur"
  ],
  "Sydney, Australia": [
    "Conrad Sydney",
    "Hilton Sydney"
  ],
  "Seoul, South Korea": [
    "Conrad Seoul",
    "Hilton Seoul"
  ],
  "Manila, Philippines": [
    "Conrad Manila",
    "Hilton Manila"
  ],
  "Jakarta, Indonesia": [
    "Conrad Jakarta",
    "Hilton Jakarta"
  ],
  "Mumbai, India": [
    "Conrad Mumbai",
    "Hilton Mumbai"
  ]
};

interface AvailabilityResult {
  date: string;
  available: boolean;
  roomCount?: number;
}

export function VoucherForm() {
  const [creditCard, setCreditCard] = useState("");
  const [voucherCode, setVoucherCode] = useState("");
  const [destination, setDestination] = useState("");
  const [hotel, setHotel] = useState("");
  const [voucherExpiry, setVoucherExpiry] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<AvailabilityResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  
  const { toast } = useToast();

  const isFormValid = creditCard.length === 6 && voucherCode.length === 10 && destination && hotel && voucherExpiry;
  const canShowDestination = creditCard.length === 6 && voucherCode.length === 10 && voucherExpiry;
  const availableHotels = destination ? hotelsByDestination[destination] || [] : [];

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
      // Simulate API call to check availability across date range
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Mock results - in real implementation, this would make actual API calls
      const today = new Date();
      const expiry = new Date(voucherExpiry);
      const mockResults: AvailabilityResult[] = [];
      
      // Create date range from today to expiry date (inclusive)
      const currentDate = new Date(today);
      while (currentDate <= expiry) {
        const isAvailable = Math.random() > 0.6; // Random availability for demo
        const roomCount = isAvailable ? Math.floor(Math.random() * 5) + 1 : 0;
        
        mockResults.push({
          date: currentDate.toISOString().split('T')[0],
          available: isAvailable,
          roomCount: isAvailable ? roomCount : undefined
        });
        
        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      setResults(mockResults);
      setShowResults(true);
      
      toast({
        title: "Search Complete",
        description: `Found availability results for ${mockResults.length} dates.`,
      });
      
    } catch (error) {
      toast({
        title: "Search Failed",
        description: "Unable to check availability. Please try again.",
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

  return (
    <div className="space-y-8">
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
            {/* Credit Card Field */}
            <div className="space-y-2">
              <Label htmlFor="creditCard" className="text-sm font-semibold flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                Credit Card
              </Label>
              <Input
                id="creditCard"
                value={creditCard}
                onChange={(e) => setCreditCard(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter first 6 digits"
                maxLength={6}
                className="font-mono tracking-wider"
              />
              <p className="text-xs text-muted-foreground">
                Enter the first 6 character of your American Express Singapore Airlines KrisFlyer Ascend Credit Card
              </p>
              {creditCard.length > 0 && creditCard.length < 6 && (
                <p className="text-xs text-warning">You've provided an incorrect entry. Please try again.</p>
              )}
            </div>

            {/* Voucher Code Field */}
            <div className="space-y-2">
              <Label htmlFor="voucherCode" className="text-sm font-semibold">
                Voucher Code
              </Label>
              <Input
                id="voucherCode"
                value={voucherCode}
                onChange={(e) => setVoucherCode(e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 10))}
                placeholder="Enter 10 character code"
                maxLength={10}
                className="font-mono tracking-wider"
              />
              <p className="text-xs text-muted-foreground">
                Enter the 10 character code printed on your voucher*
              </p>
              {voucherCode.length > 0 && voucherCode.length < 10 && (
                <p className="text-xs text-warning">You've provided an incorrect entry. Please try again.</p>
              )}
            </div>

            {/* Voucher Expiry Date */}
            <div className="space-y-2">
              <Label htmlFor="voucherExpiry" className="text-sm font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Voucher Expiry Date
              </Label>
              <Input
                id="voucherExpiry"
                type="date"
                value={voucherExpiry}
                onChange={(e) => setVoucherExpiry(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
              <p className="text-xs text-muted-foreground">
                We'll check availability from today until your voucher expires
              </p>
            </div>

            {/* Destination Field - Only show when card and voucher are valid */}
            {canShowDestination && (
              <div className="space-y-2">
                <Label htmlFor="destination" className="text-sm font-semibold flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  Destination
                </Label>
                <Select value={destination} onValueChange={setDestination}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose your destination" />
                  </SelectTrigger>
                  <SelectContent>
                    {destinations.map((dest) => (
                      <SelectItem key={dest} value={dest}>
                        {dest}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Select the Destination
                </p>
              </div>
            )}

            {/* Hotel Field - Only show when destination is selected */}
            {destination && (
              <div className="space-y-2">
                <Label htmlFor="hotel" className="text-sm font-semibold flex items-center gap-2">
                  <Building className="h-4 w-4 text-primary" />
                  Hotel
                </Label>
                <Select value={hotel} onValueChange={setHotel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose your hotel" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableHotels.map((hotelName) => (
                      <SelectItem key={hotelName} value={hotelName}>
                        {hotelName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Select the Hotel
                </p>
              </div>
            )}

            {/* Submit Button */}
            <Button 
              type="submit" 
              variant="luxury" 
              className="w-full"
              disabled={!isFormValid || isLoading}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Checking Availability...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  Check Availability
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Results Section */}
      {showResults && (
        <Card className="bg-gradient-card shadow-luxury border-0">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-primary flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Availability Results
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Showing availability for {hotel} from today until {formatDate(voucherExpiry)}
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {results.map((result) => (
                <div
                  key={result.date}
                  className={`p-3 rounded-lg border flex items-center justify-between transition-all duration-200 ${
                    result.available
                      ? "bg-success/10 border-success/20 hover:bg-success/20"
                      : "bg-muted/50 border-border hover:bg-muted"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {result.available ? (
                      <CheckCircle className="h-5 w-5 text-success" />
                    ) : (
                      <XCircle className="h-5 w-5 text-muted-foreground" />
                    )}
                    <span className="font-medium">
                      {formatDate(result.date)}
                    </span>
                  </div>
                  <div className="text-right">
                    {result.available ? (
                      <Button
                        variant="link"
                        className="p-0 h-auto text-success font-semibold hover:underline"
                        onClick={() => window.open('https://www.hilton.com/en/book/reservation/rooms/', '_blank')}
                      >
                        {result.roomCount} room{result.roomCount !== 1 ? 's' : ''} available
                      </Button>
                    ) : (
                      <span className="text-muted-foreground text-sm">
                        No availability
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {results.length > 0 && (
              <div className="mt-4 p-3 bg-accent/50 rounded-lg">
                <p className="text-sm text-foreground">
                  <strong>Summary:</strong> {results.filter(r => r.available).length} available dates out of {results.length} checked with {results.reduce((sum, r) => sum + (r.roomCount || 0), 0)} total available rooms.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}