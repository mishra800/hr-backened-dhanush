import { Link } from 'react-router-dom';
import logo from '../assets/logo.png';

export default function Welcome() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <img src={logo} alt="Company Logo" className="h-10 w-auto" />
              <span className="ml-3 text-xl font-bold text-gray-900">HR Management System</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/careers"
                className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition duration-150"
              >
                Careers
              </Link>
              <Link
                to="/login"
                className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition duration-150"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition duration-150 shadow-sm"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <div className="inline-block mb-4">
            <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
              🚀 Next-Generation HR Platform
            </span>
          </div>
          <h1 className="text-5xl font-extrabold text-gray-900 sm:text-6xl md:text-7xl leading-tight">
            <span className="block">Transform Your</span>
            <span className="block bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
              HR Operations
            </span>
          </h1>
          <p className="mt-6 max-w-3xl mx-auto text-xl text-gray-600 leading-relaxed">
            Complete HR management solution with AI-powered recruitment, smart attendance, 
            automated payroll, and real-time analytics. Everything you need in one platform.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
            <Link
              to="/signup"
              className="group px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-150 shadow-lg hover:shadow-2xl transform hover:-translate-y-1"
            >
              Get Started
              <span className="ml-2 group-hover:translate-x-1 inline-block transition-transform">→</span>
            </Link>
            <Link
              to="/login"
              className="px-8 py-4 bg-white text-gray-900 border-2 border-gray-300 rounded-xl text-lg font-semibold hover:border-blue-600 hover:text-blue-600 transition-all duration-150 shadow-lg hover:shadow-xl"
            >
              Sign In
            </Link>
          </div>
          
          {/* Trust Badges */}
          <div className="mt-12 flex flex-wrap justify-center items-center gap-8 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <span className="text-green-500 text-xl">✓</span>
              <span>Secure & Compliant</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-500 text-xl">✓</span>
              <span>24/7 Support</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-500 text-xl">✓</span>
              <span>Easy Setup</span>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mt-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Everything You Need to Manage Your Workforce</h2>
            <p className="text-lg text-gray-600">Powerful features designed for modern HR teams</p>
          </div>
          
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Feature 1 */}
            <div className="group bg-white rounded-2xl shadow-md p-8 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100 hover:border-blue-200">
              <div className="flex items-center justify-center h-14 w-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white text-3xl mb-5 group-hover:scale-110 transition-transform">
                🎯
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Smart Recruitment</h3>
              <p className="text-gray-600 leading-relaxed">
                AI-powered candidate screening, resume parsing, and automated interview scheduling with talent intelligence.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group bg-white rounded-2xl shadow-md p-8 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100 hover:border-green-200">
              <div className="flex items-center justify-center h-14 w-14 rounded-xl bg-gradient-to-br from-green-500 to-green-600 text-white text-3xl mb-5 group-hover:scale-110 transition-transform">
                📋
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Digital Onboarding</h3>
              <p className="text-gray-600 leading-relaxed">
                Paperless onboarding with document verification, e-signatures, and automated workflows for seamless experience.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group bg-white rounded-2xl shadow-md p-8 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100 hover:border-purple-200">
              <div className="flex items-center justify-center h-14 w-14 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 text-white text-3xl mb-5 group-hover:scale-110 transition-transform">
                ⏰
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Smart Attendance</h3>
              <p className="text-gray-600 leading-relaxed">
                Face recognition, GPS tracking, and fraud detection for accurate attendance with WFH support.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="group bg-white rounded-2xl shadow-md p-8 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100 hover:border-yellow-200">
              <div className="flex items-center justify-center h-14 w-14 rounded-xl bg-gradient-to-br from-yellow-500 to-yellow-600 text-white text-3xl mb-5 group-hover:scale-110 transition-transform">
                💰
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Automated Payroll</h3>
              <p className="text-gray-600 leading-relaxed">
                Automated salary calculations, tax deductions, and compliance management with detailed reports.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="group bg-white rounded-2xl shadow-md p-8 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100 hover:border-red-200">
              <div className="flex items-center justify-center h-14 w-14 rounded-xl bg-gradient-to-br from-red-500 to-red-600 text-white text-3xl mb-5 group-hover:scale-110 transition-transform">
                📊
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Performance Analytics</h3>
              <p className="text-gray-600 leading-relaxed">
                AI-driven performance reviews, sentiment analysis, and predictive insights for better decisions.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="group bg-white rounded-2xl shadow-md p-8 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100 hover:border-indigo-200">
              <div className="flex items-center justify-center h-14 w-14 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white text-3xl mb-5 group-hover:scale-110 transition-transform">
                🎉
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Employee Engagement</h3>
              <p className="text-gray-600 leading-relaxed">
                Recognition programs, wellness tracking, team activities, and photo galleries to boost morale.
              </p>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="mt-24 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-3xl shadow-2xl p-12 relative overflow-hidden">
          <div className="absolute inset-0 bg-white opacity-5"></div>
          <div className="relative z-10">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-2">Trusted by Organizations Worldwide</h2>
              <p className="text-blue-100">Join thousands of companies transforming their HR operations</p>
            </div>
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-4 text-center">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                <div className="text-5xl font-bold text-white">10K+</div>
                <div className="mt-2 text-blue-100">Active Users</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                <div className="text-5xl font-bold text-white">95%</div>
                <div className="mt-2 text-blue-100">Time Saved</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                <div className="text-5xl font-bold text-white">500+</div>
                <div className="mt-2 text-blue-100">Companies</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                <div className="text-5xl font-bold text-white">24/7</div>
                <div className="mt-2 text-blue-100">Support</div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-24 bg-gradient-to-br from-gray-50 to-blue-50 rounded-3xl p-12 text-center border border-gray-200">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Ready to Transform Your HR Operations?
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Join thousands of companies streamlining their workforce management with our all-in-one platform
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              to="/signup"
              className="group inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-150 shadow-lg hover:shadow-2xl transform hover:-translate-y-1"
            >
              Get Started Now
              <span className="ml-2 group-hover:translate-x-1 inline-block transition-transform">→</span>
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center px-8 py-4 bg-white text-gray-900 border-2 border-gray-300 rounded-xl text-lg font-semibold hover:border-blue-600 hover:text-blue-600 transition-all duration-150 shadow-lg"
            >
              Sign In to Your Account
            </Link>
          </div>
          <p className="mt-6 text-sm text-gray-500">
            No credit card required • Easy setup in minutes • Cancel anytime
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">Product</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white">Features</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Pricing</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Security</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Company</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white">About</a></li>
                <li><Link to="/careers" className="text-gray-400 hover:text-white">Careers</Link></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Contact</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Resources</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white">Documentation</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Help Center</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Blog</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Legal</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white">Privacy</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Terms</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-gray-400">
            <p>&copy; 2024 HR Management System. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
