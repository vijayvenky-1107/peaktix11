/**
 * Bank Card Offers & Discount Rules Engine for PeakTix.
 *
 * NOTE: All bank promotions are simulated demonstration discount rules.
 * Validation and calculations are strictly verified on the backend.
 */
export const offersData = [
  {
    code: "HDFCWEEKEND",
    title: "HDFC Bank Credit & Debit Card Delight",
    description: "Get 20% instant discount up to ₹250 on movies and live experiences.",
    bank: "HDFC Bank",
    cardType: "ALL_CARDS",
    cardBinPrefixes: ["4052", "4160", "5241", "6070"], // Illustrative BINs
    discountType: "PERCENTAGE",
    discountValue: 20,
    maxDiscount: 250,
    minAmount: 500,
    eligibleCategories: ["All", "Movies", "Concerts", "Experiences"],
    expiry: "Dec 31, 2026",
    badge: "20% OFF",
    terms: "Valid once per user every weekend (Fri-Sun). Minimum booking amount ₹500.",
  },
  {
    code: "ICICICINEMA",
    title: "ICICI Bank Coral & Sapphiro Movie BOGO",
    description: "Buy 1 Get 1 Free on movie tickets (up to ₹300 off on second ticket).",
    bank: "ICICI Bank",
    cardType: "PREMIUM_CARDS",
    cardBinPrefixes: ["4315", "5176", "6521"],
    discountType: "BOGO",
    discountValue: 100, // 100% on 1 ticket
    maxDiscount: 300,
    minAmount: 400,
    eligibleCategories: ["Movies"],
    expiry: "Dec 31, 2026",
    badge: "BOGO ₹300",
    terms: "Valid on minimum booking of 2 movie tickets. Maximum discount ₹300.",
  },
  {
    code: "RUPAYFEST",
    title: "RuPay Platinum & Select Card Special",
    description: "Flat ₹150 off on all live entertainment & movie bookings above ₹600.",
    bank: "RuPay",
    cardType: "RUPAY_PLATINUM",
    cardBinPrefixes: ["60", "65", "81", "82"],
    discountType: "FLAT",
    discountValue: 150,
    maxDiscount: 150,
    minAmount: 600,
    eligibleCategories: ["All", "Movies", "Concerts", "Comedy", "Experiences"],
    expiry: "Jan 15, 2027",
    badge: "FLAT ₹150",
    terms: "Valid on all RuPay Platinum, Select, and Credit cards on UPI.",
  },
  {
    code: "SBIEARLYBIRD",
    title: "SBI Card Elite & Prime Entertainment Offer",
    description: "15% off up to ₹200 on cinema and cultural concert bookings.",
    bank: "State Bank of India",
    cardType: "SBI_CREDIT",
    cardBinPrefixes: ["4726", "5289"],
    discountType: "PERCENTAGE",
    discountValue: 15,
    maxDiscount: 200,
    minAmount: 450,
    eligibleCategories: ["All", "Movies", "Concerts"],
    expiry: "Dec 31, 2026",
    badge: "15% OFF",
    terms: "Applicable on SBI Credit Card transactions only. No coupon code needed if card selected.",
  },
  {
    code: "UPIFLAT50",
    title: "Instant UPI Cashback & Discount",
    description: "Flat ₹50 instant discount on payment via any UPI App (GPay, PhonePe, Paytm).",
    bank: "UPI",
    cardType: "UPI_ALL",
    cardBinPrefixes: [],
    discountType: "FLAT",
    discountValue: 50,
    maxDiscount: 50,
    minAmount: 300,
    eligibleCategories: ["All"],
    expiry: "Open Promo",
    badge: "₹50 UPI",
    terms: "Valid on all UPI transactions above ₹300. Instant discount applied at checkout.",
  },
];

/**
 * Calculates discount amount strictly on backend.
 * @param {string} offerCode
 * @param {number} subtotal
 * @param {string} category
 * @param {number} quantity
 * @returns {{ valid: boolean, discount: number, error?: string, offer?: object }}
 */
export function calculateBackendDiscount(offerCode, subtotal, category = "All", quantity = 1) {
  if (!offerCode || typeof offerCode !== "string") {
    return { valid: false, discount: 0, error: "No offer code provided." };
  }

  const cleanCode = offerCode.trim().toUpperCase();
  const offer = offersData.find((o) => o.code === cleanCode);

  if (!offer) {
    return { valid: false, discount: 0, error: `Invalid offer code '${cleanCode}'.` };
  }

  if (subtotal < offer.minAmount) {
    return {
      valid: false,
      discount: 0,
      error: `Minimum booking amount for code ${offer.code} is ₹${offer.minAmount}. Current subtotal is ₹${subtotal}.`,
    };
  }

  if (
    offer.eligibleCategories &&
    !offer.eligibleCategories.includes("All") &&
    !offer.eligibleCategories.includes(category)
  ) {
    return {
      valid: false,
      discount: 0,
      error: `Offer ${offer.code} is only valid on ${offer.eligibleCategories.join(", ")}.`,
    };
  }

  let discount = 0;
  if (offer.discountType === "FLAT") {
    discount = Math.min(offer.discountValue, subtotal);
  } else if (offer.discountType === "PERCENTAGE") {
    const rawDiscount = Math.round((subtotal * offer.discountValue) / 100);
    discount = Math.min(rawDiscount, offer.maxDiscount);
  } else if (offer.discountType === "BOGO") {
    // Buy 1 get 1: 1 ticket free up to maxDiscount, requires quantity >= 2
    if (quantity < 2) {
      return {
        valid: false,
        discount: 0,
        error: `Offer ${offer.code} requires a minimum of 2 tickets.`,
      };
    }
    const singleTicketApprox = Math.round(subtotal / quantity);
    discount = Math.min(singleTicketApprox, offer.maxDiscount);
  }

  return {
    valid: true,
    discount: Math.max(0, Math.min(discount, subtotal)),
    offer: {
      code: offer.code,
      title: offer.title,
      badge: offer.badge,
      bank: offer.bank,
    },
  };
}
