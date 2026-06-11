import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import logoUrl from "../assets/logo.png";

export default function TermsOfService() {
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
            <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
            <p className="text-muted-foreground">
              Last Updated: December 5, 2025
            </p>
          </div>

          <Card>
            <CardContent className="p-6 sm:p-8 space-y-8 prose prose-slate dark:prose-invert max-w-none">
              <section>
                <h2 className="text-2xl font-semibold mb-4">1. Agreement to Terms</h2>
                <p>
                  Welcome to AffiliateXchange ("Company," "we," "our," or "us"). These Terms of Service ("Terms") govern your access to and use of our marketplace platform, including our website, mobile application, and related services (collectively, the "Services").
                </p>
                <p>
                  By accessing or using our Services, you agree to be bound by these Terms and our Privacy Policy. If you do not agree to these Terms, you may not access or use our Services.
                </p>
                <p>
                  <strong>IMPORTANT:</strong> These Terms contain an arbitration clause and class action waiver that affects your rights. Please read Section 18 carefully.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">2. Definitions</h2>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>"Creator"</strong> means a content creator, influencer, or affiliate marketer using our Services to find and promote brand offers.</li>
                  <li><strong>"Company"</strong> or <strong>"Brand"</strong> means a business entity offering affiliate marketing opportunities or retainer contracts through our Services.</li>
                  <li><strong>"Offer"</strong> means an affiliate marketing opportunity posted by a Brand on our platform.</li>
                  <li><strong>"Retainer"</strong> means a monthly contract between a Creator and a Brand for ongoing promotional services.</li>
                  <li><strong>"Application"</strong> means a Creator's request to participate in a Brand's Offer or Retainer.</li>
                  <li><strong>"Commission"</strong> means the payment earned by a Creator for successful conversions or retainer services.</li>
                  <li><strong>"User"</strong> means any person who accesses or uses our Services, including Creators and Brands.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">3. Eligibility</h2>
                <p>To use our Services, you must:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Be at least 18 years of age or the age of majority in your jurisdiction</li>
                  <li>Have the legal capacity to enter into binding contracts</li>
                  <li>Not be prohibited from using our Services under applicable laws</li>
                  <li>Provide accurate, current, and complete information during registration</li>
                  <li>Maintain the security of your account credentials</li>
                  <li>Comply with all applicable laws and regulations</li>
                </ul>
                <p className="mt-4">
                  If you are using our Services on behalf of a business entity, you represent that you have the authority to bind that entity to these Terms.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">4. Account Registration</h2>

                <h3 className="text-xl font-semibold mb-3">4.1 Account Creation</h3>
                <p>To access certain features, you must create an account. You agree to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Provide accurate, truthful, and complete information</li>
                  <li>Maintain and update your information to keep it current</li>
                  <li>Keep your password secure and confidential</li>
                  <li>Notify us immediately of any unauthorized access</li>
                  <li>Be responsible for all activities under your account</li>
                </ul>

                <h3 className="text-xl font-semibold mb-3 mt-6">4.2 Account Types</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Creator Account:</strong> For individuals promoting brand offers and earning commissions</li>
                  <li><strong>Brand Account:</strong> For businesses posting offers and hiring creators</li>
                  <li><strong>Admin Account:</strong> For platform administrators (by invitation only)</li>
                </ul>

                <h3 className="text-xl font-semibold mb-3 mt-6">4.3 Account Verification</h3>
                <p>
                  We may require identity verification, business verification, or additional documentation before approving certain features (e.g., payment processing, premium listings).
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">5. User Conduct</h2>

                <h3 className="text-xl font-semibold mb-3">5.1 Prohibited Activities</h3>
                <p>You agree NOT to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Violate any laws, regulations, or third-party rights</li>
                  <li>Impersonate any person or entity, or misrepresent your affiliation</li>
                  <li>Post false, misleading, or fraudulent information</li>
                  <li>Engage in spam, phishing, or unsolicited marketing</li>
                  <li>Upload malware, viruses, or harmful code</li>
                  <li>Attempt to gain unauthorized access to our systems</li>
                  <li>Scrape, crawl, or use automated tools without permission</li>
                  <li>Manipulate tracking links, clicks, or conversions</li>
                  <li>Create fake accounts or use multiple accounts to circumvent restrictions</li>
                  <li>Harass, abuse, or threaten other users</li>
                  <li>Post offensive, discriminatory, or inappropriate content</li>
                  <li>Infringe on intellectual property rights</li>
                  <li>Interfere with the proper functioning of our Services</li>
                </ul>

                <h3 className="text-xl font-semibold mb-3 mt-6">5.2 Creator-Specific Obligations</h3>
                <p>Creators must:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Comply with FTC disclosure guidelines and advertise relationships clearly</li>
                  <li>Use tracking links properly and not manipulate clicks or conversions</li>
                  <li>Accurately represent products and services in promotions</li>
                  <li>Not engage in cookie stuffing, ad fraud, or trademark bidding</li>
                  <li>Honor the terms of individual Offers and Retainers</li>
                  <li>Deliver agreed-upon content and promotional services</li>
                </ul>

                <h3 className="text-xl font-semibold mb-3 mt-6">5.3 Brand-Specific Obligations</h3>
                <p>Brands must:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Provide accurate information about products, services, and commission structures</li>
                  <li>Honor commission agreements and pay Creators timely</li>
                  <li>Provide functional tracking links and conversion tracking</li>
                  <li>Not reverse legitimate conversions without valid reason</li>
                  <li>Comply with advertising laws and industry standards</li>
                  <li>Treat Creators professionally and respectfully</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">6. Offers and Applications</h2>

                <h3 className="text-xl font-semibold mb-3">6.1 Posting Offers (Brands)</h3>
                <p>Brands may post Offers subject to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Approval by AffiliateXchange (we reserve the right to reject any Offer)</li>
                  <li>Accuracy and completeness of Offer details</li>
                  <li>Compliance with our content policies and applicable laws</li>
                  <li>Payment of applicable platform fees</li>
                </ul>

                <h3 className="text-xl font-semibold mb-3 mt-6">6.2 Applying to Offers (Creators)</h3>
                <p>Creators may apply to Offers. Applications are subject to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Automatic or manual approval by the Brand</li>
                  <li>Meeting Offer requirements (follower count, niche, location, etc.)</li>
                  <li>Acceptance of Offer-specific terms</li>
                </ul>

                <h3 className="text-xl font-semibold mb-3 mt-6">6.3 Offer Terms</h3>
                <p>
                  Each Offer may have additional terms. By applying to an Offer, you agree to those specific terms. In case of conflict, Offer-specific terms take precedence over these general Terms for that particular Offer.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">7. Payments and Commissions</h2>

                <h3 className="text-xl font-semibold mb-3">7.1 Commission Structure</h3>
                <p>Creators earn commissions based on:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Per-Sale:</strong> A percentage or fixed amount per conversion</li>
                  <li><strong>Retainer:</strong> A monthly fee for ongoing services</li>
                  <li><strong>Hybrid:</strong> A combination of retainer and performance-based payments</li>
                </ul>

                <h3 className="text-xl font-semibold mb-3 mt-6">7.2 Payment Processing</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Payments are processed through Stripe, PayPal, or bank transfer (e-transfer for Canada)</li>
                  <li>Creators must complete payment setup before receiving payouts</li>
                  <li>Minimum payout thresholds may apply</li>
                  <li>Payment schedules are defined in individual Offers or Retainers</li>
                  <li>We may hold payments during dispute resolution or fraud investigations</li>
                </ul>

                <h3 className="text-xl font-semibold mb-3 mt-6">7.3 Platform Fees</h3>
                <p>AffiliateXchange charges the following fees:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Creator Fee:</strong> 10% platform fee on all commission earnings (deducted automatically from payouts)</li>
                  <li><strong>Brand Monthly Fee:</strong> $99/month for standard listing (includes up to 10 active offers)</li>
                  <li><strong>Brand Premium Features:</strong> Priority listing ($49/offer/month), featured placement ($149/month), unlimited offers ($199/month)</li>
                  <li><strong>Transaction Fees:</strong> Payment processor fees (Stripe: 2.9% + $0.30, PayPal: 2.99%, E-transfer: Free)</li>
                  <li><strong>Minimum Payout:</strong> $50 for creators (lower threshold may apply for retainer contracts)</li>
                </ul>
                <p className="mt-4 text-sm text-muted-foreground">
                  All fees are subject to change with 30 days notice. Existing contracts will honor the fee structure in place at the time of agreement.
                </p>

                <h3 className="text-xl font-semibold mb-3 mt-6">7.4 Taxes</h3>
                <p>
                  You are responsible for all taxes associated with your use of the Services. We may collect tax information and issue tax forms (e.g., 1099, T4A) as required by law.
                </p>

                <h3 className="text-xl font-semibold mb-3 mt-6">7.5 Refunds and Chargebacks</h3>
                <p>
                  If a Brand receives a refund or chargeback for a conversion you earned commission on, we may reverse that commission and deduct it from your account balance.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">8. Tracking and Analytics</h2>
                <p>
                  We provide tracking links, conversion tracking, and analytics for affiliate campaigns. You agree that:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Tracking data is for informational purposes and may not be 100% accurate</li>
                  <li>We are not liable for tracking errors or technical issues</li>
                  <li>Disputes about conversions will be resolved based on available data</li>
                  <li>Brands may use additional tracking methods (pixels, postback URLs)</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">9. Intellectual Property</h2>

                <h3 className="text-xl font-semibold mb-3">9.1 Our Intellectual Property</h3>
                <p>
                  All content, features, and functionality of our Services (including text, graphics, logos, trademarks, software, and design) are owned by AffiliateXchange or our licensors and are protected by copyright, trademark, and other intellectual property laws.
                </p>
                <p className="mt-4">You may not:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Copy, modify, or create derivative works of our platform</li>
                  <li>Reverse engineer, decompile, or disassemble our software</li>
                  <li>Use our trademarks without written permission</li>
                  <li>Remove copyright or proprietary notices</li>
                </ul>

                <h3 className="text-xl font-semibold mb-3 mt-6">9.2 User Content</h3>
                <p>
                  You retain ownership of content you submit to our Services (profile information, videos, images, messages, reviews). By submitting content, you grant us a worldwide, non-exclusive, royalty-free license to:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Display, reproduce, and distribute your content on our platform</li>
                  <li>Use your content for marketing and promotional purposes</li>
                  <li>Modify your content for technical compatibility</li>
                </ul>
                <p className="mt-4">You represent and warrant that:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>You own or have the rights to submit the content</li>
                  <li>Your content does not infringe on third-party rights</li>
                  <li>Your content complies with these Terms and applicable laws</li>
                </ul>

                <h3 className="text-xl font-semibold mb-3 mt-6">9.3 DMCA Policy</h3>
                <p>
                  We respect intellectual property rights. If you believe your copyright has been infringed, please contact us at dmca@affiliatexchange.com with:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Identification of the copyrighted work</li>
                  <li>Identification of the infringing material</li>
                  <li>Your contact information</li>
                  <li>A statement of good faith belief</li>
                  <li>A statement under penalty of perjury</li>
                  <li>Your physical or electronic signature</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">10. Termination</h2>

                <h3 className="text-xl font-semibold mb-3">10.1 Termination by You</h3>
                <p>
                  You may terminate your account at any time by contacting support or using the account deletion feature. Upon termination:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Your access to the Services will be revoked</li>
                  <li>Outstanding commissions will be paid according to our normal schedule</li>
                  <li>Certain data may be retained as required by law</li>
                </ul>

                <h3 className="text-xl font-semibold mb-3 mt-6">10.2 Termination by Us</h3>
                <p>We may suspend or terminate your account if:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>You violate these Terms or our policies</li>
                  <li>You engage in fraudulent or illegal activity</li>
                  <li>Your account is inactive for an extended period</li>
                  <li>We are required to do so by law</li>
                  <li>We discontinue the Services</li>
                </ul>

                <h3 className="text-xl font-semibold mb-3 mt-6">10.3 Effect of Termination</h3>
                <p>Upon termination:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>All licenses granted to you will immediately terminate</li>
                  <li>You must cease all use of our Services</li>
                  <li>Sections 9, 11, 12, 13, 14, 17, and 18 will survive termination</li>
                  <li>We may retain your data as permitted by our Privacy Policy</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">11. Disclaimers</h2>
                <p className="uppercase font-semibold">
                  THE SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED.
                </p>
                <p className="mt-4">WE DISCLAIM ALL WARRANTIES, INCLUDING:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT</li>
                  <li>ACCURACY, RELIABILITY, OR COMPLETENESS OF CONTENT</li>
                  <li>UNINTERRUPTED, SECURE, OR ERROR-FREE OPERATION</li>
                  <li>RESULTS OR EARNINGS FROM USE OF THE SERVICES</li>
                </ul>
                <p className="mt-4">
                  We do not guarantee any specific level of performance, commissions, or conversions. Success depends on many factors outside our control.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">12. Limitation of Liability</h2>
                <p className="uppercase font-semibold">
                  TO THE MAXIMUM EXTENT PERMITTED BY LAW, AffiliateXchange AND ITS OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR:
                </p>
                <ul className="list-disc pl-6 space-y-2 mt-4">
                  <li>INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES</li>
                  <li>LOST PROFITS, REVENUE, DATA, OR BUSINESS OPPORTUNITIES</li>
                  <li>DAMAGES ARISING FROM YOUR USE OR INABILITY TO USE THE SERVICES</li>
                  <li>DAMAGES ARISING FROM USER CONTENT OR CONDUCT OF OTHER USERS</li>
                  <li>DAMAGES ARISING FROM UNAUTHORIZED ACCESS OR SECURITY BREACHES</li>
                </ul>
                <p className="mt-4 uppercase">
                  OUR TOTAL LIABILITY FOR ANY CLAIM ARISING FROM THESE TERMS OR THE SERVICES SHALL NOT EXCEED THE GREATER OF (A) $100 OR (B) THE AMOUNT YOU PAID US IN THE PAST 12 MONTHS.
                </p>
                <p className="mt-4">
                  Some jurisdictions do not allow limitations on implied warranties or exclusions of certain damages, so these limitations may not apply to you.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">13. Indemnification</h2>
                <p>
                  You agree to indemnify, defend, and hold harmless AffiliateXchange and its officers, directors, employees, contractors, and agents from and against any claims, liabilities, damages, losses, costs, or expenses (including reasonable attorneys' fees) arising from:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Your use of the Services</li>
                  <li>Your violation of these Terms</li>
                  <li>Your violation of any rights of another party</li>
                  <li>Your content or conduct</li>
                  <li>Your promotional activities or advertising</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">14. Third-Party Services</h2>
                <p>
                  Our Services may integrate with or link to third-party services (Stripe, PayPal, Google Analytics, etc.). We are not responsible for:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>The availability, accuracy, or content of third-party services</li>
                  <li>Third-party terms, policies, or practices</li>
                  <li>Your interactions with third parties</li>
                </ul>
                <p className="mt-4">
                  Your use of third-party services is at your own risk and subject to their terms.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">15. Privacy</h2>
                <p>
                  Your use of our Services is also governed by our Privacy Policy, which is incorporated into these Terms by reference. Please review our Privacy Policy to understand how we collect, use, and protect your information.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">16. User-Generated Content and Reviews</h2>

                <h3 className="text-xl font-semibold mb-3">16.1 User Content</h3>
                <p>
                  Users may post reviews, ratings, testimonials, and feedback about other users (Creators reviewing Brands, Brands reviewing Creators). By posting such content, you agree that:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Your reviews are based on genuine experiences and are truthful</li>
                  <li>You will not post false, defamatory, or malicious content</li>
                  <li>You will not attempt to manipulate ratings or reviews</li>
                  <li>You will comply with applicable laws regarding endorsements and testimonials</li>
                  <li>Your reviews do not contain confidential or proprietary information</li>
                </ul>

                <h3 className="text-xl font-semibold mb-3 mt-6">16.2 Content Moderation</h3>
                <p>
                  We reserve the right to monitor, edit, or remove user-generated content that:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Violates these Terms or our Community Guidelines</li>
                  <li>Is abusive, threatening, obscene, or discriminatory</li>
                  <li>Infringes on intellectual property or privacy rights</li>
                  <li>Contains spam, advertising, or promotional material</li>
                  <li>Is reported by other users as inappropriate</li>
                </ul>

                <h3 className="text-xl font-semibold mb-3 mt-6">16.3 Review Disputes</h3>
                <p>
                  If you believe a review is false or violates our policies, you may report it to support@affiliatexchange.com. We will investigate and take appropriate action, which may include removal of the review or suspension of the reviewer's account.
                </p>
                <p className="mt-4">
                  We do not mediate disputes between users regarding reviews. Reviews represent the subjective opinions of individual users and do not reflect the views of AffiliateXchange.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">17. Beta Features and Services</h2>
                <p>
                  We may offer beta features, experimental services, or early access programs ("Beta Services") to select users. Beta Services are provided for testing and feedback purposes.
                </p>

                <h3 className="text-xl font-semibold mb-3 mt-4">Terms for Beta Services:</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>No Warranty:</strong> Beta Services are provided "as is" with no guarantees of functionality, availability, or accuracy</li>
                  <li><strong>May Change or Discontinue:</strong> We may modify, suspend, or discontinue Beta Services at any time without notice</li>
                  <li><strong>Data Loss:</strong> Data in Beta Services may be lost, deleted, or become inaccessible</li>
                  <li><strong>Confidentiality:</strong> You may be required to keep Beta Services confidential</li>
                  <li><strong>Feedback:</strong> We may use your feedback about Beta Services without compensation or attribution</li>
                  <li><strong>No SLA:</strong> Beta Services are not subject to service level agreements or uptime guarantees</li>
                </ul>
                <p className="mt-4">
                  Participation in Beta Services is at your own risk. We recommend not relying on Beta Services for critical business operations.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">18. Platform Availability and Maintenance</h2>

                <h3 className="text-xl font-semibold mb-3">18.1 Service Availability</h3>
                <p>
                  While we strive to provide reliable and uninterrupted service, we do not guarantee that our Services will be available at all times. Service may be interrupted due to:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Scheduled maintenance (announced in advance when possible)</li>
                  <li>Emergency maintenance or security updates</li>
                  <li>Technical difficulties or system failures</li>
                  <li>Third-party service provider outages</li>
                  <li>Network or internet connectivity issues</li>
                  <li>Force majeure events (natural disasters, pandemics, etc.)</li>
                </ul>

                <h3 className="text-xl font-semibold mb-3 mt-6">18.2 Maintenance Windows</h3>
                <p>
                  Scheduled maintenance typically occurs during off-peak hours (12:00 AM - 4:00 AM PST). We will provide at least 48 hours notice for planned maintenance that affects core functionality.
                </p>

                <h3 className="text-xl font-semibold mb-3 mt-6">18.3 Service Level</h3>
                <p>
                  We target 99.5% uptime for our Services (excluding scheduled maintenance). However, this is a target, not a guarantee. We are not liable for any damages resulting from service interruptions.
                </p>

                <h3 className="text-xl font-semibold mb-3 mt-6">18.4 Status Updates</h3>
                <p>
                  Service status and incident updates are available at status.affiliatexchange.com (or announced via our website/social media).
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">19. API Usage and Developer Terms</h2>
                <p>
                  If you use our API (Application Programming Interface), you agree to comply with our API Terms and Usage Guidelines:
                </p>

                <h3 className="text-xl font-semibold mb-3 mt-4">19.1 API Access</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Registration Required:</strong> API access requires registration and approval</li>
                  <li><strong>API Keys:</strong> Keep your API keys confidential and secure</li>
                  <li><strong>Rate Limits:</strong> Respect rate limits (varies by plan: 100 requests/min for free tier, 1000 requests/min for paid tier)</li>
                  <li><strong>Authentication:</strong> Use OAuth 2.0 or API key authentication as specified</li>
                </ul>

                <h3 className="text-xl font-semibold mb-3 mt-6">19.2 API Usage Restrictions</h3>
                <p>You may NOT:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Exceed rate limits or attempt to circumvent usage restrictions</li>
                  <li>Use the API to scrape data or create competing services</li>
                  <li>Share your API credentials with unauthorized parties</li>
                  <li>Make excessive or abusive API calls that impact service performance</li>
                  <li>Cache data beyond reasonable timeframes (max 24 hours for most data)</li>
                  <li>Use the API to send spam or unauthorized communications</li>
                </ul>

                <h3 className="text-xl font-semibold mb-3 mt-6">19.3 API Changes and Deprecation</h3>
                <p>
                  We may modify, deprecate, or discontinue API endpoints with at least 90 days notice for breaking changes. Non-breaking changes may be implemented without notice.
                </p>

                <h3 className="text-xl font-semibold mb-3 mt-6">19.4 API Support</h3>
                <p>
                  API documentation is available at api.affiliatexchange.com/docs. For API support, contact developers@affiliatexchange.com.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">20. User Feedback and Suggestions</h2>
                <p>
                  We welcome your feedback, suggestions, and ideas for improving our Services ("Feedback"). By submitting Feedback, you agree that:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Your Feedback is voluntary and provided without expectation of compensation</li>
                  <li>We may use, modify, and implement your Feedback without attribution or payment</li>
                  <li>You grant us a perpetual, worldwide, royalty-free license to use your Feedback</li>
                  <li>Your Feedback does not contain confidential or proprietary information you wish to protect</li>
                  <li>We have no obligation to implement or respond to Feedback</li>
                </ul>
                <p className="mt-4">
                  If you wish to share confidential information or propose a business partnership, please contact partnerships@affiliatexchange.com to discuss appropriate confidentiality protections.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">21. Modifications to Terms</h2>
                <p>
                  We may modify these Terms at any time. If we make material changes, we will notify you by:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Posting the updated Terms on this page</li>
                  <li>Updating the "Last Updated" date</li>
                  <li>Sending an email notification (for significant changes)</li>
                </ul>
                <p className="mt-4">
                  Your continued use of the Services after changes become effective constitutes acceptance of the revised Terms. If you do not agree to the changes, you must stop using the Services.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">22. Governing Law</h2>
                <p>
                  These Terms shall be governed by and construed in accordance with the laws of the State of California, United States, without regard to its conflict of law provisions.
                </p>
                <p className="mt-4">
                  Any legal action or proceeding arising under these Terms will be brought exclusively in the state or federal courts located in San Francisco County, California, and you consent to personal jurisdiction in such courts.
                </p>
                <p className="mt-4 text-sm text-muted-foreground">
                  For users outside the United States, these Terms will be enforced to the maximum extent permitted by your local laws. Nothing in these Terms affects your statutory rights as a consumer in your jurisdiction.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">23. Dispute Resolution</h2>

                <h3 className="text-xl font-semibold mb-3">23.1 Informal Resolution</h3>
                <p>
                  Before initiating any formal dispute resolution, you agree to contact us at legal@affiliatexchange.com to attempt to resolve the dispute informally. We will work in good faith to resolve disputes within 30 days.
                </p>

                <h3 className="text-xl font-semibold mb-3 mt-6">23.2 Binding Arbitration</h3>
                <p>
                  If informal resolution fails, you and AffiliateXchange agree to resolve any disputes through binding arbitration rather than in court, except for:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Small claims court matters (under $10,000)</li>
                  <li>Intellectual property disputes</li>
                  <li>Requests for injunctive or equitable relief</li>
                  <li>Enforcement of these Terms</li>
                </ul>
                <p className="mt-4">
                  Arbitration will be conducted by JAMS (Judicial Arbitration and Mediation Services) under its Comprehensive Arbitration Rules & Procedures. The arbitration will take place in San Francisco, California, or remotely via video conference if both parties agree. The arbitrator's decision is final and binding, and may be entered as a judgment in any court of competent jurisdiction.
                </p>
                <p className="mt-4 text-sm text-muted-foreground">
                  Each party will bear their own costs of arbitration unless the arbitrator determines otherwise. AffiliateXchange will reimburse your filing fees if your claim is for less than $10,000 and you cannot afford to pay.
                </p>

                <h3 className="text-xl font-semibold mb-3 mt-6">23.3 Class Action Waiver</h3>
                <p className="uppercase font-semibold">
                  YOU AND AffiliateXchange AGREE THAT EACH MAY BRING CLAIMS AGAINST THE OTHER ONLY IN YOUR OR ITS INDIVIDUAL CAPACITY AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS OR REPRESENTATIVE ACTION.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">24. General Provisions</h2>

                <h3 className="text-xl font-semibold mb-3">24.1 Entire Agreement</h3>
                <p>
                  These Terms, together with our Privacy Policy and any Offer-specific terms, constitute the entire agreement between you and AffiliateXchange.
                </p>

                <h3 className="text-xl font-semibold mb-3 mt-6">24.2 Severability</h3>
                <p>
                  If any provision of these Terms is found to be unenforceable, the remaining provisions will continue in full force and effect.
                </p>

                <h3 className="text-xl font-semibold mb-3 mt-6">24.3 No Waiver</h3>
                <p>
                  Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights.
                </p>

                <h3 className="text-xl font-semibold mb-3 mt-6">24.4 Assignment</h3>
                <p>
                  You may not assign or transfer these Terms without our prior written consent. We may assign these Terms without restriction.
                </p>

                <h3 className="text-xl font-semibold mb-3 mt-6">24.5 Force Majeure</h3>
                <p>
                  We are not liable for any failure or delay in performance due to circumstances beyond our reasonable control (natural disasters, war, strikes, etc.).
                </p>

                <h3 className="text-xl font-semibold mb-3 mt-6">24.6 Relationship</h3>
                <p>
                  These Terms do not create a partnership, joint venture, employment, or agency relationship between you and AffiliateXchange.
                </p>

                <h3 className="text-xl font-semibold mb-3 mt-6">24.7 Notices</h3>
                <p>
                  Notices to you may be sent to your email address on file. Notices to us should be sent to legal@affiliatexchange.com.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">25. Contact Information</h2>
                <p>If you have questions about these Terms, please contact us:</p>
                <div className="mt-4 space-y-2">
                  <p><strong>Company Name:</strong> AffiliateXchange Inc.</p>
                  <p><strong>Legal Inquiries:</strong> legal@affiliatexchange.com</p>
                  <p><strong>General Support:</strong> support@affiliatexchange.com</p>
                  <p><strong>Business Partnerships:</strong> partnerships@affiliatexchange.com</p>
                  <p><strong>Mailing Address:</strong> 123 Commerce Street, Suite 400, San Francisco, CA 94102, United States</p>
                  <p><strong>Business Hours:</strong> Monday - Friday, 9:00 AM - 5:00 PM PST</p>
                </div>
                <p className="mt-4 text-sm text-muted-foreground">
                  For urgent account or payment issues, please use the in-app support chat or email support@affiliatexchange.com with "URGENT" in the subject line.
                </p>
              </section>

              <div className="mt-12 pt-8 border-t">
                <p className="text-sm text-muted-foreground text-center">
                  By using AffiliateXchange, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
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
