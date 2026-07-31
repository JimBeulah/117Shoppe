import Link from "next/link"

const footerLinks = {
  "Customer Service": ["Help Center", "How to Buy", "Returns & Refunds", "Contact Us"],
  "About 11/7 Shoppe": ["About Us", "Careers", "Blog", "Privacy Policy", "Terms of Service"],
  "Payment & Shipping": ["GCash", "Maya", "Credit Card", "J&T Express", "Ninja Van"],
  "Follow Us": ["Facebook", "Instagram", "TikTok", "YouTube"],
}

export function Footer() {
  return (
    <footer className="bg-white border-t border-border mt-8">
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {Object.entries(footerLinks).map(([heading, links]) => (
            <div key={heading}>
              <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wide mb-3">{heading}</h3>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link}>
                    <Link href="#" className="text-xs text-text-secondary hover:text-brand-600 transition-colors">
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-8 pt-6 border-t border-border flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-xs text-text-secondary">© 2026 11/7 Shoppe. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="text-xs text-text-secondary">Country & Region:</span>
            <span className="text-xs font-medium text-text-primary">🇵🇭 Philippines</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
