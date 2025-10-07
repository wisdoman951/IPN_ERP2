import { MEMBER_IDENTITY_OPTIONS, MemberIdentity } from "../types/memberIdentity";

const IDENTITY_ALIASES: Record<string, MemberIdentity> = {
  "推廣商": "推廣商(分店能量師)",
  "推廣商(分店)": "推廣商(分店能量師)",
  "推廣商（分店能量師）": "推廣商(分店能量師)",
  "一般會員": "會員",
  "一般價": "一般售價",
  "一般價格": "一般售價",
  "一般售價": "一般售價",
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

  if (IDENTITY_ALIASES[trimmed]) {
    return IDENTITY_ALIASES[trimmed];
  }

  const directMatch = MEMBER_IDENTITY_OPTIONS.find(
    ({ value, label }) => value === trimmed || label === trimmed,
  );
  return directMatch ? directMatch.value : null;
};
