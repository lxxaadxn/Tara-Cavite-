import { Link } from 'react-router-dom';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-white/95 backdrop-blur">
        <Link to="/" className="flex items-center">
          <img src="/images/cavitour-logo.png" alt="CaviTour" className="h-9 w-auto" />
        </Link>
        <nav className="flex items-center gap-6">
          <Link to="/login" className="text-gray-700 hover:text-gray-900">
            Log In
          </Link>
          <Link
            to="/signup"
            className="px-5 py-2.5 rounded-lg bg-[var(--cavitour-green)] text-white font-medium hover:bg-[var(--cavitour-green-dark)]"
          >
            Sign Up
          </Link>
        </nav>
      </header>

      {/* Slide 1: Hero */}
      <section className="min-h-screen flex flex-col md:flex-row items-center justify-between px-6 pt-24 pb-12 max-w-7xl mx-auto gap-12">
        <div className="flex-1 max-w-xl">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Your Guide to Exploring{' '}
            <span className="text-[var(--cavitour-green)]">Cavite</span>
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Your go to tourist guide for discovering Cavite's{' '}
            <strong>destinations</strong>, routes, food spots, and hidden gems all in one app.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              to="/login"
              className="px-6 py-3 rounded-xl bg-[var(--cavitour-green)] text-white font-semibold hover:bg-[var(--cavitour-green-dark)]"
            >
              Start Exploring
            </Link>
            <a
              href="#"
              className="px-6 py-3 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
            >
              Download the App
            </a>
          </div>
        </div>
        <div className="flex-1 relative flex justify-center items-center">
          <div className="relative w-full max-w-md">
            <div className="aspect-[4/3] rounded-3xl overflow-hidden bg-gray-100 shadow-xl">
              <img
                src="https://images.unsplash.com/photo-1585155770424-fb0291a69c43?w=800&q=80"
                alt="Cavite"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/90 rounded-full blur-sm" />
          </div>
        </div>
      </section>

      {/* Slide 2: Features */}
      <section className="min-h-screen py-20 px-6 bg-[#e8f5e9]">
        <div className="max-w-6xl mx-auto">
          <p className="text-sm font-medium text-gray-600 uppercase tracking-wider mb-2">Features</p>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-16 max-w-2xl">
            Discover, navigate, and plan your Cavite adventure all in one place.
          </h2>
          <div className="grid md:grid-cols-2 gap-12 relative">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[var(--cavitour-green)] flex items-center justify-center text-white text-2xl">
                📍
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Comprehensive Directory</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  The application provides a comprehensive directory of tourist destinations
                  categorized by city or municipality and type of attraction. Each destination
                  includes descriptions, photos, operating hours, and entrance fees.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[var(--cavitour-teal)] flex items-center justify-center text-white text-2xl">
                🗺️
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Integrated Map</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  An integrated map allows users to view the exact locations of tourist spots and
                  access navigation directions from their current location, improving overall
                  accessibility.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[var(--cavitour-teal)] flex items-center justify-center text-white text-2xl">
                🔍
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Search & Filter</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Users can search and filter destinations based on location, category, or popularity,
                  save favorite places, and create simple travel itineraries for personalized
                  planning.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[var(--cavitour-teal)] flex items-center justify-center text-white text-2xl">
                🚌
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Transportation Guide</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  The application includes a transportation guide for jeepneys, buses, and vans, with
                  routes and estimated travel times when traveling within the province.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Slide 3: Destinations */}
      <section className="min-h-screen py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-16">
            <span className="text-[var(--cavitour-green)]">Destinations</span> waiting for you
          </h2>
          <div className="space-y-20">
            <div className="flex flex-col md:flex-row gap-8 items-center">
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Tagaytay</h3>
                <p className="text-gray-600">
                  A majestic volcanic island nestled within Taal Lake, offering breathtaking views
                  and a unique trekking experience just a short drive from Tagaytay.
                </p>
              </div>
              <div className="flex-1 rounded-2xl overflow-hidden shadow-lg aspect-video max-w-lg">
                <img
                  src="https://images.unsplash.com/photo-1585155770424-fb0291a69c43?w=600&q=80"
                  alt="Tagaytay"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div className="flex flex-col md:flex-row-reverse gap-8 items-center">
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Silang</h3>
                <p className="text-gray-600">
                  A charming spot in Silang, surrounded by vibrant flower gardens and scenic
                  landscapes perfect for nature lovers, photo ops, and relaxing strolls.
                </p>
              </div>
              <div className="flex-1 rounded-2xl overflow-hidden shadow-lg aspect-video max-w-lg">
                <img
                  src="https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&q=80"
                  alt="Silang"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div className="flex flex-col md:flex-row gap-8 items-center">
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Maragondon</h3>
                <p className="text-gray-600">
                  A quiet coastal escape in Maragondon, ideal for swimming, picnics, and enjoying
                  serene seaside sunsets away from the crowds.
                </p>
              </div>
              <div className="flex-1 rounded-2xl overflow-hidden shadow-lg aspect-video max-w-lg">
                <img
                  src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80"
                  alt="Maragondon"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="py-8 px-6 text-center text-gray-500 text-sm">
        © CaviTour 2026
      </footer>
    </div>
  );
}
