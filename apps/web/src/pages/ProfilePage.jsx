import { AppHeader } from '../components/AppHeader';
const olive = '#7ea00e';
export function ProfilePage() {
    return (<div className="min-h-screen bg-neutral-50 font-['Inter',sans-serif]">
      <AppHeader />

      <div className="relative">
        <div className="h-40 sm:h-48 w-full" style={{
            background: 'linear-gradient(90deg, #7ea00e 0%, #2d5016 55%, #213502 100%)',
        }}/>
        <div className="max-w-[900px] mx-auto px-4 sm:px-6 -mt-16 relative z-[1] pb-16">
          <div className="flex flex-col sm:flex-row sm:items-end gap-6 sm:gap-8">
            <div className="shrink-0">
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 border-white shadow-lg overflow-hidden bg-white">
                <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=256&q=80" alt="" className="w-full h-full object-cover"/>
              </div>
            </div>
            <div className="flex-1 flex flex-wrap items-start justify-between gap-4 pb-2">
              <div>
                <h1 className="font-['Poppins',sans-serif] font-bold text-2xl text-neutral-900">Olivia Rhye</h1>
                <p className="text-neutral-500 mt-1">olivia@untitledui.com</p>
              </div>
              <div className="flex gap-3">
                <button type="button" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-neutral-200 bg-white text-neutral-700 font-semibold text-sm shadow-sm hover:bg-neutral-50">
                  <span aria-hidden>👤+</span> Share
                </button>
                <button type="button" className="px-4 py-2.5 rounded-xl text-white font-semibold text-sm shadow-sm" style={{ backgroundColor: olive }}>
                  View Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[900px] mx-auto px-4 sm:px-6 -mt-8 pb-20">
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] divide-y md:divide-y-0 md:divide-x divide-neutral-100">
            <div className="p-6 md:p-8 bg-neutral-50/50">
              <h2 className="font-['Poppins',sans-serif] font-bold text-lg text-neutral-900">Personal info</h2>
              <p className="text-sm text-neutral-500 mt-2 leading-relaxed">Update your photo and personal details.</p>
            </div>
            <div className="p-6 md:p-8">
              <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1.5">First name</label>
                    <input defaultValue="Oliva" className="w-full px-4 py-3 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-[rgba(126,160,14,0.25)]"/>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1.5">Last name</label>
                    <input defaultValue="Rhye" className="w-full px-4 py-3 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-[rgba(126,160,14,0.25)]"/>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">Email</label>
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-neutral-200">
                    <span className="text-neutral-400">✉️</span>
                    <input type="email" defaultValue="olivia@untitledui.com" className="flex-1 outline-none bg-transparent"/>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-700 mb-3">Photo</p>
                  <div className="flex flex-wrap items-center gap-4">
                    <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&q=80" alt="" className="w-16 h-16 rounded-full object-cover border-2 border-neutral-200"/>
                    <div className="flex-1 min-w-[200px] rounded-2xl border-2 border-dashed border-neutral-200 px-6 py-8 text-center bg-neutral-50/50">
                      <p className="text-neutral-600 text-sm">
                        <span className="font-semibold" style={{ color: '#6366f1' }}>
                          Click to upload
                        </span>{' '}
                        or drag and drop
                      </p>
                      <p className="text-xs text-neutral-400 mt-1">SVG, PNG, JPG or GIF (max. 800×400px)</p>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100">
                  <button type="button" className="px-5 py-2.5 rounded-xl border border-neutral-200 font-semibold text-neutral-700 hover:bg-neutral-50">
                    Cancel
                  </button>
                  <button type="submit" className="px-5 py-2.5 rounded-xl text-white font-semibold" style={{ backgroundColor: olive }}>
                    Save changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>);
}
