'use client';

import { Sparkles, ArrowRight } from 'lucide-react';

interface WelcomeScreenProps {
    onStartTour: () => void;
}

export function WelcomeScreen({ onStartTour }: WelcomeScreenProps) {
    return (
        <div className="fixed inset-0 bg-gradient-to-br from-background to-background/95 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="animate-fade-in">
                <div className="text-center max-w-2xl mx-auto px-6">
                    {/* Logo/Icon */}
                    <div className="mb-8 flex justify-center">
                        <div className="relative inline-block">
                            <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse"></div>
                            <div className="relative bg-primary/10 rounded-full p-6 border border-primary/20">
                                <Sparkles className="h-12 w-12 text-primary" />
                            </div>
                        </div>
                    </div>

                    {/* Welcome Text */}
                    <h1 className="text-4xl font-bold mb-4 animate-slide-up" style={{ animationDelay: '100ms' }}>
                        Welcome to <span className="text-primary">Miller3</span>
                    </h1>

                    <p className="text-lg text-muted-foreground mb-8 animate-slide-up" style={{ animationDelay: '200ms' }}>
                        Discover companies with precision. Search, filter, and export with ease. Let's get you started with a quick tour of the platform.
                    </p>

                    {/* Features Grid */}
                    <div className="grid grid-cols-3 gap-4 mb-12 animate-slide-up" style={{ animationDelay: '300ms' }}>
                        <div className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors">
                            <div className="text-2xl mb-2">🔍</div>
                            <p className="text-sm font-medium">Smart Search</p>
                            <p className="text-xs text-muted-foreground mt-1">Filter companies precisely</p>
                        </div>
                        <div className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors">
                            <div className="text-2xl mb-2">✨</div>
                            <p className="text-sm font-medium">AI Search</p>
                            <p className="text-xs text-muted-foreground mt-1">Ask in plain English</p>
                        </div>
                        <div className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors">
                            <div className="text-2xl mb-2">📈</div>
                            <p className="text-sm font-medium">Enrichment</p>
                            <p className="text-xs text-muted-foreground mt-1">Enrich your data</p>
                        </div>
                    </div>

                    {/* CTA Button */}
                    <button
                        onClick={onStartTour}
                        className="animate-slide-up inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors active:scale-[0.98]"
                        style={{ animationDelay: '400ms' }}
                    >
                        Start Guided Tour
                        <ArrowRight className="h-5 w-5" />
                    </button>

                    {/* Footer Text */}
                    {/* <p className="text-xs text-muted-foreground mt-6 animate-fade-in" style={{ animationDelay: '500ms' }}>
                        You can skip this tour anytime and explore on your own
                    </p> */}
                </div>
            </div>

            {/* Add animations to global CSS */}
            <style jsx>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .animate-slide-up {
          animation: slide-up 0.6s ease-out forwards;
          opacity: 0;
        }

        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
        }

        .text-gradient {
          background: linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
      `}</style>
        </div>
    );
}