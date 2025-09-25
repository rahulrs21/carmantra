import { Award, Clock, Shield } from 'lucide-react'
import React from 'react'

const TrustIndicator = () => {


    return (
        <div>

            {/* Trust Indicators */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                <div className="flex items-center justify-center space-x-3 animate-float">
                    <div className="w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center">
                        <Shield className="w-6 h-6 text-accent" />
                    </div>
                    <div className="text-left">
                        <div className="text-lg font-semibold text-primary-foreground">5+ Years</div>
                        <div className="text-primary-foreground/70">Experience</div>
                    </div>
                </div>

                <div className="flex items-center justify-center space-x-3 animate-float" style={{ animationDelay: "1s" }}>
                    <div className="w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center">
                        <Award className="w-6 h-6 text-accent" />
                    </div>
                    <div className="text-left">
                        <div className="text-lg font-semibold text-primary-foreground">1000+</div>
                        <div className="text-primary-foreground/70">Happy Customers</div>
                    </div>
                </div>

                <div className="flex items-center justify-center space-x-3 animate-float" style={{ animationDelay: "2s" }}>
                    <div className="w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center">
                        <Clock className="w-6 h-6 text-accent" />
                    </div>
                    <div className="text-left">
                        <div className="text-lg font-semibold text-primary-foreground">24/7</div>
                        <div className="text-primary-foreground/70">Support</div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default TrustIndicator