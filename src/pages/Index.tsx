import { VoucherForm } from "@/components/VoucherForm";
import heroImage from "@/assets/hero-travel.jpg";
import { Building, Shield, Clock } from "lucide-react";
const Index = () => {
  return <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative h-64 md:h-80 overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{
        backgroundImage: `url(${heroImage})`
      }} />
        <div className="absolute inset-0 bg-gradient-hero opacity-75" />
        <div className="relative z-10 h-full flex items-center justify-center text-center px-4">
          <div className="max-w-4xl">
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">
              AMEX KrisFlyer Hilton Voucher Lookup
            </h1>
            <p className="text-lg md:text-xl text-white/90 mb-2">Check hotel availability across all dates at once</p>
            <p className="text-sm text-white/80">
              by <a href="https://vibez.ventures" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline transition-all duration-200">Vibez Ventures</a> - Not affiliated with Hilton, AMEX, or KrisFlyer
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* How it Works Section */}
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-primary mb-6">
              How to Use This Tool
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-gradient-card p-6 rounded-lg shadow-card">
                <div className="flex justify-center mb-4">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold text-primary mb-2">1. Verify Details</h3>
                <p className="text-sm text-muted-foreground">
                  Enter your credit card and voucher information to begin
                </p>
              </div>
              <div className="bg-gradient-card p-6 rounded-lg shadow-card">
                <div className="flex justify-center mb-4">
                  <Building className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold text-primary mb-2">2. Select Hotel</h3>
                <p className="text-sm text-muted-foreground">
                  Choose your destination and preferred Hilton property
                </p>
              </div>
              <div className="bg-gradient-card p-6 rounded-lg shadow-card">
                <div className="flex justify-center mb-4">
                  <Clock className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold text-primary mb-2">3. Get Results</h3>
                <p className="text-sm text-muted-foreground">
                  View availability for all dates until your voucher expires
                </p>
              </div>
            </div>
          </div>

          {/* Voucher Form */}
          <VoucherForm />

          {/* Important Notice */}
          <div className="mt-8 p-4 bg-accent/30 border border-accent rounded-lg">
            <h3 className="font-semibold text-primary mb-2">Important Notice</h3>
            <p className="text-sm text-muted-foreground">
              This is an unofficial tool created to help check availability across multiple dates automatically. 
              It is not affiliated with Hilton Hotels, American Express, or Singapore Airlines KrisFlyer. 
              Please verify all bookings directly with Hilton and ensure you meet all terms and conditions 
              of your voucher before traveling.
            </p>
          </div>
        </div>
      </div>
    </div>;
};
export default Index;