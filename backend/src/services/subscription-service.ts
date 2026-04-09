export type BillingPlanCode = "pro_monthly_15900_krw";

export async function createCheckoutSession(planCode: BillingPlanCode) {
	return {
		planCode,
		checkoutUrl: "https://autoscreen.app/pricing?checkout=stub",
		message: "checkout skeleton ready",
	};
}

export async function getCurrentSubscription() {
	return {
		plan: "free",
		status: "inactive",
		currentPeriodEnd: null,
	};
}

export async function handleTossWebhook(payload: unknown) {
	return {
		accepted: true,
		received: payload,
	};
}

export async function getEntitlements() {
	return {
		entitlements: ["basic_recording", "basic_editing"],
	};
}
