export type MemberIdentity =
  | '直營店'
  | '加盟店'
  | '合夥商'
  | '推廣商(分店能量師)'
  | 'B2B合作專案'
  | '心耀商'
  | '會員'
  | '一般售價';

export const MEMBER_IDENTITY_LABELS: Record<MemberIdentity, string> = {
  '直營店': '直營店',
  '加盟店': '加盟店',
  '合夥商': '合夥商',
  '推廣商(分店能量師)': '推廣商(分店能量師)',
  'B2B合作專案': 'B2B合作專案',
  '心耀商': '心耀商',
  '會員': '會員',
  '一般售價': '一般售價',
};

export const MEMBER_IDENTITY_OPTIONS: { value: MemberIdentity; label: string }[] = (
  Object.entries(MEMBER_IDENTITY_LABELS) as [MemberIdentity, string][]
).map(([value, label]) => ({ value, label }));

