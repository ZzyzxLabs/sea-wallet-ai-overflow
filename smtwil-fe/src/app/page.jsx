export default function Home() {
  return (
    <main className="flex min-h-screen flex-col bg-white">
      {/* Hero Section */}
      <section className="relative py-24 px-6 rounded-3xl mx-4 mt-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
            <span className="block">智能遺產分配平台</span>
            <span className="block text-sky-500">讓遺產規劃更智能、更安心</span>
          </h1>
          <p className="mt-6 max-w-lg mx-auto text-xl text-gray-500">
            透過區塊鏈技術和智能合約，為您的財產傳承提供安全、透明、高效的現代化解決方案。
          </p>
          <div className="mt-10 flex justify-center">
            <div className="inline-flex rounded-full shadow">
              <a href="/contract" className="px-8 py-3 border border-transparent text-base font-medium rounded-full text-white bg-sky-400 hover:bg-sky-500 transition-colors">
                立即體驗
              </a>
            </div>
            <div className="ml-3 inline-flex rounded-full shadow">
              <a href="#features" className="px-8 py-3 border border-transparent text-base font-medium rounded-full text-sky-600 bg-white hover:bg-gray-50 transition-colors">
                瞭解更多
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white" id="features">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">智能合約遺產規劃的優勢</h2>
            <p className="mt-4 text-lg text-gray-500">
              結合區塊鏈技術與法律專業知識，提供前所未有的遺產規劃體驗
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            <div className="bg-sky-50 p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-full bg-sky-400 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900">安全可靠</h3>
              <p className="mt-2 text-gray-600">
                區塊鏈技術確保您的遺產分配計畫不可篡改，智能合約執行無需第三方介入，降低爭議風險。
              </p>
            </div>

            <div className="bg-orange-100 p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-full bg-orange-300 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900">高效便捷</h3>
              <p className="mt-2 text-gray-600">
                自動化執行遺產分配，無需繁瑣的行政程序，節省時間和費用，讓繼承人迅速獲得應得財產。
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-full bg-sky-400 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900">透明可信</h3>
              <p className="mt-2 text-gray-600">
                所有交易記錄永久保存在區塊鏈上，可隨時查詢驗證，確保遺產分配過程公開透明。
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}