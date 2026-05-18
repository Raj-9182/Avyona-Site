import fs from "fs";
import path from "path";

const frontendRoot = process.cwd();
const checkoutPath = path.join(frontendRoot, "src", "pages", "CheckoutPage.jsx");
const customerApiPath = path.join(frontendRoot, "src", "api", "customerApi.js");
const checkoutCssPath = path.join(frontendRoot, "src", "styles", "checkout.css");

const checkout = fs.readFileSync(checkoutPath, "utf8");
const customerApi = fs.readFileSync(customerApiPath, "utf8");
const checkoutCss = fs.readFileSync(checkoutCssPath, "utf8");

const checks = [
  {
    label: "Checkout fetches the customer wallet",
    passed: /fetchCustomerWallet\(\)/.test(checkout) && /customer\/credits\/wallet/.test(customerApi)
  },
  {
    label: "Checkout applies rewards through backend validation",
    passed: /applyCustomerCreditPoints\(\{\s*points:\s*requested,\s*orderSubtotal:/s.test(checkout) && /customer\/credits\/apply/.test(customerApi)
  },
  {
    label: "Checkout has remove points action",
    passed: /const removePoints\s*=\s*\(\)\s*=>/.test(checkout) && /onClick=\{removePoints\}/.test(checkout)
  },
  {
    label: "Checkout recalculates credit discount and total",
    passed: /const creditDiscount\s*=\s*Math\.floor\(appliedPoints \/ pointsPerRupee\)/.test(checkout) &&
      /const total\s*=\s*Math\.max\(0, subtotal - discount - creditDiscount\) \+ shipping/.test(checkout)
  },
  {
    label: "Checkout submits applied points with order",
    passed: /creditPoints:\s*appliedPoints/.test(checkout)
  },
  {
    label: "Mobile order summary is available",
    passed: /className="mobile-summary-toggle"/.test(checkout) && /\.mobile-summary-toggle\s*>\s*summary/.test(checkoutCss)
  },
  {
    label: "Mobile layout stacks checkout for narrow screens",
    passed: /@media \(max-width:\s*980px\)[\s\S]*\.checkout-layout[\s\S]*grid-template-columns:\s*1fr/.test(checkoutCss) &&
      /@media \(max-width:\s*760px\)/.test(checkoutCss)
  },
  {
    label: "Mobile sticky payment action exists",
    passed: /@media \(max-width:\s*760px\)[\s\S]*\.checkout-cta-wrap[\s\S]*position:\s*sticky/.test(checkoutCss)
  },
  {
    label: "Wallet blocked state hides rewards usage",
    passed: /customerAvailablePoints > 0 && !walletData\?\.isBlocked/.test(checkout)
  },
  {
    label: "Rewards usage is visible before totals",
    passed: checkout.indexOf("Use Credit Points") > -1 &&
      checkout.indexOf("Use Credit Points") < checkout.indexOf("<div className=\"summary-row\"><span>Subtotal</span>")
  }
];

const failed = checks.filter((check) => !check.passed);

for (const check of checks) {
  console.log(`${check.passed ? "PASS" : "FAIL"} ${check.label}`);
}

if (failed.length) {
  console.error(`\n${failed.length} mobile checkout reward QA check(s) failed.`);
  process.exitCode = 1;
} else {
  console.log(`\nAll ${checks.length} mobile checkout reward QA checks passed.`);
}
