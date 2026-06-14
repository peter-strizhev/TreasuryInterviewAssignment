export default function Header() {
  return (
    <header className="bg-white">
      {/* Skip link */}
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:text-gov-navy">
        Skip to main content
      </a>

      {/* Treasury brand bar */}
      <div className="bg-[#0057a8]">
        <div className="mx-auto flex max-w-[1600px] items-center px-4 py-5 sm:px-6 lg:px-8 xl:px-16">
          <a href="https://home.treasury.gov/" target="_blank" rel="noreferrer" className="inline-flex items-center">
            <img
              src="https://home.treasury.gov/themes/custom/hamilton/logo.old.svg"
              alt="U.S. Department of the Treasury"
              className="h-12 w-auto sm:h-16 lg:h-[4.4rem]"
            />
          </a>
        </div>
      </div>
    </header>
  );
}
