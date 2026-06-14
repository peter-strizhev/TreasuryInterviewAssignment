export default function Footer() {
  const links = [
    {
      heading: 'Bureaus',
      links: [
        { label: 'Alcohol and Tobacco Tax and Trade (TTB)', href: 'http://www.ttb.gov/' },
        { label: 'Bureau of Engraving and Printing (BEP)', href: 'https://www.bep.gov/' },
        { label: 'Bureau of the Fiscal Service (BFS)', href: 'http://www.fiscal.treasury.gov/' },
        { label: 'Financial Crimes Enforcement Network (FinCEN)', href: 'http://www.fincen.gov/' },
        { label: 'Internal Revenue Service (IRS)', href: 'http://www.irs.gov/' },
        { label: 'Office of the Comptroller of the Currency (OCC)', href: 'http://www.occ.gov/' },
        { label: 'U.S. Mint', href: 'http://www.usmint.gov/' },
      ],
    },
    {
      heading: 'Inspector General Sites',
      links: [
        { label: 'Office of Inspector General (OIG)', href: 'https://oig.treasury.gov/' },
        { label: 'Treasury Inspector General for Tax Administration (TIGTA)', href: 'http://www.treasury.gov/tigta' },
        { label: 'Report Scams, Fraud, Waste & Abuse', href: 'https://home.treasury.gov/services/report-fraud-waste-and-abuse' },
        { label: 'Special Inspector General for Pandemic Recovery (SIGPR)', href: 'https://www.sigpr.gov/' },
      ],
    },
    {
      heading: 'U.S. Government Shared Services',
      links: [
        { label: 'Center for Financial Management', href: 'https://fiscal.treasury.gov/financial-management-solutions/financial-management-shared-services' },
        { label: 'Treasury Direct Services for Governments', href: 'https://www.treasurydirect.gov/government/' },
        { label: 'Financial Management (FM) Marketplace Catalog', href: 'https://tfx.treasury.gov/fmqsmo/marketplace-catalog' },
      ],
    },
    {
      heading: 'Additional Resources',
      links: [
        { label: 'Privacy Act', href: 'https://home.treasury.gov/footer/privacy-act' },
        { label: 'Small Business Contacts', href: 'https://home.treasury.gov/policy-issues/small-business-programs/small-and-disadvantaged-business-utilization/how-to-contact-us' },
        { label: 'Budget and Performance', href: 'https://home.treasury.gov/about/budget-financial-reporting-planning-and-performance' },
        { label: 'TreasuryDirect.gov Securities/Bonds', href: 'http://www.treasurydirect.gov/' },
        { label: 'Freedom of Information Act (FOIA)', href: 'https://home.treasury.gov/footer/freedom-of-information-act' },
        { label: 'No FEAR Act Data', href: 'https://home.treasury.gov/footer/no-fear-act' },
        { label: 'Whistleblower Protection', href: 'https://home.treasury.gov/footer/prohibited-personnel-practices-and-whistleblower-protection' },
      ],
    },
    {
      heading: 'Other Government Sites',
      links: [
        { label: 'USA.gov', href: 'http://www.usa.gov/' },
        { label: 'USAJOBS.gov', href: 'http://www.usajobs.gov/' },
        { label: 'OPM.gov', href: 'http://www.opm.gov/' },
        { label: 'MyMoney.gov', href: 'http://www.mymoney.gov/' },
        { label: 'Data.gov', href: 'http://www.data.gov/' },
        { label: 'Forms.gov', href: 'https://www.usa.gov/forms' },
        { label: 'Regulations.gov', href: 'http://www.regulations.gov/' },
        { label: 'PaymentAccuracy.gov', href: 'http://www.paymentaccuracy.gov/' },
        { label: 'my Social Security', href: 'http://www.socialsecurity.gov/myaccount/' },
        { label: 'Vote.gov', href: 'https://vote.gov/' },
      ],
    },
  ];

  const subfooterLinks = [
    { label: 'Privacy Policy', href: 'https://home.treasury.gov/subfooter/privacy-policy' },
    { label: 'Google Privacy', href: 'https://home.treasury.gov/subfooter/google-privacy-policy' },
    { label: 'Site Policies and Notices', href: 'https://home.treasury.gov/subfooter/site-policies-and-notices' },
    { label: 'FAQs', href: 'https://home.treasury.gov/faqs' },
    { label: 'Feedback', href: 'https://www.treasury.gov/pages/tgovproblemsfeedbackform.aspx' },
    { label: 'Careers', href: 'https://home.treasury.gov/careers' },
    { label: 'Accessibility', href: 'https://home.treasury.gov/utility/accessibility' },
    { label: 'Contact', href: 'https://home.treasury.gov/utility/contact' },
  ];

  return (
    <footer className="mt-16 bg-[#202d3d] text-white">
      {/* Footer links */}
      <div className="relative border-t border-[#202d3d] pt-16">
        <div className="absolute inset-x-0 -top-14 flex justify-center">
          <div className="rounded-full bg-white p-1 shadow-[0_4px_16px_rgba(0,0,0,0.18)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://home.treasury.gov/themes/custom/hamilton/sass/components/footer/seal.png"
              alt="Seal of the U.S. Department of the Treasury"
              className="h-24 w-24 rounded-full object-cover"
            />
          </div>
        </div>

        <div className="mx-auto max-w-[1600px] px-8 pb-14 pt-4 sm:px-10 lg:px-12 xl:px-16">
          <div className="grid gap-x-10 gap-y-8 md:grid-cols-2 xl:grid-cols-5">
            {links.map((group) => (
              <div key={group.heading}>
                <h2 className="text-[0.88rem] font-bold uppercase leading-6 tracking-[0.01em] text-white">
                  {group.heading}
                </h2>
                <ul className="mt-2.5 space-y-2 text-[0.87rem] leading-6 text-slate-200">
                  {group.links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noreferrer"
                        className="underline decoration-[0.5px] underline-offset-2 transition-colors hover:text-white"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer meta */}
      <div className="bg-[#111c29]">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-6 px-8 py-8 sm:px-10 lg:flex-row lg:items-end lg:justify-between lg:px-12 xl:px-16">
          <div>
            <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5 text-[0.82rem] text-slate-200">
              {subfooterLinks.map((link, index) => (
                <span key={link.label} className="flex items-center gap-1 leading-4">
                  <a href={link.href} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-white">
                    {link.label}
                  </a>
                  {index < subfooterLinks.length - 1 && <span className="text-slate-500">•</span>}
                </span>
              ))}
            </div>

            <p className="mt-3 max-w-4xl text-[0.72rem] leading-5 text-slate-300">
              Disclaimer: This is an independent interview project and prototype. It is not an official U.S. Department of the Treasury or U.S. government website, is not affiliated with the government, and is provided solely for evaluation purposes.
            </p>
          </div>

          <div className="flex items-center gap-4 self-end lg:self-auto">
            <a
              href="https://twitter.com/USTreasury"
              target="_blank"
              rel="noreferrer"
              aria-label="Treasury on X"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-300 text-white transition-colors hover:bg-white/10"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
                <path d="M18.901 1.153h3.68l-8.039 9.188L24 22.847h-7.406l-5.8-7.584-6.639 7.584H.474l8.598-9.826L0 1.153h7.594l5.243 6.932 6.064-6.932Zm-1.291 19.492h2.039L6.486 3.24H4.298L17.61 20.645Z" />
              </svg>
            </a>
            <a
              href="https://www.facebook.com/USTreasuryDept"
              target="_blank"
              rel="noreferrer"
              aria-label="Treasury on Facebook"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-300 text-white transition-colors hover:bg-white/10"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4.5 w-4.5 fill-current">
                <path d="M13.5 21v-7.2h2.43l.364-2.805H13.5V9.204c0-.812.226-1.365 1.39-1.365h1.484V5.33c-.257-.034-1.14-.11-2.166-.11-2.142 0-3.608 1.308-3.608 3.71v2.065H8.172V13.8H10.6V21h2.9Z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
