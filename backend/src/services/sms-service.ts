import { createHmac, randomUUID } from "node:crypto";
import { config } from "../config.js";

export interface SmsSendResult {
	success: boolean;
	provider: string;
	messageId?: string;
	previewCode?: string;
	error?: string;
}

function buildSolapiAuthorization() {
	const date = new Date().toISOString();
	const salt = randomUUID().replace(/-/g, "");
	const signature = createHmac("sha256", config.smsApiSecret)
		.update(date + salt)
		.digest("hex");
	return {
		date,
		salt,
		header: `HMAC-SHA256 apiKey=${config.smsApiKey}, date=${date}, salt=${salt}, signature=${signature}`,
	};
}

export async function sendVerificationSms(
	phoneNumber: string,
	code: string,
): Promise<SmsSendResult> {
	if (config.smsProvider !== "solapi") {
		return {
			success: false,
			provider: config.smsProvider,
			error: "지원하지 않는 SMS 공급자입니다.",
		};
	}

	if (config.smsDryRun || !config.smsSender || !config.smsApiKey || !config.smsApiSecret) {
		return {
			success: true,
			provider: "solapi",
			messageId: `dry-run-${phoneNumber}-${Date.now()}`,
			previewCode: code,
		};
	}

	try {
		const auth = buildSolapiAuthorization();
		const response = await fetch(`${config.smsApiBaseUrl}/messages/v4/send-many/detail`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: auth.header,
			},
			body: JSON.stringify({
				message: {
					from: config.smsSender,
					text: `[Auto Screen] 인증번호는 ${code} 입니다. 3분 안에 입력해주세요.`,
				},
				messages: [{ to: phoneNumber }],
			}),
		});

		const payload = (await response.json().catch(() => null)) as {
			messageId?: string;
			statusMessage?: string;
			errorMessage?: string;
		} | null;

		if (!response.ok) {
			return {
				success: false,
				provider: "solapi",
				error:
					payload?.errorMessage ||
					payload?.statusMessage ||
					`Solapi 요청 실패 (${response.status})`,
			};
		}

		return {
			success: true,
			provider: "solapi",
			messageId: payload?.messageId || `solapi-${Date.now()}`,
		};
	} catch (error) {
		return {
			success: false,
			provider: "solapi",
			error: error instanceof Error ? error.message : "SMS 전송 중 알 수 없는 오류가 발생했습니다.",
		};
	}
}
