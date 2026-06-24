import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import logoUrl from "../assets/logo.png";

export default function CookiePolicy() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 z-50 bg-background/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/">
            <a className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <img src={logoUrl} alt="AffiliateXchange Logo" className="h-8 w-8 rounded-md object-cover" />
              <span className="text-xl font-bold">AFFEXCH</span>
            </a>
          </Link>
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-4">Cookie Policy</h1>
            <p className="text-muted-foreground">
              Last Updated: January 19, 2026
            </p>
          </div>

          <Card>
            <CardContent className="p-6 sm:p-8 space-y-8 prose prose-slate dark:prose-invert max-w-none">
              <section>
                <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
                <p>
                  This Cookie Policy explains how AffiliateXchange ("we," "our," or "us") uses cookies and similar tracking technologies when you visit our website and use our affiliate marketing platform. This policy provides you with clear and comprehensive information about the cookies we use and the purposes for using them.
                </p>
                <p>
                  By continuing to use our Services, you consent to the use of cookies as described in this policy. You can manage your cookie preferences at any time through our cookie consent banner or your browser settings.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">2. What Are Cookies?</h2>
                <p>
                  Cookies are small text files that are stored on your device (computer, tablet, or mobile phone) when you visit a website. They are widely used to make websites work more efficiently, provide a better user experience, and give website owners useful information about how their site is being used.
                </p>
                <p>
                  Cookies can be "persistent" or "session" cookies:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Session Cookies:</strong> These are temporary cookies that expire when you close your browser. They are used to maintain your session while you navigate through the website.</li>
                  <li><strong>Persistent Cookies:</strong> These cookies remain on your device for a set period or until you delete them. They are used to remember your preferences and settings for future visits.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">3. Types of Cookies We Use</h2>

                <h3 className="text-xl font-semibold mb-3">3.1 Essential Cookies (Required)</h3>
                <p>These cookies are necessary for the website to function properly and cannot be disabled. They include:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Authentication Cookies:</strong> Used to identify you when you log in and maintain your session throughout your visit</li>
                  <li><strong>Security Cookies:</strong> Help protect against cross-site request forgery (CSRF) attacks and other security threats</li>
                  <li><strong>Load Balancing Cookies:</strong> Ensure optimal server performance by distributing traffic across multiple servers</li>
                  <li><strong>Cookie Consent Cookie:</strong> Remembers your cookie preferences so we don't ask you repeatedly</li>
                </ul>
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <p className="text-sm"><strong>Examples:</strong></p>
                  <ul className="text-sm list-disc pl-6 space-y-1 mt-2">
                    <li><code>session_id</code> - Maintains your login session (expires: end of session)</li>
                    <li><code>csrf_token</code> - Security token for form submissions (expires: end of session)</li>
                    <li><code>cookie_consent</code> - Stores your cookie preferences (expires: 1 year)</li>
                  </ul>
                </div>

                <h3 className="text-xl font-semibold mb-3 mt-6">3.2 Functional Cookies</h3>
                <p>These cookies enable enhanced functionality and personalization:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Preference Cookies:</strong> Remember your language, theme (light/dark mode), and display preferences</li>
                  <li><strong>Dashboard Settings:</strong> Save your preferred dashboard layout and filter settings</li>
                  <li><strong>Recently Viewed:</strong> Track offers and creators you've recently viewed for quick access</li>
                </ul>
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <p className="text-sm"><strong>Examples:</strong></p>
                  <ul className="text-sm list-disc pl-6 space-y-1 mt-2">
                    <li><code>theme_preference</code> - Stores your theme preference (expires: 1 year)</li>
                    <li><code>dashboard_layout</code> - Remembers your dashboard configuration (expires: 1 year)</li>
                    <li><code>recent_offers</code> - Tracks recently viewed offers (expires: 30 days)</li>
                  </ul>
                </div>

                <h3 className="text-xl font-semibold mb-3 mt-6">3.3 Analytics Cookies</h3>
                <p>These cookies help us understand how visitors interact with our website:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Google Analytics:</strong> Collects anonymous data about page views, session duration, and user flows</li>
                  <li><strong>Performance Monitoring:</strong> Tracks page load times and identifies performance issues</li>
                  <li><strong>Feature Usage:</strong> Helps us understand which features are most popular and how they're used</li>
                </ul>
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <p className="text-sm"><strong>Examples:</strong></p>
                  <ul className="text-sm list-disc pl-6 space-y-1 mt-2">
                    <li><code>_ga</code> - Google Analytics identifier (expires: 2 years)</li>
                    <li><code>_gid</code> - Google Analytics session identifier (expires: 24 hours)</li>
                    <li><code>_gat</code> - Google Analytics throttling (expires: 1 minute)</li>
                  </ul>
                </div>

                <h3 className="text-xl font-semibold mb-3 mt-6">3.4 Affiliate Tracking Cookies</h3>
                <p>As an affiliate marketing platform, we use specialized cookies to track affiliate activities:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Click Tracking:</strong> Records when a user clicks on an affiliate link to attribute conversions correctly</li>
                  <li><strong>Conversion Attribution:</strong> Tracks purchases and sign-ups to credit the appropriate affiliate</li>
                  <li><strong>Commission Calculation:</strong> Ensures accurate commission payouts to creators</li>
                </ul>
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <p className="text-sm"><strong>Examples:</strong></p>
                  <ul className="text-sm list-disc pl-6 space-y-1 mt-2">
                    <li><code>aff_click_id</code> - Unique click identifier for tracking (expires: 30 days)</li>
                    <li><code>aff_ref</code> - Affiliate reference code (expires: 30 days)</li>
                    <li><code>aff_campaign</code> - Campaign identifier for attribution (expires: 30 days)</li>
                  </ul>
                </div>
                <p className="mt-4 text-sm text-muted-foreground">
                  <strong>Note:</strong> Affiliate tracking cookies are essential for the core functionality of our platform. Disabling these cookies may prevent accurate commission attribution for creators.
                </p>

                <h3 className="text-xl font-semibold mb-3 mt-6">3.5 Marketing Cookies (Optional)</h3>
                <p>These cookies are used for marketing purposes and are only set with your explicit consent:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Retargeting Cookies:</strong> Show you relevant ads on other websites based on your activity on our platform</li>
                  <li><strong>Social Media Cookies:</strong> Enable sharing features and track interactions with social media content</li>
                  <li><strong>Advertising Cookies:</strong> Help measure the effectiveness of our advertising campaigns</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">4. Third-Party Cookies</h2>
                <p>
                  Some cookies are placed by third-party services that appear on our pages. We do not control these cookies and encourage you to review their privacy policies:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Google Analytics:</strong> <a href="https://policies.google.com/privacy" className="text-primary hover:underline">Privacy Policy</a></li>
                  <li><strong>Stripe (Payment Processing):</strong> <a href="https://stripe.com/privacy" className="text-primary hover:underline">Privacy Policy</a></li>
                  <li><strong>Cloudinary (Media Hosting):</strong> <a href="https://cloudinary.com/privacy" className="text-primary hover:underline">Privacy Policy</a></li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">5. Managing Your Cookie Preferences</h2>

                <h3 className="text-xl font-semibold mb-3">5.1 Cookie Consent Banner</h3>
                <p>
                  When you first visit our website, you'll see a cookie consent banner that allows you to:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Accept all cookies</li>
                  <li>Accept only essential cookies</li>
                  <li>Customize your preferences for each cookie category</li>
                </ul>

                <h3 className="text-xl font-semibold mb-3 mt-6">5.2 Browser Settings</h3>
                <p>
                  You can also control cookies through your browser settings. Most browsers allow you to:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>View what cookies are stored on your device</li>
                  <li>Delete all or specific cookies</li>
                  <li>Block all cookies or only third-party cookies</li>
                  <li>Set preferences for specific websites</li>
                </ul>
                <p className="mt-4">Here are links to cookie management instructions for popular browsers:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><a href="https://support.google.com/chrome/answer/95647" className="text-primary hover:underline">Google Chrome</a></li>
                  <li><a href="https://support.mozilla.org/en-US/kb/enhanced-tracking-protection-firefox-desktop" className="text-primary hover:underline">Mozilla Firefox</a></li>
                  <li><a href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac" className="text-primary hover:underline">Safari</a></li>
                  <li><a href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" className="text-primary hover:underline">Microsoft Edge</a></li>
                </ul>

                <h3 className="text-xl font-semibold mb-3 mt-6">5.3 Opt-Out Tools</h3>
                <p>You can opt out of specific tracking technologies:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Google Analytics Opt-out:</strong> <a href="https://tools.google.com/dlpage/gaoptout" className="text-primary hover:underline">Browser Add-on</a></li>
                  <li><strong>Network Advertising Initiative:</strong> <a href="https://optout.networkadvertising.org/" className="text-primary hover:underline">NAI Opt-out Tool</a></li>
                  <li><strong>Digital Advertising Alliance:</strong> <a href="https://optout.aboutads.info/" className="text-primary hover:underline">DAA Opt-out Tool</a></li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">6. Impact of Disabling Cookies</h2>
                <p>
                  Please be aware that disabling certain cookies may impact your experience on our platform:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Essential Cookies:</strong> Disabling these will prevent you from logging in and using our Services</li>
                  <li><strong>Functional Cookies:</strong> Your preferences won't be saved between sessions</li>
                  <li><strong>Analytics Cookies:</strong> We won't be able to improve our Services based on usage patterns</li>
                  <li><strong>Affiliate Tracking Cookies:</strong> Creators may not receive accurate commission attribution for conversions they generate</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">7. Similar Technologies</h2>
                <p>
                  In addition to cookies, we may use other similar technologies:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Local Storage:</strong> Stores data in your browser that persists even after you close the browser window. Used for caching and improving performance.</li>
                  <li><strong>Session Storage:</strong> Similar to local storage but data is cleared when the browser tab is closed. Used for temporary data during your session.</li>
                  <li><strong>Web Beacons (Pixel Tags):</strong> Small transparent images used in emails and web pages to track opens and clicks.</li>
                  <li><strong>Fingerprinting:</strong> We do NOT use browser fingerprinting to track users.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">8. Cookie Retention Periods</h2>
                <p>
                  Different cookies have different retention periods:
                </p>
                <div className="overflow-x-auto mt-4">
                  <table className="min-w-full border-collapse border border-border">
                    <thead>
                      <tr className="bg-muted">
                        <th className="border border-border px-4 py-2 text-left">Cookie Type</th>
                        <th className="border border-border px-4 py-2 text-left">Retention Period</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-border px-4 py-2">Session Cookies</td>
                        <td className="border border-border px-4 py-2">End of browser session</td>
                      </tr>
                      <tr>
                        <td className="border border-border px-4 py-2">Authentication Cookies</td>
                        <td className="border border-border px-4 py-2">7 days (or until logout)</td>
                      </tr>
                      <tr>
                        <td className="border border-border px-4 py-2">Preference Cookies</td>
                        <td className="border border-border px-4 py-2">1 year</td>
                      </tr>
                      <tr>
                        <td className="border border-border px-4 py-2">Analytics Cookies</td>
                        <td className="border border-border px-4 py-2">Up to 2 years</td>
                      </tr>
                      <tr>
                        <td className="border border-border px-4 py-2">Affiliate Tracking Cookies</td>
                        <td className="border border-border px-4 py-2">30 days</td>
                      </tr>
                      <tr>
                        <td className="border border-border px-4 py-2">Marketing Cookies</td>
                        <td className="border border-border px-4 py-2">Up to 1 year</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">9. Updates to This Policy</h2>
                <p>
                  We may update this Cookie Policy from time to time to reflect changes in our practices or for legal, operational, or regulatory reasons. We will notify you of any material changes by:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Posting the updated policy on this page</li>
                  <li>Updating the "Last Updated" date at the top of this policy</li>
                  <li>Displaying a notice on our website for significant changes</li>
                </ul>
                <p className="mt-4">
                  We encourage you to review this policy periodically to stay informed about how we use cookies.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">10. Contact Us</h2>
                <p>
                  If you have any questions about our use of cookies or this Cookie Policy, please contact us:
                </p>
                <div className="mt-4 space-y-2">
                  <p><strong>Email:</strong> privacy@affiliatexchange.com</p>
                  <p><strong>Support:</strong> support@affiliatexchange.com</p>
                  <p><strong>Mailing Address:</strong> 123 Commerce Street, Suite 400, San Francisco, CA 94102, United States</p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">11. Related Policies</h2>
                <p>
                  For more information about how we handle your data, please refer to our other policies:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><Link href="/privacy-policy"><a className="text-primary hover:underline">Privacy Policy</a></Link> - Details on how we collect, use, and protect your personal information</li>
                  <li><Link href="/terms-of-service"><a className="text-primary hover:underline">Terms of Service</a></Link> - The terms governing your use of our platform</li>
                </ul>
              </section>

              <div className="mt-12 pt-8 border-t">
                <p className="text-sm text-muted-foreground text-center">
                  By using AffiliateXchange, you acknowledge that you have read and understood this Cookie Policy.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-12 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <img src={logoUrl} alt="AffiliateXchange Logo" className="h-8 w-8 rounded-md object-cover" />
              <span className="font-bold">AFFEXCH</span>
            </div>
            <div className="flex gap-6 text-sm">
              <Link href="/privacy-policy">
                <a className="text-muted-foreground hover:text-foreground transition-colors">
                  Privacy Policy
                </a>
              </Link>
              <Link href="/terms-of-service">
                <a className="text-muted-foreground hover:text-foreground transition-colors">
                  Terms of Service
                </a>
              </Link>
              <Link href="/cookie-policy">
                <a className="text-muted-foreground hover:text-foreground transition-colors">
                  Cookie Policy
                </a>
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 AffiliateXchange. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
