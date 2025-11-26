-- 將舊的 GENERAL_MEMBER 會員身份全部改為 MEMBER
UPDATE member
SET identity_type = 'MEMBER'
WHERE identity_type = 'GENERAL_MEMBER';
