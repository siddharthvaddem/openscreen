import { describe, expect, it } from "vitest";
import { type Locale, SUPPORTED_LOCALES } from "@/i18n/config";
import arDialogs from "@/i18n/locales/ar/dialogs.json";
import enDialogs from "@/i18n/locales/en/dialogs.json";
import esDialogs from "@/i18n/locales/es/dialogs.json";
import frDialogs from "@/i18n/locales/fr/dialogs.json";
import jaJPDialogs from "@/i18n/locales/ja-JP/dialogs.json";
import koKRDialogs from "@/i18n/locales/ko-KR/dialogs.json";
import ruDialogs from "@/i18n/locales/ru/dialogs.json";
import trDialogs from "@/i18n/locales/tr/dialogs.json";
import viDialogs from "@/i18n/locales/vi/dialogs.json";
import zhCNDialogs from "@/i18n/locales/zh-CN/dialogs.json";
import zhTWDialogs from "@/i18n/locales/zh-TW/dialogs.json";

const tutorialHelpKeys = [
	"triggerLabel",
	"title",
	"description",
	"explanationBefore",
	"remove",
	"explanationMiddle",
	"covered",
	"explanationAfter",
	"visualExample",
	"removed",
	"kept",
	"part1",
	"part2",
	"part3",
	"finalVideo",
	"step1Title",
	"step1DescriptionBefore",
	"step1DescriptionAfter",
	"step2Title",
	"step2Description",
] as const;

const keysThatMayBeEmpty = new Set<(typeof tutorialHelpKeys)[number]>(["step1DescriptionBefore"]);

const dialogsByLocale = {
	en: enDialogs,
	"zh-CN": zhCNDialogs,
	"zh-TW": zhTWDialogs,
	es: esDialogs,
	fr: frDialogs,
	tr: trDialogs,
	"ko-KR": koKRDialogs,
	ru: ruDialogs,
	"ja-JP": jaJPDialogs,
	ar: arDialogs,
	vi: viDialogs,
} satisfies Record<Locale, { tutorial: Record<string, unknown> }>;

describe("TutorialHelp translations", () => {
	it("defines every tutorial help key for each supported locale", () => {
		for (const locale of SUPPORTED_LOCALES) {
			const tutorial = dialogsByLocale[locale].tutorial;

			for (const key of tutorialHelpKeys) {
				const message = tutorial[key];
				const label = `${locale} dialogs.tutorial.${key}`;
				expect(message, label).toEqual(expect.any(String));
				if (!keysThatMayBeEmpty.has(key)) {
					expect((message as string).trim().length, label).toBeGreaterThan(0);
				}
			}
		}
	});
});
