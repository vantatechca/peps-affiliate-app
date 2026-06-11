// Minimal declaration to satisfy TypeScript when the PayPal SDK has no types
declare module '@paypal/payouts-sdk' {
  const content: any;
  export = content;
}
