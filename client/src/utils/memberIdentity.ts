import { MEMBER_IDENTITY_LABELS, MEMBER_IDENTITY_OPTIONS, MemberIdentity } from "../types/memberIdentity";

const canonicalizeIdentityValue = (value: string) =>
  value
    .replace(/[\s_（）()\-]/g, "")
    .toUpperCase();

const IDENTITY_NORMALIZATION_MAP: Record<string, MemberIdentity> = {
  [canonicalizeIdentityValue("直營店")]: "直營店",
  [canonicalizeIdentityValue("Direct Store")]: "直營店",
  [canonicalizeIdentityValue("直營")]: "直營店",

  [canonicalizeIdentityValue("加盟店")]: "加盟店",
  [canonicalizeIdentityValue("Franchise Store")]: "加盟店",
  [canonicalizeIdentityValue("Franchise")]: "加盟店",

  [canonicalizeIdentityValue("合夥商")]: "合夥商",
  [canonicalizeIdentityValue("Partner")]: "合夥商",

  [canonicalizeIdentityValue("推廣商(分店能量師)")]: "推廣商(分店能量師)",
  [canonicalizeIdentityValue("推廣商")]: "推廣商(分店能量師)",
  [canonicalizeIdentityValue("推廣商(分店)")]: "推廣商(分店能量師)",
  [canonicalizeIdentityValue("推廣商（分店能量師）")]: "推廣商(分店能量師)",
  [canonicalizeIdentityValue("Promoter")]: "推廣商(分店能量師)",
  [canonicalizeIdentityValue("Promoter Branch")]: "推廣商(分店能量師)",

  [canonicalizeIdentityValue("B2B合作專案")]: "B2B合作專案",
  [canonicalizeIdentityValue("B2B Project")]: "B2B合作專案",
  [canonicalizeIdentityValue("B2B")]: "B2B合作專案",

  [canonicalizeIdentityValue("心耀商")]: "心耀商",
  [canonicalizeIdentityValue("Heart Shine")]: "心耀商",
  [canonicalizeIdentityValue("Heart Shop")]: "心耀商",

  [canonicalizeIdentityValue("會員")]: "會員",
  [canonicalizeIdentityValue("Member")]: "會員",
  [canonicalizeIdentityValue("一般會員")]: "會員",
  [canonicalizeIdentityValue("General Member")]: "會員",

  [canonicalizeIdentityValue("一般售價")]: "一般售價",
  [canonicalizeIdentityValue("一般價格")]: "一般售價",
  [canonicalizeIdentityValue("一般價")]: "一般售價",
  [canonicalizeIdentityValue("General Price")]: "一般售價",
  [canonicalizeIdentityValue("General")]: "一般售價",
};

export const normalizeMemberIdentity = (
  rawIdentity?: string | null,
): MemberIdentity | null => {
  if (!rawIdentity) {
    return null;
  }
  const trimmed = rawIdentity.trim();
  if (!trimmed) {
    return null;
  }

  const canonical = canonicalizeIdentityValue(trimmed);
  if (IDENTITY_NORMALIZATION_MAP[canonical]) {
    return IDENTITY_NORMALIZATION_MAP[canonical];
  }

  const directMatch = MEMBER_IDENTITY_OPTIONS.find(
    ({ value, label }) => value === trimmed || label === trimmed,
  );
  return directMatch ? directMatch.value : null;
};

const IDENTITY_DISPLAY_MAP: Record<string, string> = {
  [canonicalizeIdentityValue("直營店")]: "直營店",
  [canonicalizeIdentityValue("Direct Store")]: "直營店",

  [canonicalizeIdentityValue("加盟店")]: "加盟店",
  [canonicalizeIdentityValue("Franchise Store")]: "加盟店",

  [canonicalizeIdentityValue("合夥商")]: "合夥商",
  [canonicalizeIdentityValue("Partner")]: "合夥商",

  [canonicalizeIdentityValue("推廣商(分店能量師)")]: "推廣商(分店能量師)",
  [canonicalizeIdentityValue("推廣商")]: "推廣商(分店能量師)",
  [canonicalizeIdentityValue("推廣商(分店)")]: "推廣商(分店能量師)",
  [canonicalizeIdentityValue("推廣商（分店能量師）")]: "推廣商(分店能量師)",
  [canonicalizeIdentityValue("Promoter")]: "推廣商(分店能量師)",
  [canonicalizeIdentityValue("Promoter Branch")]: "推廣商(分店能量師)",

  [canonicalizeIdentityValue("B2B合作專案")]: "B2B合作專案",
  [canonicalizeIdentityValue("B2B Project")]: "B2B合作專案",
  [canonicalizeIdentityValue("B2B")]: "B2B合作專案",

  [canonicalizeIdentityValue("心耀商")]: "心耀商",
  [canonicalizeIdentityValue("Heart Shine")]: "心耀商",
  [canonicalizeIdentityValue("Heart Shop")]: "心耀商",

  [canonicalizeIdentityValue("會員")]: "會員",
  [canonicalizeIdentityValue("Member")]: "會員",

  [canonicalizeIdentityValue("一般會員")]: "一般會員",
  [canonicalizeIdentityValue("General Member")]: "一般會員",
  [canonicalizeIdentityValue("一般售價")]: "一般會員",
  [canonicalizeIdentityValue("General Price")]: "一般會員",
  [canonicalizeIdentityValue("General")]: "一般會員",
};

export const resolveMemberIdentityLabel = (
  rawIdentity?: string | null,
): string | null => {
  if (!rawIdentity) {
    return null;
  }
  const trimmed = rawIdentity.trim();
  if (!trimmed) {
    return null;
  }

  const canonical = canonicalizeIdentityValue(trimmed);
  if (IDENTITY_DISPLAY_MAP[canonical]) {
    return IDENTITY_DISPLAY_MAP[canonical];
  }

  const normalized = normalizeMemberIdentity(trimmed);
  if (!normalized) {
    return trimmed;
  }

  if (normalized === "一般售價") {
    return "一般會員";
  }

  return MEMBER_IDENTITY_LABELS[normalized];
};
