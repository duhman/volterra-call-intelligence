"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Phone } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-medium mb-6">
            <Phone className="h-4 w-4" />
            Sales Call Intelligence
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Sales AI
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Automatic call transcription and HubSpot sync. Save 15+ minutes per call with GDPR-compliant AI summaries.
          </p>
        </div>

        {/* How It Works */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">How It Works</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-semibold text-sm">1</div>
              <div>
                <h3 className="font-semibold text-gray-900">Call Ends</h3>
                <p className="text-gray-600 text-sm">Telavox webhook triggers recording lookup automatically</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-semibold text-sm">2</div>
              <div>
                <h3 className="font-semibold text-gray-900">Consent Request</h3>
                <p className="text-gray-600 text-sm">Slack message sent to sales rep for GDPR-compliant approval</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-semibold text-sm">3</div>
              <div>
                <h3 className="font-semibold text-gray-900">Transcription</h3>
                <p className="text-gray-600 text-sm">ElevenLabs converts audio to text with speaker identification</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-semibold text-sm">4</div>
              <div>
                <h3 className="font-semibold text-gray-900">AI Summary</h3>
                <p className="text-gray-600 text-sm">GPT-4 generates structured summary with sentiment, next steps, and key points</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-semibold text-sm">5</div>
              <div>
                <h3 className="font-semibold text-gray-900">HubSpot Sync</h3>
                <p className="text-gray-600 text-sm">Automatically attached to contact record with full transcript and summary</p>
              </div>
            </div>
          </div>
        </div>

        {/* Use Cases */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Perfect For</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-gray-900">Sales Calls</h3>
                <p className="text-gray-600 text-sm">Capture pricing discussions, objections, and commitments</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-gray-900">Discovery Calls</h3>
                <p className="text-gray-600 text-sm">Document requirements, pain points, and decision makers</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-gray-900">Follow-ups</h3>
                <p className="text-gray-600 text-sm">Track promises made and agreed next steps</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-gray-900">Team Coaching</h3>
                <p className="text-gray-600 text-sm">Review call patterns and improve sales technique</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            View Dashboard
            <ArrowRight className="h-5 w-5" />
          </Link>
          <p className="text-sm text-gray-500 mt-3">
            Access all transcribed calls and analytics
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-gray-500">
          © {new Date().getFullYear()} Volterra · Internal Sales Tool
        </div>
      </footer>
    </div>
  );
}
